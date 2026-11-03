import { Injectable } from '@nestjs/common';

import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';
import type { LlmModelChoice } from 'src/modules/llm/constants/llm-models.constant.js';
import { claimSchema } from 'src/modules/venues/agents/review-claims.agent.js';

/** A's answer for one post: also the frame of the one-call post reader (`PostReaderAgent`), whose claims carry B's parts */
export const postClaimsSchema = z.object({
	isPromotional: z
		.boolean()
		.describe(
			'True only for a post by someone other than the venue (a creator, a blog) that a venue paid for, gifted or invited: a paid partnership, an ad, a gifted meal, "invited by", a collab or a giveaway. A venue\'s own post about itself is never promotional',
		),
	places: z
		.array(
			z.object({
				venueName: z
					.string()
					.describe(
						'Venue name, with obvious transcription errors fixed using the caption and hashtags',
					),
				locationHint: z
					.string()
					.nullable()
					.describe(
						'Neighborhood, street, station or landmark the post itself gives for this venue; null when it gives none. Never fill it in from what you know about the venue',
					),
				cuisine: z
					.string()
					.nullable()
					.describe(
						'The kinds of food it serves, comma-separated, most specific first, e.g. "Pho, Vietnamese" or "Vegan, Döner & kebab"',
					),
				city: z
					.string()
					.nullable()
					.describe(
						'City the venue is in, if stated or clearly implied, e.g. "Berlin", "London"',
					),
				visited: z
					.boolean()
					.describe('False if the creator says they have not been there themselves'),
				isNewOpening: z
					.boolean()
					.describe(
						'True only when the post itself says this venue has opened or is opening (eröffnet, Neueröffnung, grand opening, just opened, soft opening, opening week). Calling it "new", "neu", "a new spot" or "a new foodspot" is not enough: that is how places get promoted. False for a new dish, menu or branch of an old place, a reopening or new concept of an existing place, a place telling how long it has been open ("six months already"), a #new hashtag alone, for "new to me", and for anything you know about the venue but the post does not say',
					),
			}),
		)
		.describe(
			'Every specific place that serves or sells food or drink talked about (restaurant, café, bar, bakery, food truck, market stall, food hall, shop). Never a park, forest, district, street, square, museum, event, festival or organisation. Empty if none.',
		),
	claims: z
		.array(
			claimSchema.extend({
				subject: z
					.enum(['place', 'city', 'none'])
					.describe(
						'Who the claim is about: one of the places above, the city as a whole, or neither',
					),
				place: z
					.string()
					.nullable()
					.describe(
						'For subject place: the venueName of the place it is about, written exactly as in places; null otherwise',
					),
			}),
		)
		.describe(
			'Everything the text says, one claim each: about a place, about the city ("Berlin has increasing prices"), or about neither',
		),
});

/** Agent A's answer for one post or article (or one part of a long one): a claim names its place */
export type PostClaimsAnswer = z.infer<typeof postClaimsSchema>;

/** The answer as the pipeline stores it: a claim's place by its index in places (`readPostClaims`) */
export type PostClaimsReading = Omit<PostClaimsAnswer, 'claims'> & {
	claims: (Omit<PostClaimsAnswer['claims'][number], 'place'> & { place: number | null })[];
};

/** The city whose scrape found the post (`City.name`) and the food topics' labels for the cuisine field. */
export interface PostClaimsContext {
	cityName: string;
	/** The food topics' labels (`TopicIndex.food`): the cuisine words the reports group by */
	topics?: string[];
}

/**
 * Agent A for posts and articles: the places a post or blog article talks about (today's mention
 * fields) and its claims, each about one of those places, the city, or nothing. No aspect, dish
 * or number here: agent B reads those from the claims.
 */
@Injectable()
export class PostClaimsAgent extends BaseMastraAgent<typeof postClaimsSchema, PostClaimsContext> {
	protected readonly config: BaseMastraAgentConfig<typeof postClaimsSchema> = {
		id: 'post-claims',
		name: 'PostClaimsAgent',
		outputSchema: postClaimsSchema,
	};

	// Hundreds of posts a month (~3,000 tokens each with transcripts): mini, whose daily complimentary
	// allowance is 10M tokens; 641 posts used 0.9M of the full model's 1M
	protected getModel(): LlmModelChoice {
		return 'mini';
	}

