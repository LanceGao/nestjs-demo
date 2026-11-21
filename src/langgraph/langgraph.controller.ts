import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { LanggraphService } from './langgraph.service.js';
import { ArticleService } from './article.service.js';
import { ReactAgentService } from './react-agent.service.js';
import { RoutingService } from './routing.service.js';
import { ParallelService } from './parallel.service.js';
import { SupervisorService } from './supervisor.service.js';
import { PipelineService } from './pipeline.service.js';
import { CodeReviewService } from './code-review.service.js';

@Controller('langgraph')
export class LanggraphController {
    constructor(
        private readonly langgraphService: LanggraphService,
        private readonly articleService: ArticleService,
        private readonly reactAgentService: ReactAgentService,
        private readonly routingService: RoutingService,
        private readonly parallelService: ParallelService,
        private readonly supervisorService: SupervisorService,
        private readonly pipelineService: PipelineService,
        private readonly codeReviewService: CodeReviewService,
    ) {}
    @Post('simple-chat')
    simpleChat(@Body() body: { message: string }) {
        return this.langgraphService.simpleChat(body.message);
    }
    @Post('memory-chat')
    memoryChat(@Body() body: { threadId: string, message: string }) {
        return this.langgraphService.memoryChat(body.threadId, body.message);
    }
    @Get('history/:threadId')
    getHistory(@Param('threadId') threadId: string) {
        return this.langgraphService.getHistory(threadId);
    }
    @Post('article')
    genArticleSummary(@Body() body: { article: string }) {
        return this.articleService.genArticleSummary(body.article);
    }
    @Post('react-agent')
    reactAgent(@Body() body: { message: string, threadId: string }) {
        return this.reactAgentService.reactAgent(body.message, body.threadId);
    }
    @Post('routing')
    routing(@Body() body: { message: string }) {
        return this.routingService.routing(body.message);
    }
    @Post('parallel')
    parallel(@Body() body: { message: string }) {
        return this.parallelService.parallel(body.message);
    }
    @Post('supervisor-agent')
    supervisorAgent(@Body() body: { message: string }) {
        return this.supervisorService.supervisorAgent(body.message);
    }
    @Post('code-review')
    codeReview(@Body() body: { code: string, language: string }) {
        return this.codeReviewService.codeReview(body.code, body.language);
    }
    @Post('create-content')
    createContent(@Body() body: { topic: string }) {
        return this.pipelineService.createContent(body.topic);
    }
}
