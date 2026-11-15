import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { SystemMessage, HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages'
import { MultiServerMCPClient } from '@langchain/mcp-adapters'
import { ChatOllama } from '@langchain/ollama';
import { config } from '../config.js'

@Injectable()
export class McpAgentService implements OnModuleInit, OnModuleDestroy {
    private llm = new ChatOllama({
        model: config.ollama.chatModel,
        baseUrl: config.ollama.baseUrl,
        temperature: 0.1,
        think: false,
        numPredict: 1024
    })
    // MultiServerMCPClient 用于连接多个 MCP 服务器
    private mcpClient: MultiServerMCPClient;
    // 从 MCP 转换来的 LangChain Tools
    private mcpTools: any[] = []

    // 初始化 MCP Agent
    async onModuleInit() {
        this.mcpClient = new MultiServerMCPClient({
           // 关闭「服务器名_工具名」前缀，保持与 MCP Server 注册名一致
           prefixToolNameWithServerName: false,
           servers: {
            // 连接本地 MCP 服务器
             'local-tools': {
                transport: 'stdio', // 通过标准输入输出传输
                command: 'tsx', // 使用 TypeScript 运行 MCP 服务器
                args: ['src/mcp-server/server.ts'], // MCP 服务器脚本路径
                env: {...process.env} as Record<string, string>, // 继承当前环境变量
             },
            // 也可以连接社区现成的 MCP Server（举例，需要单独安装）
            // 'filesystem': {
            //   transport: 'stdio',
            //   command: 'npx',
            //   args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
            // },
           }
        })
        // 把所有 MCP Server 的工具转成 LangChain Tools 格式
        // 之后就可以像普通 LangChain Tool 一样使用
        this.mcpTools = await this.mcpClient.listTools()
        console.log(`✅ MCP Agent 已加载 ${this.mcpTools.length} 个工具：`)
    }

    // ── 只获取工具列表（不执行）──────────────────────
    async getTools() {
        const response = this.mcpTools.map(tool => ({
            name: tool.name,
            description: tool.description,
            args: tool.schema
        }))
        return response
    }

    // ── Agent 执行（LLM 自主决策调用 MCP 工具）─────────
    async runAgent(message: string) {
        if (!this.mcpTools.length) {
            return {error: 'MCP 工具未初始化，请稍后重试'}
        }
        const llmWithTools = this.llm.bindTools(this.mcpTools)
        const toolMap = Object.fromEntries(this.mcpTools.map(t => [t.name, t]))
        console.log('mapmap', toolMap)
        const messages: any[] = [
            new SystemMessage(
                `你是一个智能助手，可以使用以下工具帮助用户：
                - query_users：查询用户数据库
                - read_file：读取项目文件
                - write_file：写入文件
                - get_weather：查询城市天气

                根据用户的问题，选择合适的工具获取信息后回答。用中文回答。`
            ),
            new HumanMessage(message)
        ]
        const steps: string[] = []
        let roundCount = 0

        while(roundCount < 6) {
            roundCount++
            const response = await llmWithTools.invoke(messages)
            messages.push(response)
            if (!response.tool_calls?.length) {
                steps.push(`最终回答：${response.content}`)
                break;
            }
            for (const toolCall of response.tool_calls) {
                const tool = toolMap[toolCall.name]
                if (!tool) {
                    steps.push(`工具 ${toolCall.name} 不存在`)
                    continue;
                }
                steps.push(`调用工具 ${toolCall.name}，参数：${toolCall.args}`)
                const result = await tool.invoke(toolCall.args)
                steps.push(`工具 ${toolCall.name} 执行结果：${result}`)
                messages.push(new ToolMessage({
                    content: JSON.stringify(result),
                    tool_call_id: toolCall.id ?? '',
                }))
            }
        }
        const lastMessage = [...messages].reverse().find(m => m instanceof AIMessage)
        return {
            message,
            roundCount,
            steps,
            result: lastMessage?.content ?? '抱歉，无法完成请求'
        }
    }



       async onModuleDestroy() {
        await this.mcpClient.close()
        console.log('✅ MCP Agent 已断开连接')
    }
}
