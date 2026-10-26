import { createTool, type Tool } from '@mastra/core/tools';
import type { z, ZodObject } from 'zod/v4';

/**
 * `createTool` with the input typed from the zod schema and nothing else inferred: Mastra's own
 * generics over a zod v4 schema go "excessively deep" for tsc, and the agent only needs a `Tool`.
 */
export const defineTool = <S extends ZodObject>(opts: {
	id: string;
	description: string;
	inputSchema: S;
	execute: (input: z.infer<S>) => Promise<unknown>;
}): Tool => createTool(opts as never) as unknown as Tool;
