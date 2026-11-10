import { Controller, Post, Body, Get, Query, Delete } from '@nestjs/common';
import { RagService } from './rag.service.js';

@Controller('rag')
export class RagController {
    constructor(private readonly ragService: RagService) {}
    @Post('load')
    loadDocuments(@Body() body: { documents: { id: string, source: string, content: string}[] }) {
        return this.ragService.loadDocuments(body.documents)
    }
    @Get('status')
    getStatus() {
        return this.ragService.getStatus()
    }
    @Post('search')
    search(@Body() body: { question: string, topK?: number }) {
        return this.ragService.search(body.question, body.topK || 3)
    }
    @Post('searchfromvector')
    searchFromVector(@Body() body: { question: string, topK?: number }) {
        return this.ragService.searchFromVector(body.question, body.topK || 3)
    }
    @Delete('clear')
    clear() {
        return this.ragService.clear()
    }
}
