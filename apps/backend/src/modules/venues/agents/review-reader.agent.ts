import { Injectable } from '@nestjs/common';

import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';
import type { LlmModelChoice } from 'src/modules/llm/constants/llm-models.constant.js';
import {
	ClaimPartsAgent,
	type ClaimPartsContext,
	claimPartsSchema,
} from 'src/modules/statements/agents/claim-parts.agent.js';
import {
	READER_PREAMBLE,
	readerCoaching,
	stepBlock,
} from 'src/modules/statements/util/one-call-reader.js';

import { claimSchema, ReviewClaimsAgent } from './review-claims.agent.js';

const reviewReaderSchema = z.object({
	claims: z
		.array(claimSchema.extend(claimPartsSchema.shape))
		.describe(
			'Everything the review says, one claim each, with its parts. Empty only for a review that says nothing',
		),
});

/** One claim as the review reader answers it: A's text and quote, B's parts */
export type ReviewReaderClaim = z.infer<typeof reviewReaderSchema>['claims'][number];

/**
 * The one-call review reader: agent A's claims (`ReviewClaimsAgent`) and agent B's parts of each
 * (`ClaimPartsAgent`) in one call, one review a call, on the `full` tier. Its rules are A's and
 * B's own (`rulesFor`), quoted as two steps; its coaching is theirs. The input is A's
 * (`reviewClaimsInput`); the legend is the same for every call, so the instructions stay cached.
 */
@Injectable()
export class ReviewReaderAgent extends BaseMastraAgent<typeof reviewReaderSchema, ClaimPartsContext> {
	protected readonly config: BaseMastraAgentConfig<typeof reviewReaderSchema> = {
		id: 'review-reader',
		name: 'ReviewReaderAgent',
		outputSchema: reviewReaderSchema,
	};

	constructor(
		private readonly reviewClaimsAgent: ReviewClaimsAgent,
		private readonly claimPartsAgent: ClaimPartsAgent,
	) {
		super();
	}

	// ~200 reviews a day at ~4-5k tokens: the full model's free allowance (1M a day an account)
	protected getModel(): LlmModelChoice {
		return 'full';
	}

	protected getInstructions(context?: ClaimPartsContext): string {
		return (
			READER_PREAMBLE +
			' The source is one Google or TripAdvisor review of one venue.' +
			stepBlock('Step A: splitting a review into claims', this.reviewClaimsAgent.rulesFor()) +
			stepBlock(
				'Step B: the parts of each claim',
				this.claimPartsAgent.rulesFor(context ?? { legend: '' }),
			) +
			"\n\nAnswer the review's claims, each with its quote and step B's parts."
		);
	}

	protected getCoaching(context?: ClaimPartsContext): string {
		return readerCoaching(
			this.reviewClaimsAgent.coachingFor(),
			this.claimPartsAgent.coachingFor(context),
		);
	}
}
