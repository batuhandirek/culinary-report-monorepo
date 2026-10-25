import type { CityHighlightBrand, CityHighlightCreator, CityHighlightRiser } from 'client';

import type { FillSource, PostFill } from './post-design.js';

import { monthLabel } from '#lib/culinary.js';
import { climbLabel } from '#lib/highlights.js';

// What each design can be filled with from a city's built month (`CityHighlightData`, the data
// the public page `/<city>/<month>` draws): our own counts only, positive lists only, already
// without the city's do-not-list. Wording follows the `brand` skill: facts plain, numbers
// concrete, the city as the subject, creators credited by handle, link in bio, 3–5 hashtags.

const n = (x: number) => x.toLocaleString('en');
const plural = (x: number, one: string, many = `${one}s`) => `${n(x)} ${x === 1 ? one : many}`;
/** "11%"; one decimal only under 10 ("4.5%") */
const percent = (x: number) => `${n(x >= 10 ? Math.round(x) : Math.round(x * 10) / 10)}%`;
const utc = (month: string) => new Date(`${month}-01T00:00:00Z`);
/** "October" */
const monthName = (month: string) =>
	utc(month).toLocaleString('en', { month: 'long', timeZone: 'UTC' });
/** "Oct 2026", for pixel stamps */
const shortMonth = (month: string) =>
	utc(month).toLocaleString('en', { month: 'short', year: 'numeric', timeZone: 'UTC' });
/** "1–31 October" */
const dayRange = (month: string) => {
	const d = utc(month);
	const days = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
	return `1–${days} ${monthName(month)}`;
};
const previousMonth = (month: string) => {
	const d = utc(month);
	return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
};
/** A label inside a sentence: "Döner & kebab" → "döner & kebab", "BBQ" stays. */
const inSentence = (label: string) =>
	label.length > 1 && label[1] === label[1].toLowerCase()
		? label[0].toLowerCase() + label.slice(1)
		: label;

/** The city edition's account (`brand`: `@munchwerk.<city>`). */
const handleOf = (s: FillSource) => `@munchwerk.${s.citySlug}`;
const methodLine = (s: FillSource) =>
	`Counted from ${plural(s.data.totals.posts, 'post')} by ${plural(s.data.totals.creators, 'creator')}, ${dayRange(s.month)}`;
const hashtags = (s: FillSource, ...extra: string[]) =>
	[`#${s.citySlug}food`, `#${s.citySlug}eats`, ...extra].join(' ');
const handle = (c: CityHighlightCreator) => (c.platform === 'blog' ? c.handle : `@${c.handle}`);
/** The month's most watched creators, credited. */
const creditLine = (s: FillSource) => {
	const top = s.data.creators.slice(0, 3).map(handle);
	if (!top.length) return '';
	const list = top.length === 1 ? top[0] : `${top.slice(0, -1).join(', ')} and ${top.at(-1)}`;
	return `Most watched: ${list}.`;
};
const caption = (...blocks: (string | false | undefined)[]) =>
	blocks.filter((b): b is string => !!b && !!b.trim()).join('\n\n');

/**
 * A place's name for a post: a Google listing's slogan after " - " or " | " cut off
 * ("Choc-Spot - Desserts, Coffee and more" → "Choc-Spot"); hyphens inside a name stay.
 */
const placeName = (name: string) => name.split(/\s+[-–|]\s+/)[0].trim() || name;

const postsBy = (b: CityHighlightBrand) =>
	`${plural(b.posts, 'post')} by ${plural(b.creators, 'creator')}`;
const climb = (r: CityHighlightRiser) => climbLabel(r).replace(/^new/, 'New');
const listLines = (rows: { name: string; district?: string }[]) =>
	rows
		.map((r, i) => `${i + 1}. ${placeName(r.name)}${r.district ? `, ${r.district}` : ''}`)
		.join('\n');
const fullList = (shown: number, total: number) =>
	total > shown ? `The full top ${total}: link in bio.` : 'More on the page: link in bio.';

// ── List carousel ─────────────────────────────────────────────────────────────

interface CarouselValues {
	series: string;
	title: string;
	period: string;
	items: { name: string; area: string; stat: string }[];
	method: string;
	cta: string;
	handle: string;
}

