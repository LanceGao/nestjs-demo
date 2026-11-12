import { Injectable } from '@nestjs/common';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { Pool } from 'pg';
import { Document } from '@langchain/core/documents';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { DistanceStrategy,PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';
import { config } from '../config.js';
import { domainToASCII } from 'url';

@Injectable()
export class RagDbService {
    // 初始化对话模型实例
    private llm = new ChatOllama({
        model: config.ollama.chatModel,
        baseUrl: config.ollama.baseUrl,
        temperature: config.ollama.temperature,
    })
    // 初始化向量模型实例
    private embeddings = new OllamaEmbeddings({
        model: config.ollama.embedModel,
        baseUrl: config.ollama.baseUrl,
    })
    // ✅ 关键：Pool 在 Service 层创建，整个 Service 生命周期内共用一个
    // 不要在每个方法里创建 Pool，更不要在方法里 end() 它
    private pool = new Pool({
        // 生产环境建议使用环境变量配置数据库连接字符串
        connectionString: process.env.DATABASE_URL,
        // 连接池配置（可选，生产环境建议显式配置）
        max: 10,              // 最大连接数，根据并发量调整
        idleTimeoutMillis: 30000,  // 空闲连接 30 秒后释放
        connectionTimeoutMillis: 5000, // 获取连接超时 5 秒
    })
    // 初始化向量存储配置
    private vectorConfig = {
        pool: this.pool,
        collectionName: 'rag-knowledge',
        collectionTableName: 'langchain_pg_collection',
        tableName: 'langchain_pg_embedding',
        columns: {
            idColumnName: 'id',
            vectorColumnName: 'embedding',
            contentColumnName: 'content',
            metadataColumnName: 'metadata',
        },
        distanceStrategy: 'cosine' as DistanceStrategy
    }

    private docsCount: number = 0;
    
    async load(documents: {id: string, content: string, source: string}[]) {
        // 文档分割规则：按段落、句子、空格等分割
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 100,
            separators: ['\n\n', '\n', '。', '！', '？', '，', ' ', ''],
        })
        const allDocChunks: Document[] = [];
        for (const doc of documents) {
            // 对每个文档内容进行分割 ，生成多个文档块
            // createDocuments 内部会调用 RecursiveCharacterTextSplitter.splitDocuments()，将文档内容分割为多个文档块
            // 2. 每个文档块会包含文档内容、元数据（source、docId）
            const chunks = await splitter.createDocuments(
                [doc.content],
                [{ source: doc.source || doc.id, docId: doc.id }]
            );
            allDocChunks.push(...chunks)
        }
        this.docsCount += documents.length;

        // fromDocuments 内部会从 this.pool 取连接，用完自动归还，不需要手动 end()
        // fromDocuments 内部会调用this.embeddings.embedDocuments()，将文档内容转换为向量表示
        // 1. 首次调用时，会自动创建向量表结构（langchain_pg_collection 存储文档，langchain_pg_embedding 存储向量）
        // 2. 后续调用时，会自动把文档数据插入到 langchain_pg_collection 表, 向量数据插入到 langchain_pg_embedding 表
        // 3. 后续调用时，会自动根据向量表示进行相似度计算，返回最相似的文档
        await PGVectorStore.fromDocuments(
            allDocChunks,
            this.embeddings,
            this.vectorConfig,
        );
        return {
            success: true,
            totalChunks: allDocChunks.length,
            originalDocuments: documents.length,
            message: `加载了${documents.length}个文档，共${allDocChunks.length}个chunks`,
        }
    }
    async getStatus() {
        try {
            const result = await this.pool.query(
                `SELECT COUNT(*) FROM langchain_pg_embedding 
                WHERE collection_id = 
                    (SELECT uuid FROM langchain_pg_collection WHERE name = $1)`,
                [this.vectorConfig.collectionName]
            )
            console.log('status====', result)
            const chunksCount = result.rows[0]?.count
            return {
                mode: 'PGVectorStore',
                loaded: chunksCount > 0,
                chunksCount,
                collectionName: this.vectorConfig.collectionName,
                message: chunksCount > 0 ? `postgreSQL 向量库已加载 ${chunksCount} 个文档块`
                : `postgreSQL 为空，请加载文档后查询`,
            }
        } catch (errr) {
            return {
                mode: 'PGVectorStore',
                loaded: false,
                message: `获取数据库状态失败`,
            }
        }
    }
    async search(question: string, topK: number) {
        // 初始化向量存储
        // initialize() 从 this.pool 借一个连接，查完自动归还
        // ✅ 不需要也不应该调用 end()
        const vectorStore = await PGVectorStore.initialize(
            this.embeddings,
            this.vectorConfig,
        );
        // 执行相似度搜索
        const results = await vectorStore.similaritySearchWithScore(question, topK);
        // ❌ 删掉这行：await vectorStore.end()
        return {
            success: true,
            question,
            result: results.map(([item, score]) => ({
                document: item.pageContent,
                source: item.metadata?.source,
                // score 是余弦距离（越小越相关），转成相似度更直观
                similarity: parseFloat((1 - score).toFixed(4)), // 1 - score 是相似度，score 是距离度
                rawDistance: parseFloat(score.toFixed(4)), // score 是距离度，1 - score 是相似度
            }))
        }
    }
    async query(question: string, topK: number = 3) {
        console.log('query====', question, topK)
        const vectorStore = await PGVectorStore.initialize(this.embeddings, this.vectorConfig)
        const result = await vectorStore.similaritySearchWithScore(question, topK)

        // score 是距离，越小越相关
        // 过滤掉距离 > 0.5 的结果（相似度 < 0.5，基本不相关）
        const filteredResult = result.filter(([, score]) => score < 0.5)
        console.log('embed-result', filteredResult)
        console.log('embed-result', result)
        if (!filteredResult.length) {
            return {
                success: false,
                message: '未找到相关文档块'
            }
        }
        const context = filteredResult.map(([doc], index) => `[${index + 1}] ${doc.pageContent}`).join('\n\n')
        console.log('context==', context);
        const messages = ChatPromptTemplate.fromMessages([
            [
                'system',
                `你是一个专业的知识库问答助手，根据知识库回答问题。
                原则：
                1. 你只能根据上下文回答用户问题，不能用知识库之外的知识。
                2. 如果知识库返回‘未找到相关文档块’，则回答‘未找到相关内容’。
                3. 回答简洁，使用中文回答。
                知识库：${context}`
            ],
            ['human', '{question}']
        ])
        const chain = messages.pipe(this.llm).pipe(new StringOutputParser())
        const answer = await chain.invoke({ context, question })
        return {
            question,
            answer,
            content: result.map(([doc, score]) => ({
                content: doc.pageContent,
                source: doc.metadata?.source,
                score: parseFloat((1 - score).toFixed(4)),
            }))
        }
    }
    async clearKnowledge() {
        await this.pool.query(
            `DELETE FROM langchain_pg_embedding
            WHERE collection_id = 
                (SELECT uuid FROM langchain_pg_collection WHERE name = $1)`,
            [this.vectorConfig.collectionName]
        )
        await this.pool.query(
            `DELETE FROM langchain_pg_collection
            WHERE name = $1`,
            [this.vectorConfig.collectionName]
        )
        this.docsCount = 0
        return {
            success: true,
            message: `postgreSQL 向量库已清空`,
        }
    }

    // ✅ NestJS 应用退出时才真正关闭连接池
    async onModuleDestroy() {
        await this.pool.end()
        console.log('RagDbService：PostgreSQL 连接池已关闭')
    }
}
