import { Injectable } from '@nestjs/common';

import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';
import type { LlmModelChoice } from 'src/modules/llm/constants/llm-models.constant.js';

import { REFERENCE_MODEL } from '../constants/eval.constant.js';

import { stepBlock } from './reference-schemas.js';

export const VERDICTS = ['agent_wrong', 'reference_wrong', 'both_ok'] as const;
export type Verdict = (typeof VERDICTS)[number];

const adjudicationSchema = z.object({
	rulings: z.array(
		z.object({
			n: z.number(),
			verdict: z
				.enum(VERDICTS)
				.describe(
					'agent_wrong: the reference is right; reference_wrong: the agent is right and the reference is not; both_ok: the instructions allow both',
				),
			reason: z.string().describe('One short sentence'),
		}),
	),
});

/** The rules both sides were held to: the pipeline agents' instructions the reference was written from */
export interface AdjudicationContext {
	spec: string;
}

/**
 * Rules on an eval run's disagreements with its reference, one source a call: for each, whether
 * the agent was wrong, the reference was wrong, or the instructions allow both. Opus, as the
 * references are, but asked to judge both sides by the rules, not to defend its earlier answer.
 */
@Injectable()
export class EvalAdjudicationAgent extends BaseMastraAgent<
	typeof adjudicationSchema,
	AdjudicationContext
> {
	protected readonly config: BaseMastraAgentConfig<typeof adjudicationSchema> = {
		id: 'eval-adjudication',
		name: 'EvalAdjudicationAgent',
		outputSchema: adjudicationSchema,
	};

	protected getModel(): LlmModelChoice {
		return REFERENCE_MODEL;
	}

	protected getInstructions(context?: AdjudicationContext): string {
		return (
			'You settle disagreements between an extraction agent and the reference answer it is scored against. You get the ' +
			"source as the agent read it, the reference answer, the agent's answer, and the numbered disagreements the scorer " +
			'found. For each, rule by the instructions below, which bind both sides: agent_wrong when the reference follows them ' +
			"and the agent doesn't; reference_wrong when the agent follows them and the reference doesn't; both_ok when they " +
			'allow both readings (a detail kept apart or folded into a neighbouring claim, two aspects that both fit, a pairing ' +
			'the scorer missed because the two claims say the same thing). The reference is not presumed right: judge each side ' +
			'as if you had written neither.' +
			stepBlock('The instructions', context?.spec ?? '') +
			'\n\nRule on every disagreement by its number.'
		);
	}
}
