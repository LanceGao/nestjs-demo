import { Controller, Post, Body } from '@nestjs/common';
import { RagService } from './rag.service.js';

@Controller('rag')
export class RagController {
    constructor(private readonly ragService: RagService) {}
    @Post('load')
    loadDocuments(@Body() body: { documents: { id: string, source: string, content: string}[] }) {
        return this.ragService.loadDocuments(body.documents)
    }
}
