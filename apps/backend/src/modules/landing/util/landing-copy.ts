// What the model wrote for an edition, checked line by line. Pure.
//
// The front page publishes itself, so a line goes out only when every number in it is one the
// model was given for that line, it stays inside its length, and it uses none of the words the
// brand never says. Anything else is replaced by the line's plain fallback.

import _ from 'lodash';

import {
	isGiven,
	numbersOf,
	statedNumbers,
	wordCount,
} from 'src/shared/util/stated-numbers.js';

import { LANDING_TICKER, LANDING_TRENDS } from '../constants/landing.constant.js';
import type {
	LandingCopy,
	LandingEditionData,
	LandingStory,
} from '../interfaces/landing-edition.interface.js';

import { fallbackLines } from './landing.js';

// The front page's prompt and tests read them from here
export { numbersOf, statedNumbers };

/** The model's answer, before checks (`LandingCopyAgent`'s schema). */
export interface LandingCopyAnswer {
	lede: string;
	places: { brandId: string; said: string; tagline: string }[];
	dishes: { key: string; text: string; sticker: string }[];
	trends: { storyId: string; title: string; text: string }[];
	ticker: { storyId: string; text: string }[];
	openings: { brandId: string; text: string }[];
}

/** Words per kind of line, at most. */
export const LINE_WORDS = {
	lede: 60,
	said: 55,
	tagline: 10,
	dish: 50,
	sticker: 2,
	trendTitle: 8,
	trendText: 45,
	ticker: 28,
	opening: 40,
} as const;

// The brand's voice (`brand` skill) and the public guardrails: no negatives about a named place
const BANNED = [
	/\binsights?\b/i,
	/\banalytics\b/i,
	/\bdata-driven\b/i,
	/\bleverag/i,
	/\bhidden gems?\b/i,
	/\bfoodies?\b/i,
	/\bmust-try\b/i,
	/\bviral\b/i,
	/\bgame-?changer\b/i,
	/\binfluencers?\b/i,
	/!!/,
	/\b(worst|avoid|overrated|disappoint\w*|scam|rip-?off|allegation\w*|police|investigat\w*|lawsuit|closed down)\b/i,
	/\b(stars?|rating|rated)\b/i,
];

const words = wordCount;

/** Why a line can't go out, or null when it can. */
export const lineProblem = (
	text: string | undefined,
	given: number[],
	maxWords: number,
): string | null => {
	const line = text?.trim();
	if (!line) return 'empty';
	if (words(line) > maxWords) return `over ${maxWords} words`;
	const banned = BANNED.find(re => re.test(line));
	if (banned) return `says ${line.match(banned)![0]}`;
	const stray = statedNumbers(line).find(n => !isGiven(n, given));
	if (stray) return `states ${stray.value}, which it was not given`;
	return null;
};

/**
 * The numbers each line may state: what the model was shown for that line. `inputs` is the
 * prompt's own objects, so a number the model saw is a number it may write.
 */
export interface LandingCopyInputs {
	all: unknown;
	places: Map<string, unknown>;
	dishes: Map<string, unknown>;
	openings: Map<string, unknown>;
	stories: Map<string, unknown>;
}

/**
 * The edition's copy: each of the model's lines that passes `lineProblem` against its own
 * numbers, else the fallback. Trend tiles take the model's three picks among the trend stories
 * (unknown or repeated ids dropped), filled up in the stories' own order; the ticker every
 * other story, in order. `answer` null (the call failed) gives every fallback.
 */
export const checkCopy = (
	data: LandingEditionData,
	answer: LandingCopyAnswer | null,
	inputs: LandingCopyInputs,
	onProblem: (where: string, problem: string) => void = () => {},
): LandingCopy => {
	const fallback = fallbackLines(data);
	let written = 0;
	let fallbacks = 0;
	const take = (
		where: string,
		text: string | undefined,
		given: number[],
		maxWords: number,
		plain: string,
	) => {
		if (text === undefined && !answer) {
			fallbacks++;
			return plain;
		}
		const problem = lineProblem(text, given, maxWords);
		if (problem) {
			onProblem(where, problem);
			fallbacks++;
			return plain;
		}
		written++;
		return text!.trim();
	};
	const allNumbers = numbersOf(inputs.all);

	const lede = take('lede', answer?.lede, allNumbers, LINE_WORDS.lede, fallback.lede);

	const placeAnswers = new Map((answer?.places ?? []).map(p => [p.brandId, p]));
	const places = data.places.map(p => {
		const a = placeAnswers.get(p.brandId);
		const given = numbersOf(inputs.places.get(p.brandId));
		const plain = fallback.place(p);
		return {
			brandId: p.brandId,
			said: take(`place ${p.name}`, a?.said, given, LINE_WORDS.said, plain.said),
			tagline: take(
				`tagline ${p.name}`,
				a?.tagline,
				given,
				LINE_WORDS.tagline,
				plain.tagline,
			),
		};
	});

	const dishAnswers = new Map((answer?.dishes ?? []).map(d => [d.key, d]));
	const dishes = data.dishes.map(d => {
		const a = dishAnswers.get(d.key);
		const given = numbersOf(inputs.dishes.get(d.key));
		const plain = fallback.dish(d);
		return {
			key: d.key,
			text: take(`dish ${d.label}`, a?.text, given, LINE_WORDS.dish, plain.text),
			// A sticker holds no number at all
			sticker: take(`sticker ${d.label}`, a?.sticker, [], LINE_WORDS.sticker, plain.sticker),
		};
	});

	const storyById = new Map(data.stories.map(s => [s.id, s]));
	const storyLine = (
		s: LandingStory,
		a: { title?: string; text?: string } | undefined,
		maxWords: number,
	) => {
		const given = numbersOf(inputs.stories.get(s.id));
		return {
			storyId: s.id,
			title: take(`title ${s.id}`, a?.title, given, LINE_WORDS.trendTitle, s.title),
			text: take(`story ${s.id}`, a?.text, given, maxWords, s.fact),
		};
	};
	const trendAnswers = _.uniqBy(
		(answer?.trends ?? []).filter(t => storyById.get(t.storyId)?.trend),
		t => t.storyId,
	).slice(0, LANDING_TRENDS);
	const trendIds = [
		...trendAnswers.map(t => t.storyId),
		...data.stories.filter(s => s.trend).map(s => s.id),
	];
	const trends = _.uniq(trendIds)
		.slice(0, LANDING_TRENDS)
		.map(id =>
			storyLine(
				storyById.get(id)!,
				trendAnswers.find(t => t.storyId === id),
				LINE_WORDS.trendText,
			),
		);

	const tickerAnswers = new Map((answer?.ticker ?? []).map(t => [t.storyId, t]));
	const ticker = data.stories
		.filter(s => !s.trend)
		.slice(0, LANDING_TICKER)
		.map(s => {
			const a = tickerAnswers.get(s.id);
			const given = numbersOf(inputs.stories.get(s.id));
			return {
				storyId: s.id,
				title: s.title,
				text: take(`ticker ${s.id}`, a?.text, given, LINE_WORDS.ticker, s.fact),
			};
		});

	const openingAnswers = new Map((answer?.openings ?? []).map(o => [o.brandId, o]));
	const openings = data.openings.map(o => ({
		brandId: o.brandId,
		text: take(
			`opening ${o.name}`,
			openingAnswers.get(o.brandId)?.text,
			numbersOf(inputs.openings.get(o.brandId)),
			LINE_WORDS.opening,
			fallback.opening(o).text,
		),
	}));

	return { lede, places, dishes, trends, ticker, openings, written, fallbacks };
};
