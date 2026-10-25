// Wording and links of the front page (`/`). Pure: safe on the server.
import type {
	BlogEntrySummaryOutputDto,
	LandingDish,
	LandingEditionOutputDto,
	LandingOpening,
	LandingPlace,
	LandingStory
} from 'client';

/** The edition the front page speaks for. The pages it links to are per city. */
export const LANDING_CITY = { slug: 'berlin', name: 'Berlin' } as const;

export const INSTAGRAM_CITY = 'https://www.instagram.com/munchwerk.berlin/';
export const INSTAGRAM_BRAND = 'https://www.instagram.com/munchwerk/';
export const TIKTOK_CITY = 'https://www.tiktok.com/@munchwerk.berlin';
export const VENUES_MAILTO = 'mailto:hello@munchwerk.com?subject=Munchwerk%20for%20Venues';

/** The brand's series; each keeps its colour and badge everywhere. */
export type Series = 'heat' | 'rising' | 'new' | 'dish' | 'trends';

export interface LandingData {
	/** The newest published live edition of the city, if any */
	edition: LandingEditionOutputDto | null;
	/** The newest published month (`/berlin/2026-10`) and quarter of trends, as paths */
	monthPath: string | null;
	trendsPath: string | null;
	/** The newest blog articles */
	posts: BlogEntrySummaryOutputDto[];
}

/** A place on the list with its lines. */
export type Place = LandingPlace & { said: string; tagline: string };
export type Dish = LandingDish & { text: string; sticker: string };
export type Opening = LandingOpening & { text: string };
export type StoryLine = LandingStory & { line: string; heading: string };

/** The edition's numbers joined to their lines (`copy`, keyed by id). */
export const editionView = (edition: LandingEditionOutputDto) => {
	const { data, copy } = edition;
	const placeCopy = new Map(copy.places.map((p) => [p.brandId, p]));
	const dishCopy = new Map(copy.dishes.map((d) => [d.key, d]));
	const openingCopy = new Map(copy.openings.map((o) => [o.brandId, o]));
	const stories = new Map(data.stories.map((s) => [s.id, s]));
	const story = (line: { storyId: string; title: string; text: string }): StoryLine | null => {
		const s = stories.get(line.storyId);
		return s ? { ...s, heading: line.title, line: line.text } : null;
	};
	return {
		places: data.places.map(
			(p): Place => ({ ...p, said: placeCopy.get(p.brandId)?.said ?? '', tagline: placeCopy.get(p.brandId)?.tagline ?? '' })
		),
		dishes: data.dishes.map(
			(d): Dish => ({ ...d, text: dishCopy.get(d.key)?.text ?? '', sticker: dishCopy.get(d.key)?.sticker ?? '' })
		),
		openings: data.openings.map((o): Opening => ({ ...o, text: openingCopy.get(o.brandId)?.text ?? '' })),
		trends: copy.trends.map(story).filter((s): s is StoryLine => !!s),
		ticker: copy.ticker.map(story).filter((s): s is StoryLine => !!s)
	};
};

const UTC = { timeZone: 'UTC' } as const;
/** The last day the edition counts (its window's end is exclusive). */
export const lastDay = (edition: LandingEditionOutputDto) => new Date(new Date(edition.windowEnd).getTime() - 1);
/** "October 2026" */
export const monthYear = (d: Date) => d.toLocaleString('en', { month: 'long', year: 'numeric', ...UTC });
/** "Oct 2026" */
export const shortMonthYear = (d: Date) => d.toLocaleString('en', { month: 'short', year: 'numeric', ...UTC });
/** "20 October" */
export const dayMonth = (iso: string) =>
	new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleString('en-GB', { day: 'numeric', month: 'long', ...UTC });
/** "26 Sep – 25 Oct" */
export const windowLabel = (edition: LandingEditionOutputDto) => {
	const fmt = (d: Date) => d.toLocaleString('en-GB', { day: 'numeric', month: 'short', ...UTC });
	return `${fmt(new Date(edition.windowStart))} – ${fmt(lastDay(edition))}`;
};

export const twoDigits = (n: number) => String(n).padStart(2, '0');

/** "Friedrichshain · Boxhagener Straße", or for a chain "9 places in Berlin". */
export const placeWhere = (p: { district?: string; street?: string; branches?: number }) =>
	p.branches && p.branches > 1 ?
		`${p.branches} places in ${LANDING_CITY.name}`
	:	[p.district, p.street].filter(Boolean).join(' · ');

/** The movement pill: climbers, held, new. A public list never shows a fall. */
export const movePill = (p: LandingPlace): { label: string; kind: 'up' | 'new' | 'flat' } | null => {
	if (p.move === 'up') return { label: `↑ ${p.climb}`, kind: 'up' };
	if (p.move === 'new') return { label: 'New', kind: 'new' };
	if (p.move === 'held') return { label: 'Held', kind: 'flat' };
	return null;
};

/** "1.4M", "173k", "5,079" */
export const compact = (n: number) => {
	if (n < 10_000) return n.toLocaleString('en');
	if (n < 1_000_000) return `${Math.round(n / 1000)}k`;
	return `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
};

/** First letter up: the model writes stickers in lower case at times. */
export const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export const DISH_KICKERS: Record<LandingDish['role'], string> = {
	dish_of_the_month: 'Dish of the Month',
	rising: 'Still rising',
	most_named: 'Most named',
	drink: 'Drink of the moment'
};

/** A published path of the city in a sitemap section, newest last: `/berlin/2026-10`. */
export const latestPath = (paths: string[], pattern: RegExp) => paths.filter((p) => pattern.test(p)).sort().at(-1) ?? null;

export const MONTH_PATH = new RegExp(`^/${LANDING_CITY.slug}/(\\d{4}-\\d{2})$`);
export const QUARTER_PATH = new RegExp(`^/${LANDING_CITY.slug}/trends/(\\d{4}-q\\d)$`);
