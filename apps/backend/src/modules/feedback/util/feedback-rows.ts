// Pure: what a source says, as feedback rows, and back.

import _ from 'lodash';

import type { TopicIndex } from 'src/modules/topics/util/topics.js';
import type {
	FeedbackSentiment,
	FeedbackTopic,
} from 'src/modules/venues/interfaces/feedback.interface.js';
import { dishKey, namesDish } from 'src/modules/venues/util/dishes.js';

import type { FeedbackUnit } from '../entities/feedback-point.entity.js';

import { AMOUNT_UNITS, parseAmount } from './amounts.js';

/** A praise or complaint point as an agent answers it, or as it was stored before rows */
export interface AnsweredPoint {
	/** An aspect's key (`Topic.key`) */
	theme?: string | null;
	/** Only points stored before themes carry it without a theme */
	topic?: FeedbackTopic | null;
	detail: string;
	dish?: string | null;
	/** In the topic's unit: minutes for a wait, the price for a price */
	amount?: number | null;
}

/** A dish or drink a source names, with how it came across */
export interface AnsweredDish {
	name: string;
	sentiment: FeedbackSentiment;
}

/** Everything one source says: what the agents answer, what the jsonb held */
export interface FeedbackAnswer {
	praise: AnsweredPoint[];
	complaints: AnsweredPoint[];
	dishes: AnsweredDish[];
	/** Changes a reviewer noticed since before ("new owner"): reviews only */
	changes?: string[];
}

/** A row to write, before its source, city, month and food topic are set */
export interface FeedbackRowDraft {
	sentiment: FeedbackSentiment;
	topic: FeedbackTopic | null;
	theme: string | null;
	/** The aspect row's id, with `theme`; null while unfiled */
	aspectId: string | null;
	detail: string | null;
	dish: string | null;
	dishKey: string | null;
	amount: number | null;
	unit: FeedbackUnit | null;
	/** The dish is decided: no dish pass needed */
	dishChecked: boolean;
	/** The amount is decided: no amount pass needed */
	amountChecked: boolean;
	/** A noticed change, not a praise or complaint point */
	change: boolean;
}

/** The topics whose points can be about one dish or drink: the dish pass asks only these */
export const DISH_TOPICS: FeedbackTopic[] = ['food', 'drinks'];

/** What the writers check an agent's aspect key against: the index (`TopicIndex.aspect`) */
export type AspectLookup = Pick<TopicIndex, 'aspect'>;

/**
 * A source's rows: one per praise point (`positive`) and complaint point (`negative`), then one per
 * listed dish no point names (same `dishKey`), with the dish's sentiment.
 *
 * `aspects`: the index the agents' aspect keys are checked against: a known aspect gives the row its
 * `theme`, `aspectId` and `topic` (the aspect's root); an unknown key leaves the point unfiled (the
 * `feedback-themes` backlog files it). `asked`: the agent was asked for each point's dish and amount
 * (an extraction now), so a point without one has none. Otherwise (points stored before rows) the phrase is read: a point naming
 * exactly one listed dish takes it, and a wait or price point takes the amount its phrase states;
 * the rest are left for the LLM passes (`dishChecked` / `amountChecked` false), a dish only for a
 * food or drinks point of a source that lists dishes.
 */
export const feedbackRows = (
	answer: FeedbackAnswer,
	opts: { asked: boolean; aspects: AspectLookup },
): FeedbackRowDraft[] => {
	const dishes = _.uniqBy(
		answer.dishes
			.map(d => ({ ...d, name: d.name.trim(), key: dishKey(d.name) }))
			.filter(d => d.key),
		d => d.key,
	);
	const point = (p: AnsweredPoint, sentiment: 'positive' | 'negative'): FeedbackRowDraft => {
		const aspect = p.theme ? opts.aspects.aspect(p.theme) : undefined;
		const theme = aspect?.key ?? null;
		const topic = (aspect?.root ?? p.topic ?? 'other') as FeedbackTopic;
		const detail = p.detail.trim();

		let dish = p.dish?.trim() || null;
		let dishChecked = opts.asked;
		if (!opts.asked) {
			const named = dishes.filter(d => namesDish(detail, d.key));
			if (named.length === 1) {
				dish = named[0].name;
				dishChecked = true;
			} else dishChecked = !DISH_TOPICS.includes(topic) || !dishes.length;
		}

		// The agent answers the number; its unit is the topic's (a wait in minutes, a price)
		const unit = AMOUNT_UNITS[topic];
		const stated =
			unit && p.amount != null && Number.isFinite(p.amount) && p.amount > 0 ?
				{ amount: p.amount, unit }
			:	parseAmount(detail, topic);
		const amountChecked = opts.asked || !!stated || !unit;
		return {
			sentiment,
			topic,
			theme,
			aspectId: aspect?.id ?? null,
			detail,
			dish,
			dishKey: dish ? dishKey(dish) || null : null,
			amount: stated?.amount ?? null,
			unit: stated?.unit ?? null,
			dishChecked,
			amountChecked,
			change: false,
		};
	};
	const points = [
		...answer.praise.filter(p => p.detail?.trim()).map(p => point(p, 'positive')),
		...answer.complaints.filter(p => p.detail?.trim()).map(p => point(p, 'negative')),
	];
	const named = new Set(points.map(p => p.dishKey).filter(Boolean));
	const dishOnly = dishes
		.filter(d => !named.has(d.key))
		.map((d): FeedbackRowDraft => ({
			sentiment: d.sentiment,
			topic: null,
			theme: null,
			aspectId: null,
			detail: null,
			dish: d.name,
			dishKey: d.key,
			amount: null,
			unit: null,
			dishChecked: true,
			amountChecked: true,
			change: false,
		}));
	return [...points, ...dishOnly, ...changeRows(answer.changes ?? [])];
};

