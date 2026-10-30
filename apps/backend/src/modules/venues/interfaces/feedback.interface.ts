// The feedback vocabulary's types. What a source says is stored as rows (`FeedbackPoint`, modules/feedback);
// what a point is about is an aspect (`Topic` of kind `aspect`, `TopicIndex`), its key the row's `theme`.

export type FeedbackSentiment = 'positive' | 'mixed' | 'negative' | 'neutral';

/** The seeded aspect roots: a filed point's `topic` is its aspect's root key */
export type FeedbackTopic =
	'food' | 'drinks' | 'service' | 'vibe' | 'price' | 'payment' | 'wait' | 'cleanliness' | 'other';
