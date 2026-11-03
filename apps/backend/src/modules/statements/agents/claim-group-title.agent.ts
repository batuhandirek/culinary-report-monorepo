import { Injectable } from '@nestjs/common';

import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';
import type { LlmModelChoice } from 'src/modules/llm/constants/llm-models.constant.js';

const claimGroupTitleSchema = z.object({
	title: z
		.string()
		.describe(
			'What these claims say, at most six words, sentence case, no quotes ("Quality got worse", "Long wait for the food", "Cash only")',
		),
});

export type ClaimGroupTitle = z.infer<typeof claimGroupTitleSchema>;

/**
 * Titles one group of Explore's "Grouped by meaning" (`StatementInsightService.groups`): the
 * claims' shared point in six words at most. One call per group; the title is a reading aid,
 * kept in memory, never stored.
 */
@Injectable()
export class ClaimGroupTitleAgent extends BaseMastraAgent<typeof claimGroupTitleSchema> {
	protected readonly config: BaseMastraAgentConfig<typeof claimGroupTitleSchema> = {
		id: 'claim-group-title',
		name: 'ClaimGroupTitleAgent',
		outputSchema: claimGroupTitleSchema,
		// Up to twelve short calls a view: on Claude when OpenAI is out (the user's call, 2026-11-03)
		paidFallback: true,
	};

	// Up to twelve short calls when a view's groups are worked out: mini
	protected getModel(): LlmModelChoice {
		return 'mini';
	}

	protected getInstructions(): string {
		return (
			'You get a group of claims about restaurants, bars and cafés, read from Google reviews, social media posts and blog ' +
			'articles, that say the same thing in different words. Give the group a title: what they say, in at most six words, ' +
			'sentence case, plain English, no quotes and no trailing full stop. Keep the claims\' direction ("Quality got worse", not ' +
			'"Quality"), name no venue and no person, and say the shared point, never one claim\'s detail.'
		);
	}
}
