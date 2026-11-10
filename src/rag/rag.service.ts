import { Injectable } from '@nestjs/common';
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';
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
        temperature: config.ollama.temperature
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
            chunkSize: 80,
            chunkOverlap: 20,
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
        this.docCount = allDocs.length
        return {
            success: true,
            docCount: this.docCount,
            documents: documents.length,
            message: `加载${documents.length} 篇文档，共 ${this.docCount} 个chunks`
        }
    }
}
