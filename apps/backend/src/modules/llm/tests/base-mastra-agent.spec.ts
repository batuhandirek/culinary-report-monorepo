import { describe, expect, it } from '@jest/globals';
import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	type BaseMastraAgentConfig,
	failedRunError,
} from '../abstractions/base-mastra-agent.abstract.js';
import type { LlmModelChoice } from '../constants/llm-models.constant.js';

const schema = z.object({ ok: z.boolean() });

class CoachedAgent extends BaseMastraAgent<typeof schema, { city: string }> {
	protected readonly config: BaseMastraAgentConfig<typeof schema> = {
		id: 'coached',
		name: 'CoachedAgent',
		outputSchema: schema,
	};
	protected getModel(): LlmModelChoice {
		return 'mini';
	}
	protected getInstructions(context?: { city: string }): string {
		return `Read posts from ${context?.city}.`;
	}
	protected getCoaching(): string {
		return 'Mini tends to drop neutral facts: keep them.';
	}
}

/* An agent's rules are what a reference model is given as its spec; the coaching only reaches the
   model that runs it, so coaching it never makes a reference stale. */
describe('BaseMastraAgent rules and coaching', () => {
	it('runs on the rules then the coaching, and hands only the rules out as the spec', () => {
		const agent = new CoachedAgent();
		expect(agent.rulesFor({ city: 'Berlin' })).toBe('Read posts from Berlin.');
		expect(agent.instructionsFor({ city: 'Berlin' })).toBe(
			'Read posts from Berlin.\n\nMini tends to drop neutral facts: keep them.',
		);
	});
});

describe('failedRunError', () => {
	it("keeps a provider's own error, so the roster can read its limit", () => {
		const own = Object.assign(new Error('rate-limited upstream'), { statusCode: 429 });
		expect(failedRunError({ error: own }, 'openrouter/x/y:free')).toBe(own);
	});

	it('says why a run gave no object, with the start of what the model wrote', () => {
		expect(
			failedRunError(
				{ error: { message: 'Structured output validation failed' }, text: '{"claims": [' },
				'openrouter/x/y:free',
			).message,
		).toBe(
			'openrouter/x/y:free gave no answer: Structured output validation failed; it wrote: {"claims": [',
		);
		expect(failedRunError({ finishReason: 'length' }, 'openai/gpt-5.4').message).toBe(
			'openai/gpt-5.4 gave no answer: finish reason length',
		);
	});
});
