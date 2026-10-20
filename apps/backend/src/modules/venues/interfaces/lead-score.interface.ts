// A venue's lead score: how good a prospect it is for a paid monthly report. Stored as jsonb on
// the venue and sent to the admin as is.

export type LeadSignalKey = 'buzz' | 'spends' | 'problem' | 'reachable' | 'press';

/**
 * One signal: its 0–1 value (`null` = unknown, counted at half), its weight and the raw inputs.
 * `value` is optional because responses serialize with `skipNull`, which drops the null inside the
 * jsonb too: absent reads as unknown.
 */
export interface LeadSignal {
	value?: number | null;
	weight: number;
	inputs: Record<string, number | boolean | string | null>;
}

export interface LeadSignals {
	/** The report month scored; the window is it and the month before. */
	month: string;
	buzz: LeadSignal;
	spends: LeadSignal;
	problem: LeadSignal;
	reachable: LeadSignal;
	/** Press and listicle features in the window; absent in scores computed before it existed */
	press?: LeadSignal;
	/** On the city's `chainDenyList`: the score is halved (`LEAD_DENY_LIST_FACTOR`) */
	denyListed?: boolean;
	/** Points added for a place first seen recently with few Google reviews. */
	newPlaceBonus: number;
	/** What would make the score complete, e.g. `reviews not scraped`. */
	missing: string[];
}

/** Everything `scoreBrand` needs about one venue, gathered by `BrandLeadScoreService`. */
export interface LeadInputs {
	name: string;
	/** When a city-wide scrape first saw it open (an `opened` status change); absent for the rest */
	openedAt?: Date | null;
	reviewsCount: number | null;
	hasWebsite: boolean;
	hasPhone: boolean;
	/** Posts by others in the window */
	posts: number;
	views: number;
	creators: number;
	/** Posts by the venue's own account in the window */
	ownPosts: number;
	/** Posts by others marked as an ad or read as paid, gifted or invited */
	promotionalPosts: number;
	/** Posts by others with a negative or mixed mention of it */
	negativePosts: number;
	/** Google reviews in the window; `null` when none were scraped */
	reviews: {
		total: number;
		/** Written reviews the LLM analysed */
		analysed: number;
		withComplaints: number;
		replied: number;
		unansweredCritical: number;
		withChanges: number;
	} | null;
	/** Classified press in the window (`WebMention`); null or absent when its press was never searched */
	press?: { features: number; listicles: number; passing: number } | null;
}

/** The buzz figures of every venue mentioned by others in the window, to rank one against. */
export interface BuzzDistribution {
	posts: number[];
	views: number[];
	creators: number[];
}
