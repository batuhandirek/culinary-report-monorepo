import { Injectable } from '@nestjs/common';

import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';
import type { LlmModelChoice } from 'src/modules/llm/constants/llm-models.constant.js';
// TODO(topic-graph): the old term × topic relations, kept only so the references on disk still parse
const TERM_RELATIONS = ['same', 'kind_of', 'with'] as const;

import { REFERENCE_MODEL } from '../constants/eval.constant.js';

import { stepBlock } from './reference-schemas.js';

const termReferenceSchema = z.object({
	terms: z.array(
		z.object({
			id: z.string(),
			topics: z.array(z.object({ key: z.string(), relation: z.enum(TERM_RELATIONS) })),
			alsoAcceptable: z
				.array(z.string())
				.describe(
					'Other topic keys a careful reader could link without being wrong; empty when your list is the only right one',
				),
			suggestion: z.string().nullable(),
		}),
	),
});

/** The linker's own instructions (`TermTopicAgent`) */
export interface TermReferenceContext {
	spec: string;
}

/** The eval's reference for wordings: their topics and relations (agent C) by Opus */
@Injectable()
export class TermReferenceAgent extends BaseMastraAgent<
	typeof termReferenceSchema,
	TermReferenceContext
> {
	protected readonly config: BaseMastraAgentConfig<typeof termReferenceSchema> = {
		id: 'eval-term-reference',
		name: 'TermReferenceAgent',
		outputSchema: termReferenceSchema,
	};

	protected getModel(): LlmModelChoice {
		return REFERENCE_MODEL;
	}

	protected getInstructions(context?: TermReferenceContext): string {
		return (
			'You write the reference answer a wording-to-topic linker is scored against. Do its job yourself, as the most ' +
			'careful reader its instructions describe: follow them to the letter where they are clear, and where they leave ' +
			'room, take the reading that lets a report count the dish or aspect right. Agents are scored against you, so list in ' +
			'alsoAcceptable the other topic keys the instructions allow (few and honest: a reading they allow, never a mistake ' +
			'you would forgive). Its instructions:' +
			stepBlock('The linker', context?.spec ?? '')
		);
	}
}
