import { Injectable, OnModuleInit } from '@nestjs/common';
import { HumanMessage } from '@langchain/core/messages';
import { Annotation, StateGraph, START, END } from '@langchain/langgraph';
import { ChatOllama } from '@langchain/ollama';
import { config } from '../config.js'

const Category = Annotation.Root({
    userInput: Annotation<string>(),
    category: Annotation<string>(),
    response: Annotation<string>()
})

@Injectable()
export class RoutingService implements OnModuleInit {

    private graph: any
    onModuleInit() {
        const llm = new ChatOllama({
            model: config.ollama.chatModel,
            baseUrl: config.ollama.baseUrl,
            temperature: config.ollama.temperature,
            think: false,
            numPredict: 512
        })

        const classify = async (state: typeof Category.State) => {
            const messages = [
                new HumanMessage(`
                    根据用户的问题进行分类，只输出分类名称，不输出其他内容。
                    分类如下：
                    technical -> 技术问题
                    pricing -> 定价问题
                    other -> 其他问题
                    用户问题：${state.userInput}
                    `)
            ]
            const response = await llm.invoke(messages)

            const categoryList = ['technical', 'pricing', 'other']
            const category = (response.content as string).trim().toLowerCase()
            console.log('response', category)
            return {category: categoryList.includes(category) ? category : 'other'}
        }

        const routeByCategory = (state: typeof Category.State) => {
            return state.category
        }

        const makeHandle = (prompt: string) => 
            async (state: typeof Category.State) => {
                const messages = [
                    new HumanMessage(`${prompt}, \n\n用户的问题：${state.userInput}`)
                ]
                console.log('messages', messages)
                const res = await llm.invoke(messages)
                console.log('response-handle', res)
                return {response: res.content}
            }
        

        this.graph = new StateGraph(Category)
            .addNode('classify', classify)
            .addNode('technical', makeHandle('你是一位技术问题的助手，帮助处理技术问题'))
            .addNode('pricing', makeHandle('你是一位商务专员，帮助处理定价、费用相关问题'))
            .addNode('other', makeHandle('你是一位其他问题的助手，帮助处理其他问题'))
            .addEdge(START, 'classify')
            .addConditionalEdges(
                'classify',
                routeByCategory,
                {
                    technical: 'technical',
                    pricing: 'pricing',
                    other: 'other'
                }
            )
            .addEdge('technical', END)
            .addEdge('pricing', END)
            .addEdge('other', END)
            .compile()
    }
    async routing(message: string) {
        const res = await this.graph.invoke({userInput: message})
        console.log('res', res)
        return {
            input: res.userInput,
            category: res.category,
            response: res.response
        }
    }
}
