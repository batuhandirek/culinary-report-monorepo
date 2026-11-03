import { Injectable } from '@nestjs/common';

import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';
import type { LlmModelChoice } from 'src/modules/llm/constants/llm-models.constant.js';
import {
	ClaimPartsAgent,
	claimPartsSchema,
} from 'src/modules/statements/agents/claim-parts.agent.js';
import {
	READER_PREAMBLE,
	readerCoaching,
	stepBlock,
} from 'src/modules/statements/util/one-call-reader.js';

import { PostClaimsAgent, postClaimsSchema } from './post-claims.agent.js';

const postClaim = postClaimsSchema.shape.claims.element;

const postReaderSchema = postClaimsSchema.extend({
	claims: z
		.array(postClaim.extend(claimPartsSchema.shape))
		.describe(`${postClaimsSchema.shape.claims.description}; each with its parts`),
});

/** The post reader's answer for one post (or one part of a long one): A's places and claims, each claim with B's parts */
export type PostReaderAnswer = z.infer<typeof postReaderSchema>;

/** Fixed for every call (no city, no brand: those are in the message), so the instructions stay cached */
export interface PostReaderContext {
	/** The aspects' legend (`TopicIndex.aspectLegend`): step B's */
	legend: string;
	/** The food topics' labels for the cuisine field: step A's */
	topics?: string[];
}

/**
 * The one-call post reader: agent A's places and claims (`PostClaimsAgent`) and agent B's parts
 * of each claim (`ClaimPartsAgent`) in one call, one post a call (a long one in parts, as
 * `readPostClaims` plans it), on the `full` tier. Its rules are A's and B's own (`rulesFor`),
 * quoted as two steps; its coaching is theirs. The city goes in the message (`postClaimsPrompt`
 * with the city), never in the instructions, so every city shares one cache.
 */
@Injectable()
export class PostReaderAgent extends BaseMastraAgent<typeof postReaderSchema, PostReaderContext> {
	protected readonly config: BaseMastraAgentConfig<typeof postReaderSchema> = {
		id: 'post-reader',
		name: 'PostReaderAgent',
		outputSchema: postReaderSchema,
	};

	constructor(
		private readonly postClaimsAgent: PostClaimsAgent,
		private readonly claimPartsAgent: ClaimPartsAgent,
	) {
		super();
	}

	// ~125 posts a day at ~10k tokens: the full model's free allowance (1M a day an account)
	protected getModel(): LlmModelChoice {
		return 'full';
	}

	protected getInstructions(context?: PostReaderContext): string {
		return (
			READER_PREAMBLE +
			' The source is one social media post or blog article; the input starts with the city whose scrape found it, ' +
			"the city step A's instructions speak of." +
			stepBlock(
				'Step A: the places and the claims',
				this.postClaimsAgent.rulesFor({ cityName: '', topics: context?.topics }),
			) +
			stepBlock(
				'Step B: the parts of each claim',
				this.claimPartsAgent.rulesFor({ legend: context?.legend ?? '' }),
			) +
			'\n\nAnswer whether it is promotional, the places, then the claims, each with its subject, its place, its quote ' +
			"and step B's parts."
		);
	}

	protected getCoaching(context?: PostReaderContext): string {
		return readerCoaching(
			this.postClaimsAgent.coachingFor(),
			this.claimPartsAgent.coachingFor({ legend: context?.legend ?? '' }),
		);
	}
}
