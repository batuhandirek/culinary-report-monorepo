import { Injectable } from '@nestjs/common';

import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';
import type { LlmModelChoice } from 'src/modules/llm/constants/llm-models.constant.js';

const aspectSuggestionSchema = z.object({
	label: z
		.string()
		.describe(
			'A name for what these claims are about, at most four words, sentence case, no polarity ("Music volume", not "Loud music")',
		),
	hint: z
		.string()
		.describe(
			'One line saying what the aspect covers and, where a word is shared with another aspect, what it is not',
		),
	root: z
		.string()
		.describe(
			'The key of the root aspect it belongs under, from the roots in the instructions',
		),
	fits: z
		.string()
		.nullable()
		.describe(
			'The key of an existing aspect that already covers these claims (they should have been filed there); null when none does',
		),
});

export type AspectSuggestion = z.infer<typeof aspectSuggestionSchema>;

/** A cluster as the agent reads it */
export interface AspectSuggestionInput {
	/** Claims of the cluster, one per sub-cluster first, then others */
	claims: string[];
	/** Where the claims are filed now: a root's key and how many, or `none` */
	filedAt: { aspect: string; claims: number }[];
}

/** The aspects' legend (`TopicIndex.aspectLegend`) and the roots' keys */
export interface AspectSuggestionContext {
	legend: string;
	roots: string[];
}

/**
 * Names a cluster of claims no aspect fits (the "missing aspects" of `StatementClusterService`): a
 * label of four words at most, a one-line hint, the root it belongs under, or the existing aspect
 * that already covers it. One call per cluster; nothing it says is stored: an admin creates the
 * aspect from it.
 */
@Injectable()
export class AspectSuggestionAgent extends BaseMastraAgent<
	typeof aspectSuggestionSchema,
	AspectSuggestionContext
> {
	protected readonly config: BaseMastraAgentConfig<typeof aspectSuggestionSchema> = {
		id: 'aspect-suggestion',
		name: 'AspectSuggestionAgent',
		outputSchema: aspectSuggestionSchema,
	};

	// ~30 short calls when an admin opens the tab: mini
	protected getModel(): LlmModelChoice {
		return 'mini';
	}

	protected getInstructions(context?: AspectSuggestionContext): string {
		return (
			'Claims about restaurants, bars and cafés, read from Google reviews, social media posts and blog articles, are filed under ' +
			'aspects: what a claim is about, never whether it was good or bad (portion size covers generous and small portions). ' +
			'You get a group of claims that were filed under no aspect, or only at a root because nothing finer fitted, and that say ' +
			'the same kind of thing. Name the aspect they share as a new one: a label of at most four words in sentence case, without ' +
			'polarity ("Music volume", not "Loud music"); a one-line hint saying what it covers and what it is not where a word is ' +
			'shared with another aspect; and the key of the root it belongs under. When an existing aspect below already covers these ' +
			'claims, answer its key in "fits" (the claims should have been filed there) and still give the label, hint and root. ' +
			'Name what the claims are about, never a single claim. ' +
			`The roots: ${context?.roots.join(', ') ?? ''}. The aspects, by root, each with its key and what it covers: ${context?.legend ?? ''}.`
		);
	}
}
