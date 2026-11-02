// Pure: what a source's statements say, as reports, prompts and pages read them.

import _ from 'lodash';

import type { StatementKind } from '../constants/kind.constant.js';
import type { Sentiment } from '../constants/sentiment.constant.js';
import type { StatementPartRole } from '../entities/statement-part.entity.js';

/** What a reader needs of a part: the entity (populated `topic.parent`, `term.topics.topic`), or a row read by SQL */
export interface PartLike {
	role: StatementPartRole | string;
	/** An aspect part's topic, with its parent when loaded (a root has none) */
	topic?: { key: string; label?: string; parent?: { key: string; label?: string } | null } | null;
	/** A food part's wording, with its links when loaded */
	term?: {
		key: string;
		name: string;
		topics?: Iterable<{ topic: { key: string; label?: string } }>;
	} | null;
}

/** What a reader needs of a statement: the entity, or a row read by SQL */
export interface StatementLike {
	text?: string | null;
	/** The source's own words, when kept */
	quote?: string | null;
	sentiment?: Sentiment | string | null;
	/** Agent B's kind; null until it read the claim */
	kind?: StatementKind | string | null;
	amount?: number | null;
	unit?: string | null;
	parts?: Iterable<PartLike>;
}

/** A claim as reports and prompts show it */
export interface StatementView {
	text: string;
	/** The source's own words, when kept */
	quote?: string;
	sentiment: Sentiment;
	/** Agent B's kind; absent until it read the claim */
	kind?: StatementKind;
	/** The aspect's key; absent until agent B filed it, or when the claim is about no aspect */
	aspect?: string;
	/** The aspect's root key (its parent's, or its own); absent with `aspect` */
	root?: string;
	amount?: number;
	unit?: string;
}

export const partsOf = (s: StatementLike): PartLike[] => (s.parts ? [...s.parts] : []);

/** A statement's aspect part, when it has one */
export const aspectPart = (s: StatementLike): PartLike | undefined =>
	partsOf(s).find(p => p.role === 'aspect' && p.topic);

/** An aspect's root key: its parent's key when loaded, else its own (a root) */
export const rootOf = (topic: NonNullable<PartLike['topic']>): string =>
	topic.parent?.key ?? topic.key;

/** The topic keys a part is about: an aspect's own, a food wording's links (empty until decided) */
export const partTopicKeys = (p: PartLike): string[] =>
	p.role === 'aspect' ?
		p.topic ?
			[p.topic.key]
		:	[]
	: p.term?.topics ? [...p.term.topics].map(l => l.topic.key)
	: [];

/** A noticed change (kind `change`): no praise or complaint whatever its sentiment */
export const isChange = (s: StatementLike): boolean => s.kind === 'change';

/**
 * A claim that can praise or complain: a statement with text that is no change and no question (a
 * dish-only statement has no text)
 */
export const isClaim = (s: StatementLike): boolean =>
	!!s.text?.trim() && !isChange(s) && s.kind !== 'question';

export const view = (s: StatementLike): StatementView => {
	const aspect = aspectPart(s)?.topic;
	return {
		text: s.text!.trim(),
		...(s.quote?.trim() && { quote: s.quote.trim() }),
		sentiment: (s.sentiment ?? 'neutral') as Sentiment,
		...(s.kind && { kind: s.kind as StatementKind }),
		...(aspect && { aspect: aspect.key, root: rootOf(aspect) }),
		...(s.amount != null && s.unit && { amount: s.amount, unit: s.unit }),
	};
};

/** A source's praise: its positive claims, in the order said (rows come in id order) */
export const praiseOf = (list: StatementLike[]): StatementView[] =>
	list.filter(s => isClaim(s) && s.sentiment === 'positive').map(view);

/** A source's complaints: its negative claims */
export const complaintsOf = (list: StatementLike[]): StatementView[] =>
	list.filter(s => isClaim(s) && s.sentiment === 'negative').map(view);

/** A source's noted facts: its neutral and mixed claims ("fries for 10 euros"), neither praise nor complaint */
export const notedOf = (list: StatementLike[]): StatementView[] =>
	list
		.filter(s => isClaim(s) && s.sentiment !== 'positive' && s.sentiment !== 'negative')
		.map(view);

