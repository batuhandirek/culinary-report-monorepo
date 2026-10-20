// The shapes the LLM extracts from posts and reviews, stored as jsonb and sent to the admin.

export type FeedbackSentiment = 'positive' | 'mixed' | 'negative' | 'neutral';

export type FeedbackTopic =
	'food' | 'drinks' | 'service' | 'vibe' | 'price' | 'payment' | 'wait' | 'cleanliness' | 'other';

/** One thing praised or criticised, e.g. `{ topic: 'service', detail: 'staff forgot our order' }`. */
export interface FeedbackPoint {
	topic: FeedbackTopic;
	detail: string;
}

/** A dish or drink named, with how it came across. */
export interface FeedbackDish {
	name: string;
	sentiment: FeedbackSentiment;
}
