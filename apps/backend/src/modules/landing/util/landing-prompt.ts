// What `LandingCopyAgent` is shown for an edition. Pure.

import type { LandingEditionData, LandingPlace } from '../interfaces/landing-edition.interface.js';

import { dayLabel, type LandingPromptMaterial, viewsLabel } from './landing.js';
import type { LandingCopyInputs } from './landing-copy.js';

const MOVES: Record<LandingPlace['move'], (p: LandingPlace) => string | undefined> = {
	up: p => `climbed ${p.climb} places since the 30 days before`,
	held: () => 'held its place',
	new: () => 'new to the list',
	none: () => undefined,
};

const where = (p: { district?: string; street?: string; branches?: number }, cityName: string) =>
	p.branches && p.branches > 1 ?
		`${p.branches} places in ${cityName}${p.district ? `, most posted about in ${p.district}` : ''}`
	:	[p.district, p.street].filter(Boolean).join(' · ') || undefined;

/**
 * The prompt's input and, per line, the objects whose numbers that line may state
 * (`checkCopy`). Praise and summaries are the positive ones only (`promptMaterial`).
 */
export const landingPrompt = (
	data: LandingEditionData,
	material: LandingPromptMaterial,
	ctx: { cityName: string; windowStart: Date; windowEnd: Date },
): { input: Record<string, unknown>; inputs: LandingCopyInputs } => {
	const last = new Date(ctx.windowEnd.getTime() - 1);
	const places = data.places.map(p => ({
		brandId: p.brandId,
		rank: p.rank,
		name: p.name,
		where: where(p, ctx.cityName),
		peoplePosting: p.creators,
		posts: p.posts,
		views: viewsLabel(p.views),
		movement: MOVES[p.move](p),
		dishNamedMost: p.dish,
		newlyOpened: p.isNew || undefined,
		praiseInPosts: material.praise.get(p.brandId) ?? [],
		whatPostsSaid: material.summaries.get(p.brandId) ?? [],
	}));
	const dishes = data.dishes.map(d => ({
		key: d.key,
		role: d.role,
		label: d.label,
		posts: d.posts,
		places: d.places,
		shareOfPostsNamingADishPercent: d.share,
		changeInPointsOn30DaysBefore: d.delta,
		mostPostedAt: d.topPlaces.map(p => ({
			name: p.name,
			district: p.district,
			posts: p.posts,
		})),
		praiseInPosts: material.dishPraise.get(d.key) ?? [],
	}));
	const openings = data.openings.map(o => ({
		brandId: o.brandId,
		name: o.name,
		where: where(o, ctx.cityName),
		firstPostCallingItNew: dayLabel(new Date(`${o.firstSeen}T00:00:00Z`)),
		posts: o.posts,
		peoplePosting: o.creators,
		views: viewsLabel(o.views),
		dishNamedMost: o.dish,
		praiseInPosts: material.praise.get(o.brandId) ?? [],
		whatPostsSaid: material.summaries.get(o.brandId) ?? [],
	}));
	const story = (s: LandingEditionData['stories'][number]) => ({
		storyId: s.id,
		title: s.title,
		fact: s.fact,
	});
	const input = {
		city: ctx.cityName,
		// Say "the last 30 days"; the dates are for context, not for the copy
		window: `the last 30 days (${dayLabel(ctx.windowStart)} to ${dayLabel(last)} ${last.getUTCFullYear()})`,
		totals: {
			posts: data.totals.posts,
			views: viewsLabel(data.totals.views),
			peoplePosting: data.totals.creators,
			placesPostedAbout: data.totals.places,
			placesCalledNewInLast14Days: data.openingsCount,
		},
		places,
		dishes,
		openings,
		trendCandidates: data.stories.filter(s => s.trend).map(story),
		tickerStories: data.stories.filter(s => !s.trend).map(story),
	};
	return {
		input,
		inputs: {
			all: input,
			places: new Map(places.map(p => [p.brandId, p])),
			dishes: new Map(dishes.map(d => [d.key, d])),
			openings: new Map(openings.map(o => [o.brandId, o])),
			// A story about a place or the dish may also state that place's or dish's numbers
			stories: new Map(
				data.stories.map(s => {
					const brandId = s.id.includes(':') ? s.id.split(':')[1] : undefined;
					const about =
						brandId ? places.find(p => p.brandId === brandId)
						: s.kind === 'dish' ? dishes.find(d => d.role === 'dish_of_the_month')
						: undefined;
					return [s.id, { ...story(s), about }];
				}),
			),
		},
	};
};
