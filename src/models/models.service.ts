import { Injectable } from '@nestjs/common';
import { config } from '../config.js';
import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

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
    async chatSystem(system: string, message: string) {
        const response = await this.llm.invoke([
            new SystemMessage(system),
            new HumanMessage(message)
        ])
        console.log('chat-system-res', response)
        return {
            system,
            message,
            answer: response.content,
            usage: response.usage_metadata,
        }
    } 
}