export const carouselFills: PostFill<CarouselValues>[] = [
	{
		id: 'heat-check',
		label: 'Heat Check: the top places',
		description:
			'The places posted about most by others, one slide each, with their posts and creators.',
		counts: [5, 3, 10],
		apply: (s) => {
			const brands = s.data.brands.slice(0, s.count ?? 5);
			if (!brands.length) return null;
			const city = s.cityName;
			return {
				values: {
					series: 'Heat Check',
					title: `${city}’s most talked-about places`,
					period: shortMonth(s.month),
					items: brands.map((b) => ({
						name: placeName(b.name),
						area: b.district ?? '',
						stat: postsBy(b)
					})),
					method: methodLine(s),
					cta: fullList(brands.length, s.data.brands.length).replace(/\.$/, ''),
					handle: handleOf(s)
				},
				caption: caption(
					`${city}’s most talked-about places in ${monthLabel(s.month)}. ${placeName(brands[0].name)} came first.`,
					listLines(brands),
					`${methodLine(s)}.`,
					creditLine(s),
					fullList(brands.length, s.data.brands.length),
					hashtags(s, '#heatcheck')
				)
			};
		}
	},
	{
		id: 'rising',
		label: 'Rising: the fastest climbers',
		description: 'The places that climbed most in the top 50 by posts, one slide each.',
		apply: (s) => {
			const risers = s.data.risers;
			if (!risers.length) return null;
			const city = s.cityName;
			const prev = monthName(previousMonth(s.month));
			return {
				values: {
					series: 'Rising',
					title: `Climbing fast in ${city}`,
					period: shortMonth(s.month),
					items: risers.map((r) => ({
						name: placeName(r.name),
						area: r.district ?? '',
						stat: `${climb(r)} · ${plural(r.posts, 'post')}`
					})),
					method: `Ranked by posts by others, ${prev} to ${monthName(s.month)}`,
					cta: 'The whole month: link in bio',
					handle: handleOf(s)
				},
				caption: caption(
					`The places ${city} started posting about in ${monthLabel(s.month)}.`,
					risers
						.map(
							(r, i) =>
								`${i + 1}. ${placeName(r.name)}: ${climb(r)}, ${plural(r.posts, 'post')}${r.prevPosts ? ` (${n(r.prevPosts)} in ${prev})` : ''}`
						)
						.join('\n'),
					creditLine(s),
					'The whole month: link in bio.',
					hashtags(s, '#rising')
				)
			};
		}
	}
];

// ── Top list ──────────────────────────────────────────────────────────────────

interface TopListValues {
	label: string;
	title: string;
	period: string;
	items: { name: string; meta: string; value: number }[];
	method: string;
	handle: string;
}

export const topListFills: PostFill<TopListValues>[] = [
	{
		id: 'heat-check',
		label: 'Heat Check: the top 10',
		description: 'The ten places posted about most by others, with their posts.',
		apply: (s) => {
			const brands = s.data.brands;
			if (!brands.length) return null;
			return {
				values: {
					label: `Heat Check · ${s.cityName}`,
					title: 'Most talked-about places',
					period: monthLabel(s.month),
					items: brands.map((b) => ({
						name: placeName(b.name),
						meta: plural(b.posts, 'post'),
						value: b.posts
					})),
					method: methodLine(s),
					handle: handleOf(s)
				},
				caption: caption(
					`${s.cityName}’s most talked-about places in ${monthLabel(s.month)}. ${placeName(brands[0].name)} came first.`,
					listLines(brands),
					`${methodLine(s)}.`,
					creditLine(s),
					'Every place on the page: link in bio.',
					hashtags(s, '#heatcheck')
				)
			};
		}
	},
	{
		id: 'rising',
		label: 'Rising: the fastest climbers',
		description: 'The five places that climbed most, with how far.',
		apply: (s) => {
			const risers = s.data.risers;
			if (!risers.length) return null;
			const prev = monthName(previousMonth(s.month));
			return {
				values: {
					label: `Rising · ${s.cityName}`,
					title: 'The fastest climbers',
					period: monthLabel(s.month),
					items: risers.map((r) => ({
						name: placeName(r.name),
						meta: climb(r),
						value: r.posts
					})),
					method: `Ranked by posts by others, ${prev} to ${monthName(s.month)}`,
					handle: handleOf(s)
				},
				caption: caption(
					`The places ${s.cityName} started posting about in ${monthLabel(s.month)}.`,
					risers.map((r, i) => `${i + 1}. ${placeName(r.name)}: ${climb(r)}`).join('\n'),
					creditLine(s),
					'The whole month: link in bio.',
					hashtags(s, '#rising')
				)
			};
		}
	}
];

// ── Big number ────────────────────────────────────────────────────────────────

interface BigNumberValues {
	label: string;
	figure: string;
	unit: string;
	sentence: string;
	method: string;
	handle: string;
}

