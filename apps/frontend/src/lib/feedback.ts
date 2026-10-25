import type { FeedbackPointOutputDtoThemeEnum } from 'client';

// What a review or a mention says, as the API serves it: feedback rows (`FeedbackPointOutputDto`).
// A point has a detail and is praise (positive) or a complaint (negative); a dish-only row names a
// dish no point names, with how it came across.

/** The fields a page reads of a feedback row */
interface FeedbackRow {
	sentiment: string;
	topic?: string;
	theme?: string;
	detail?: string;
	dish?: string;
	foodTopic?: { key: string; label: string };
	/** The number it states: minutes for a wait, euro for a price */
	amount?: number;
	unit?: string;
	/** A change the reviewer noticed since before: no praise or complaint */
	change?: boolean;
}

/** A source's praise points (`praise`) or complaint points (`complaints`), in the order said */
export const pointsOf = <T extends FeedbackRow>(feedback: T[] | undefined, side: 'praise' | 'complaints'): T[] =>
	(feedback ?? []).filter((row) => row.detail && row.sentiment === (side === 'praise' ? 'positive' : 'negative'));

/** A review's noticed changes, as "Portion size: made smaller" once filed under a theme */
export const changesOf = (feedback: FeedbackRow[] | undefined): string[] =>
	(feedback ?? [])
		.filter((row) => row.change && row.detail)
		.map((row) => (row.theme ? `${themeLabel(row.theme)}: ${row.detail}` : row.detail!));

/** The topics a source's points of one side raise, each once */
export const topicsOf = (feedback: FeedbackRow[] | undefined, side: 'praise' | 'complaints'): string[] => [
	...new Set(pointsOf(feedback, side).map((row) => row.topic ?? 'other'))
];

/** The dishes and drinks a source names, each once (case aside), as first spelled */
export const dishesOf = (feedback: FeedbackRow[] | undefined): string[] => {
	const seen = new Map<string, string>();
	for (const row of feedback ?? []) if (row.dish && !seen.has(row.dish.toLowerCase())) seen.set(row.dish.toLowerCase(), row.dish);
	return [...seen.values()];
};

/**
 * The feedback vocabulary's labels, as a report shows a theme. Mirrors the backend's
 * `FEEDBACK_THEMES`; typed against the client's enum, so a theme added there fails svelte-check
 * until it is labelled here.
 */
export const FEEDBACK_THEME_LABELS: Record<FeedbackPointOutputDtoThemeEnum, { label: string; topic: string }> = {
	taste: { label: 'Taste', topic: 'food' },
	freshness: { label: 'Freshness', topic: 'food' },
	temperature: { label: 'Temperature', topic: 'food' },
	cooking: { label: 'Cooking', topic: 'food' },
	seasoning: { label: 'Seasoning', topic: 'food' },
	portion_size: { label: 'Portion size', topic: 'food' },
	ingredient_quality: { label: 'Ingredients', topic: 'food' },
	menu_variety: { label: 'Menu variety', topic: 'food' },
	availability: { label: 'Availability', topic: 'food' },
	quality_change: { label: 'Quality change', topic: 'food' },
	authenticity: { label: 'Authenticity', topic: 'food' },
	presentation: { label: 'Presentation', topic: 'food' },
	food_other: { label: 'Food, other', topic: 'food' },
	drink_quality: { label: 'Drink quality', topic: 'drinks' },
	drink_selection: { label: 'Drink selection', topic: 'drinks' },
	drinks_other: { label: 'Drinks, other', topic: 'drinks' },
	friendliness: { label: 'Friendliness', topic: 'service' },
	attentiveness: { label: 'Attentiveness', topic: 'service' },
	speed_of_service: { label: 'Speed of service', topic: 'service' },
	order_accuracy: { label: 'Order accuracy', topic: 'service' },
	advice: { label: 'Advice', topic: 'service' },
	language: { label: 'Language', topic: 'service' },
	reservation_handling: { label: 'Reservations', topic: 'service' },
	complaint_handling: { label: 'Complaint handling', topic: 'service' },
	takeaway_handling: { label: 'Takeaway handling', topic: 'service' },
	staff_change: { label: 'Staff change', topic: 'service' },
	service_other: { label: 'Service, other', topic: 'service' },
	atmosphere: { label: 'Atmosphere', topic: 'vibe' },
	noise: { label: 'Noise', topic: 'vibe' },
	space: { label: 'Space', topic: 'vibe' },
	interior: { label: 'Interior', topic: 'vibe' },
	outdoor_seating: { label: 'Outdoor seating', topic: 'vibe' },
	crowding: { label: 'Crowding', topic: 'vibe' },
	location: { label: 'Location', topic: 'vibe' },
	family_pets: { label: 'Families and pets', topic: 'vibe' },
	vibe_other: { label: 'Atmosphere, other', topic: 'vibe' },
	price_level: { label: 'Price level', topic: 'price' },
	value_for_money: { label: 'Value for money', topic: 'price' },
	price_increase: { label: 'Price increase', topic: 'price' },
	extra_charges: { label: 'Extra charges', topic: 'price' },
	price_other: { label: 'Price, other', topic: 'price' },
	cash_only: { label: 'Cash only', topic: 'payment' },
	card_payment: { label: 'Card payment', topic: 'payment' },
	tipping: { label: 'Tipping', topic: 'payment' },
	billing: { label: 'Billing', topic: 'payment' },
	payment_other: { label: 'Payment, other', topic: 'payment' },
	queue: { label: 'Queue', topic: 'wait' },
	wait_for_food: { label: 'Wait for food', topic: 'wait' },
	wait_for_table: { label: 'Wait for a table', topic: 'wait' },
	wait_other: { label: 'Waiting, other', topic: 'wait' },
	toilets: { label: 'Toilets', topic: 'cleanliness' },
	dining_area: { label: 'Dining area', topic: 'cleanliness' },
	food_hygiene: { label: 'Food hygiene', topic: 'cleanliness' },
	cleanliness_other: { label: 'Cleanliness, other', topic: 'cleanliness' },
	opening_hours: { label: 'Opening hours', topic: 'other' },
	accessibility: { label: 'Accessibility', topic: 'other' },
	ownership_change: { label: 'Ownership change', topic: 'other' },
	renovation: { label: 'Renovation', topic: 'other' },
	delivery_platform: { label: 'Delivery platform', topic: 'other' },
	amenities: { label: 'Amenities', topic: 'other' },
	other: { label: 'Other', topic: 'other' },
};

