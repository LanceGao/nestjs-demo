import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import 'dotenv/config.js'

@Injectable()
export class McpClientService implements OnModuleInit, OnModuleDestroy {
    private client: Client
    private transport: StdioClientTransport
    
    // ── 模块启动时连接 MCP Server ──────────────────────
    async onModuleInit() {
        // stdio 模式：NestJS 以子进程方式启动 MCP Server
        this.transport = new StdioClientTransport({
            command: 'tsx',
            args: ['src/mcp-server/server.ts'],
            // 把当前环境变量传给子进程（包含 DATABASE_URL 等）
            env: {...process.env} as Record<string, string>,
        })
        this.client = new Client(
            {name: 'nestjs-mcp-client', version: '1.0.0'},
            {capabilities: {}},
        )
        await this.client.connect(this.transport)
        console.log('✅ MCP Client 已连接到 MCP Server')
    }
    // ── 获取所有可用工具列表 ──────────────────────────
    async getToolList() {
        const response = await this.client.listTools()
        return response.tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema
        }))
    }
    // ── 应用退出时断开连接 ─────────────────────────────
    async onModuleDestroy() {
        await this.client.close()
        console.log('✅ MCP Client 已断开连接')
    }
}
