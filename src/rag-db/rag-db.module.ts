import { Module } from '@nestjs/common';
import { RagDbService } from './rag-db.service.js';
import { RagDbController } from './rag-db.controller.js';

@Module({
  providers: [RagDbService],
  controllers: [RagDbController]
})
export class RagDbModule {}
