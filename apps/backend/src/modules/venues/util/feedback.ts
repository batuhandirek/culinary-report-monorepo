// Pure helpers over praise and complaint points.

import { FEEDBACK_THEMES } from '../constants/feedback-themes.constant.js';
import type { FeedbackPoint, FeedbackTheme } from '../interfaces/feedback.interface.js';

/** What the agents answer per point: the theme and the phrase; the topic is derived. */
export interface ThemedPoint {
	theme: FeedbackTheme;
	detail: string;
}

/** The agents answer a theme and a detail; the topic is the theme's, so the two never disagree. */
export const withTopics = (points: ThemedPoint[]): FeedbackPoint[] =>
	points.map(p => ({ topic: FEEDBACK_THEMES[p.theme].topic, theme: p.theme, detail: p.detail }));
