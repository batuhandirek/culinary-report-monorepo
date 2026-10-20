import type { BadgeVariant } from '#ui/primitives-new/badge/index.js';

// Wording and formatting shared by the venue, post and report admin pages. A city's districts
// come from its row (`lib/admin-cities.ts`, `stores/AdminCitiesStore.svelte.ts`).

export const TOPIC_LABELS: Record<string, string> = {
	food: 'Food',
	drinks: 'Drinks',
	service: 'Service',
	vibe: 'Atmosphere',
	price: 'Price',
	payment: 'Payment',
	wait: 'Waiting time',
	cleanliness: 'Cleanliness',
	other: 'Other'
};

export const PLATFORM_LABELS: Record<string, string> = { tiktok: 'TikTok', instagram: 'Instagram' };

export const compact = (n: number | null | undefined) =>
	Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n ?? 0);

/** `2026-09` → "September 2026". */
export const monthLabel = (month: string) =>
	new Date(`${month}-01T00:00:00Z`).toLocaleString('en', {
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC'
	});

/** The last `count` months, newest first, as `YYYY-MM`. */
export const recentMonths = (count = 12): string[] => {
	const now = new Date();
	return Array.from({ length: count }, (_, i) =>
		new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString().slice(0, 7)
	);
};

/** The month before this one: what the monthly pipeline reports on. */
export const lastMonth = () => recentMonths(2)[1];

/** This month: still filling up, so its figures are so far, not final. */
export const currentMonth = () => recentMonths(1)[0];

export const sentimentVariant = (sentiment?: string): BadgeVariant =>
	sentiment === 'positive'
		? 'success'
		: sentiment === 'negative'
			? 'destructive'
			: sentiment === 'mixed'
				? 'warning'
				: 'secondary';

/** A venue at or above this lead score is a prospect (the backend's `LEAD_PROSPECT_SCORE`). */
export const LEAD_PROSPECT_SCORE = 60;

export const leadScoreVariant = (score?: number | null): BadgeVariant =>
	score == null
		? 'quiet'
		: score >= LEAD_PROSPECT_SCORE
			? 'success'
			: score >= 40
				? 'warning'
				: 'quiet';

/** The lead score's signals, in the order the venue page lists them. */
export const LEAD_SIGNAL_LABELS = {
	buzz: { name: 'Buzz', hint: 'Posts, views and creators from others, against other venues' },
	spends: { name: 'Already spends', hint: 'Own account, paid posts about it, a website' },
	problem: {
		name: 'Nameable problem',
		hint: 'Complaints, unanswered critical reviews, reply rate'
	},
	reachable: { name: 'Reachable', hint: 'Phone or website, an own social account' },
	press: { name: 'Press', hint: 'Featured or listed by the press this window (report venues only)' }
} as const;
