import type { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';

/**
 * The front page's live edition of a city: the last 30 days of what the city posted about
 * eating out, against the 30 days before. Our own counts of public posts by others only (a
 * brand's own account and paid or promotional posts left out): no Google rating, no review
 * text, nothing from OSM. Positive lists only. Optional fields are absent, never null
 * (`serialize({ skipNull })` drops a null inside the jsonb too).
 */
export interface LandingEditionData {
	totals: LandingTotals;
	/** The ten places the most people posted about, then by posts, then views */
	places: LandingPlace[];
	/** The window's most named dishes, for the marquee */
	marquee: string[];
	/** Up to four dishes with a role each (Dish of the Month, still rising, most named, drink) */
	dishes: LandingDish[];
	/** Places posts called new in the last 14 days, most talked about first (three at most) */
	openings: LandingOpening[];
	/** How many places posts called new in the last 14 days */
	openingsCount: number;
	/** Facts the model may tell: trend tiles pick three, the ticker the rest */
	stories: LandingStory[];
}

export interface LandingTotals {
	/** Posts by others naming a place of the city */
	posts: number;
	views: number;
	/** People, not accounts */
	creators: number;
	places: number;
}

/** How a place moved against the 30 days before. A public list never shows a fall: `none`. */
export type LandingMove = 'up' | 'held' | 'new' | 'none';

export interface LandingPlace {
	rank: number;
	brandId: string;
	name: string;
	/** The branch the window's posts named most (else its most reviewed open one) */
	district?: string;
	/** Its street without the house number, as Google writes it */
	street?: string;
	/** The brand's open places in the city */
	branches: number;
	posts: number;
	views: number;
	creators: number;
	move: LandingMove;
	/** Places climbed, for `up` */
	climb?: number;
	/** Its rank in the 30 days before, when it was in the top 50 */
	prevRank?: number;
	/** The dish its posts named most, with 2+ posts */
	dish?: LandingNamedDish;
	/** A post in the last 14 days called it new */
	isNew?: boolean;
}

export interface LandingNamedDish {
	label: string;
	posts: number;
}

export type LandingDishRole = 'dish_of_the_month' | 'rising' | 'most_named' | 'drink';

export interface LandingDish {
	role: LandingDishRole;
	/** The food topic's key, else the dish key */
	key: string;
	label: string;
	posts: number;
	/** Places whose posts named it */
	places: number;
	/** Share of the posts naming a dish, percent with one decimal, and the change in points */
	share: number;
	delta: number;
	/** The places whose posts named it most */
	topPlaces: LandingDishPlace[];
}

export interface LandingDishPlace {
	brandId: string;
	name: string;
	district?: string;
	posts: number;
}

export interface LandingOpening {
	brandId: string;
	name: string;
	district?: string;
	street?: string;
	/** The day of the first post calling it new (`YYYY-MM-DD`), else of the scrape that saw it open */
	firstSeen: string;
	posts: number;
	views: number;
	creators: number;
	dish?: LandingNamedDish;
}

export type LandingStoryKind =
	| 'district'
	| 'street'
	| 'cuisine'
	| 'praise'
	| 'openings'
	| 'crowd'
	| 'top_post'
	| 'climber'
	| 'place'
	| 'dish';

/**
 * One fact with its numbers. `fact` is the plain sentence the page falls back to when the
 * model's line is missing or states a number the fact doesn't hold.
 */
export interface LandingStory {
	/** Stable within an edition: `district`, `place:<brandId>`, … */
	id: string;
	kind: LandingStoryKind;
	/** Trend tiles pick among these; the ticker takes the others */
	trend: boolean;
	/** A short fallback title, for a trend tile */
	title: string;
	fact: string;
	/** The district it is about, for the ticker's tag */
	district?: string;
	/** Credit, for a story about a post */
	handle?: string;
	platform?: SocialPlatformEnum;
	url?: string;
}

/**
 * What the model wrote for an edition, each line checked against its numbers; a line that
 * failed or was missing is the plain fallback. The page joins it to `data` by key.
 */
export interface LandingCopy {
	/** The hero's paragraph */
	lede: string;
	places: LandingPlaceCopy[];
	dishes: LandingDishCopy[];
	/** Three trend tiles, in order */
	trends: LandingStoryCopy[];
	/** The "right now" strip, in order */
	ticker: LandingStoryCopy[];
	openings: LandingOpeningCopy[];
	/** Lines the model wrote and that passed the checks, and lines that fell back */
	written: number;
	fallbacks: number;
}

export interface LandingPlaceCopy {
	brandId: string;
	/** What the city said, two sentences at most */
	said: string;
	/** A few words under the name on the hero's ticket */
	tagline: string;
}

export interface LandingDishCopy {
	key: string;
	text: string;
	/** One or two words on the tile's sticker */
	sticker: string;
}

export interface LandingStoryCopy {
	storyId: string;
	title: string;
	text: string;
}

export interface LandingOpeningCopy {
	brandId: string;
	text: string;
}
