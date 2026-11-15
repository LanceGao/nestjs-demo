import { Controller, Get, Post, Body } from '@nestjs/common';
import { McpAgentService } from './mcp-agent.service.js';

@Controller('mcp-agent')
export class McpAgentController {
    constructor(private readonly mcpAgentService: McpAgentService) {}
    @Get('tools')
    getTools() {
        return this.mcpAgentService.getTools()
    }
    @Post('run')
    runAgent(@Body() body: {message: string}) {
        return this.mcpAgentService.runAgent(body.message)
    }
}