export const bigNumberFills: PostFill<BigNumberValues>[] = [
	{
		id: 'month-posts',
		label: 'The month in posts',
		description:
			'How many posts named a place of the city, how many places, and the top district.',
		apply: (s) => {
			const { totals, district } = s.data;
			if (!totals.posts) return null;
			const sentence = `${s.cityName}’s creators named ${plural(totals.brands, 'place')} in ${monthName(s.month)}.${district ? ` ${district.name} came first.` : ''}`;
			return {
				values: {
					label: `${s.cityName} · ${shortMonth(s.month)}`,
					figure: n(totals.posts),
					unit: 'posts about food',
					sentence,
					method: `By ${plural(totals.creators, 'creator')}, ${dayRange(s.month)}`,
					handle: handleOf(s)
				},
				caption: caption(
					`${n(totals.posts)} posts about ${s.cityName}’s food in ${monthLabel(s.month)}.`,
					sentence,
					creditLine(s),
					'The month’s most talked-about places: link in bio.',
					hashtags(s)
				)
			};
		}
	},
	{
		id: 'number-one',
		label: 'The #1 place',
		description: 'The posts about the month’s most talked-about place.',
		apply: (s) => {
			const top = s.data.brands[0];
			if (!top) return null;
			const sentence = `${placeName(top.name)} was ${s.cityName}’s most talked-about place in ${monthName(s.month)}, posted about by ${plural(top.creators, 'creator')}.`;
			return {
				values: {
					label: 'Heat Check',
					figure: n(top.posts),
					unit: `posts about ${placeName(top.name)}`,
					sentence,
					method: methodLine(s),
					handle: handleOf(s)
				},
				caption: caption(
					sentence,
					creditLine(s),
					'The rest of the top 10: link in bio.',
					hashtags(s, '#heatcheck')
				)
			};
		}
	}
];

// ── Headline card ─────────────────────────────────────────────────────────────

interface HeadlineValues {
	label: string;
	headline: string;
	body: string;
	where: string;
	handle: string;
}

const where = (s: FillSource) => `${s.cityName} · ${monthLabel(s.month)}`;

export const headlineFills: PostFill<HeadlineValues>[] = [
	{
		id: 'dish',
		label: 'Dish of the Month',
		description: 'The dish whose share of the posts and reviews naming a dish rose most.',
		apply: (s) => {
			const dish = s.data.dishes[0];
			if (!dish) return null;
			const prev = monthName(previousMonth(s.month));
			const body = `Named in ${percent(dish.share)} of the posts and reviews naming a dish, up ${n(Math.round(dish.delta * 10) / 10)} points on ${prev}.`;
			return {
				values: {
					label: 'Dish of the Month',
					headline: `${s.cityName} couldn’t stop posting about ${inSentence(dish.label)}`,
					body,
					where: where(s),
					handle: handleOf(s)
				},
				caption: caption(
					`${s.cityName}’s dish of the month: ${inSentence(dish.label)}.`,
					body,
					creditLine(s),
					'The whole month: link in bio.',
					hashtags(s, '#dishofthemonth')
				)
			};
		}
	},
	{
		id: 'number-one',
		label: 'The #1 place',
		description: 'The month’s most talked-about place, with its posts and creators.',
		apply: (s) => {
			const top = s.data.brands[0];
			if (!top) return null;
			const body = `Posted about ${plural(top.posts, 'time')} by ${plural(top.creators, 'creator')} in ${monthName(s.month)}.`;
			return {
				values: {
					label: 'Heat Check',
					headline: `${placeName(top.name)} was ${s.cityName}’s most talked-about place`,
					body,
					where: where(s),
					handle: handleOf(s)
				},
				caption: caption(
					`${placeName(top.name)} was ${s.cityName}’s most talked-about place in ${monthLabel(s.month)}.`,
					body,
					creditLine(s),
					'The rest of the top 10: link in bio.',
					hashtags(s, '#heatcheck')
				)
			};
		}
	},
	{
		id: 'district',
		label: 'The top district',
		description: 'The district with the biggest share of the month’s mentions of a place.',
		apply: (s) => {
			const district = s.data.district;
			if (!district) return null;
			const body = `${district.name} drew ${percent(district.share)} of the month’s mentions of a place: ${plural(district.mentions, 'mention')}.`;
			return {
				values: {
					label: 'Heat Check',
					headline: `${s.cityName} posted most about ${district.name}`,
					body,
					where: where(s),
					handle: handleOf(s)
				},
				caption: caption(
					`${district.name} was ${s.cityName}’s most talked-about district in ${monthLabel(s.month)}.`,
					body,
					creditLine(s),
					'The places behind it: link in bio.',
					hashtags(s)
				)
			};
		}
	}
];
