// What a review, a post or a post's mention says, as the API serves it: statements
// (`StatementOutputDto`), one claim each. Praise is a positive claim, a complaint a negative one, a
// noted fact ("fries for 10 euros") a neutral or mixed one; a claim of kind `change` (or a question)
// is none of them whatever its sentiment. A claim carries its `quote`, the source's own words, when
// agent A gave one that is verbatim. A statement with no text is dish-only: a food the source listed
// that no claim names. One with text and no sentiment has not been read by agent B yet. Every
// label comes from the statement's parts: the frontend holds no copy of the vocabulary.

import { exploreHref } from '#lib/explore.js';

/** A topic a part is about: an aspect (with its root as `parent`), or one of a wording's topics */
export interface StatementTopic {
	key: string;
	label: string;
	/** `Topic.kind`: aspect, dish, drink, cuisine, … */
	kind: string;
	parent?: { key: string; label: string };
}

/** One thing a statement is about: its aspect (`topic`), or a food wording as said (`term`) */
export interface StatementPart {
	role: string;
	topic?: StatementTopic;
	term?: { key: string; name: string; topics: { rank: number; topic: StatementTopic }[] };
}

/** The fields a page reads of a statement; what every `statements` route serves fits it */
export interface Statement {
	id: number;
	/** The claim, in English; absent on a dish-only statement */
	text?: string;
	/** The source's own words for it, in its language */
	quote?: string;
	/** positive, negative, neutral or mixed; absent until agent B read it */
	sentiment?: string;
	/** opinion, fact, change, new_item, deal, event, question, verdict; absent until agent B read it */
	kind?: string;
	/** The number it states: minutes for a wait, euro for a price */
	amount?: number;
	unit?: string;
	parts: StatementPart[];
}

/** Which of a theme's lists: what guests criticised, praised, or noticed had changed since before */
export type ThemeSide = 'complaints' | 'praise' | 'changes';

/** The group a claim is shown in: a theme's three sides, the noted facts, and what agent B has not read yet */
export type StatementSide = ThemeSide | 'noted' | 'unread';

/** A claim's group; nothing for a dish-only statement */
export const sideOf = (s: Pick<Statement, 'text' | 'sentiment' | 'kind'>): StatementSide | undefined =>
	!s.text
		? undefined
		: s.kind === 'change'
			? 'changes'
			: s.kind === 'question'
				? 'noted'
			: !s.sentiment
				? 'unread'
				: s.sentiment === 'positive'
					? 'praise'
					: s.sentiment === 'negative'
						? 'complaints'
						: 'noted';

/** The side of a theme's page a claim's aspect link opens: a noted or unread claim opens the page as it defaults */
export const themeSideOf = (side: StatementSide): ThemeSide =>
	side === 'praise' || side === 'changes' ? side : 'complaints';

const bySide = <T extends Statement>(statements: T[] | undefined, side: StatementSide): T[] =>
	(statements ?? []).filter((s) => sideOf(s) === side);

/** A source's positive claims, in the order said */
export const praiseOf = <T extends Statement>(statements: T[] | undefined): T[] => bySide(statements, 'praise');
/** Its negative claims */
export const complaintsOf = <T extends Statement>(statements: T[] | undefined): T[] => bySide(statements, 'complaints');
/** Its neutral and mixed claims: said, neither praise nor complaint */
export const notedOf = <T extends Statement>(statements: T[] | undefined): T[] => bySide(statements, 'noted');
/** The changes it noticed since before, whatever their sentiment */
export const changesOf = <T extends Statement>(statements: T[] | undefined): T[] => bySide(statements, 'changes');
/** Its claims agent B has not read yet: no sentiment, aspect or foods */
export const unreadOf = <T extends Statement>(statements: T[] | undefined): T[] => bySide(statements, 'unread');

/** A claim's aspect: its key and label, and its root's (the aspect's own for a root) */
export interface AspectRef {
	key: string;
	label: string;
	root: string;
	rootLabel: string;
}

