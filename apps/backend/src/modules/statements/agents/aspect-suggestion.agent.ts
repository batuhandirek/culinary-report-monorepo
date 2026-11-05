import { Injectable } from '@nestjs/common';

import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';
import type { LlmModelChoice } from 'src/modules/llm/constants/llm-models.constant.js';

const aspectSuggestionSchema = z.object({
	isAspect: z
		.boolean()
		.describe(
			'false when what the claims share is no aspect: only a dish, drink or ingredient (a food wording, counted apart), only a place, the city or a kind of venue, a verdict on the whole visit ("a must visit", "5 stars", "everything was perfect"), or nothing about a place at all (a creator\'s life, a first visit); true when they share something about a place that an aspect could hold',
		),
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
			"The key of an existing aspect that already covers these claims (they should have been filed there), a root's key when they are about that root as a whole; null when none does",
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
 * Names a cluster of claims no aspect fits (a group of `AspectDiscoveryService`): a
 * label of four words at most, a one-line hint, the root it belongs under, or the existing aspect
 * that already covers it, or that the group is no aspect at all. One call per group; the job
 * creates the aspects from its answers (no review step).
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
		// ~90 short calls a city a week: on Sonnet when OpenAI is out, cents a run (the user's call, 2026-11-03)
		paidFallback: true,
	};

	// What it decides creates aspects nobody reviews, and it runs ~90 calls a city a week (~270k
	// tokens, a quarter of one account's daily gpt-5.4 allowance): full (the user's call, 2026-11-03)
	protected getModel(): LlmModelChoice {
		return 'full';
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
			'Name what the claims are about, never a single claim. Claims that share only a dish or drink ("the burger is great", ' +
			'"the döner costs 3 euros") are about food or price, not about that dish: a dish is never an aspect, and neither is a ' +
			'verdict on the whole visit; say so in "isAspect". Claims about a root as a whole, with nothing finer said ("the food ' +
			'was good", "the service was great", "the staff were helpful", "the place was clean", "we had to wait"), are filed right ' +
			'at that root: answer the root\'s key in "fits". Never name an aspect "overall", "general" or "total" anything: that is ' +
			'the root itself. ' +
			`The roots: ${context?.roots.join(', ') ?? ''}. The aspects, by root, each with its key and what it covers: ${context?.legend ?? ''}.`
		);
	}
}
