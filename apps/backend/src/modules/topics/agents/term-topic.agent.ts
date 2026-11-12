import { Injectable } from '@nestjs/common';

import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';
import type { LlmModelChoice } from 'src/modules/llm/constants/llm-models.constant.js';

import { EDGE_TYPES, PROMOTION_KINDS } from '../constants/topic-edge.constant.js';

const termTopicSchema = z.object({
	none: z
		.boolean()
		.describe('true when the wording is no food, no drink and nothing guests say about a place, or is too general to say what was meant; everything else is then null or empty'),
	topic: z
		.string()
		.nullable()
		.describe('The key of the one topic the wording is, or is a narrower thing under; null when none of the topics given fits'),
	exact: z
		.boolean()
		.describe('true when the wording is that topic itself, spelled or translated; false when it is something narrower'),
	label: z
		.string()
		.nullable()
		.describe('When exact is false: the short English name this thing would have as a topic of its own, the same for every spelling and language of it ("Vegan döner", "Kumpir"); else null'),
	kind: z
		.enum(PROMOTION_KINDS)
		.nullable()
		.describe('When exact is false: the kind that topic would have; else null'),
	modifiers: z
		.array(
			z.object({
				topic: z.string().describe('A key among the topics given'),
				type: z
					.enum(EDGE_TYPES)
					.nullable()
					.describe('is_a: the wording is also a kind of it; has: it has it as a diet, an ingredient or an attribute; null to leave it to the topic\'s kind'),
			}),
		)
		.describe('When exact is false: what else the wording is or has beside its main topic; else empty'),
});

/** A topic the agent picks from */
export interface TermTopicInputTopic {
	key: string;
	label: string;
	/** cuisine, dish, drink, diet, format, meal, ingredient or aspect */
	kind: string;
	/** The keys of the topics it is a kind of, the first its parent in the tree */
	isA?: string[];
}

/**
 * What agent C is told beside its rules: the topics every wording is offered (the small fixed
 * kinds and the aspect roots; fixed until a topic changes, so cached). The topics close to one
 * wording come in its message.
 */
export interface TermTopicContext {
	topics: TermTopicInputTopic[];
}

/**
 * Agent C: decides one wording (a dish name from a review or a post, one of Google's review tags,
 * any language, often misspelt): the one topic it is, or is a narrower thing under, with what
 * else it is or has. The `terms` backlog's reader. One wording a call; each wording is asked once
 * (`Term`); an admin's decision is never asked.
 */
@Injectable()
export class TermTopicAgent extends BaseMastraAgent<typeof termTopicSchema, TermTopicContext> {
	protected readonly config: BaseMastraAgentConfig<typeof termTopicSchema> = {
		id: 'term-topic',
		name: 'TermTopicAgent',
		outputSchema: termTopicSchema,
	};

	// Thousands of short wordings: mini
	protected getModel(): LlmModelChoice {
		return 'mini';
	}

	protected getInstructions(context?: TermTopicContext): string {
		return (
			'You place one wording guests used about restaurants, bars and cafés — a name of a dish or drink as written in a review or a ' +
			'social media post, or a short tag Google shows as "people often mention" (any language, often misspelt) — in a graph of ' +
			'topics. A topic is a kind of food or drink (kinds: cuisine, dish, drink, diet, format = a kind of place, meal, ingredient) ' +
			'or an aspect (what guests say about a place: waiting, price, friendliness). You are given topics to pick from: the ones ' +
			'listed below, and in the message the ones closest to the wording. Each has its key, label, kind and the topics it is a ' +
			'kind of. Use only keys you were given.\n\n' +
			'Answer one of three.\n' +
			'1. The wording IS one of the topics, spelled another way or translated: topic = its key, exact = true, label and kind ' +
			'null, modifiers empty. "Melemen" is menemen; "Pommes" and "french fries" are fries; "türkisches Essen" is turkish; ' +
			'"Frühstück" is breakfast; "waiting time" is the waiting aspect, "cash only" the cash-only aspect, "friendly staff" ' +
			'friendliness; "beef" is the beef ingredient. Pick the most specific topic it is: "smash burger" is the smash burger ' +
			'topic when one is given, never burgers with exact = true. What that topic is in turn (menemen is Turkish, is a ' +
			'breakfast) is known already: never repeat it.\n' +
			'2. The wording is no food, no drink and nothing guests say about a place, or is too general to say what was eaten or ' +
			'meant: none = true, everything else null, false or empty. "food", "dishes", "meal", "plate", "drinks", "snacks", ' +
			'"toppings", "special", "starter"; a wording of several dishes ("burger and fries"); a menu or a set ("lunch menu", ' +
			'"tasting menu").\n' +
			'3. The wording is a narrower thing than any topic given, or a combination: exact = false. topic = the key of the one ' +
			'topic it is most a kind of (the dish before the cuisine: "garlic parmesan fries" is under fries, "kumpir" under turkish ' +
			'when no closer dish is given; null when nothing given fits, as for a dish no topic comes near). label = the short ' +
			'English name it would have as a topic of its own, in the form the topics are labelled, and the same label for every ' +
			'spelling, plural and language of the same thing ("vegan döner", "veganer Döner" and "Vegan Doner" are all "Vegan ' +
			'döner"; "kumpir" and "Kumpir Kartoffel" are "Kumpir"). kind = the kind that topic would have (a dish for a dish, a ' +
			'drink for a drink). modifiers = what else it is or has, each a key given: is_a when it is also a kind of it ("Turkish ' +
			'breakfast plate": topic breakfast, is_a turkish), has when it has it as a diet, an ingredient or an attribute ("vegan ' +
			'döner": topic kebab, has vegan; "chicken döner": topic kebab, has chicken; "avocado toast": has avocado; "matcha ' +
			'tiramisu": topic tiramisu or dessert, has matcha). Never list as a modifier what the main topic already is. A part of ' +
			'a dish is not the dish: a burger bun is no burger, kebab sauce is a sauce that has kebab, a pizza oven is no pizza, ' +
			'"cheese counter" is no cheese. A wording under an aspect is always exact (answer 1) with the closest aspect, a root ' +
			'when nothing finer fits.\n\n' +
			'An odd wording gets an answer too: none is a decision.' +
			(context ? `\n\nThe topics always offered:\n${topicLines(context.topics)}` : '')
		);
	}
}

/** Topics as the agent reads them, one a line: `key | label | kind | is a: a, b` */
export const topicLines = (topics: TermTopicInputTopic[]): string =>
	topics
		.map(
			t =>
				`${t.key} | ${t.label} | ${t.kind}${t.isA?.length ? ` | is a: ${t.isA.join(', ')}` : ''}`,
		)
		.join('\n');
