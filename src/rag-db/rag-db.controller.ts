import { Controller, Post, Body, Get } from '@nestjs/common';
import { RagDbService } from './rag-db.service.js';

@Controller('rag-db')
export class RagDbController {
    constructor(private readonly ragDbService: RagDbService) {}
    @Post('load')
    load(@Body() body: { documents: { content: string, id: string, source: string }[] }) {
        return this.ragDbService.load(body.documents)
    }
    @Get('status')
    getStatus() {
        return this.ragDbService.getStatus()
    }
    @Post('search')
    search(@Body() body: { query: string, topK: number }) {
        return this.ragDbService.search(body.query, body.topK)
    }
    @Post('query')
    query(@Body() body: { question: string, topK: number }) {
        return this.ragDbService.query(body.question, body.topK)
    }
    @Post('clean')
    clearKnowledge() {
        return this.ragDbService.clearKnowledge()
    }
}
