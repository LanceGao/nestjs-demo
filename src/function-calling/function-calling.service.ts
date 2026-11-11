import { Injectable } from '@nestjs/common';
import { tool } from '@langchain/core/tools'
import { HumanMessage, ToolMessage } from '@langchain/core/messages'
import { ChatOllama } from '@langchain/ollama'
import { config } from '../config.js'
import { z } from 'zod'

@Injectable()
export class FunctionCallingService {
    private llm = new ChatOllama({
        model: config.ollama.chatModel,
        baseUrl: config.ollama.baseUrl,
        temperature: config.ollama.temperature,
        think: false,
        numPredict: 1024
    })

    private checkProduct = tool(
        (productName: string) => {
            const products: Record<string, { name: string , stoke: number, price: number }> = {
                'iPhone 18': {
                    name: 'Phone 18',
                    stoke: 100,
                    price: 7900
                },
                'iPhone 18 Pro': {
                    name: 'Phone 18 Pro',
                    stoke: 200,
                    price: 8100
                },
                'Macbook Pro': {
                    name: 'Macbook Pro',
                    stoke: 13,
                    price: 13900
                }
            }
            const product = products[productName]
            if (!product) {
                return {
                    message: `产品 ${productName} 不存在, 请检查产品名称`,
                    success: true
                }
            }
            return {
                message: `查询到产品 ${productName}，当前库存：${product.stoke}，单价：${product.price}`,
                success: true
            }
        },
        {
            name: 'check_product',
            description: 'Check the product of the user',
            schema: z.object({
                product: z.string().describe('查询的产品名称')
            })
        }
    )
    private createOrder = tool(
        ({ productName, quantity, consumerName }: { productName: string, quantity: number, consumerName: string }) => {
            const orderId = `ORD-${Date.now()}.slice(-6)`
            return {
                message: `创建订单成功！订单号：${orderId}， 顾客名称：${consumerName}， ${productName} ${quantity} 个`,
                success: true
            }
        },
        {
            name: 'create_order',
            description: '为顾客创建订单',
            schema: z.object({
                productName: z.string().describe('产品名称'),
                quantity: z.number().describe('购买数量'),
                consumerName: z.string().describe('顾客名称')
            })
        }
    )
    async runFuncCalling(message: string) {
        const tools = [this.checkProduct, this.createOrder]
        const toolMap: any = {
            check_product: this.checkProduct,
            create_order: this.createOrder
        }
        const llmWithTools = this.llm.bindTools(tools)
        const messages: any[] = [new HumanMessage(message)]
        const toolCallLog: any[]  = []

        for (let round = 0; round < 3; round++) {
            const res = await llmWithTools.invoke(messages)
            messages.push(res)

            if (!(res.tool_calls?.length)) break
            for (const toolCall of res.tool_calls) {
                const toolFn = toolMap[toolCall.name]
                if (!toolFn) continue
                const toolCallResult = await toolFn.invoke(toolCall.args)
                toolCallLog.push({
                    tool: toolCall.name,
                    args: toolCall.args,
                    result: JSON.parse(toolCallResult)
                })
                messages.push(new ToolMessage({ content: toolCallResult, tool_call_id: toolCall.id || ''}))
                
            }
        }

    
    }
}
