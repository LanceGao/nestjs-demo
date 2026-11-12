import { Injectable } from '@nestjs/common';
import { ChatOllama } from '@langchain/ollama';
import type { Response } from 'express';
import { BaseMessage, HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { config } from '../config.js';

@Injectable()
export class MemoryService {
    private llm = new ChatOllama({
        model: config.ollama.chatModel,
        baseUrl: config.ollama.baseUrl,
        temperature: 0.3,
        think: false,
        numPredict: 512
    })

    // 会话存储：sessionId → 消息历史数组
    // NestJS Service 是单例，Map 在整个应用生命周期内存在
    private sessions = new Map<string, BaseMessage[]>()
    private systemMessage = new SystemMessage('你是一个智能助手，可以记住对话历史，根据上下文准确回答')

    // 统一：统计用户实际提问次数（不含 SystemMessage）
    private countUserTurns(history: BaseMessage[]) {
        return history.filter(m => m instanceof HumanMessage).length
    }
    private getOrCreateSession(sessionId: string) {
        if (!(this.sessions.has(sessionId))) {
            // 新会话：初始化时加入 SystemMessage
            this.sessions.set(sessionId, [this.systemMessage])
        }
        return this.sessions.get(sessionId)
    }
    // ── 多轮对话（REST 版本）──────────────────────────────
    async chat(message: string, sessionId: string) {
       const history = this.getOrCreateSession(sessionId) || []
       // 把用户新消息加入历史
       history.push(new HumanMessage(message))
       // 把完整历史发给模型（包含 System + 所有历史 + 本次消息）
      // 模型看到完整上下文，能理解之前说了什么
       const res = await this.llm.invoke(history)
       // 把模型回复也加入历史，下次对话继续携带
       history.push(res)
       console.log('history', history)
       return {
            message,
            sessionId,
            answer: res.content,
            turns: this.countUserTurns(history)
        }
    }
    async getSessionHistory(sessionId: string) {
        const history = this.sessions.get(sessionId)
        if (!history) {
            return { sessionId, exist: false, historyMessages: [] }
        }
        const messages = history.filter(m => !(m instanceof SystemMessage)).map((m,i) => ({
            index: i + 1,
            role: m instanceof HumanMessage ? 'user' : 'assistant',
            content: m.content
        }))
        return {
            sessionId,
            exist: true,
            turns: this.countUserTurns(history), // 用户提问次数
            historyMessages: messages
        }
    }
    deleteSessionHistory(sessionId: string) {
        const history = this.sessions.get(sessionId)
        if (!history) {
            return { sessionId, cleared: false, message: '会话不存在' }
        }
        this.sessions.set(sessionId, [this.systemMessage])
        return { sessionId, cleared: true, message: '会话历史已删除' }
    }
    getSessionList() {
        const sessions = Array.from(this.sessions.entries()).map(([sessionId, history]) => ({
            sessionId,
            turns: this.countUserTurns(history)
        }))
        return {
            sessions,
            total: sessions.length
        }
    }
    async chatStream(message: string, sessionId: string, res: Response) {
        res.setHeader("Content-Type", "text/event-stream")
        res.setHeader("Access-Control-Allow-Origin", "*")
        res.setHeader("connection", "keep-alive")
        res.setHeader("cache-control", "no-cache")
        
        const history = this.getOrCreateSession(sessionId) || []
        history.push(new HumanMessage(message))
        const stream = await this.llm.stream(history)
        let fullAnswer = ''
        for await (const chunk of stream) {
            if (chunk.content) {
                const text = String(chunk.content)
                fullAnswer += text
                res.write(`data: ${JSON.stringify({text, turns: this.countUserTurns(history)})}\n\n`)
            }
        }
        history.push(new AIMessage(fullAnswer))
        res.write(`data: ${JSON.stringify({text: 'done', turns: this.countUserTurns(history)})}\n\n`)
        res.end()
    }
}