	protected getInstructions(context?: PostClaimsContext): string {
		const city = context?.cityName;
		return (
			`You read ${city ? `${city} ` : ''}social media posts and food blog articles for a report to restaurant, bar and café owners: the places each talks about, and what it says. ` +
			`For a post you get the caption, hashtags, tagged location and, when available, the speech transcript; for a blog article its title and text, where a link to a social profile follows the linked words in parentheses ("Kaffeebar (instagram.com/kaffeebar)"): an account linked from a venue's name is that venue's and confirms its spelling. ` +
			`A blog article or list may name many venues: include each one it says something about. ` +
			`Transcripts are machine-generated and often misspell names; prefer spellings from the caption, hashtags or tagged location. ` +
			`Hashtags of a city also attract posts about other cities, so record the venue's city when known. ` +
			`A post tagged at a venue that describes a visit there counts as a mention of that venue, even if the caption does not repeat its name. ` +
			`Only include venues that are specifically named or tagged. ` +
			`A place is somewhere that serves or sells food or drink: a restaurant, café, bar, bakery, food truck, market stall, food hall or shop. A park, forest, lake, district, street, square, landmark, museum, club, event, festival, market day or organisation is never a place: what the text says about it is about the city or about nothing. ` +
			`When the input says the post is by a venue's own account, list that venue as a place (its venueName as given) even when the text never names it, and what the post says about its food, drinks, menu, prices or opening hours is about it. ` +
			`Then split what the text says about food, drink, places and the city's food scene into claims: one thing said per claim, as a short English phrase that keeps the words that matter — what was eaten or drunk, spelled as the author spells it ("Pommes" stays "Pommes"), the numbers stated (prices, minutes waited), who it is about. ` +
			`"Damn good fries for 10 euros" is two claims: "the fries were damn good" and "the fries cost 10 euros". Keep neutral facts with no judgement about a dish, a drink, a place, its prices, service, atmosphere or a visit, and every dish or drink named, as a claim of its own when no other claim names it. ` +
			`A claim is about one of the places (it names it as in places), about the city as a whole ("Berlin has increasing prices in the last years"), or about food or drink in general (subject none: "the burger uses fried onions"). ` +
			`Not claims, leave them out: the creator's personal life and feelings unrelated to food ("she has to buy her mother flowers"), a recipe's steps, timings and quantities, the video's own narration ("link in bio", "part two tomorrow"), and anything about no food, drink, place or the city. ` +
			`A claim names what it is about: "the Gemüse kebab is incredibly delicious", never "it is incredibly delicious"; "the dürüm and the box were delicious", never "both were". ` +
			`With each claim give its quote: the exact words of the caption, transcript or article it comes from, copied character for character in their language (never translated), the shortest span that says it. ` +
			`Only what the text says: never add, judge or summarise a claim; within that scope never drop one because it fits no category. ` +
			`isPromotional is true only for a post by someone other than the venue, a creator or a blog, that a venue paid for, gifted or invited: a paid partnership, an ad, a gifted meal, "invited by", a collab or a giveaway with the venue. It is false for a venue's own post about itself (its menu, its offers, "come by": that is the venue's own post, counted apart), for a creator's own unpaid visit even with a disclosure such as "unpaid ad" or "not sponsored", and for a creator plugging their own guide, app or channel. ` +
			`Mark a venue as a new opening only when the post itself says it is new or has just opened; a new dish, a new menu or a creator's first visit is not an opening. ` +
			(context?.topics?.length ?
				`For cuisine, use these words where one fits: ${context.topics.join(', ')}. Use another short English word only when none fits. `
			:	'') +
			`Write everything in concise English.`
		);
	}

	// Where a quick reader goes wrong, as a careful one (the eval's references) reads the same rules
	protected getCoaching(): string {
		return (
			'Never start a claim with "it", "this", "that" or "they" for a thing: name what it is about every time, the dish, drink, place or part of the visit, even when the text only points at it ("schmeckt fast wie Karamell" after the creator holds up a sweet they never name is "the sweet tastes almost like caramel", never "it tastes almost like caramel"; "it tasted meaty" after "the jackfruit burger" is "the jackfruit burger tasted meaty"). ' +
			'Phrase a claim by what is meant, never word for word: an idiom says its meaning ("das war ein Griff ins Klo" is ' +
			'"the visit was a bad choice"). A claim\'s subject is what its sentence is about in the text, whether or not the ' +
			"claim's words name it: in a post about a visit to one place, every dish, drink, price, portion, wait and moment of " +
			'that visit is about that place ("the broth was too salty" said at a ramen bar is that bar\'s). Subject none is only ' +
			'food or drink with no place behind it: where a dish comes from or how it is made anywhere ("mochi are made from ' +
			'rice"). A place\'s dish called the best in the city is still about that place.'
		);
	}
}
