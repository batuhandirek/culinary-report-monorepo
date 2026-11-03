import { Injectable } from '@nestjs/common';

import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';
import type { LlmModelChoice } from 'src/modules/llm/constants/llm-models.constant.js';

import { KIND_RULES, STATEMENT_KINDS } from '../constants/kind.constant.js';
import { SENTIMENTS } from '../constants/sentiment.constant.js';

const claimPartsSchema = z.object({
	sentiment: z
		.enum(SENTIMENTS)
		.describe(
			'How the claim judges what it is about: positive, negative, mixed, or neutral for a fact with no judgement',
		),
	aspect: z
		.string()
		.nullable()
		.describe(
			'The key of the one aspect the claim is about, from the aspects in the instructions; null when none fits',
		),
	foods: z
		.array(z.string())
		.describe(
			'The dishes, drinks, ingredients or kinds of food the claim names, each spelled exactly as the source spells it, never translated or normalised; empty when it names none',
		),
	amount: z
		.number()
		.nullable()
		.describe('The number the claim states for its unit; null when it states none'),
	unit: z
		.enum(['minutes', 'money'])
		.nullable()
		.describe(
			'What the amount measures: minutes waited, or a price in the local currency; null with amount null',
		),
	kind: z
		.enum(STATEMENT_KINDS)
		.describe('What sort of thing the claim says (see the instructions)'),
});

/** One claim as the parts pass sends it */
export interface ClaimPartsInputClaim {
	id: string;
	text: string;
	/** The source's own words, in its language, when the claim has them */
	quote?: string;
}

/** One source's claims, so a claim can be read next to its siblings ("crispy and juicy" after "we had the wings") */
export interface ClaimPartsInputSource {
	/** review | post | comment | press */
	kind: string;
	/** The place the claims are about, when there is one */
	venue: string | null;
	claims: ClaimPartsInputClaim[];
}

/** The aspects' legend (`TopicIndex.aspectLegend`), read from the topics table per call */
export interface ClaimPartsContext {
	legend: string;
}

/**
 * Agent B: the parts of stored claims, from the claim's text alone (never a source read again):
 * its sentiment, the aspect it is about, the food wordings it names as spelled, the number it
 * states, its kind (`KIND_RULES`; final). One claim a call, its source's other claims beside it (`claimPartsQuestions`).
 */
@Injectable()
export class ClaimPartsAgent extends BaseMastraAgent<typeof claimPartsSchema, ClaimPartsContext> {
	protected readonly config: BaseMastraAgentConfig<typeof claimPartsSchema> = {
		id: 'claim-parts',
		name: 'ClaimPartsAgent',
		outputSchema: claimPartsSchema,
	};

	// Tens of thousands of short claims, ~15 tokens each: mini
	protected getModel(): LlmModelChoice {
		return 'mini';
	}

	protected getInstructions(context?: ClaimPartsContext): string {
		return (
			'You break one short claim about a restaurant, bar or café into its parts. It was read from one source, a Google ' +
			'review, social media post, blog article or comment, and comes with the place the source is about and the source\'s other ' +
			'claims, so you can read it next to them ("crispy and juicy" after "we had the wings" is about the wings). Answer for this ' +
			'claim only: its sentiment (neutral for a fact with no judgement: "fries for 10 euros"; mixed ' +
			'when it praises and criticises at once); the one aspect it is about, the key from the list below, the one that fits best, a ' +
			'root ("price", "food") only when none of the finer aspects under it fits, null when the claim is about none (an aspect says ' +
			'what the claim is about, not whether it was good or bad: portion_size covers generous and small portions; prices that went ' +
			'up since an earlier visit are price_level, and its kind says it changed; portions that got smaller are ' +
			'portion_size); the foods and drinks it names, each spelled exactly as written in the claim, or in its quote when the claim ' +
			'has one (the source\'s own words: "Pommes" in the quote stays "Pommes" even when the English says fries), never ' +
			'translated, normalised or completed ' +
			'("Pommes" stays "Pommes", "the döner" is "döner"; empty when it is about the place, the service or the food in general; a ' +
			'general word is never a food: "food", "dishes", "meal", "plate", "drinks", "snacks", "toppings", "menu"); ' +
			'the number it states, only when the text states it, never an estimate: for a wait the minutes ("an hour" is 60, "half an ' +
			'hour" 30, "30 to 40 minutes" 40), for a price the price ("dürüm now €9.50" is 9.5), with its unit, and null for "waited ' +
			'forever" or "pricey"; and its kind. ' +
			KIND_RULES +
			' Never drop a claim because no aspect fits: answer it with aspect ' +
			`null. The aspects, by root, each with its key and what it covers: ${context?.legend ?? ''}.`
		);
	}

	// Where a quick reader goes wrong, as a careful one (the eval's references) reads the same rules
	protected getCoaching(): string {
		return (
			'Read closely: a post or article that describes approvingly judges ("the pistachio tiramisu was simply wow", "the crust ' +
			'is thin and blistered", "loved by every food magazine", "a must when you visit"), so it is positive and an opinion, ' +
			'however neutral or promotional the tone; neutral is only for a fact that judges nothing ("open until 22"). Nearly ' +
			'every claim has an aspect: what a place serves or offers ("the place serves Georgian cuisine", "they have bagels, ' +
			'cinnamon buns and soups") is menu_variety, a dish described or judged is about the food aspect that fits (taste, ' +
			'cooking, presentation, …) or food; null only when the claim is about nothing the list covers ("came on a Tuesday", ' +
			'"the owners are two brothers"). A food the claim is about counts even when its words only point at it ("it was ' +
			'greasy" after "the lahmacun came cold" is about the lahmacun); when its quote does not name it ("schön knusprig" for ' +
			'"the schnitzel was nicely crispy"), spell it as the quotes of the other claims spell it ("Schnitzel"). ' +
			'The root other is not "none": a rating, a ranking, an award, a recommendation, a visit, an event or what kind of ' +
			"place it is has no aspect, so answer null; other is for the place's practicalities when none of the aspects under " +
			'it fits; music, a band or a DJ is atmosphere. Foods: read the quote, not the English text, which is a translation: copy each food word out of the quote ' +
			'letter for letter, in its language (quote "zwei Stück Apfelkuchen", text "two slices of apple cake": "Apfelkuchen", ' +
			'never "apple cake"), and use the English only when no quote of the source names the food. Name every dish, drink, ' +
			'ingredient, sauce, side, topping or flavour the claim names, not only the main one ("a burger with Obatzda, radish ' +
			'and a pretzel bun": burger, Obatzda, radish, pretzel bun). A general word is never a food in any language ' +
			'("Getränke", "Speisen", "Spezialitäten", "yemekler"). ' +
			'Praise someone else gave is still praise: a score or star rating ("rated 7/10", "4.7 stars"), a place in a guide\'s ' +
			"picks or a top ten, a critic's or a friend's recommendation, someone's go-to spot, \"you have to order the " +
			'dumplings" are positive, never a neutral fact: about the place as a whole a verdict, about one dish an opinion; a ' +
			'low score ("3 out of 10") is negative. A change needs a before and an after at this same place, said or plainly ' +
			'meant ("used to", "no longer", "this time … than last time", "new owners"); words that only sound like change are ' +
			'not one: a menu that rotates on schedule ("the specials switch every Friday"), a difference between two items or ' +
			'sizes ("the large one costs 2 € more"), what is or is not served on one special day, someone changing their own ' +
			'mind ("it won me over"), something that stayed the same, an opening or a new branch. A handover to new owners or ' +
			'a new name is a change even when told as news.'
		);
	}
}
