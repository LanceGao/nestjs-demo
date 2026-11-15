import { Module } from '@nestjs/common';
import { McpClientController } from './mcp-client.controller.js';
import { McpClientService } from './mcp-client.service.js';

@Module({
  controllers: [McpClientController],
  providers: [McpClientService],
  exports: [McpClientService], // 导出供其他模块使用
})
export class McpClientModule {}
