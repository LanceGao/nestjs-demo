import { Injectable, OnModuleInit } from '@nestjs/common';
import { HumanMessage } from '@langchain/core/messages';
import { StateGraph, Command, Send, START, END, Annotation } from '@langchain/langgraph';
import { ChatOllama } from '@langchain/ollama';
import { config } from '../config.js'

// 主图state
const ParallelState = Annotation.Root({
    task: Annotation<string>(),
    results: Annotation<{task: string, result: string}[]>({
        reducer: (pre, cur) => [...pre, ...cur],
        default: () => []
    }),
    finalResult: Annotation<string>()
})

// 子图state
const SubParallerState = Annotation.Root({
    task: Annotation<string>()
})

@Injectable()
export class ParallelService implements OnModuleInit {

    private graph: any

    async onModuleInit() {
        const llm = new ChatOllama({
            model: config.ollama.chatModel,
            baseUrl: config.ollama.baseUrl,
            temperature: config.ollama.temperature,
            think: false,
            numPredict: 512
        });

        // 拆分任务
        const splitTask = async (state: typeof ParallelState.State) => {

            const res = await llm.invoke([
                new HumanMessage(`请将任务 ${state.task} 分成 3 个独立子任务，每个子任务的描述不能超过 100 个字符，换行分割，不需要编号。`)
            ])
            const subTasks = (res.content as String).split('\n').filter(Boolean)
            console.log(res, subTasks)
            return new Command({
                goto: subTasks.map((task) => new Send('prcessNode', { task: task }))
            })
        }

        // 子任务节点， 多个实例 并行运行
        const prcessNode = async (state: typeof SubParallerState.State) => {
            const res = await llm.invoke([
                new HumanMessage(`请完成子任务 ${state.task}，不超过100字。`)
            ])
            console.log('task-res', res.content as String)
            return {
                results: [{task: state.task, result: res.content as String}]
            }
        }

        // 汇总节点， 收集所有子任务结果，生成最终报告
        const mergeResults = async (state: typeof ParallelState.State) => {
            const text = state.results.map((m) => `${m.task}:${m.result}\n\n`)
            const res = await llm.invoke([
                new HumanMessage(`请根据子任务结果 ${text}，并返回最终结果，不超过300字。`)
            ])
            console.log('merge-res', res.content as String)
            return {finalResult: res.content as String}
            
        }

        this.graph = new StateGraph(ParallelState)
            .addNode('splitTask', splitTask, {ends: ['prcessNode']})
            .addNode('prcessNode', prcessNode, {ends: ['mergeResults']})
            .addNode('mergeResults', mergeResults)
            .addEdge(START, 'splitTask')
            .addEdge('prcessNode', 'mergeResults')
            .addEdge('mergeResults', END)
            .compile()
    }
    async parallel(message: string) {
        const t0 = Date.now()
        const res = await this.graph.invoke({ task: message })
        return {
            task: res.task,
            subResults: res.results,
            finalResult: res.finalResult,
            totalTime: (Date.now() - t0) / 1000
        }
    }
}
