// What the model wrote for an edition, checked line by line. Pure.
//
// The front page publishes itself, so a line goes out only when every number in it is one the
// model was given for that line, it stays inside its length, and it uses none of the words the
// brand never says. Anything else is replaced by the line's plain fallback.

import _ from 'lodash';

import { LANDING_TICKER, LANDING_TRENDS } from '../constants/landing.constant.js';
import type {
	LandingCopy,
	LandingEditionData,
	LandingStory,
} from '../interfaces/landing-edition.interface.js';

import { fallbackLines } from './landing.js';

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

/** Numbers always fine in a line: small counts and ranks, the window's length. */
const ALWAYS = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 14, 30]);

interface StatedNumber {
	value: number;
	/** The step the writing rounds to: 1 for "24", 0.1 for "36.4", 100,000 for "1.4M" */
	step: number;
	/** Written as a plain whole number: must be one of the given numbers exactly */
	exact: boolean;
}

const SCALE: Record<string, number> = { k: 1e3, thousand: 1e3, m: 1e6, million: 1e6 };

/** The numbers a line states, as written: "1.4M", "591k", "1,378,152", "36%", "10/10". */
export const statedNumbers = (text: string): StatedNumber[] => {
	const out: StatedNumber[] = [];
	const re = /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(k|m|thousand|million)?(?![\p{L}\d])/giu;
	for (const match of text.matchAll(re)) {
		const raw = match[1].replace(/,/g, '');
		const decimals = raw.includes('.') ? raw.split('.')[1].length : 0;
		const scale = match[2] ? SCALE[match[2].toLowerCase()] : 1;
		const value = Number(raw) * scale;
		if (!Number.isFinite(value)) continue;
		out.push({ value, step: 10 ** -decimals * scale, exact: scale === 1 && decimals === 0 });
	}
	return out;
};

/** Every number in a value: an object's or array's leaves, numbers inside strings too. */
export const numbersOf = (value: unknown): number[] => {
	if (typeof value === 'number') return [value];
	if (typeof value === 'string') return statedNumbers(value).map(n => n.value);
	if (Array.isArray(value)) return value.flatMap(numbersOf);
	if (value && typeof value === 'object') return Object.values(value).flatMap(numbersOf);
	return [];
};

/** A stated number is given when it is one of `given`, as written or rounded or cut to its step. */
const isGiven = (n: StatedNumber, given: number[]): boolean => {
	if (n.exact && Number.isInteger(n.value) && ALWAYS.has(n.value)) return true;
	if (n.value >= 2000 && n.value <= 2100 && n.exact) return true;
	return given.some(g => {
		if (n.exact && Number.isInteger(g)) return g === n.value;
		const eps = n.step * 1e-6;
		// Rounded to the step ("1.4M" for 1,378,152) or cut to it ("1.3M")
		return (
			Math.abs(g - n.value) <= n.step / 2 + eps ||
			(g >= n.value - eps && g < n.value + n.step)
		);
	});
};

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

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
