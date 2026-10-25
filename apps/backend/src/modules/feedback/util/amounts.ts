// Pure: the number a wait or price phrase states, read without an LLM.

import type { FeedbackTopic } from 'src/modules/venues/interfaces/feedback.interface.js';

import type { FeedbackUnit } from '../entities/feedback-point.entity.js';

/** The topics whose points can state an amount: a wait in minutes, a price */
export const AMOUNT_UNITS: Partial<Record<FeedbackTopic, FeedbackUnit>> = {
	wait: 'minutes',
	price: 'money',
};

export interface StatedAmount {
	amount: number;
	unit: FeedbackUnit;
}

const NUMBER = String.raw`(\d+(?:[.,]\d+)?)`;
const RANGE = String.raw`(?:\s*(?:-|–|to|or)\s*${NUMBER})?`;
const num = (raw: string) => Number(raw.replace(',', '.'));

const WORD_HOURS: [RegExp, number][] = [
	[/\b(?:an?|one) hour and (?:a )?half\b|\bhour and a half\b/, 90],
	[/\bhalf an hour\b|\bhalf hour\b|\b30-minute\b/, 30],
	[/\b(?:a )?quarter of an hour\b/, 15],
	[/\btwo hours\b/, 120],
	[/\b(?:an|one|over an|more than an) hour\b/, 60],
];

/** Minutes a wait phrase states: "40 min", "30-40 minutes" (the upper end), "1.5 hours", "over an hour". */
const minutes = (text: string): number | undefined => {
	const mins = text.match(
		new RegExp(String.raw`\b${NUMBER}${RANGE}\s*(?:min|mins|minute|minutes)\b`),
	);
	if (mins) return num(mins[2] ?? mins[1]);
	const hours = text.match(
		new RegExp(String.raw`\b${NUMBER}${RANGE}\s*(?:h|hr|hrs|hour|hours)\b`),
	);
	if (hours) return Math.round(num(hours[2] ?? hours[1]) * 60);
	for (const [pattern, value] of WORD_HOURS) if (pattern.test(text)) return value;
	return undefined;
};

/** A price a phrase states in euro: "€9.50", "9,50 €", "EUR 12", "12 euros", "€8-10" (the upper end). */
const money = (text: string): number | undefined => {
	const before = text.match(new RegExp(String.raw`(?:€|\beur\b)\s*${NUMBER}${RANGE}`));
	if (before) return num(before[2] ?? before[1]);
	const after = text.match(new RegExp(String.raw`\b${NUMBER}${RANGE}\s*(?:€|eur\b|euros?\b)`));
	if (after) return num(after[2] ?? after[1]);
	return undefined;
};

/**
 * The amount a wait or price point's phrase states, or none ("waited forever", "too long",
 * "pricey"). Only what is written: a range is its upper end ("30-40 minutes": 40), "an hour" 60,
 * "half an hour" 30. Money is read in euro, the currency of every city so far (`City` has none).
 */
export const parseAmount = (
	detail: string,
	topic: FeedbackTopic | null | undefined,
): StatedAmount | undefined => {
	const unit = topic ? AMOUNT_UNITS[topic] : undefined;
	if (!unit) return undefined;
	const text = detail.toLowerCase();
	const amount = unit === 'minutes' ? minutes(text) : money(text);
	return amount !== undefined && Number.isFinite(amount) && amount > 0 ?
			{ amount, unit }
		:	undefined;
};
