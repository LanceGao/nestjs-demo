import { Controller, Post, Body } from '@nestjs/common';
import { FunctionCallingService } from './function-calling.service.js';

@Controller('function-calling')
export class FunctionCallingController {
    constructor(private readonly functionCallingService: FunctionCallingService) {}
    @Post('run')
    runFuncCalling(@Body() body: { message: string }) {
        return this.functionCallingService.runFuncCalling(body.message)
    }
}
