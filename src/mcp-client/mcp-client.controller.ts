import { Controller, Get, Post, Body } from '@nestjs/common';
import { McpClientService } from './mcp-client.service.js';

@Controller('mcp-client')
export class McpClientController {
    constructor(private readonly mcpClientService: McpClientService) {}
    @Get('tools-list')
    getToolList() {
        return this.mcpClientService.getToolList()
    }
    @Post('call-tool')
    callTool(@Body() body: {toolName: string, args: any}) {
        return this.mcpClientService.callTool(body.toolName, body.args)
    }
}
