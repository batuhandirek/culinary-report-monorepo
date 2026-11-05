import { Injectable } from '@nestjs/common';

import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';

import { TERM_RELATIONS } from '../constants/term-relation.constant.js';
import type { LlmModelChoice } from 'src/modules/llm/constants/llm-models.constant.js';

const termTopicSchema = z.object({
	topics: z
		.array(
			z.object({
				key: z.string(),
				relation: z
					.enum(TERM_RELATIONS)
					.describe('same: the wording is this topic (a spelling, a translation); kind_of: a more specific kind of it; with: it has or is made with it'),
			}),
		)
		.describe('The topics the wording is or has, most specific first; empty when it is none'),
	suggestion: z
		.string()
		.nullable()
		.describe(
			'When topics is empty and the wording is one specific dish, drink or thing guests talk about: a short English label for a topic that would fit ("Fries"); else null',
		),
});

/** A topic the agent picks from */
export interface TermTopicInputTopic {
	key: string;
	label: string;
	/** cuisine, dish, drink, diet, format, meal, ingredient or aspect */
	kind: string;
	/** The parent's key, for the tree */
	parent?: string;
}

/** What agent C is told beside its rules: the topics it picks from (fixed for a day, so cached) */
export interface TermTopicContext {
	topics: TermTopicInputTopic[];
}

/**
 * Agent C: links wordings (dish names from reviews and posts, Google's review tags, any language,
 * often misspelt) to the topics they are, one or many: the `terms` backlog's reader. One wording a
 * call, the topics in the instructions (cached); each wording is asked once (`Term`); an admin's
 * links are never asked.
 */
@Injectable()
export class TermTopicAgent extends BaseMastraAgent<typeof termTopicSchema, TermTopicContext> {
	protected readonly config: BaseMastraAgentConfig<typeof termTopicSchema> = {
		id: 'term-topic',
		name: 'TermTopicAgent',
		outputSchema: termTopicSchema,
		ingestion: true,
	};

	// Thousands of short wordings: mini
	protected getModel(): LlmModelChoice {
		return 'mini';
	}

	protected getInstructions(context?: TermTopicContext): string {
		return (
			'You link one wording guests used about restaurants, bars and cafés — a name of a dish or drink as written in a review or a ' +
			'social media post, or a short tag Google shows as "people often mention" (any language, often misspelt) — to the topics it ' +
			'is. The topics follow, each with its key, label, kind (cuisine, dish, drink, diet, format, meal, ingredient, or aspect: what ' +
			'guests say about a place, such as waiting, price, friendliness) and parent. Answer the ' +
			'topics it is or has, most specific first (a child before its parent: "smash burger" is the smash burger topic when there is ' +
			'one, else burgers), each with its relation: same when the wording is that topic, spelled or translated ("Pommes" is fries, ' +
			'"Dürüm" is the dürüm topic), kind_of when it is a more specific kind of it ("garlic parmesan fries" is fries, "Biang Biang ' +
			'noodles" noodles), with when it has or is made with it ("vegan döner" is kebab, kind_of, and vegan, with; "chicken döner" ' +
			'is chicken, with; "avocado toast" is avocado, with). "Dürüm" and "chicken kebap" are kebab; "Spaghetti Vongole", "carbonara" and "Spaghettiiiossso" are pasta; "Nudeln" and "hand-pulled ' +
			'noodles" are noodles; "iced matcha latte" is matcha; "Turkish breakfast" is turkish and breakfast; "waiting time" is the ' +
			'waiting aspect, "cash only" the cash-only aspect, "friendly staff" friendliness, "outdoor seating" outdoor seating, ' +
			'"vegan options" vegan. Answer a topic only when the wording is one: a burger bun is no burger, kebab sauce or döner meat no ' +
			'kebab (they are with: kebab sauce is a sauce with kebab), a pizza oven no pizza, matcha tiramisu a dessert with matcha; ' +
			'"cheese counter" is no cheese. An ingredient ("beef", "avocado", "mushrooms") is its ingredient topic, same. Answer no ' +
			'topic for a wording of several dishes ("burger and fries"), a menu or a set ("lunch menu", "tasting menu"), or a word too ' +
			'general to say what was eaten or meant ("food", "dishes", "meal", "plate", "drinks", "snacks", "toppings", "special", ' +
			'"starter"). When topics is empty and ' +
			'the wording is one specific dish, drink or thing guests talk about that no topic covers, also answer suggestion: a short ' +
			'English label in the plural where English uses one, the way the topics are labelled ("Fries", "Hummus", "Soups", ' +
			'"Milkshakes", "Tip prompts"), the same label for every wording of that kind ("pommes", "garlic parmesan fries" and "chips" ' +
			'are all "Fries"); else suggestion is null. An odd wording gets an answer too: an empty list is a decision. Use only ' +
			'the keys given.' +
			(context ? `\n\nThe topics: ${JSON.stringify(context.topics)}` : '')
		);
	}
}
