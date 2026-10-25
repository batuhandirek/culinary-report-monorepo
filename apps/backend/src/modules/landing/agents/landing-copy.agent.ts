import { Injectable } from '@nestjs/common';

import { MastraModelConfig } from '@mastra/core/llm';
import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';

import { LINE_WORDS } from '../util/landing-copy.js';

const landingCopySchema = z.object({
	lede: z
		.string()
		.describe(
			`The hero paragraph, at most ${LINE_WORDS.lede} words: the 30 days in one breath, three of the biggest facts, ending on the city talking rather than one critic`,
		),
	places: z
		.array(
			z.object({
				brandId: z.string(),
				said: z
					.string()
					.describe(
						`What the city said about the place, at most two sentences and ${LINE_WORDS.said} words, from its praise and what its posts said`,
					),
				tagline: z
					.string()
					.describe(
						`At most ${LINE_WORDS.tagline} words, lowercase start, no full stop: what the place is about right now, e.g. "the chicken half the city queued for"`,
					),
			}),
		)
		.describe('One per place, every place given'),
	dishes: z
		.array(
			z.object({
				key: z.string(),
				text: z
					.string()
					.describe(
						`At most ${LINE_WORDS.dish} words: why the city couldn't put it down, and where it got it`,
					),
				sticker: z
					.string()
					.describe(
						'A playful tag of one or two words for the tile\'s sticker about this dish right now, no numbers and never the tile\'s own name (not "Dish of the month", "Rising", "Drink"), e.g. "Everywhere", "Late bloomer", "Comfort pick"',
					),
			}),
		)
		.describe('One per dish, every dish given'),
	trends: z
		.array(
			z.object({
				storyId: z.string().describe('The storyId of one of trendCandidates'),
				title: z
					.string()
					.describe(
						`At most ${LINE_WORDS.trendTitle} words, sentence case, ending with a full stop, e.g. "Brunch moved north."`,
					),
				text: z
					.string()
					.describe(
						`At most ${LINE_WORDS.trendText} words: the fact behind the title, with its numbers`,
					),
			}),
		)
		.describe('Exactly three, picked among trendCandidates: the three most surprising'),
	ticker: z
		.array(
			z.object({
				storyId: z.string().describe('The storyId of one of tickerStories'),
				text: z
					.string()
					.describe(
						`At most ${LINE_WORDS.ticker} words: the fact with its numbers, then a short punchline`,
					),
			}),
		)
		.describe('One per ticker story, every one given'),
	openings: z
		.array(
			z.object({
				brandId: z.string(),
				text: z
					.string()
					.describe(
						`At most ${LINE_WORDS.opening} words: what is new there and what the first posts said about it`,
					),
			}),
		)
		.describe('One per opening, every opening given'),
});

/** The edition's city (`City.name`). */
export interface LandingCopyContext {
	cityName: string;
}

/**
 * The jokey lines of the front page's live edition: the hero's paragraph, what the city said
 * about each listed place, dish tiles, trend tiles, the "right now" strip, New in Town. Public
 * copy that publishes itself, so it runs on the full model and every line is checked against
 * its numbers before it goes out (`checkCopy`).
 */
@Injectable()
export class LandingCopyAgent extends BaseMastraAgent<
	typeof landingCopySchema,
	LandingCopyContext
> {
	protected readonly config: BaseMastraAgentConfig<typeof landingCopySchema> = {
		id: 'landing-copy',
		name: 'LandingCopyAgent',
		outputSchema: landingCopySchema,
	};

	protected getModel(): MastraModelConfig {
		return 'openai/gpt-5.4';
	}

	protected getInstructions(context?: LandingCopyContext): string {
		const city = context?.cityName ?? 'the city';
		return (
			`You write the front page of Munchwerk ${city}: what ${city} posted about eating out in the last 30 days, ` +
			'counted from public TikTok, Instagram and blog posts. The voice is the friend who always knows where everyone ' +
			'is eating, and can prove it: playful, never snarky. Every line is a fact with its number, then a wink: a pun, ' +
			'a dry aside, a punchline of a few words. One joke per line at most; facts stay plain. ' +
			`Talk about the city, not about us: "${city} couldn't stop posting about…", never "our data shows". ` +
			'Short sentences, sentence case, English, plain words. Write "people" or "creators", never "influencers". ' +
			'Never write: insights, analytics, data-driven, leverage, hidden gem, foodie, must-try, viral, game-changer, ' +
			'stars, rating, two exclamation marks, emoji. ' +
			'Use only what the input gives. Every number you write must appear in the input for that line (round big numbers ' +
			'the way people say them: 1.4M views, 591k views), written as digits. Never invent a detail the input does not ' +
			'state: no queues, waits, prices, opening days, owners, menus, times of day or neighbourhood stories unless the ' +
			"praise or what posts said mention them. praiseInPosts and whatPostsSaid are the posts' own words, paraphrase " +
			'them, never quote a whole one. Everything on the page is positive: never say anything bad about a named place, ' +
			'never compare places to say one is worse, and leave out anything that is not praise. Movement only ever goes ' +
			'up, holds or is new: never mention a fall, and say it as movement gives it ("climbed 7 places", "held its place", ' +
			'"new to the list"). Views are given rounded: write them as given. ' +
			"A place's where says where it is: for a chain it is several places, so never pin it to one street. " +
			'A dish role says its tile: dish_of_the_month is the dish whose share of posts naming a dish rose the most, ' +
			'rising the next, most_named the most named, drink the drink of the moment. ' +
			'Trend titles are a short decision the city made ("Sonnenallee is the street.", "Brunch moved north."), the ' +
			'text the fact with its numbers. Ticker lines are one breath each: the fact, then the punchline. ' +
			'An opening is new according to posts that called it new: say "first called new on <day>", never that it ' +
			'opened on a day. ' +
			'Answer every place, dish, opening and ticker story given, with its own id; pick exactly three trendCandidates.'
		);
	}
}
