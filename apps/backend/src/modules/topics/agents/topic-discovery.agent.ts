import { Injectable } from '@nestjs/common';

import { z } from 'zod/v4';

import { BaseMastraAgent, BaseMastraAgentConfig } from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';
import type { LlmModelChoice } from 'src/modules/llm/constants/llm-models.constant.js';

import { TERM_RELATIONS } from '../constants/term-relation.constant.js';

/** The kinds discovery may create: kinds of food, never an aspect or a kind of place */
export const DISCOVERY_KINDS = ['cuisine', 'dish', 'drink', 'diet', 'meal', 'ingredient'] as const;

const topicDiscoverySchema = z.object({
	groups: z.array(
		z.object({
			existing: z
				.string()
				.nullable()
				.describe('The key of the existing topic the group is, when one is; null for a new topic'),
			label: z
				.string()
				.nullable()
				.describe('For a new topic: its English label, in the topics\' style ("Smash burgers", "Dürüm", "Pork knuckle", "Avocado"); null with existing'),
			kind: z.enum(DISCOVERY_KINDS).nullable().describe('For a new topic: its kind; null with existing'),
			parent: z
				.string()
				.nullable()
				.describe('For a new topic: the key of the existing topic it is a kind of (Smash burgers under burgers, Dürüm under kebab); null for none'),
			wordings: z
				.array(
					z.object({
						id: z.string(),
						relation: z.enum(TERM_RELATIONS).describe('How the wording is the group\'s topic: same, kind_of or with'),
					}),
				)
				.describe('The wordings that are this topic'),
		}),
	),
});

/** A food topic as the agent sees it */
export interface DiscoveryInputTopic {
	key: string;
	label: string;
	kind: string;
	parent?: string;
}

/** A wording as the agent sees it: how often it was said, and the topics it links to today */
export interface DiscoveryInputWording {
	id: string;
	name: string;
	uses: number;
	links: { key: string; relation: string }[];
}

/**
 * Topic discovery (agent D): groups wordings no topic is the same thing as (unlinked, or linked only
 * as a kind of something or as having something) into the topics they are: an existing one agent C
 * missed, or a new, finer one under the closest parent ("smash burger" + "smashburger" → Smash
 * burgers under Burgers). `TopicDiscoveryService` checks the floors and creates the topics live.
 */
@Injectable()
export class TopicDiscoveryAgent extends BaseMastraAgent<typeof topicDiscoverySchema> {
	protected readonly config: BaseMastraAgentConfig<typeof topicDiscoverySchema> = {
		id: 'topic-discovery',
		name: 'TopicDiscoveryAgent',
		outputSchema: topicDiscoverySchema,
	};

	// A few hundred wordings a call, rarely: mini
	protected getModel(): LlmModelChoice {
		return 'mini';
	}

	protected getInstructions(): string {
		return (
			'You keep the topic tree of a food-culture report: the kinds of food, dishes, drinks, diets, meals and ingredients people ' +
			'talk about in reviews and social media posts. You get the topics (key, label, kind, parent) and wordings people used ' +
			'(any language, as written), each with how often it was said and the topics it links to today: unlinked ones, ones linked ' +
			'only as a kind of something or as having something, and ones linked to a broad topic that a finer one would fit better ' +
			'("smash burger" linked to burgers). A wording already exactly its topic ("Pommes" to fries) belongs to no group. Group the wordings that are one specific thing: its spellings, plurals and translations ("smash burger", ' +
			'"smashburger"; "durum", "dürüm"; "Gemüse kebab", "vegetable kebab", "vegetable döner"; "pork knuckle", "Schweinshaxe"). ' +
			'For each group answer the existing topic it is (existing: its key) when there is one, else a new topic: an English label ' +
			'in the topics\' style, its kind (dish, drink, ingredient for what dishes are made with such as beef, cheese, avocado, ' +
			'mushrooms; cuisine, diet or meal), and its parent: the existing topic it is a kind of, so it still counts for it (Dürüm ' +
			'and Gemüse kebab under kebab, Smash burgers and Cheeseburgers under burgers, Sando under sandwiches, Cheesecake under ' +
			'cake, Oysters under seafood, Sourdough under bread), null when none is. Create a topic only for one specific thing ' +
			'people talk about, never for a general word ("food", "meat", "dishes", "meal", "plate", "drinks", "snacks", ' +
			'"toppings"), a menu or a set, a place, or several things at once ("burger and fries"); leave those wordings out. For each ' +
			'wording of a group give its relation to the group\'s topic: same for a spelling or translation of it, kind_of for a more ' +
			'specific kind of it ("garlic sauce" in a group "Sauces"), with when it only has or is made with it. Use only the keys ' +
			'given for existing and parent. A wording belongs to one group at most; most wordings may belong to none.'
		);
	}
}
