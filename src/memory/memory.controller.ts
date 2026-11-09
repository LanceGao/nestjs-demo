import { Controller, Post, Body, Get, Param, Delete } from '@nestjs/common';
import { MemoryService } from './memory.service.js'
import type { Response } from 'express';
import { Res } from '@nestjs/common';



@Controller('memory')
export class MemoryController {
    constructor(private readonly memoryService: MemoryService) {}
    @Post('chat')
    chat(@Body() body: { message: string, sessionId: string }) {
        return this.memoryService.chat(body.message, body.sessionId)
    }
    @Get('history/:sessionId')
    getSessionHistory(@Param('sessionId') sessionId: string) {
        return this.memoryService.getSessionHistory(sessionId)
    }
    @Delete('history/:sessionId')
    deleteSessionHistory(@Param() param: {sessionId: string}) {
        return this.memoryService.deleteSessionHistory(param.sessionId)
    }
    @Get('list')
    getSessionList() {
        return this.memoryService.getSessionList()
    }
    @Post('chat-stream')
    chatStream(@Body() body: { message: string, sessionId: string }, @Res() res: Response) {
        return this.memoryService.chatStream(body.message, body.sessionId, res)
    }
}