export const aspectOf = (s: Pick<Statement, 'parts'>): AspectRef | undefined => {
	const topic = s.parts.find((p) => p.role === 'aspect')?.topic;
	if (!topic) return undefined;
	return {
		key: topic.key,
		label: topic.label,
		root: topic.parent?.key ?? topic.key,
		rootLabel: topic.parent?.label ?? topic.label
	};
};

/** A noticed change as a table cell says it: "Portion size: made smaller" */
export const changeLabel = (s: Statement): string => {
	const aspect = aspectOf(s);
	return aspect ? `${aspect.label}: ${s.text}` : (s.text ?? '');
};

export interface FoodTopic {
	key: string;
	label: string;
	kind: string;
}

/** A food or drink wording as the source spelled it (a term), with the topics it is linked to, by rank */
export interface FoodRef {
	key: string;
	name: string;
	/** Empty until the wording is decided */
	topics: FoodTopic[];
}

/** A claim's food wordings, in the order named */
export const foodPartsOf = (s: Pick<Statement, 'parts'>): FoodRef[] =>
	s.parts.flatMap((p) =>
		p.role === 'food' && p.term
			? [
					{
						key: p.term.key,
						name: p.term.name,
						topics: [...p.term.topics].sort((a, b) => a.rank - b.rank).map((t) => t.topic)
					}
				]
			: []
	);

/** Where a wording links: its first dish or drink topic, else its first topic; nothing until it is decided */
export const linkTopicOf = (food: Pick<FoodRef, 'topics'>): FoodTopic | undefined =>
	food.topics.find((t) => t.kind === 'dish' || t.kind === 'drink') ?? food.topics[0];

/** A food a source names, once per wording */
export interface SourceFood extends FoodRef {
	/** The dish-only statement's sentiment, else its claims' one polarity, else `mixed`; absent until read */
	sentiment?: string;
	/** No claim names it: the source only listed it */
	listedOnly: boolean;
}

export const foodsOf = (statements: Statement[] | undefined): SourceFood[] => {
	const seen = new Map<string, { food: FoodRef; listed?: string; claimed: Set<string>; named: boolean }>();
	for (const s of statements ?? []) {
		for (const food of foodPartsOf(s)) {
			const entry = seen.get(food.key) ?? { food, claimed: new Set<string>(), named: false };
			if (s.text) {
				entry.named = true;
				if (s.sentiment) entry.claimed.add(s.sentiment);
			} else if (s.sentiment) {
				entry.listed = s.sentiment;
			}
			seen.set(food.key, entry);
		}
	}
	return [...seen.values()].map(({ food, listed, claimed, named }) => ({
		...food,
		sentiment: listed ?? (claimed.size === 1 ? [...claimed][0] : claimed.size ? 'mixed' : undefined),
		listedOnly: !named
	}));
};

/** A theme or a topic as a page names it */
export interface Term {
	key: string;
	label: string;
}

/** Each term once, by key, in the order first met */
const uniqueTerms = (terms: Term[]): Term[] => [...new Map(terms.map((t) => [t.key, t])).values()];

/** The roots a source's claims of one side raise, each once, as the aspects name them */
export const rootsOf = (statements: Statement[] | undefined, side: StatementSide): Term[] =>
	uniqueTerms(
		bySide(statements, side).flatMap((s) => {
			const aspect = aspectOf(s);
			return aspect ? [{ key: aspect.root, label: aspect.rootLabel }] : [];
		})
	);

/**
 * The root labels a list of statements carries, by root key, added to `into`: what names a
 * root-key filter whose facets hold keys only, without a copy of the vocabulary.
 */
export const rootLabels = (statements: Statement[] | undefined, into = new Map<string, string>()) => {
	for (const s of statements ?? []) {
		const aspect = aspectOf(s);
		if (aspect && !into.has(aspect.root)) into.set(aspect.root, aspect.rootLabel);
	}
	return into;
};

