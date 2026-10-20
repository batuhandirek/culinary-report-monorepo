// Pure helpers for Google search interest (`TrendSearchInterest`) and its comparison with the
// share of social mentions.

/** One weekly point of `signalbench/google-trends-scraper`'s `interestOverTime`. */
export interface GoogleTrendsTimelinePoint {
	/** Unix seconds of the week's start */
	timestamp: number;
	/** "Sep 28 – Oct 4, 2025" */
	date?: string;
	/** 0–100; 0 where Google has too little data */
	value: number;
	isPartial?: boolean;
}

/** One related query of an item, as Google's "Related queries" box lists it. */
export interface GoogleTrendsRelatedQuery {
	label: string;
	/** Top: 0–100 against the most searched one. Rising: percent growth (250 = +250 %) */
	value: number;
	/** Rising: "Breakout" past +5,000 %, else "+250%" */
	formattedValue?: string;
	link?: string;
}

/**
 * One dataset item of `signalbench/google-trends-scraper`: one per search term, none for a term
 * Google failed for (a comma in it, say).
 */
export interface GoogleTrendsItem {
	searchTerm: string;
	/** The region searched, as given (DE-BE) */
	geo?: string;
	interestOverTime?: GoogleTrendsTimelinePoint[];
	/** Up to 25 each, over the item's whole window */
	relatedQueries?: { top?: GoogleTrendsRelatedQuery[]; rising?: GoogleTrendsRelatedQuery[] };
}

/** A related query ready to store: `rank` is its place in Google's list, from 1. */
export interface RelatedQueryRow {
	rising: boolean;
	rank: number;
	query: string;
	value: number;
	breakout: boolean;
}

/**
 * An item's top and rising related queries in Google's order, each query once per list; a rising
 * one past +5,000 % is a breakout.
 */
export const relatedQueries = (item: GoogleTrendsItem): RelatedQueryRow[] =>
	(
		[
			[false, item.relatedQueries?.top],
			[true, item.relatedQueries?.rising],
		] as const
	).flatMap(([rising, list]) => {
		const seen = new Set<string>();
		return (list ?? [])
			.filter(q => {
				const key = termKey(q.label ?? '');
				if (!key || typeof q.value !== 'number' || seen.has(key)) return false;
				seen.add(key);
				return true;
			})
			.map((q, i) => ({
				rising,
				rank: i + 1,
				query: q.label.trim(),
				value: q.value,
				breakout: rising && q.formattedValue?.trim().toLowerCase() === 'breakout',
			}));
	});

/** `count` months ending with `last`, oldest first. */
export const monthsUpTo = (last: string, count: number): string[] => {
	const [year, month] = last.split('-').map(Number);
	return Array.from({ length: count }, (_, i) =>
		new Date(Date.UTC(year, month - 1 - (count - 1 - i), 1)).toISOString().slice(0, 7),
	);
};

/** The last day of a month, YYYY-MM-DD. */
export const lastDayOf = (month: string): string => {
	const [year, m] = month.split('-').map(Number);
	return new Date(Date.UTC(year, m, 0)).toISOString().slice(0, 10);
};

// Weeks with data a month needs before it gets a figure: a small cuisine in one region has data
// in a week here and there (Berlin, 2026: 36 of 100 topics had over 20 of 53 weeks without),
// and one stray week would read as that month's level
export const MIN_WEEKS_WITH_DATA = 2;

/**
 * The months' interest from weekly points: the mean of the points whose week starts in the
 * month and that have data, one decimal. Google's 0 on a single-term query means too little
 * data, so it is left out. A month with fewer than `MIN_WEEKS_WITH_DATA` such points is null,
 * never 0.
 */
export const monthlyInterest = (
	timeline: GoogleTrendsTimelinePoint[] | undefined,
	months: string[],
): Map<string, number | null> => {
	const sums = new Map<string, { sum: number; n: number }>();
	for (const point of timeline ?? []) {
		const { value, timestamp } = point;
		if (typeof value !== 'number' || value <= 0 || typeof timestamp !== 'number') continue;
		const month = new Date(timestamp * 1000).toISOString().slice(0, 7);
		const s = sums.get(month) ?? { sum: 0, n: 0 };
		s.sum += value;
		s.n++;
		sums.set(month, s);
	}
	return new Map(
		months.map(month => {
			const s = sums.get(month);
			return [
				month,
				s && s.n >= MIN_WEEKS_WITH_DATA ? Math.round((s.sum / s.n) * 10) / 10 : null,
			];
		}),
	);
};

/** Searches are compared case- and space-insensitively with what the actor echoes back. */
export const termKey = (term: string) => term.trim().toLowerCase().replace(/\s+/g, ' ');

/** What a term is searched as: Google returns nothing for a term with a comma, so it goes. */
export const trendsQuery = (term: string) => term.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();

/** The key an item maps back to: its echoed `searchTerm`, which is the term's `trendsQuery`. */
export const queryTermKey = (term: string) => termKey(trendsQuery(term));

/** `now / before - 1` (0.4 = up 40 %); null when either is unknown or `before` is 0. */
export const change = (now: number | null | undefined, before: number | null | undefined) =>
	now === null || now === undefined || before === null || before === undefined || before === 0 ?
		null
	:	Math.round((now / before - 1) * 100) / 100;

// `signalbench/google-trends-scraper` refuses a run capped under this
export const GOOGLE_TRENDS_MIN_CAP_USD = 1;

/**
 * The caps of a pull's two runs, by their share of the terms, each at least the actor's floor:
 * so a budget under $2 with both runs can be exceeded by up to $1 (a run costs ~$0.004 a term,
 * far below either cap). A run without terms gets 0.
 */
export const splitTrendsBudget = (
	budgetUsd: number,
	topicTerms: number,
	brandTerms: number,
): { topics: number; brands: number } => {
	const cap = (usd: number) => Math.max(GOOGLE_TRENDS_MIN_CAP_USD, Math.round(usd * 100) / 100);
	if (!brandTerms) return { topics: topicTerms ? cap(budgetUsd) : 0, brands: 0 };
	if (!topicTerms) return { topics: 0, brands: cap(budgetUsd) };
	const topics = cap((budgetUsd * topicTerms) / (topicTerms + brandTerms));
	return { topics, brands: cap(budgetUsd - topics) };
};

/** A topic's Google search interest and mention share, the month against the one before. */
export interface SearchDelta {
	key: string;
	label: string;
	/** Google's 0–100 this month (100 = the term's twelve-month peak) */
	interest: number;
	prevInterest?: number;
	/** 0.4 = searches up 40 %; absent when last month has no data */
	searchChange?: number;
	/** Its share of the city's mentions with a topic, percent (children counted) */
	share?: number;
	prevShare?: number;
	/** 1 = mentions' share doubled */
	mentionChange?: number;
}
