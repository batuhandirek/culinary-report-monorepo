/**
 * The blocks a report is made of, in the order a report type lists them (`ReportType.sections`).
 * Each kind is one embeddable class (`report-section.embeddable.ts`) holding its own settings.
 */
export enum ReportSectionKindEnum {
	// Brand, month, the key figures and the findings: always the first section
	COVER = 'cover',
	// What moved, and why it might have: the notable moves, what we checked, the possible reasons
	ANALYSIS = 'analysis',
	// What five-star reviews praise next to what the rest criticise
	STARS = 'stars',
	// A chain's places side by side (drawn for a chain only)
	BRANCHES = 'branches',
	COMPETITORS = 'competitors',
	// The highlights' actions for next month
	ACTIONS = 'actions',
	// What people posted: sentiment, the top posts, the topics they raised
	POSTS = 'posts',
	OWN_ACCOUNTS = 'own_accounts',
	COMMENTS = 'comments',
	PRESS = 'press',
	// Media coverage: each blog article that wrote about the brand, with what it said and a QR code of its link
	MEDIA = 'media',
	CREATORS = 'creators',
	REVIEWS = 'reviews',
	REPLIES = 'replies',
	DISHES = 'dishes',
	// Each place's own figures, one place after another
	PLACES = 'places',
	PATTERNS = 'patterns',
	CITY = 'city',
	APPENDIX = 'appendix',
}

/** The cover's figure tiles. */
export enum ReportCoverKpiEnum {
	VIEWS = 'views',
	CREATORS = 'creators',
	INTERACTIONS = 'interactions',
	STARS = 'stars',
	REVIEWS = 'reviews',
	ANSWERED = 'answered',
}

/** The blocks of each place's own figures. */
export enum ReportPlacePartEnum {
	// Popular times and open tables
	BUSYNESS = 'busyness',
	// Delivery menu prices
	PRICES = 'prices',
	// Who got talked about nearby, openings and closures
	NEIGHBOURHOOD = 'neighbourhood',
	// Google Maps search ranks
	SEARCH_RANKS = 'search_ranks',
}

export const REPORT_COVER_KPIS = Object.values(ReportCoverKpiEnum);
export const REPORT_PLACE_PARTS = Object.values(ReportPlacePartEnum);

export const DEFAULT_POSTS_SHOWN = 6;
export const MAX_POSTS_SHOWN = 24;
export const DEFAULT_DISHES_SHOWN = 12;
export const MAX_DISHES_SHOWN = 30;
export const DEFAULT_ARTICLES_SHOWN = 6;
export const MAX_ARTICLES_SHOWN = 20;

/** Whether a brand's report configuration gets its report built every month. */
export enum ReportConfigStatusEnum {
	ACTIVE = 'active',
	// Paused: not built until switched back on; its reports stay
	INACTIVE = 'inactive',
}