/** What a source talks about: the aspects of its complaints and of its praise, each once, and its foods */
export interface TalksAbout {
	complaints: Term[];
	praise: Term[];
	foods: SourceFood[];
}

export const talksAbout = (statements: Statement[] | undefined): TalksAbout => {
	const aspects = (side: StatementSide) =>
		uniqueTerms(
			bySide(statements, side).flatMap((s) => {
				const aspect = aspectOf(s);
				return aspect ? [{ key: aspect.key, label: aspect.label }] : [];
			})
		);
	return { complaints: aspects('complaints'), praise: aspects('praise'), foods: foodsOf(statements) };
};

/**
 * An aspect on the Explore page for a city and month, on one side: who raised it, broken down,
 * and every claim under it. `place` narrows to the brands of one kind of food (the Praise and
 * complaints tab's food filter); `placesOnly` keeps the claims about a place, as that tab counts.
 */
export const aspectHref = (
	aspect: string,
	side: ThemeSide,
	at: { cityId?: string; month?: string; place?: string | null; placesOnly?: boolean }
) =>
	exploreHref({
		node: aspect,
		cityId: at.cityId,
		...(at.month && { from: at.month, to: at.month }),
		side,
		...(at.place && { place: at.place }),
		...(at.placesOnly && { subject: 'place' })
	});

/**
 * The Trends "Praise and complaints" tab opened on a theme's row, for a city and month: its side,
 * its topic (`root`, the aspect's root key, from the caller's aspect) and the theme
 * (`TrendsThemesTab` reads them from the URL).
 */
export const themeRowHref = (
	theme: string,
	side: 'praise' | 'complaints',
	at: { cityId?: string; month?: string; root?: string }
) => {
	const params = new URLSearchParams({ tab: 'themes' });
	if (at.cityId) params.set('cityId', at.cityId);
	if (at.month) params.set('month', at.month);
	if (side === 'praise') params.set('side', 'praise');
	if (at.root) params.set('topic', at.root);
	params.set('theme', theme);
	return `/admin/trends?${params}`;
};

/** A stated number as read: "40 min", "€9.50" */
export const amountLabel = (amount: number, unit: string) =>
	unit === 'minutes'
		? `${Number.isInteger(amount) ? amount : amount.toFixed(1)} min`
		: `€${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;

/** A claim's kind as a page names it */
export const KIND_LABELS: Record<string, string> = {
	opinion: 'opinion',
	fact: 'fact',
	change: 'change',
	new_item: 'new item',
	deal: 'deal',
	event: 'event',
	question: 'question',
	verdict: 'verdict'
};

/**
 * A source's sentiment from its claims (a review or a post stores none): every judging claim
 * positive → positive, every one negative → negative, both or a mixed one → mixed, none → neutral.
 * The backend's `sentimentOf`, for pages that show a badge per source.
 */
export const sentimentOf = (statements: Pick<Statement, 'text' | 'sentiment' | 'kind'>[] | undefined): string => {
	const judged = (statements ?? [])
		.filter((s) => s.text && s.kind !== 'change' && s.kind !== 'question' && s.sentiment && s.sentiment !== 'neutral')
		.map((s) => s.sentiment!);
	const pos = judged.includes('positive');
	const neg = judged.includes('negative');
	return judged.includes('mixed') || (pos && neg) ? 'mixed' : pos ? 'positive' : neg ? 'negative' : 'neutral';
};

/** What a source said, its own words where kept (the quote, else the English): judging claims first, at most `limit` */
export const saidOf = (statements: Pick<Statement, 'text' | 'quote' | 'sentiment' | 'kind'>[] | undefined, limit = 2): string[] => {
	const said = (statements ?? []).filter((s) => s.text);
	const judging = said.filter((s) => s.kind !== 'change' && s.kind !== 'question' && s.sentiment && s.sentiment !== 'neutral');
	return [...new Set([...judging, ...said].map((s) => s.quote || s.text!))].slice(0, limit);
};

