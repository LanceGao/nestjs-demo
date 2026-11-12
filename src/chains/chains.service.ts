import { Injectable } from '@nestjs/common';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence, RunnablePassthrough } from '@langchain/core/runnables';
import { ChatOllama } from '@langchain/ollama';
import { config } from '../config.js';

@Injectable()
export class ChainsService {
    private llm = new ChatOllama({
        model: config.ollama.chatModel,
        baseUrl: config.ollama.baseUrl,
        temperature: 0.5,
        numPredict: 512,
        think: false,
    })
    // ── 多步骤链：文章润色（分析问题 → 润色文章）──────────
    // RunnableSequence：把多个步骤组合成顺序链
    // RunnablePassthrough：透传输入值（用于在分叉步骤保留原始输入）
    async polish(article: string) {
        const analysisPrompt = ChatPromptTemplate.fromMessages([
            ['system', '你是一个专业的文章分析助手，不要直接编辑文章，而是输出文章的分析结果'],
            ['human', '请对以下文章进行分析：{article}'],
        ])
        const polishPrompt = ChatPromptTemplate.fromMessages([
            ['system', '你是一个专业的文章润色助手，根据文章的分析结果，对文章进行润色，保持文章原意'],
            ['human', '原文：{article}, \n 分析结果：{analysis},\n输出润色后的文章：'],
        ])
        // 第一条链：article字符串 → 分析 → analysis字符串
        const analysisChain = analysisPrompt.pipe(this.llm).pipe(new StringOutputParser())
        // 第二条链：article字符串 → 分析结果 → 润色文章
        const polishChain = polishPrompt.pipe(this.llm).pipe(new StringOutputParser())
        // RunnableSequence：分两步执行
        // 步骤1：同时保留 article 原文 + 调用 analyzeChain 得到 analysis
        // 步骤2：把 { article, analysis } 传给 polishChain 润色
        const fullChain = RunnableSequence.from([{ article: new RunnablePassthrough(), analysis: analysisChain }, polishChain])
        const res = await fullChain.invoke({ article })
        return {
            original: article,
            polished: res
        }
    }
    // ── 顺序链：博客生成（关键词→大纲→文章→SEO标题）──────
    async generateBlog(keyWord: string, style: string) {
        // 三条独立链，顺序执行，上一步输出传给下一步
        const outlinPrompt = ChatPromptTemplate.fromMessages([
            ['system', '你是一个专业的博客文章助手，根据关键词和风格，生成博客大纲'],
            ['human', '根据关键词：{keyword}, 风格：{style}, 生成一篇博客大纲'],
        ]).pipe(this.llm).pipe(new StringOutputParser())
        const articlePrompt = ChatPromptTemplate.fromMessages([
            ['system', '你是一个专业的博客文章助手，根据博客大纲，生成博客文章'],
            ['human', '根据博客大纲：{outline}, 生成一篇博客文章'],
        ]).pipe(this.llm).pipe(new StringOutputParser())
        const seoTitlePrompt = ChatPromptTemplate.fromMessages([
            ['system', '你是一个专业的博客文章助手，根据博客文章，生成博客的SEO标题'],
            ['human', '根据博客文章：{article}, 生成一篇博客的SEO标题'],
        ]).pipe(this.llm).pipe(new StringOutputParser())
        const outline = await outlinPrompt.invoke({ keyword: keyWord, style })
        const article = await articlePrompt.invoke({ outline })
        const seoTitle = await seoTitlePrompt.invoke({ article })
        return {
            keyword: keyWord,
            style,
            outline,
            article,
            seoTitle,
        }
    }
    // ── 条件分支链：客服路由（分类 → 路由到不同处理链）────
    async smartRouter(question: string) {
        // 、分析用户问题，分类问题
        const prompt = ChatPromptTemplate.fromMessages([
            ['system', `分析用户的问题，只输出以下问题的分类:
                技术问题 -> TECH
                订单问题 -> ORDER
                退款问题 -> REFUND
                投诉建议 -> SUGGESTION
                其他问题 -> OTHER
            `],
            ['human', '用户问题：{question}'],
        ]).pipe(this.llm).pipe(new StringOutputParser())
        const category = await prompt.invoke({ question })
        console.log('prompt', category)
        // 、根据分类，路由到不同的处理链
        const categoryMap: Record<string, string> = {
            'TECH': '你是一个专业的技术支持助手，给用户具体的解决步骤',
            'ORDER': '你是一个专业的订单问题助手，帮助用户解决订单问题',
            'REFUND': '你是一个专业的退款问题助手，引导用户完成退款流程',
            'SUGGESTION': '你是一个专业的投诉建议助手，引导用户提交投诉建议问题',
            'OTHER': '你是一个通用的客服助手，友好回答用户的各类问题',
        }
        const categorySystem = categoryMap[category] || categoryMap['OTHER']
        console.log('category', category, categorySystem)
        // 、根据分类，调用不同的处理链
        const questionPrompt = ChatPromptTemplate.fromMessages([
            ['system', categorySystem],
            ['human', '用户问题：{question}'],
        ]).pipe(this.llm).pipe(new StringOutputParser())
        const res = await questionPrompt.invoke({ question })
        return {
            question,
            category,
            res,
        }
    }
}
