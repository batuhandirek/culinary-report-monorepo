import { describe, expect, it } from '@jest/globals';

import {
	fallbackTheme,
	FEEDBACK_THEME_KEYS,
	FEEDBACK_THEMES,
	FEEDBACK_TOPICS,
	feedbackThemeLabel,
	feedbackThemeLegend,
	isFeedbackTheme,
	themesOfTopic,
} from '../constants/feedback-themes.constant.js';
import { withTopics } from '../util/feedback.js';

/* The vocabulary every praise and complaint point is filed under. */
describe('feedback themes', () => {
	it('puts every theme under one of the nine topics, and gives every topic a catch-all of its own', () => {
		for (const key of FEEDBACK_THEME_KEYS) expect(FEEDBACK_TOPICS).toContain(FEEDBACK_THEMES[key].topic);
		for (const topic of FEEDBACK_TOPICS) {
			const fallback = fallbackTheme(topic);
			expect(isFeedbackTheme(fallback)).toBe(true);
			expect(FEEDBACK_THEMES[fallback].topic).toBe(topic);
			// A catch-all alone would say nothing the topic does not
			expect(themesOfTopic(topic).length).toBeGreaterThan(topic === 'other' ? 1 : 2);
		}
	});

	it('names every theme once, with a label of its own', () => {
		const labels = FEEDBACK_THEME_KEYS.map(k => FEEDBACK_THEMES[k].label.toLowerCase());
		expect(new Set(labels).size).toBe(labels.length);
		const legend = feedbackThemeLegend();
		for (const key of FEEDBACK_THEME_KEYS) expect(legend).toContain(`${key} (`);
		expect(feedbackThemeLabel('price_increase')).toBe('price / price increase');
	});

	it('derives the topic from the theme the agent answered', () => {
		expect(
			withTopics([
				{ theme: 'price_increase', detail: 'prices went up' },
				{ theme: 'cash_only', detail: 'cards no longer accepted' },
			]),
		).toEqual([
			{ topic: 'price', theme: 'price_increase', detail: 'prices went up' },
			{ topic: 'payment', theme: 'cash_only', detail: 'cards no longer accepted' },
		]);
	});
});
