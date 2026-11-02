/** How something came across: a review's or a mention's overall tone, a statement's judgement */
export const SENTIMENTS = ['positive', 'mixed', 'negative', 'neutral'] as const;

export type Sentiment = (typeof SENTIMENTS)[number];
