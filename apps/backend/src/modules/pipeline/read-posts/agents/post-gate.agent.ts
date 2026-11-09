import { Injectable } from '@nestjs/common';

import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';
import type { LlmModelChoice } from 'src/modules/llm/constants/llm-models.constant.js';
import { PostSkipReasonEnum } from 'src/modules/social/entities/social-post.entity.js';

/** The reasons the gate may answer (`no_content` is decided in code, before the gate) */
const GATE_REASONS = [
	PostSkipReasonEnum.NOT_FOOD,
	PostSkipReasonEnum.HOME_COOKING,
	PostSkipReasonEnum.GROCERIES,
	PostSkipReasonEnum.OUTDOORS,
	PostSkipReasonEnum.OTHER_CITY,
] as const;

const postGateSchema = z.object({
	digest: z
		.boolean()
		.describe(
			'True when the post is about eating or drinking out in the city (see the instructions)',
		),
	reason: z
		.enum(GATE_REASONS)
		.nullable()
		.describe('When not digested, what it is about instead; null when digested'),
});

/** The gate's answer on one post */
export type PostGateAnswer = z.infer<typeof postGateSchema>;

/** One post as the gate sees it: the start of its text, never all of it */
export interface PostGateInput {
	platform: string;
	/** The brand whose own account posted it */
	ownBrand?: string;
	/** The place the post is tagged at */
	location?: string;
	/** The caption or the article's start, cut */
	text: string;
	/** The transcript's start, cut */
	transcript?: string;
}

export interface PostGateContext {
	cityName: string;
}

/**
 * The gate: whether a post or article is worth digesting at all (agent A, places and claims), on
 * the start of its text, one post a call. A post not about eating or drinking out in the city
 * (music, a recipe, supermarket deals, foraging, another city) is not digested and keeps the
 * reason. When in doubt it digests: a wrong skip loses a source, a wrong digest only costs a read.
 */
@Injectable()
export class PostGateAgent extends BaseMastraAgent<typeof postGateSchema, PostGateContext> {
	protected readonly config: BaseMastraAgentConfig<typeof postGateSchema> = {
		id: 'post-gate',
		name: 'PostGateAgent',
		outputSchema: postGateSchema,
		// Haiku once mini's allowance is out (the user's call, 2026-11-09): review reading uses the
		// day's mini, and a post waiting at the gate waits for its whole reading (~$0.0001 a post)
		paidFallback: true,
	};

	// Every post the scrapes find, a few hundred tokens each: mini
	protected getModel(): LlmModelChoice {
		return 'mini';
	}

	protected getInstructions(context?: PostGateContext): string {
		const city = context?.cityName ?? 'the city';
		return (
			`You decide whether a food-culture report on ${city} should read one social media post or blog article. You see the start ` +
			`of its caption or article and of its speech transcript. Digest it when it is about eating or drinking out in ` +
			`${city}: a restaurant, café, bar, bakery, food truck, market stall or food shop there; a dish or drink people have out; ` +
			`openings, closings, prices or trends of ${city}'s food places; a place's own post about its menu, a new dish or its ` +
			`hours. A food post that names no place still counts when it is about food out in ${city} (a street-food tour, "the best ` +
			`döner in ${city}"). Do not digest, and give the reason: not_food when it is about something else (music, fashion, ` +
			`politics, sport, a creator's life, a book café's books); home_cooking for a recipe, cooking or meal prep at home; ` +
			`groceries for supermarket deals, products on a shelf or a shopping haul; outdoors for foraging, a picnic, a garden or a ` +
			`barbecue in a park; other_city only when the post names another city or a place there as where it is (a post found ` +
			`through ${city}'s hashtags, tagged at a place, or comparing with home ("UK Burger King could never") is in ${city}). ` +
			`A tagged location is where the post was made. Hashtags alone decide nothing: #berlinfood is on posts about anything. ` +
			`When in doubt, digest.`
		);
	}

	// Worked examples (invented): they teach the cases a quick model gets wrong, and keep the fixed
	// instructions past the 1,024 tokens a provider caches from
	protected getCoaching(): string {
		return (
			'Examples. Digest: "Best smash burger I had this year 🍔 at Patty Club" (a dish out at a named place); "POV: you ' +
			'finally try the viral pistachio croissant", tagged at a bakery (the tag is the place); "Our autumn menu starts Thursday: ' +
			'pumpkin gnocchi and chestnut tiramisu" by a restaurant\'s own account (a place\'s own news); "5 stalls you must try at the ' +
			'Thursday street-food market" with no stall named (food out in the city); "Which café has the best wifi to work from?" ' +
			'(a question about places here); "UK Burger King could never, the Whopper here hits different", tagged here (comparing ' +
			'with home: it is here); "This place closed after 20 years, end of an era" about a local diner (a closing); "Döner prices ' +
			'went up again, now 9 €" (prices of food out here); a review-style video with only a transcript praising a dumpling shop ' +
			'(the transcript says what it is about). Do not digest: "3 easy meal-prep bowls for the week" (home_cooking); "My ' +
			'grandma\'s stuffed peppers, recipe in caption" (home_cooking); "Haul from the Asian supermarket, everything under 20 €" ' +
			'(groceries); "New protein bar flavour in every drugstore now" (groceries: a product on a shelf); "Where we forage wild ' +
			'garlic in the forest" (outdoors); "Picnic spread at the lake 🧺" (outdoors); "Outfit check before date night" with a ' +
			'restaurant tag only as the backdrop (not_food: the outfit is the subject); "Concert tonight, doors at 8" at a club ' +
			'(not_food); "Best ramen in Hamburg" found through this city\'s hashtags (other_city: it names another city as where it is); ' +
			'"Weekend in Paris: the bakeries" (other_city). A post that mixes a trip home with a meal here is digested; a post with only ' +
			'hashtags and emoji says nothing and is never sent to you.'
		);
	}
}
