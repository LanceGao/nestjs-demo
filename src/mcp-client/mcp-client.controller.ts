import { Controller, Get } from '@nestjs/common';
import { McpClientService } from './mcp-client.service.js';

@Controller('mcp-client')
export class McpClientController {
    constructor(private readonly mcpClientService: McpClientService) {}
    @Get('tools-list')
    getToolList() {
        return this.mcpClientService.getToolList()
    }
}
