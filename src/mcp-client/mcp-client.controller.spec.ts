import { Test, TestingModule } from '@nestjs/testing';
import { McpClientController } from './mcp-client.controller.js';

describe('McpClientController', () => {
  let controller: McpClientController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [McpClientController],
    }).compile();

    controller = module.get<McpClientController>(McpClientController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
