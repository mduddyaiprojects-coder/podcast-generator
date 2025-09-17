import type { Logger } from '@n8n/backend-common';
import { z } from 'zod';
export declare function createGetNodeParameterTool(logger?: Logger): {
    tool: import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
        nodeId: z.ZodString;
        path: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        nodeId: string;
        path: string;
    }, {
        nodeId: string;
        path: string;
    }>, unknown, {
        nodeId: string;
        path: string;
    }, import("@langchain/langgraph").Command<unknown>>;
    displayTitle: string;
};
