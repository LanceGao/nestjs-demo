import { Injectable } from '@nestjs/common';
import { ChatOllama } from '@langchain/ollama';
import { config } from '../config.js';
import { ChatPromptTemplate, PromptTemplate, FewShotPromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'


@Injectable()
export class PromptsService {
    private llm = new ChatOllama({
        baseUrl: config.ollama.baseUrl,
        model: config.ollama.chatModel,
        temperature: config.ollama.temperature,
        numPredict: 512,
        think: false
    })
    // ── ChatPromptTemplate：多消息对话模板（最常用）─────────
    // fromMessages 接收 [role, content] 数组
    // role 可以是 'system' | 'human' | 'ai'
    // content 里的 {变量名} 是占位符，invoke 时替换
    async translate(message: string, targetLang: string) {
        const prompt = ChatPromptTemplate.fromMessages([
            ['system', '你是一个专业的翻译，只能翻译文本，不能解释或添加任何额外的内容。'],
            ['human', '请将以下文本{message}翻译成 {targetLang}']
        ])
        // pipe 把 prompt、llm、parser 串联
        // prompt.invoke({ text, targetLang }) → 格式化后的消息数组
        // llm.invoke(消息数组) → AIMessage
        // parser.invoke(AIMessage) → 纯字符串
        const chain = prompt.pipe(this.llm).pipe(new StringOutputParser())
        const answer = await chain.invoke({ message, targetLang })
        return {
            original: message,
            targetLang,
            translated: answer
        }
    }
    // ── PromptTemplate：单消息简单模板──────────────────────
    // 比 ChatPromptTemplate 简单，只有一条 human 消息
    async summarize(message: string, maxWords: number) {
        const prompt = PromptTemplate.fromTemplate('用不超过{maxWords}个字总结以下内容，只输出总结：\n\n{text}')
        const chain = prompt.pipe(this.llm).pipe(new StringOutputParser())
        const answer = await chain.invoke({ text: message, maxWords })
        return {
            original: message,
            maxWords,
            summarized: answer
        }
    }
    // ── FewShotPromptTemplate：少样本学习模板───────────────
    // 给模型几个示例，让它学会输出格式
    // 适合需要严格控制输出格式的分类、提取任务
    async classify(message: string) {
        const examples = [{
            input: '今天天气真好，我们去打篮球吧',
            output: '积极'
        }, {
            input: '这次订的餐厅环境太差了，下次不来了',
            output: '消极'
        }, {
            input: '我需要一个关于天气的建议',
            output: '中性'
        }]
        // 格式化示例
        const examplePrompt = PromptTemplate.fromTemplate('输入：{input}\n输出：{output}')
        // 格式化输入
        const fewShotPrompt = new FewShotPromptTemplate({
            examples, // 样本示例数组
            examplePrompt, // 格式化示例的模板
            prefix: '请根据以下示例，判断以下文本的类别：', // 输入占位符，用于格式化输入
            suffix: '输入：{input}，输出：', // 输出占位符，用于格式化输出
            inputVariables: ['input'], // 输入变量，用于格式化输入
        })
        const formattedPrompt = await fewShotPrompt.format({ input: message })
        const res = await this.llm.invoke(formattedPrompt)
        return {
            message,
            category: String(res.content).trim()
        }
    }
    // ── 代码审查：复杂 System Prompt 示例──────────────────
    async codeReview(code: string, lang: string) {
        const prompt = ChatPromptTemplate.fromMessages([
            ['system', '你是一个资深的{lang}代码审查员，负责代码审核：\n 审查维度：潜在bug/代码规范/代码性能/改进建议；\n 改进建议：'],
            ['human', '请审查以下代码{code}，输出审查结果：']
        ])
        const chain = prompt.pipe(this.llm).pipe(new StringOutputParser())
        const res = await chain.invoke({ code, lang })
        return {
            code,
            lang,
            review: res
        }
    }
}
