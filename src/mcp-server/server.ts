// src/mcp-server/server.ts
// 适配 @modelcontextprotocol/sdk 1.29.0
// 变更：server.tool() → server.registerTool()

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

import { handleDatabaseQuery } from './tools/database.tool.js'
import { handleFileOperation } from './tools/file.tool.js'
import { handleWeatherQuery } from './tools/weather.tool.js'

// 初始化 MCP Server
const server = new McpServer({
  name: 'nestjs-demo-mcp-server',
  version: '1.0.0',
})

// ── 工具一：数据库查询 ─────────────────────────────────────
// registerTool(名称, 元数据, 处理函数)：把工具注册进 MCP Server 的能力清单，
// 客户端 listTools 能看到它，callTool / LLM 则按名称调用它
server.registerTool(
  // ① 工具名：全局唯一标识，LLM 通过它发起调用，改名需同步修改调用方
  'query_users',
  {
    // ② 描述：会展示给 LLM，用来判断"什么场景该选这个工具"
    description: '查询用户列表，支持按姓名模糊搜索和角色过滤。返回用户 ID、姓名、邮箱、角色。',
    // ③ 入参定义：zod schema 会被转成 JSON Schema 暴露给客户端，并用于参数校验
    inputSchema: {
      name:  z.string().optional().describe('按姓名模糊搜索，可选'),
      role:  z.enum(['admin', 'user']).optional().describe('按角色过滤，可选'),
      limit: z.number().optional().describe('返回条数限制，默认 5，最大 20'),
    },
  },
  // ④ 处理函数：真正执行逻辑，必须返回 MCP 的 CallToolResult（content 数组，可选 isError）
  async (args) => {
    try {
      const result = await handleDatabaseQuery(args)
      // 'text' as const 把字符串收窄成字面量类型，才能匹配 MCP 的联合类型
      return { content: [{ type: 'text' as const, text: result }] }
    } catch (error: any) {
      // 异常不向上抛，转成 isError 结果回传给客户端，由 LLM 决定如何向用户解释
      return {
        content: [{ type: 'text' as const, text: `工具执行失败：${error.message}` }],
        isError: true,
      }
    }
  },
)

// ── 工具二：读取文件 ──────────────────────────────────────
server.registerTool(
  'read_file',
  {
    description: '读取指定路径的文件内容，只能读取项目目录下的文件。',
    inputSchema: {
      path: z.string().describe('文件相对路径，例如：README.md、src/config.ts'),
    },
  },
  async (args) => {
    try {
      const result = await handleFileOperation('read', args)
      return { content: [{ type: 'text' as const, text: result }] }
    } catch (error: any) {
      return {
        content: [{ type: 'text' as const, text: `工具执行失败：${error.message}` }],
        isError: true,
      }
    }
  },
)

// ── 工具三：写入文件 ──────────────────────────────────────
server.registerTool(
  'write_file',
  {
    description: '向指定文件写入内容（追加模式）。',
    inputSchema: {
      path:    z.string().describe('文件相对路径'),
      content: z.string().describe('要写入的内容'),
    },
  },
  async (args) => {
    try {
      const result = await handleFileOperation('write', args)
      return { content: [{ type: 'text' as const, text: result }] }
    } catch (error: any) {
      return {
        content: [{ type: 'text' as const, text: `工具执行失败：${error.message}` }],
        isError: true,
      }
    }
  },
)

// ── 工具四：天气查询 ──────────────────────────────────────
server.registerTool(
  'get_weather',
  {
    description: '获取指定城市的实时天气信息，包括温度、天气状况、湿度。',
    inputSchema: {
      city: z.string().describe('城市名称，例如：北京、上海、武汉'),
    },
  },
  async (args) => {
    try {
      const result = await handleWeatherQuery(args)
      return { content: [{ type: 'text' as const, text: result }] }
    } catch (error: any) {
      return {
        content: [{ type: 'text' as const, text: `工具执行失败：${error.message}` }],
        isError: true,
      }
    }
  },
)

// ── 启动（stdio 模式）─────────────────────────────────────
// stdio 模式下只能用 console.error
// console.log 会污染 stdout 破坏 MCP 通信协议
async function main() {
    const transport = new StdioServerTransport()
    await server.connect(transport)
    console.error('✅ [MCP Server] 已启动，等待 Client 连接...')
}

main().catch(console.error)