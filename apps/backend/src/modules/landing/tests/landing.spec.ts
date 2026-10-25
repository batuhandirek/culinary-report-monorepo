import { describe, expect, it } from '@jest/globals';

import { FoodTopicKindEnum } from 'src/modules/food-topics/entities/food-topic.entity.js';
import { seedIndex } from 'src/modules/food-topics/tests/factories/food-topic.factory.js';
import { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';

import type { LandingEditionData } from '../interfaces/landing-edition.interface.js';
import {
	computeLanding,
	type LandingFeedbackRow,
	type LandingInput,
	type LandingMentionRow,
	type LandingVenueRow,
	landingWindow,
	streetLabel,
	viewsLabel,
} from '../util/landing.js';
import {
	checkCopy,
	type LandingCopyAnswer,
	lineProblem,
	numbersOf,
	statedNumbers,
} from '../util/landing-copy.js';
import { landingPrompt } from '../util/landing-prompt.js';

const END = new Date('2026-10-25T00:00:00Z');
const index = seedIndex();

let mentionId = 0;
const mention = (
	o: Partial<LandingMentionRow> & { brandId: string; postId: string },
): LandingMentionRow => ({
	mentionId: ++mentionId,
	externalId: o.postId,
	platform: SocialPlatformEnum.TIKTOK,
	url: `https://www.tiktok.com/@x/video/${o.postId}`,
	views: 100,
	postedAt: new Date('2026-10-20T12:00:00Z'),
	handle: `h_${o.postId}`,
	creatorKey: `c_${o.postId}`,
	brandName: o.brandId,
	venueId: `${o.brandId}-v`,
	district: 'Mitte',
	street: 'Torstraße 1',
	sentiment: 'positive',
	summary: 'Good.',
	topics: [],
	...o,
});

/** n posts about a brand, each by its own person unless `creators` caps them. */
const posts = (
	brandId: string,
	n: number,
	o: Partial<LandingMentionRow> & { creators?: number } = {},
) =>
	Array.from({ length: n }, (_, i) =>
		mention({
			brandId,
			postId: `${brandId}-${o.postedAt?.toISOString() ?? 'now'}-${i}`,
			creatorKey: `${brandId}-person-${i % (o.creators ?? n)}`,
			...o,
		}),
	);

const venue = (brandId: string, o: Partial<LandingVenueRow> = {}): LandingVenueRow => ({
	venueId: `${brandId}-v`,
	brandId,
	district: 'Mitte',
	street: 'Torstraße 1',
	reviewsCount: 500,
	...o,
});

const dishRow = (
	m: LandingMentionRow,
	dish: string,
	o: Partial<LandingFeedbackRow> = {},
): LandingFeedbackRow => ({
	mentionId: m.mentionId,
	postId: m.postId,
	brandId: m.brandId,
	views: m.views,
	sentiment: 'positive',
	theme: null,
	detail: null,
	dish,
	dishKey: dish.toLowerCase(),
	topicKey: null,
	topicLabel: null,
	topicKind: null,
	...o,
});

const input = (o: Partial<LandingInput>): LandingInput => ({
	cityName: 'Berlin',
	end: END,
	current: { mentions: [], feedback: [] },
	previous: { mentions: [], feedback: [] },
	venues: [],
	openingSigns: [],
	index,
	doNotList: { venues: [], creators: [] },
	...o,
});

const BEFORE = new Date('2026-09-10T12:00:00Z');

describe('landing window', () => {
	it('counts the 30 whole days before the build day, against the 30 before', () => {
		const w = landingWindow(new Date('2026-10-25T06:30:00Z'));
		expect(w.end.toISOString()).toBe('2026-10-25T00:00:00.000Z');
		expect(w.start.toISOString()).toBe('2026-09-25T00:00:00.000Z');
		expect(w.previousStart.toISOString()).toBe('2026-08-26T00:00:00.000Z');
		expect(w.openingsSince.toISOString()).toBe('2026-10-11T00:00:00.000Z');
	});

	it('writes streets without house numbers and what Google appends', () => {
		expect(streetLabel('Torstraße 125')).toBe('Torstraße');
		expect(streetLabel('Eisenbahnstraße 42/43')).toBe('Eisenbahnstraße');
		expect(streetLabel('Europaplatz 1 Berlin Hauptbahnhof')).toBe('Europaplatz');
		expect(streetLabel('Reinhardtstraße 29 c')).toBe('Reinhardtstraße');
		expect(streetLabel('Straße des 17. Juni 112')).toBe('Straße des 17. Juni');
		expect(streetLabel('Görlitzer Str.')).toBe('Görlitzer Str.');
		expect(streetLabel('12')).toBeUndefined();
		expect(streetLabel(null)).toBeUndefined();
	});

	it('says views the way people do', () => {
		expect(viewsLabel(5_079)).toBe('5,079');
		expect(viewsLabel(172_516)).toBe('173k');
		expect(viewsLabel(1_378_152)).toBe('1.4M');
		expect(viewsLabel(2_000_000)).toBe('2M');
	});
});

describe('computeLanding', () => {
	it('ranks by people, then posts, then views, and never shows a fall', () => {
		const data = computeLanding(
			input({
				current: {
					mentions: [
						// One account posting ten times is one voice
						...posts('Loud Solo', 10, { creators: 1, views: 1_000_000 }),
						...posts('Crowd', 4),
						...posts('Duo', 3, { creators: 2 }),
						...posts('Fell', 2),
					],
					feedback: [],
				},
				previous: {
					mentions: [
						...posts('Fell', 9, { postedAt: BEFORE }),
						...posts('Duo', 5, { postedAt: BEFORE }),
						...posts('Crowd', 4, { postedAt: BEFORE }),
					],
					feedback: [],
				},
				venues: ['Loud Solo', 'Crowd', 'Duo', 'Fell'].map(b => venue(b)),
			}),
		);
		// Before: Fell 1, Duo 2, Crowd 3. A fall shows nothing; ten posts by one person rank last
		expect(data.places.map(p => [p.rank, p.name, p.creators, p.move, p.climb])).toEqual([
			[1, 'Crowd', 4, 'up', 2],
			[2, 'Duo', 2, 'held', undefined],
			[3, 'Fell', 2, 'none', undefined],
			[4, 'Loud Solo', 1, 'new', undefined],
		]);
		expect(data.places[0]).toMatchObject({
			prevRank: 3,
			district: 'Mitte',
			street: 'Torstraße',
			branches: 1,
		});
		expect(data.totals).toEqual({ posts: 19, views: 10_000_900, creators: 9, places: 4 });
	});

	it('leaves the do-not-list out of every list, never out of the totals', () => {
		const data = computeLanding(
			input({
				current: {
					mentions: [...posts('Quiet Corner', 5), ...posts('Sori', 2)],
					feedback: [],
				},
				venues: [venue('Quiet Corner'), venue('Sori')],
				doNotList: { venues: ['Quiet Corner'], creators: [] },
			}),
		);
		expect(data.places.map(p => p.name)).toEqual(['Sori']);
		expect(JSON.stringify(data.stories)).not.toContain('Quiet Corner');
		expect(data.totals.posts).toBe(7);
	});

	it('takes a chain as several places and pins it to the branch its posts named most', () => {
		const data = computeLanding(
			input({
				current: {
					mentions: posts('Chain', 3, { venueId: 'Chain-k', district: 'Kreuzberg' }),
					feedback: [],
				},
				venues: [
					venue('Chain', { venueId: 'Chain-m', reviewsCount: 9_000 }),
					venue('Chain', {
						venueId: 'Chain-k',
						district: 'Kreuzberg',
						street: 'Oranienstraße 12a',
					}),
				],
			}),
		);
		expect(data.places[0]).toMatchObject({
			branches: 2,
			district: 'Kreuzberg',
			street: 'Oranienstraße',
		});
	});

	it("names a place's dish of the moment from 2 posts on", () => {
		const ms = posts('Sori', 3);
		const data = computeLanding(
			input({
				current: {
					mentions: ms,
					feedback: [
						dishRow(ms[0], 'Tonkotsu'),
						dishRow(ms[1], 'tonkotsu'),
						dishRow(ms[2], 'Gyoza'),
					],
				},
				venues: [venue('Sori')],
			}),
		);
		expect(data.places[0].dish).toEqual({ label: 'Tonkotsu', posts: 2 });
	});

	it('picks dishes by the rise of their share, a drink apart, and lists the marquee by posts', () => {
		const now = posts('A', 20);
		const before = posts('A', 20, { postedAt: BEFORE });
		const topic = (key: string, label: string, kind = FoodTopicKindEnum.DISH) => ({
			topicKey: key,
			topicLabel: label,
			topicKind: kind,
		});
		const data = computeLanding(
			input({
				current: {
					mentions: now,
					feedback: [
						// Burgers 10 of 20 posts now, 2 before: the dish of the month
						...now
							.slice(0, 10)
							.map(m => dishRow(m, 'Burger', topic('burgers', 'Burgers'))),
						// Pizza 6 now, 6 before: named a lot, no rise
						...now.slice(10, 16).map(m => dishRow(m, 'pizza', topic('pizza', 'Pizza'))),
						// Ramen 5 now, 1 before
						...now.slice(16, 20).map(m => dishRow(m, 'ramen', topic('ramen', 'Ramen'))),
						dishRow(now[0], 'ramen', topic('ramen', 'Ramen')),
						// Tea, a drink
						...now
							.slice(0, 5)
							.map(m =>
								dishRow(m, 'tea', topic('tea', 'Tea', FoodTopicKindEnum.DRINK)),
							),
					],
				},
				previous: {
					mentions: before,
					feedback: [
						...before
							.slice(0, 2)
							.map(m => dishRow(m, 'Burger', topic('burgers', 'Burgers'))),
						...before
							.slice(2, 8)
							.map(m => dishRow(m, 'pizza', topic('pizza', 'Pizza'))),
						dishRow(before[8], 'ramen', topic('ramen', 'Ramen')),
						...before.slice(9, 20).map(m => dishRow(m, 'Schnitzel')),
					],
				},
				venues: [venue('A')],
			}),
		);
		expect(data.dishes.map(d => [d.role, d.label, d.posts])).toEqual([
			['dish_of_the_month', 'Burgers', 10],
			['rising', 'Ramen', 5],
			['most_named', 'Pizza', 6],
			['drink', 'Tea', 5],
		]);
		expect(data.dishes[0]).toMatchObject({
			share: 50,
			delta: 40,
			places: 1,
			topPlaces: [{ name: 'A', posts: 10 }],
		});
		expect(data.marquee.slice(0, 2)).toEqual(['Burgers', 'Pizza']);
	});

	it('lists a place as new only when its first sign of being new is in the last 14 days', () => {
		const data = computeLanding(
			input({
				current: {
					mentions: [
						...posts('Fresh', 3),
						...posts('Old News', 4),
						...posts('Big Old', 2),
						...posts('Scraped', 1),
					],
					feedback: [],
				},
				venues: [
					venue('Fresh', { reviewsCount: 12 }),
					venue('Old News', { reviewsCount: 40 }),
					venue('Big Old', { reviewsCount: 2_000 }),
					venue('Scraped', { reviewsCount: null }),
				],
				openingSigns: [
					{ brandId: 'Fresh', venueId: 'Fresh-v', at: new Date('2026-10-20T10:00:00Z') },
					// Called new again this week, but first called new in September
					{
						brandId: 'Old News',
						venueId: 'Old News-v',
						at: new Date('2026-10-21T10:00:00Z'),
					},
					{ brandId: 'Old News', venueId: null, at: new Date('2026-09-20T10:00:00Z') },
					// A post calls a place with 2,000 reviews new: no opening
					{
						brandId: 'Big Old',
						venueId: 'Big Old-v',
						at: new Date('2026-10-22T10:00:00Z'),
					},
					{
						brandId: 'Scraped',
						venueId: 'Scraped-v',
						at: new Date('2026-10-12T05:00:00Z'),
					},
				],
			}),
		);
		expect(data.openings.map(o => [o.name, o.firstSeen])).toEqual([
			['Fresh', '2026-10-20'],
			['Scraped', '2026-10-12'],
		]);
		expect(data.openingsCount).toBe(2);
		expect(data.places.find(p => p.name === 'Fresh')?.isNew).toBe(true);
		expect(data.places.find(p => p.name === 'Old News')?.isNew).toBeUndefined();
	});

	it('tells stories with their numbers: a street, a praise theme, a cuisine, the crowd, a credited post', () => {
		const ms = [
			...posts('A', 6, { street: 'Sonnenallee 1', district: 'Neukölln', topics: ['french'] }),
			...posts('B', 5, {
				street: 'Sonnenallee 80',
				district: 'Neukölln',
				views: 50_000,
				handle: 'bee',
			}),
			...posts('C', 5, { street: 'Sonnenallee 200', district: 'Neukölln' }),
		];
		const before = posts('A', 16, { postedAt: BEFORE });
		const data = computeLanding(
			input({
				current: {
					mentions: ms,
					feedback: ms.slice(0, 12).map(m =>
						dishRow(m, 'x', {
							dish: null,
							dishKey: null,
							theme: 'atmosphere',
							detail: 'cozy',
						}),
					),
				},
				previous: {
					mentions: before,
					feedback: before.slice(0, 12).map(m =>
						dishRow(m, 'x', {
							dish: null,
							dishKey: null,
							theme: 'taste',
							detail: 'tasty',
						}),
					),
				},
				venues: ['A', 'B', 'C'].map(b => venue(b)),
				doNotList: { venues: [], creators: [] },
			}),
		);
		const facts = Object.fromEntries(data.stories.map(s => [s.id, s.fact]));
		expect(facts.street).toBe(
			'3 places on Sonnenallee were posted about in the last 30 days, 16 posts in all.',
		);
		expect(facts.praise).toBe(
			'Atmosphere came up as praise in 12 posts: 100% of the posts praising anything, up 100 points on the 30 days before.',
		);
		expect(facts.crowd).toBe(
			'16 people posted about 3 places in the last 30 days, 16 posts in all.',
		);
		expect(facts.top_post).toMatch(/^@bee's TikTok post about B reached 50k views\.$/);
		expect(data.stories.find(s => s.id === 'top_post')).toMatchObject({
			handle: 'bee',
			platform: 'tiktok',
		});
		expect(data.stories.filter(s => s.trend).map(s => s.id)).toEqual([
			'street',
			'praise',
			'district',
			'crowd',
		]);
	});
});

const sample = (): LandingEditionData =>
	computeLanding(
		input({
			current: {
				mentions: [...posts('Sori', 4, { views: 172_516 / 4 }), ...posts('Duo', 2)],
				feedback: [],
			},
			venues: [venue('Sori'), venue('Duo')],
		}),
	);

describe('checkCopy', () => {
	it('reads numbers as written', () => {
		expect(statedNumbers('1.4M views, 591k, 1,378,152 and 36.4% in 10/10')).toEqual([
			{ value: 1_400_000, step: 100_000, exact: false },
			{ value: 591_000, step: 1_000, exact: false },
			{ value: 1_378_152, step: 1, exact: true },
			{ value: 36.4, step: 0.1, exact: false },
			{ value: 10, step: 1, exact: true },
			{ value: 10, step: 1, exact: true },
		]);
		expect(numbersOf({ a: 3, b: ['173k views'], c: { d: 'no' } })).toEqual([3, 173_000]);
	});

	it("lets a line state only numbers it was given, rounded or not, in its length, in the brand's words", () => {
		const given = [1_378_152, 24, 36.4];
		expect(lineProblem('24 people, 1.4M views.', given, 20)).toBeNull();
		expect(lineProblem('24 people, 1.3M views, 36% of posts.', given, 20)).toBeNull();
		expect(lineProblem('25 people posted.', given, 20)).toBe(
			'states 25, which it was not given',
		);
		expect(lineProblem('A 40-minute queue.', given, 20)).toBe(
			'states 40, which it was not given',
		);
		// Small counts and ranks are always fine
		expect(lineProblem('No. 3 for the second time.', given, 20)).toBeNull();
		expect(lineProblem('A hidden gem.', given, 20)).toBe('says hidden gem');
		expect(lineProblem('Rated 4.8 stars.', given, 20)).toMatch(/^says /);
		expect(lineProblem('Police were called.', given, 20)).toBe('says Police');
		expect(lineProblem('one two three', given, 2)).toBe('over 2 words');
		expect(lineProblem('  ', given, 2)).toBe('empty');
	});

	it('keeps lines that pass, falls back line by line, and fills the trend tiles in order', () => {
		const data = sample();
		const { inputs } = landingPrompt(
			data,
			{ praise: new Map(), summaries: new Map(), dishPraise: new Map() },
			{ cityName: 'Berlin', windowStart: new Date('2026-09-25T00:00:00Z'), windowEnd: END },
		);
		const [sori, duo] = data.places;
		const answer: LandingCopyAnswer = {
			lede: 'Berlin talked: 6 posts, 6 people.',
			places: [
				{
					brandId: sori.brandId,
					said: '4 people, 173k views. Berlin went back for more.',
					tagline: 'the ramen everyone filmed',
				},
				// Duo's line states a number it was not given
				{ brandId: duo.brandId, said: '12 people loved it.', tagline: 'the duo' },
			],
			dishes: [],
			trends: [
				{
					storyId: 'crowd',
					title: 'One conversation.',
					text: '6 people posted about 2 places.',
				},
				{ storyId: 'nope', title: 'Made up.', text: 'Nothing.' },
				{ storyId: 'crowd', title: 'Twice.', text: 'Again.' },
			],
			ticker: [],
			openings: [],
		};
		const problems: string[] = [];
		const copy = checkCopy(data, answer, inputs, (where, p) => problems.push(`${where}: ${p}`));
		expect(copy.lede).toBe('Berlin talked: 6 posts, 6 people.');
		expect(copy.places[0]).toEqual({
			brandId: sori.brandId,
			said: '4 people, 173k views. Berlin went back for more.',
			tagline: 'the ramen everyone filmed',
		});
		expect(copy.places[1].said).toBe(
			'2 people posted about Duo in the last 30 days, 2 posts in all.',
		);
		expect(copy.places[1].tagline).toBe('the duo');
		expect(problems).toContain('place Duo: states 12, which it was not given');
		expect(copy.trends.map(t => t.storyId)).toEqual(['crowd']);
		expect(copy.trends[0].title).toBe('One conversation.');
		// Every ticker story is there, with its plain fact when the model wrote none
		expect(copy.ticker.map(t => t.text)).toEqual(
			data.stories.filter(s => !s.trend).map(s => s.fact),
		);
	});

	it('falls back on every line when the call failed', () => {
		const data = sample();
		const { inputs } = landingPrompt(
			data,
			{ praise: new Map(), summaries: new Map(), dishPraise: new Map() },
			{ cityName: 'Berlin', windowStart: new Date('2026-09-25T00:00:00Z'), windowEnd: END },
		);
		const copy = checkCopy(data, null, inputs);
		expect(copy.written).toBe(0);
		expect(copy.lede).toBe(
			'The last 30 days in one breath: 4 people posted about Sori. This is what the whole city is talking about, not what one critic thinks.',
		);
		expect(copy.places).toHaveLength(2);
	});
});
