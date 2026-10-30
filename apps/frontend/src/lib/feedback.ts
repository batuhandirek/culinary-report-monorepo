// What a review or a mention says, as the API serves it: feedback rows (`FeedbackPointOutputDto`).
// A point has a detail and is praise (positive) or a complaint (negative); a dish-only row names a
// dish no point names, with how it came across.

/** An aspect as a row carries it (`FeedbackAspectOutputDto`): the theme's key and label, and its root */
export interface FeedbackAspect {
	key: string;
	label: string;
	parent?: { key: string; label: string };
}

/** A theme or a topic as a page names it */
export interface FeedbackTerm {
	key: string;
	label: string;
}

/** The fields a page reads of a feedback row */
interface FeedbackRow {
	sentiment: string;
	topic?: string;
	theme?: string;
	/** The aspect `theme` names, with its label; its `parent` is the root, absent for a root */
	aspect?: FeedbackAspect;
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
		.map((row) => (row.aspect ? `${row.aspect.label}: ${row.detail}` : row.detail!));

/** A row's root: the aspect's parent, the aspect itself for a root, the bare topic key for an unfiled row */
const rootOf = (row: FeedbackRow): FeedbackTerm =>
	row.aspect ? (row.aspect.parent ?? row.aspect) : { key: row.topic ?? 'other', label: row.topic ?? 'other' };

/** Each term once, by key, in the order first met */
const uniqueTerms = (terms: FeedbackTerm[]): FeedbackTerm[] => [...new Map(terms.map((t) => [t.key, t])).values()];

/** The topics (roots) a source's points of one side raise, each once */
export const topicsOf = (feedback: FeedbackRow[] | undefined, side: 'praise' | 'complaints'): FeedbackTerm[] =>
	uniqueTerms(pointsOf(feedback, side).map(rootOf));

/** The dishes and drinks a source names, each once (case aside), as first spelled */
export const dishesOf = (feedback: FeedbackRow[] | undefined): string[] => {
	const seen = new Map<string, string>();
	for (const row of feedback ?? []) if (row.dish && !seen.has(row.dish.toLowerCase())) seen.set(row.dish.toLowerCase(), row.dish);
	return [...seen.values()];
};

/** What a source talks about: the themes of its complaints and of its praise, each once, and its dishes */
export interface TalksAbout {
	complaints: FeedbackTerm[];
	praise: FeedbackTerm[];
	/** A dish's food topic when it has one (`key`), else the dish as first spelled */
	dishes: { label: string; key?: string }[];
}

export const talksAbout = (feedback: FeedbackRow[] | undefined): TalksAbout => {
	const themes = (side: 'praise' | 'complaints') =>
		uniqueTerms(pointsOf(feedback, side).flatMap((row) => (row.aspect ? [{ key: row.aspect.key, label: row.aspect.label }] : [])));
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
 * its topic (`root`, the aspect's root key, from the caller's aspect) and the theme
 * (`TrendsThemesTab` reads them from the URL).
 */
export const themeRowHref = (
	theme: string,
	side: 'praise' | 'complaints',
	at: { cityId?: string; month?: string; root?: string }
) => {
	const params = new URLSearchParams({ tab: 'themes' });
	if (at.cityId) params.set('cityId', at.cityId);
	if (at.month) params.set('month', at.month);
	if (side === 'praise') params.set('side', 'praise');
	if (at.root) params.set('topic', at.root);
	params.set('theme', theme);
	return `/admin/trends?${params}`;
};

/** A stated number as read: "40 min", "€9.50" */
export const amountLabel = (amount: number, unit: string) =>
	unit === 'minutes'
		? `${Number.isInteger(amount) ? amount : amount.toFixed(1)} min`
		: `€${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
