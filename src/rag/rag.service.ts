import { Injectable } from '@nestjs/common';
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import { Document } from '@langchain/core/documents';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { config } from '../config.js';

@Injectable()
export class RagService {
    // 对话模型：RAG 场景用低温度，让回答更严格
    private llm = new ChatOllama({
        model: config.ollama.chatModel,
        baseUrl: config.ollama.baseUrl,
        temperature: config.ollama.temperature,
        think: false,
        numPredict: 1024
    })
    // 向量化模型：把文本转成数字向量（用于相似度比较）
    private embedings = new OllamaEmbeddings({
        model: config.ollama.embedModel,
        baseUrl: config.ollama.baseUrl,
    })
    // 内存向量库（null 表示未初始化）
    private vectorStore: MemoryVectorStore | null = null;
    private docCount = 0;
    // ── 加载文档到向量库 ───────────────────────────────────
    async loadDocuments(documents: { id: string, source: string, content: string}[]) {
        // 文档分割器：把文档内容分割成多个 chunks
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 90,
            chunkOverlap: 40,
            separators: ['\n\n', '\n', '。', '！', '？', '，', ' ', ''],
        })
        const allDocs: Document[] = []
        // 从每个文档中提取 chunks 并添加到向量库
        for (const doc of documents) {
            // 从文档内容中提取 chunks
            // 每个 chunk 都包含文档来源和唯一标识（docId）
            // 这样可以方便后续的检索和分析
            const docs = await textSplitter.createDocuments(
                [doc.content],
                [{ source: doc.source || doc.id, docId: doc.id }]
            )
            allDocs.push(...docs)
        }
        // 初始化向量库
        // fromDocuments：批量向量化所有文档块，存入内存向量库
        // 内部调用 this.embeddings.embedDocuments(texts) 转成向量表示
        this.vectorStore = await MemoryVectorStore.fromDocuments(
            allDocs,
            this.embedings,
        )
        this.docCount = documents.length
        return {
            success: true,
            totalChunks: allDocs.length,
            documentsLength: documents.length,
            message: `加载${documents.length}篇文档，共${allDocs.length}个chunks`
        }
    }
    getStatus() {
        if (!this.vectorStore) {
            return {
                success: true,
                message: '向量库未初始化'
            }
        }
        return {
            success: true,
            documentsLength: this.docCount || 0,
            message: `向量库已初始化，共${this.docCount}个文档`
        }
    }
    // ── 纯向量检索（不过大模型，直接看检索结果） ───────────────────────────────────
    async search(question: string, topK: number = 3) {
        if (!this.vectorStore) {
            return {
                success: false,
                message: '向量库未初始化'
            }
        }
        // similaritySearchWithScore 内部流程：
        // 1. 把 question 向量化（调用 embeddings.embedQuery）
        // 2. 和向量库里所有文档向量计算余弦相似度
        // 3. 按相似度排序，返回前 topK 个文档
        const results = await this.vectorStore.similaritySearchWithScore(question, topK)
        return {
            success: true,
            question,
            result: results.map(([item, score]) => ({
                source: item.metadata.source,
                content: item.pageContent,
                score: score.toFixed(4), // 越高表示越相关（0-1）
            })),
            message: `找到${results.length}个相关文档`
        }
    }
    async searchFromVector(question: string, topK: number = 3) {
        if (!this.vectorStore) {
            return {
                success: false,
                message: '向量库未初始化'
            }
        }
        // Step 1：检索相关文档块
        const results = await this.vectorStore.similaritySearchWithScore(question, topK)
        if (!results.length) {
            return {
                success: false,
                message: '未找到相关文档'
            }
        }
        // Step 2：把检索结果拼成 context 字符串
        // [1] 第一块内容\n\n[2] 第二块内容...
        // 编号方便模型在回答时引用："根据[1]..."
        const context = results.map(([doc], index) => {`[${index + 1}] ${doc.pageContent}`}).join('\n\n')
        // Step 3：RAG Prompt，严格限制模型只能用参考资料回答
        const prompt = ChatPromptTemplate.fromMessages([
            [
                'system',
                `你是知识库问答助手，严格基于参考资料回答。
                规则：
                1. 只根据参考资料内容回答，不能使用资料外的知识
                2. 资料中没有相关信息，回答"知识库中暂无相关内容"
                3. 回答简洁准确，使用中文

                参考资料：
                {context}`,
            ],
            ['human', '{question}'],
        ])
        // Step 4：调用模型生成回答
        const chain = prompt.pipe(this.llm).pipe(new StringOutputParser())
        const answer = await chain.invoke({context, question})
        return {
            question,
            answer,
            sources: results.map(([doc, score]) => (
                {
                    content: doc.pageContent,
                    source: doc.metadata.source,
                    score: score.toFixed(4)
                }
            )),
        }
    }
    clear() {
        this.vectorStore = null
        this.docCount = 0
        return {
            success: true,
            message: '向量库已清空'
        }
    }
}
