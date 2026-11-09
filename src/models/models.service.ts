import { Injectable } from '@nestjs/common';
import { config } from '../config.js';
import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';
import type { Response } from 'express';

@Injectable()
export class ModelsService {
    // 创建 ChatOllama 实例
    // 整个 Service 共用一个实例（NestJS Service 默认单例）
    private llm = new ChatOllama({
        baseUrl: config.ollama.baseUrl,
        model: config.ollama.chatModel,
        // 温度参数（0~1）
        // 0   = 最保守，每次输出几乎相同，适合问答/代码
        // 0.33 = 稍有变化，适合大多数场景
        // 0.7 = 较有创意，适合写作
        // 1.0 = 最随机，适合头脑风暴
        temperature: config.ollama.temperature,
        think: false, // 关闭思考模式，直接返回回答
        numPredict: 512, // 最大预测长度，默认 2048
        // 建议：根据模型能力调整，避免超出最大长度
    })
    // ── 方式一：基础调用（等待完整回答）────────────────────
    // invoke 发送消息数组，等模型生成完整回答后一次性返回
    // 适合：普通问答，不需要流式效果
    async baseChat(message: string) {
        const response = await this.llm.invoke([
            new HumanMessage(message)
        ]);
        // response 是 AIMessage 对象
        // response.content → 模型回答的文字
        // response.usage_metadata → token 消耗统计
        console.log('basechat-res', response)
        return {
            question: message,
            answer: response.content,
            usage: response.usage_metadata,
        }
    }
    // ── 方式二：带 System Prompt ────────────────────────────
    // SystemMessage 设定模型角色，必须放在消息数组第一位
    async chatSystem(system: string, message: string) {
      const response = await this.llm.invoke([
        new SystemMessage(system),  // 角色设定
        new HumanMessage(message),  // 用户问题
      ])
      return {
        system,
        question: message,
        answer: response.content,
        usage: response.usage_metadata,
      }
    }
    // ── 方式三：SSE 流式输出 ────────────────────────────────
    // stream 返回 AsyncGenerator，每次 yield 一个文字片段（chunk）
    // 适合：需要逐字显示的场景（像 ChatGPT 那样打字效果）
    async chatStream(message: string, res: Response) {
      // 设置 SSE 响应头，告诉浏览器这是事件流
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.setHeader('Access-Control-Allow-Origin', '*')

      const stream = await this.llm.stream([
        new HumanMessage(message),
      ])

      // 逐个 chunk 推送给客户端
      // SSE 格式固定：data: JSON字符串\n\n
      for await (const chunk of stream) {
        if (chunk.content) {
          res.write(`data: ${JSON.stringify({ text: chunk.content })}\n\n`)
        }
      }

      // 发送结束标记，前端据此判断流结束
      res.write('data: [DONE]\n\n')
      res.end()
    }
    // ── 方式四：pipe 链（StringOutputParser）───────────────
    // pipe 把多个组件串联成链，输出类型从 AIMessage 变成 string
    async chatParser(message: string) {
        // 使用 StringOutputParser 解析模型回答为字符串
        // 适合：模型回答是简单的文本，不需要复杂解析
        // 例如："你好，我是 Lance"
        // 注意：如果模型回答包含 JSON 格式，需要使用 JSONOutputParser
        const chain = this.llm.pipe(new StringOutputParser())
        // chain.invoke(message) 发送消息数组，等模型生成完整回答后一次性返回
        // chain.invoke(message) 返回字符串，无需解析
        const answer = await chain.invoke(message)
        console.log('parser-res', message, answer)
        return {  
            question: message,
            answer,
        }
    }
}