/** A source's noticed changes ("new owner"), in the order said: their aspect once agent B filed them */
export const changesOf = (list: StatementLike[]): StatementView[] =>
	list.filter(s => isChange(s) && s.text?.trim()).map(view);

/** The aspect roots a source's claims of one polarity raise, each once, in order (claims with no aspect left out) */
export const rootsOf = (list: StatementLike[], sentiment: 'positive' | 'negative'): string[] =>
	_.uniq(
		(sentiment === 'positive' ? praiseOf(list) : complaintsOf(list))
			.map(v => v.root)
			.filter((r): r is string => !!r),
	);

/** A food or drink a source names, once per wording */
export interface SourceFood {
	/** The wording, as the source spelled it (`Term.name`) */
	name: string;
	/** `Term.key` */
	key: string;
	/** The dish-only statement's sentiment, else its claims' (praised and criticised: `mixed`) */
	sentiment: Sentiment;
	/** The wording's topics (`term_topics`, when loaded; empty until decided) */
	topics: string[];
}

/**
 * The foods and drinks a source names, once per term: the food parts of its statements, grouped by
 * wording. Sentiment: a dish-only statement's (text null), else the judging claims' one polarity
 * (praised and criticised: `mixed`; a neutral fact next to praise leaves it praised), else `mixed`
 * when a claim is, else `neutral`.
 */
export const foodsOf = (list: StatementLike[]): SourceFood[] => {
	const named = list.flatMap(s =>
		partsOf(s)
			.filter(p => p.role === 'food' && p.term)
			.map(p => ({ s, p })),
	);
	return Object.values(_.groupBy(named, ({ p }) => p.term!.key)).map(group => {
		const dishOnly = group.find(({ s }) => !s.text?.trim());
		const claims = group
			.filter(({ s }) => isClaim(s))
			.map(({ s }) => (s.sentiment ?? 'neutral') as Sentiment);
		const polarities = _.uniq(claims.filter(x => x === 'positive' || x === 'negative'));
		return {
			name: group[0].p.term!.name,
			key: group[0].p.term!.key,
			sentiment:
				dishOnly ? ((dishOnly.s.sentiment ?? 'neutral') as Sentiment)
				: polarities.length === 1 ? polarities[0]
				: polarities.length > 1 || claims.includes('mixed') ? 'mixed'
				: 'neutral',
			topics: _.uniq(group.flatMap(({ p }) => partTopicKeys(p))),
		};
	});
};

/** Every topic key a source's statements are about (aspects and foods' links), each once */
export const topicKeysOf = (list: StatementLike[]): string[] =>
	_.uniq(list.flatMap(s => partsOf(s).flatMap(partTopicKeys)));

/**
 * A source's sentiment, worked out from its claims (a review or a post has no stored one since
 * claim model v2): every judging claim positive → positive, every one negative → negative, both or
 * a mixed one → mixed, none judged → neutral. Changes and questions don't judge.
 */
export const sentimentOf = (list: StatementLike[]): Sentiment => {
	const judged = list
		.filter(s => isClaim(s) && s.sentiment && s.sentiment !== 'neutral')
		.map(s => s.sentiment as Sentiment);
	const polarities = _.uniq(judged.filter(x => x === 'positive' || x === 'negative'));
	return (
		judged.includes('mixed') || polarities.length > 1 ? 'mixed'
		: polarities.length === 1 ? polarities[0]
		: 'neutral'
	);
};

/**
 * What a source said, in its own words where kept (the quote, else the English text): its verdicts
 * and opinions first, then the rest, in the order said, at most `limit`. What a page or a prompt
 * shows where a one-line summary used to be.
 */
export const saidOf = (list: StatementLike[], limit = 3): string[] => {
	const said = list.filter(s => s.text?.trim());
	const first = said.filter(
		s =>
			s.kind === 'verdict' ||
			s.kind === 'opinion' ||
			(!s.kind && s.sentiment && s.sentiment !== 'neutral'),
	);
	return _.uniq([...first, ...said].map(s => s.quote?.trim() || s.text!.trim())).slice(0, limit);
};
