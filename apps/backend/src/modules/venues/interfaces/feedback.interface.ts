// The shapes the LLM extracts from posts and reviews, stored as jsonb and sent to the admin.

import type { FeedbackTheme } from '../constants/feedback-themes.constant.js';

export type { FeedbackTheme };

export type FeedbackSentiment = 'positive' | 'mixed' | 'negative' | 'neutral';

export type FeedbackTopic =
	'food' | 'drinks' | 'service' | 'vibe' | 'price' | 'payment' | 'wait' | 'cleanliness' | 'other';

/**
 * One thing praised or criticised, e.g. `{ topic: 'price', theme: 'price_increase', detail: 'prices went up' }`.
 * The theme is what it is about (`FEEDBACK_THEMES`), the topic is the theme's. A point stored
 * before themes existed has none until the backfill files it.
 */
export interface FeedbackPoint {
	topic: FeedbackTopic;
	theme?: FeedbackTheme;
	detail: string;
}

/** A dish or drink named, with how it came across. */
export interface FeedbackDish {
	name: string;
	sentiment: FeedbackSentiment;
}
