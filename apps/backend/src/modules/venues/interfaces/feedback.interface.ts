// The feedback vocabulary's types. What a source says is stored as rows (`FeedbackPoint`, modules/feedback).

import type { FeedbackTheme } from '../constants/feedback-themes.constant.js';

export type { FeedbackTheme };

export type FeedbackSentiment = 'positive' | 'mixed' | 'negative' | 'neutral';

export type FeedbackTopic =
	'food' | 'drinks' | 'service' | 'vibe' | 'price' | 'payment' | 'wait' | 'cleanliness' | 'other';
