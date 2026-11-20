import { Injectable, OnModuleInit } from '@nestjs/common';
import { HumanMessage } from '@langchain/core/messages';
import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { ChatOllama } from '@langchain/ollama';
import { config } from '../config.js';

const ArticleState = Annotation.Root({
    // 输入 文章 各节点只读
    article: Annotation<string>(),
    // 关键字列表 extractKeyWords 节点输出, genSummary 节点输入 供后续节点使用
    keyWords: Annotation<string[]>({
        reducer: (prev, cur) => [...prev, ...cur],
        default: () => []
    }),
    // 最终摘要 genSummary 输出，供最终节点输出
    summary: Annotation<string>(),
    // 日志，记录每个节点的耗时
       log: Annotation<string[]>({
        reducer: (prev, cur) => [...prev, ...cur],
        default: () => []
    })
})

@Injectable()
export class ArticleService implements OnModuleInit {
    private graph: any
    async onModuleInit() {
        const llm = new ChatOllama({
            model:         config.ollama.chatModel,
            baseUrl:       config.ollama.baseUrl,
            temperature:   config.ollama.temperature,
            think: false,
            numPredict: 1024
        })

        // 节点1 提取关键词
        const extractKeyWords = async (state: typeof ArticleState.State) => {
            const t0 = Date.now()
            const response = await llm.invoke([
                new HumanMessage(`你是专业的 AI 助手，请根据文章内容： ${state.article}提取关键词，关键词之间用逗号隔开，提取4-7个关键词`)
            ])
            console.log('keyWords', response)
            const keyWords = (response.content as string).split(',').map((m: any) => m.trim()).filter(Boolean)
            return { keyWords, log: [`提取关键词耗时：${Date.now() - t0}ms`] }
        }

        // 节点2 生成摘要
        const genSummary = async (state: typeof ArticleState.State) => {
            const t0 = Date.now()
            const response = await llm.invoke([
                new HumanMessage(`你是专业的 AI 助手，请根据文章内容： ${state.article}提取关键词${state.keyWords.join(',')}，生成摘要，摘要长度为200字以下`)
            ])
            const summary = (response.content as string).trim()
            return { summary, log: [`生成摘要耗时：${Date.now() - t0}ms`] }
        }

        this.graph = new StateGraph(ArticleState)
            .addNode('extractKeyWords', extractKeyWords)
            .addNode('genSummary', genSummary)
            .addEdge(START, 'extractKeyWords')
            .addEdge('extractKeyWords', 'genSummary')
            .addEdge('genSummary', END)
            .compile()
    }
    async genArticleSummary(article: string) {
        console.log(article)
        const res = await this.graph.invoke({ article })
        return {
            keyWords: res.keyWords,
            summary: res.summary,
            log: res.log
        }
    }
}