/** A theme's label, the key itself for one this build doesn't know */
export const themeLabel = (key: string) =>
	FEEDBACK_THEME_LABELS[key as FeedbackPointOutputDtoThemeEnum]?.label ?? key;

/** Whether a theme is a topic's catch-all ("Food, other"), which says nothing on its own */
export const isCatchAllTheme = (key: string) => key === 'other' || key.endsWith('_other');

/** What a source talks about: the themes of its complaints and of its praise, each once, and its dishes */
export interface TalksAbout {
	complaints: string[];
	praise: string[];
	/** A dish's food topic when it has one (`key`), else the dish as first spelled */
	dishes: { label: string; key?: string }[];
}

export const talksAbout = (feedback: FeedbackRow[] | undefined): TalksAbout => {
	const themes = (side: 'praise' | 'complaints') => [
		...new Set(pointsOf(feedback, side).flatMap((row) => (row.theme ? [row.theme] : [])))
	];
	const dishes = new Map<string, { label: string; key?: string }>();
	for (const row of feedback ?? []) {
		if (!row.dish) continue;
		const id = row.foodTopic?.key ?? row.dish.toLowerCase();
		if (!dishes.has(id)) dishes.set(id, row.foodTopic ? { label: row.foodTopic.label, key: row.foodTopic.key } : { label: row.dish });
	}
	return { complaints: themes('complaints'), praise: themes('praise'), dishes: [...dishes.values()] };
};

/** Which of a theme's lists: what guests criticised, praised, or noticed had changed since before */
export type ThemeSide = 'complaints' | 'praise' | 'changes';

/** A row's side: a noticed change, praise or a complaint */
export const sideOf = (row: Pick<FeedbackRow, 'sentiment' | 'change'>): ThemeSide =>
	row.change ? 'changes' : row.sentiment === 'positive' ? 'praise' : 'complaints';

/**
 * A theme's own page for a city and month, on one side: every sentence filed under it
 * (`/admin/trends/themes/<theme>`; complaints and the page's defaults stay out of the URL).
 */
export const themeHref = (theme: string, side: ThemeSide, at: { cityId?: string; month?: string; food?: string | null }) => {
	const params = new URLSearchParams();
	if (at.cityId) params.set('cityId', at.cityId);
	if (at.month) params.set('month', at.month);
	if (side !== 'complaints') params.set('side', side);
	if (at.food) params.set('food', at.food);
	const query = params.size ? `?${params}` : '';
	return `/admin/trends/themes/${encodeURIComponent(theme)}${query}`;
};

/**
 * The Trends "Praise and complaints" tab opened on a theme's row, for a city and month: its side,
 * its topic and the theme (`TrendsThemesTab` reads them from the URL).
 */
export const themeRowHref = (theme: string, side: 'praise' | 'complaints', at: { cityId?: string; month?: string }) => {
	const params = new URLSearchParams({ tab: 'themes' });
	if (at.cityId) params.set('cityId', at.cityId);
	if (at.month) params.set('month', at.month);
	if (side === 'praise') params.set('side', 'praise');
	const topic = FEEDBACK_THEME_LABELS[theme as FeedbackPointOutputDtoThemeEnum]?.topic;
	if (topic) params.set('topic', topic);
	params.set('theme', theme);
	return `/admin/trends?${params}`;
};

/** A stated number as read: "40 min", "€9.50" */
export const amountLabel = (amount: number, unit: string) =>
	unit === 'minutes'
		? `${Number.isInteger(amount) ? amount : amount.toFixed(1)} min`
		: `€${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
