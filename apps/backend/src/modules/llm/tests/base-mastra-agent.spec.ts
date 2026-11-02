import { describe, expect, it } from '@jest/globals';

import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	type BaseMastraAgentConfig,
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
