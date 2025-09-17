import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { MemorySaver } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import { type INodeTypeDescription, type IRunExecutionData, type IWorkflowBase, type NodeExecutionSchema } from 'n8n-workflow';
export interface WorkflowBuilderAgentConfig {
    parsedNodeTypes: INodeTypeDescription[];
    llmSimpleTask: BaseChatModel;
    llmComplexTask: BaseChatModel;
    logger?: Logger;
    checkpointer?: MemorySaver;
    tracer?: LangChainTracer;
    autoCompactThresholdTokens?: number;
    instanceUrl?: string;
}
export interface ChatPayload {
    message: string;
    workflowContext?: {
        executionSchema?: NodeExecutionSchema[];
        currentWorkflow?: Partial<IWorkflowBase>;
        executionData?: IRunExecutionData['resultData'];
    };
}
export declare class WorkflowBuilderAgent {
    private checkpointer;
    private parsedNodeTypes;
    private llmSimpleTask;
    private llmComplexTask;
    private logger?;
    private tracer?;
    private autoCompactThresholdTokens;
    private instanceUrl?;
    constructor(config: WorkflowBuilderAgentConfig);
    private getBuilderTools;
    private createWorkflow;
    getState(workflowId: string, userId?: string): Promise<import("@langchain/langgraph").StateSnapshot>;
    static generateThreadId(workflowId?: string, userId?: string): string;
    private getDefaultWorkflowJSON;
    chat(payload: ChatPayload, userId?: string, abortSignal?: AbortSignal): AsyncGenerator<import("./types").StreamOutput, void, unknown>;
    private validateMessageLength;
    private setupAgentAndConfigs;
    private createAgentStream;
    private handleStreamError;
    private processAgentStream;
    private handleAgentStreamError;
    private getInvalidRequestError;
    getSessions(workflowId: string | undefined, userId?: string): Promise<{
        sessions: {
            sessionId: string;
            messages: Record<string, unknown>[];
            lastUpdated: string;
        }[];
    }>;
}