/**
 * A review's noticed changes as rows: `neutral`, the change as the detail, no topic or theme until
 * the `feedback-themes` backlog files them; each spelling once (case aside).
 */
export const changeRows = (changes: string[]): FeedbackRowDraft[] =>
	_.uniqBy(changes.map(c => c.trim()).filter(Boolean), c => c.toLowerCase()).map(detail => ({
		sentiment: 'neutral',
		topic: null,
		theme: null,
		aspectId: null,
		detail,
		dish: null,
		dishKey: null,
		amount: null,
		unit: null,
		dishChecked: true,
		amountChecked: true,
		change: true,
	}));

/** What a reader needs of a row: the entity, or a row read by SQL */
export interface FeedbackRowLike {
	sentiment: FeedbackSentiment | string;
	topic?: FeedbackTopic | string | null;
	theme?: string | null;
	detail?: string | null;
	dish?: string | null;
	dishKey?: string | null;
	change?: boolean;
}

/** A praise or complaint point as reports and prompts show it */
export interface FeedbackPointView {
	topic: FeedbackTopic;
	/** The aspect's key; absent while unfiled */
	theme?: string;
	detail: string;
}

const isPoint = (row: FeedbackRowLike) => !!row.detail && !row.change;

const view = (row: FeedbackRowLike): FeedbackPointView => ({
	topic: (row.topic ?? 'other') as FeedbackTopic,
	...(row.theme && { theme: row.theme }),
	detail: row.detail!,
});

/** A source's praise points, as stored (rows come in id order: the agent's order) */
export const praiseOf = (rows: FeedbackRowLike[]): FeedbackPointView[] =>
	rows.filter(r => isPoint(r) && r.sentiment === 'positive').map(view);

/** A source's complaint points */
export const complaintsOf = (rows: FeedbackRowLike[]): FeedbackPointView[] =>
	rows.filter(r => isPoint(r) && r.sentiment === 'negative').map(view);

/** A review's noticed changes, in the order said: the topic and theme once the backlog filed them */
export const changesOf = (rows: FeedbackRowLike[]): FeedbackPointView[] =>
	rows.filter(r => r.change && r.detail).map(view);

/** The topics a source's points of one polarity raise, each once, in order */
export const topicsOf = (
	rows: FeedbackRowLike[],
	sentiment: 'positive' | 'negative',
): FeedbackTopic[] =>
	_.uniq((sentiment === 'positive' ? praiseOf(rows) : complaintsOf(rows)).map(p => p.topic));

/** A dish a source names, once per `dishKey` */
export interface SourceDish {
	name: string;
	key: string;
	sentiment: FeedbackSentiment;
}

/**
 * The dishes a source names, once per `dishKey`: a dish-only row's sentiment, else its points'
 * on that dish (praised and criticised: `mixed`). The first spelling is the name.
 */
export const dishesOf = (rows: FeedbackRowLike[]): SourceDish[] =>
	Object.values(
		_.groupBy(
			rows.filter(r => r.dish && r.dishKey),
			r => r.dishKey,
		),
	).map(group => {
		const dishOnly = group.find(r => !isPoint(r));
		const polarities = _.uniq(group.filter(isPoint).map(r => r.sentiment));
		const sentiment = (
			dishOnly ? dishOnly.sentiment
			: polarities.length === 1 ? polarities[0]
			: 'mixed') as FeedbackSentiment;
		return { name: group[0].dish!, key: group[0].dishKey!, sentiment };
	});
