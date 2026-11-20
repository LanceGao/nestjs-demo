import { Injectable, OnModuleInit } from '@nestjs/common';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StateGraph, MessagesAnnotation, START, END, MemorySaver } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { ChatOllama } from '@langchain/ollama';
import { config } from '../config.js';

const calculateTool = tool(
    ({expression}: {expression: string}) => {
        try {
            const res = Function(`'use strict';return ${expression}`)()
            return `计算结果：${expression} = ${res}`
        } catch(err: any) {
            return `计算表达式失败： ${err.message}`
        }
    },
    {
        name: 'calculate',
        description: '用于计算数学表达式的工具',
        schema: z.object({
            expression: z.string().describe('要计算的数学表达式'),
        })
    }
)
const getWeather = tool(
    ({location}) => {
        const weatherMap: Record<string, string> = {
            '北京': '晴朗, 温度22摄氏度',
            '上海': '阴, 温度20摄氏度',
            '广州': '雨, 温度34摄氏度',
        }
        return `天气：${weatherMap[location] || '未知'}`
    },
    {
        name: 'getWeather',
        description: '用于获取指定城市的天气',
        schema: z.object({
            location: z.string().describe('要获取天气的城市'),
        })
    }
)
const tools = [calculateTool, getWeather]

@Injectable()
export class ReactAgentService implements OnModuleInit {
    // 1 定义工具方法-》 bindtools到llm -> toolNode  -> 定义路由函数 
    // 2 流程图
    // 方法实现
    
    private graph: any
    async onModuleInit() {
        // 初始化 对话模型
        const llm = new ChatOllama({
            baseUrl: config.ollama.baseUrl,
            model: config.ollama.chatModel,
            temperature: config.ollama.temperature,
            think: false,
            numPredict: 512
        })
        // bindTools： 把工具的name/description/schema 绑定到模型上，使模型知道可以调用哪些工具，以及如何调用这些工具
        const llmWithTools = llm.bindTools(tools)
        // ToolNode: 封装执行llm 返回的 tool_calls的逻辑，自动调用对应的工具，获取结果，并把结果返给llm继续推理
        const toolNode = new ToolNode(tools)

        const callModel = async (state: typeof MessagesAnnotation.State) => {
            const messages = [
                new SystemMessage(`你是一个智能助手, 可以使用以下工具来解决问题。工具如下：
                        -getWeather 获取指定城市的天气
                        -calculate 用于计算数学表达式的工具
                        根据问题决定是否调用工具。
                    `),
                    ...state.messages
            ]
            const res = await llmWithTools.invoke(messages)
            return {messages: [res]}
        }

        const shouldContinue = (state: typeof MessagesAnnotation.State) => {
            const lastMsg = state.messages.at(-1) as AIMessage
            console.log('lastmsg', lastMsg)
            // 如果模型返回了 tool_calls，说明需要继续调用工具，否则结束对话
            return lastMsg.tool_calls?.length ? 'tools' : 'end'
        }
        
        // 构建图 START->callModel->shouldContinue->tools / End
        // 工具调用后，根据是否调用其他工具，继续调用callModel，直到没有工具调用
        this.graph = new StateGraph(MessagesAnnotation)
            .addNode('callModel', callModel)
            .addNode('tools', toolNode)
            .addEdge(START, 'callModel')
            .addConditionalEdges(
                'callModel',
                shouldContinue,
                {
                    tools: 'tools',
                    end: END
                }
            )
            .addEdge('tools', 'callModel') // 工具调用后，继续调用模型，形成循环
            .compile({checkpointer: new MemorySaver()})
    }
    async reactAgent(message: string, threadId: string) {
        const res = await this.graph.invoke(
            {messages: new HumanMessage(message)},
            {
                configurable: { thread_id: threadId },
                recursiveLimit: 10
            }
        )
        return res.messages.at(-1).content
    }
        
}
