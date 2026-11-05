import { Injectable } from '@nestjs/common';

import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';
import type { LlmModelChoice } from 'src/modules/llm/constants/llm-models.constant.js';

const claimPairingSchema = z.object({
	pairs: z.array(z.object({ reference: z.number(), produced: z.number() })),
});

/** One source's two lists of claims, numbered (`id` is the case's, never sent: one case a call) */
export interface ClaimPairingInput {
	id: string;
	reference: { i: number; text: string; quote?: string }[];
	produced: { i: number; text: string; quote?: string }[];
}

/**
 * Links an agent's claims to a reference's by what they claim, splits and merges included: the
 * eval's scorer then compares their parts in code. No quality judgement, so it runs on the mini
 * tier.
 */
@Injectable()
export class ClaimPairingAgent extends BaseMastraAgent<typeof claimPairingSchema> {
	protected readonly config: BaseMastraAgentConfig<typeof claimPairingSchema> = {
		id: 'eval-claim-pairing',
		name: 'ClaimPairingAgent',
		outputSchema: claimPairingSchema,
	};

	protected getModel(): LlmModelChoice {
		return 'mini';
	}

	protected getInstructions(): string {
		return (
			'You link two lists of short claims read from one review or post: a reference list and a produced list. Link ' +
			'a reference claim to each produced claim that says the same thing about the same thing (the same dish, the same ' +
			'part of the visit, the same fact), however differently worded, even when one judges it differently or adds a ' +
			'detail: "the döner was great" links to "the döner was very tasty", "waited 40 minutes" to "the wait was 40 ' +
			'minutes"; "the döner was great" does not link to "the fries were great". The lists may cut the text differently: ' +
			'when one produced claim says what two reference claims say ("the staff were polite and fast"), link it to both; ' +
			'when two produced claims split one reference claim ("the staff were cool" and "the staff were great" for "the ' +
			'staff were cool and great"), link both to it. Leave unlinked what has no counterpart. A claim may come with its quote, the ' +
			"source's own words it was read from: quotes that share their words are a strong sign of the same claim, however " +
			'differently the claims are phrased, and quotes from unrelated parts of the text a strong sign of different ones. ' +
			"Answer each link as a pair of the claims' numbers."
		);
	}
}
