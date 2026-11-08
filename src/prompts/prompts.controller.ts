import { Controller, Post, Body } from '@nestjs/common';
import { PromptsService } from './prompts.service.js';

@Controller('prompts')
export class PromptsController {
    constructor(private readonly promptsService: PromptsService) {}
    @Post('translate')
    translate(@Body() { message, targetLang } : { message: string, targetLang: string }) {
        return this.promptsService.translate(message, targetLang)
    }
    @Post('summarize')
    summarize(@Body() { message, maxWord } : { message: string, maxWord: number }) {
        return this.promptsService.summarize(message, maxWord)
    }
    @Post('classify')
    classify(@Body() body: { message: string}) {
        return this.promptsService.classify(body.message)
    }
    @Post('code-review')
    codeReview(@Body() { message, lang }: { message: string, lang: string}) {
        return this.promptsService.codeReview(message, lang)
    }
}
