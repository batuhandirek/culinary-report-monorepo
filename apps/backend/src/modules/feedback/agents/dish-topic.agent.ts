import { Injectable } from '@nestjs/common';

import { MastraModelConfig } from '@mastra/core/llm';
import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';

const dishTopicSchema = z.object({
	names: z.array(
		z.object({
			id: z.string(),
			topic: z
				.string()
				.nullable()
				.describe('The key of the topic the dish or drink is a kind of; null when none is'),
			newTopic: z
				.string()
				.nullable()
				.describe(
					'When topic is null and the name is one specific dish or drink: a short English label for a topic that would fit ("Fries"); else null',
				),
		}),
	),
});

/** A dish or drink topic the agent picks from */
export interface DishTopicInputTopic {
	key: string;
	label: string;
	/** Its other names */
	also: string[];
}

/** One dish name, as the rows spell it most */
export interface DishTopicInputName {
	id: string;
	name: string;
}

/**
 * Sorts dish and drink names (any language, misspelt) into the food topics they are a kind of: the
 * `feedback-dish-names` backlog's reader. Each name is asked once (`DishName`).
 */
@Injectable()
export class DishTopicAgent extends BaseMastraAgent<typeof dishTopicSchema> {
	protected readonly config: BaseMastraAgentConfig<typeof dishTopicSchema> = {
		id: 'dish-topic',
		name: 'DishTopicAgent',
		outputSchema: dishTopicSchema,
	};

	// Thousands of short names: mini
	protected getModel(): MastraModelConfig {
		return 'openai/gpt-5.4-mini';
	}

	protected getInstructions(): string {
		return (
			'You sort the names of dishes and drinks, as guests wrote them in reviews and social media posts about restaurants, bars and ' +
			'cafés (any language, often misspelt), into food topics. You get the topics, each with its key, label and other names, and ' +
			'the names. For each name answer the key of the topic the dish or drink is a kind of: "vegan döner", "Dürüm" and "chicken ' +
			'kebap" are kebab; "Spaghetti Vongole", "carbonara" and "Spaghettiiiossso" are pasta; "Nudeln" and "hand-pulled noodles" are ' +
			'noodles; "iced matcha latte" is matcha; "Wiener Schnitzel" is schnitzel. Answer a topic only when the dish or drink is one: ' +
			'a burger bun is no burger, kebab sauce or döner meat no kebab, a pizza oven no pizza, matcha tiramisu a dessert, not matcha. ' +
			'Answer null for a name of several dishes ("burger and fries"), a menu or a set ("lunch menu", "tasting menu"), or a word too ' +
			'general to say what was eaten ("food", "meat", "sauce", "drink", "special", "starter", "vegetables"). When the topic is ' +
			'null and the name is one specific dish or drink no topic covers, also answer newTopic: a short English label in the plural ' +
			'where English uses one, the way the topics are labelled ("Fries", "Hummus", "Coffee", "Soups", "Milkshakes"), the same label ' +
			'for every name of that kind ("pommes", "garlic parmesan fries" and "chips" are all "Fries"); else newTopic is null. Use only ' +
			'the keys given. Return one entry per id.'
		);
	}
}
