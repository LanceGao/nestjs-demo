import { Controller, Post, Body } from '@nestjs/common';
import { ChainsService } from './chains.service.js';

@Controller('chains')
export class ChainsController {
    constructor(private readonly chainsService: ChainsService) {}
    @Post('polish')
    polish(@Body() body: { article: string }) {
        return this.chainsService.polish(body.article)
    }
    @Post('blog')
    generateBlog(@Body() body: { keyword: string, style: string }) {
        return this.chainsService.generateBlog(body.keyword, body.style)
    }
    @Post('router')
    smartRouter(@Body() body: { question: string }) {
        return this.chainsService.smartRouter(body.question)
    }
}
