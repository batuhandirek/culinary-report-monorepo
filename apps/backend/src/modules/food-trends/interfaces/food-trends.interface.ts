import type { TopicKindEnum } from 'src/modules/topics/entities/topic.entity.js';

/**
 * A city's quarter of food trends in public: what `FoodTrendsReport.data` stores and the page
 * `/<city>/trends/<YYYY>-q<N>` draws. Topics only: our own counts of posts, Google's public search
 * figures, openings counted by kind of food; no venue figure, and no venue name except inside
 * Google's own rising queries. Positive framing: rises only. Optional fields are absent, never
 * null (`serialize({ skipNull })` drops a null inside the jsonb too).
 */
export interface FoodTrendsData {
	/** The quarter's three months, `YYYY-MM` */
	months: string[];
	/** Google searches on one scale across topics; absent until the anchored pull ran */
	searches?: FoodTrendsSearches;
	/** Google's rising related queries; absent without a pull for the quarter's last month */
	breakouts?: FoodTrendsBreakouts;
	/** The kinds of food posts by others named most; absent below `MIN_QUARTER_MENTIONS` */
	talked?: FoodTrendsTalked;
	/** Openings and closures by kind of food; absent when none was seen */
	openings?: FoodTrendsOpenings;
}

export interface FoodTrendsSearches {
	/** The topic every comparison carried (pizza): its two-year average is 100 */
	anchor: { key: string; label: string };
	/** The Google Trends region */
	geo: string;
	/** First and last month of the pulled window */
	from: string;
	to: string;
	/** The quarter's most searched kinds of food, highest first */
	top: FoodTrendsSearchTopic[];
	/** The biggest rises on the same quarter a year earlier, positive only */
	rising: FoodTrendsSearchTopic[];
}

export interface FoodTrendsSearchTopic {
	key: string;
	label: string;
	kind: TopicKindEnum;
	/** The quarter's mean search level, the anchor's two-year mean = 100 */
	level: number;
	/** The same quarter a year earlier, on the same scale */
	prevYearLevel?: number;
	/** `level / prevYearLevel - 1`: 0.4 = up 40 % */
	change?: number;
	/** Present on the anchor's row */
	anchor?: boolean;
}

export interface FoodTrendsBreakouts {
	/** The twelve months Google's rising queries cover, `YYYY-MM` */
	from: string;
	to: string;
	queries: FoodTrendsBreakout[];
}

export interface FoodTrendsBreakout {
	/** As Google lists it; may name a venue, Google's own words */
	query: string;
	/** The kind of food it was found under */
	topic: string;
	/** Growth against the twelve months before, percent; absent for a breakout */
	growth?: number;
	/** Rising past +5,000 % */
	breakout?: boolean;
}

export interface FoodTrendsTalked {
	/** Mentions by others with a kind of food, in the quarter */
	mentions: number;
	topics: FoodTrendsTalkedTopic[];
}

export interface FoodTrendsTalkedTopic {
	key: string;
	label: string;
	kind: TopicKindEnum;
	/** Share of the quarter's mentions with a kind of food naming it or a kind under it, percent */
	share: number;
	mentions: number;
	/** Points gained on the quarter before; absent when it fell or that quarter is too thin */
	gain?: number;
}

export interface FoodTrendsOpenings {
	opened: number;
	closed: number;
	/** By the venue's kind of food (else its Google category), most openings first */
	byTopic: { label: string; opened: number; closed: number }[];
}

/** The anchored pull as stored (`FoodTrendsReport.searchLevels`), never sent to a client. */
export interface AnchoredSearchLevels {
	anchor: string;
	geo: string;
	category: string;
	/** The window, oldest first */
	months: string[];
	pulledAt: string;
	groups: number;
	/** Groups whose anchor came back with data */
	usableGroups: number;
	/** Per topic key, its level per month of `months`; null below the comparison's resolution */
	levels: Record<string, (number | null)[]>;
}

/** Where an anchored pull stands, for the admin page. */
export interface FoodTrendsSearchPull {
	state: 'queued' | 'running' | 'done' | 'failed';
	requestedAt: string;
	finishedAt?: string;
	/** What it fetched, or why it failed */
	note?: string;
}
