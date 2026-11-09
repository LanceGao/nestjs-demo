import { Controller, Post, Body } from '@nestjs/common';
import { AgentsService } from './agents.service.js';

@Controller('agents')
export class AgentsController {
    constructor(private readonly agentsService: AgentsService) {}
    @Post('runAgent')
    runAgent(@Body() body: { message: string}) {
        return this.agentsService.runAgent(body.message)
    }
}
