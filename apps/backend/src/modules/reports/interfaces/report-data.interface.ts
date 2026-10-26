import type { MonthContext } from 'src/modules/cities/util/month-context.js';
import type { SearchDelta } from 'src/modules/trends/util/search-interest.js';
import type { FeedbackTheme } from 'src/modules/venues/constants/feedback-themes.constant.js';
import type { FeedbackSentiment, FeedbackTopic } from 'src/modules/venues/interfaces/feedback.interface.js';
import type { ReviewsDistribution } from 'src/modules/venues/interfaces/venue-details.interface.js';

import type {
	ReportComments,
	ReportOwnAccount,
	ReportPlatformGap,
	ReportPress,
	ReportReviewPlatform,
} from './report-reach.interface.js';
import type {
	ReportBusyness,
	ReportCorrelations,
	ReportDemand,
	ReportPrices,
} from './report-signals.interface.js';

/**
 * A praise or complaint point as a report keeps it: the report's own copy, built from the feedback
 * rows at build time, so a stored report never moves with them.
 */
export interface ReportFeedbackPoint {
	topic: FeedbackTopic;
	theme?: FeedbackTheme;
	detail: string;
}

/** A dish a post names, with how it came across, as a report keeps it */
export interface ReportPostDish {
	name: string;
	sentiment: FeedbackSentiment;
}

/** One post about the venue, as the report lists it. */
export interface ReportPost {
	postId: string;
	platform: 'tiktok' | 'instagram' | 'blog';
	url: string;
	/** A blog article's headline; absent for TikTok and Instagram, and in reports built before it was kept */
	title?: string;
	author?: string;
	authorFans?: number;
	postedAt: string;
	views: number;
	engagements: number;
	promotional: boolean;
	visited: boolean;
	sentiment: FeedbackSentiment;
	summary: string;
	praise: ReportFeedbackPoint[];
	complaints: ReportFeedbackPoint[];
	dishes: ReportPostDish[];
}

export interface ReportDishCount {
	name: string;
	count: number;
	positive: number;
	negative: number;
}

export interface ReportSentimentCounts {
	positive: number;
	mixed: number;
	neutral: number;
	negative: number;
}

export interface ReportSocialStats {
	postCount: number;
	tiktokCount: number;
	instagramCount: number;
	views: number;
	engagements: number;
	creators: number;
	promotional: number;
	sentiment: ReportSentimentCounts;
	/** topic → how many posts praised / criticised it */
	praise: Record<string, number>;
	complaints: Record<string, number>;
	/**
	 * theme (`FEEDBACK_THEMES`) → how many raised it, once per source like the topics; absent when
	 * a point has no theme yet (stored before themes, not backfilled) and in reports built before
	 */
	praiseThemes?: Record<string, number>;
	complaintThemes?: Record<string, number>;
}

export interface ReportReviewGroup {
	count: number;
	written: number;
	praise: Record<string, number>;
	complaints: Record<string, number>;
	/**
	 * theme (`FEEDBACK_THEMES`) → how many raised it, once per source like the topics; absent when
	 * a point has no theme yet (stored before themes, not backfilled) and in reports built before
	 */
	praiseThemes?: Record<string, number>;
	complaintThemes?: Record<string, number>;
	/** What they said, the first few points of the group */
	praiseDetails: ReportFeedbackPoint[];
	complaintDetails: ReportFeedbackPoint[];
}

/** The changes guests noticed about one thing (a feedback theme), across the month's reviews. */
export interface ReportChangeTheme {
	/** Absent while the changes are not filed yet */
	theme?: FeedbackTheme;
	label: string;
	/** Reviews noticing it, each once */
	reviews: number;
	/** How they put it, each spelling once */
	details: string[];
}

export interface ReportReviewStats {
	count: number;
	/** Reviews with text; the rest are stars only */
	written: number;
	avgStars?: number;
	/** Share of the month's reviews the owner answered, 0–1 */
	replyRate?: number;
	stars: { stars: number; count: number }[];
	/** topic → how many reviews praised / criticised it */
	praise: Record<string, number>;
	complaints: Record<string, number>;
	/**
	 * theme (`FEEDBACK_THEMES`) → how many raised it, once per source like the topics; absent when
	 * a point has no theme yet (stored before themes, not backfilled) and in reports built before
	 */
	praiseThemes?: Record<string, number>;
	complaintThemes?: Record<string, number>;
	/** The same counts for 5-star reviews and the rest: what separates a 5 from a 4 */
	split: { fiveStar: ReportReviewGroup; belowFive: ReportReviewGroup };
	/** Changes a reviewer noticed, one entry per review */
	changes: { stars?: number; changes: string[] }[];
	/** The same changes by what changed (`groupChanges`): absent from reports built before them */
	changeThemes?: ReportChangeTheme[];
	/** The month's critical reviews (3 stars or fewer) worth reading */
	critical: { stars?: number; text: string; replied: boolean }[];
	/** Every review of the month, newest first: the appendix the counts can be checked against */
	list: ReportReviewItem[];
	/** Ready-to-post replies to unanswered written reviews, critical first; filled at build */
	replyDrafts: ReportReplyDraft[];
	/** Google and TripAdvisor side by side (the counts above cover both); absent without a TripAdvisor side */
	byPlatform?: ReportReviewPlatform[];
	/** Topics locals (Google) and visitors (TripAdvisor) see differently, biggest gap first */
	platformGaps?: ReportPlatformGap[];
}

/** One Google review in the report's appendix. The entity stores no reviewer names. */
export interface ReportReviewItem {
	reviewId: string;
	/** Set for a TripAdvisor review; absent means Google */
	platform?: 'tripadvisor';
	publishedAt: string;
	stars?: number;
	/** At most 240 characters of the translated text, else the original; absent for stars only */
	excerpt?: string;
	/** The review's original language, e.g. `de` */
	language?: string;
	replied: boolean;
	/** Topics the review praised / criticised */
	praise: string[];
	complaints: string[];
}

/** A reply the owner can post under a review, in the review's language. */
export interface ReportReplyDraft {
	reviewId: string;
	draft: string;
}

/** One creator's posts about the venue this month. */
export interface ReportCreator {
	author: string;
	platform: 'tiktok' | 'instagram' | 'blog';
	authorFans?: number;
	posts: number;
	views: number;
	/** How many of their posts were paid or gifted */
	promotional: number;
	/** Whether any of their posts shows a visit */
	visited: boolean;
	/** Their most viewed post */
	url: string;
}

/** A creator who covered district neighbours this month but not the venue: someone to invite. */
export interface ReportNearbyCreator {
	author: string;
	platform: 'tiktok' | 'instagram' | 'blog';
	authorFans?: number;
	/** Their non-promotional posts about neighbours this month */
	posts: number;
	views: number;
	/** The neighbours they covered, most viewed first */
	venues: string[];
	/** Their most viewed of those posts */
	url: string;
}

export interface ReportNeighbour {
	venueId: string;
	name: string;
	category?: string;
	posts: number;
	views: number;
}

/** A venue the owner competes with, over the same month. */
export interface ReportCompetitor {
	/** Its place: the competing venue, or a rival brand's most reviewed branch in the city (busyness, open tables and menus are that branch's) */
	venueId: string;
	/** Picked for one of the brand's branches: that branch's id (`against` names it); absent for the whole brand */
	branchId?: string;
	name: string;
	category?: string;
	district?: string;
	/** All-time Google figures */
	rating?: number;
	reviewsCount?: number;
	social: Pick<ReportSocialStats, 'postCount' | 'views' | 'engagements' | 'creators'>;
	/** Whether we scrape its Google reviews at all: without, `reviews` is empty, not zero */
	reviewsTracked: boolean;
	reviews: Pick<
		ReportReviewStats,
		'count' | 'written' | 'avgStars' | 'replyRate' | 'praise' | 'complaints'
	>;
	/**
	 * Its Friday and Saturday evenings booked out (0–100), the month's mean over its sampled
	 * evenings; absent without samples. Comparable with the venue's: the same question is asked of each
	 */
	demand?: { booked: number; evenings: number };
	/**
	 * Its mean busyness index this month and the month before; absent without a sample with popular
	 * times. Google scales each venue to its own peak, so only the change is shown, never the level
	 */
	busyness?: { index: number; previousIndex?: number };
	/** A whole chain: its open branches in the city, counted together */
	branches?: number;
	/** Picked for one of a chain's branches, not the whole brand: that branch's name and street */
	against?: string;
}

/**
 * One open branch the report covers: where it is, its own month beside the brand's (the posts
 * that named it and its reviews, cut like a competitor) and its place figures. A one-branch
 * brand has one. Place figures are never summed or averaged across branches: Google scales
 * busyness to each place's own peak, and a search rank or a neighbourhood belongs to one address.
 */
export interface ReportBranch extends Omit<ReportCompetitor, 'demand' | 'busyness' | 'reviewsTracked' | 'branches' | 'against' | 'branchId'> {
	street?: string;
	/** Its city, in a report across cities (the brand's `reportScope` `all`) */
	city?: string;
	/** The branch's Google Maps page */
	googleUrl?: string;
	/** What Google Maps says it offers ("Outdoor seating", "Delivery", …); absent when unknown */
	amenities?: string[];
	/** All-time Google review count per star, as of the build; absent when unknown */
	reviewsDistribution?: ReviewsDistribution;
	/** The last six months' closing snapshots up to the report month, oldest first */
	ratingTrend: ReportRatingPoint[];
	/** Other food places talked about this month in its district, its brand's left out */
	neighbours: ReportNeighbour[];
	/** Its district this quarter; absent without a district */
	neighbourhood?: ReportNeighbourhood;
	/** Where it ranks on the Google Maps searches a guest would type; absent when not tracked this month */
	searchRanks?: ReportSearchRank[];
	/** Google popular times by week next to the brand's views ("Did the buzz fill the place?"); absent when not sampled */
	busyness?: ReportBusyness;
	/** Open Friday and Saturday tables on its booking platform; absent when not sampled */
	demand?: ReportDemand;
	/** Its delivery listings and its menu's price position; absent without a delivery listing */
	prices?: ReportPrices;
	/** Its all-time Google rating against its district's and its kind of food's venues; absent without a rating or 5 peers either way */
	ratingBenchmark?: ReportRatingBenchmark;
}

/**
 * One comparison of a branch's all-time Google rating: the peers are the city's open food
 * venues with a rating and 20+ reviews (`isRatingPeer`), the branch itself left out.
 */
export interface ReportRatingBenchmarkEntry {
	/** What it is compared with: the district's name, or the kind of food's label */
	label: string;
	/** The peers' median rating */
	median: number;
	/** Share of the peers its rating is ahead of, ties counted half, 0–100 */
	percentile: number;
	/** Peers compared, at least 5 */
	venues: number;
}

/** Against the city's venues of a kind of food: `label` is the topic's. */
export interface ReportRatingTopicBenchmark extends ReportRatingBenchmarkEntry {
	/** The food topic compared: the primary one, or the nearest parent with 5+ peers */
	key: string;
	/** The city's name */
	city: string;
}

/** "4.3 · above 70 % of Kreuzberg's 212 food venues · above 55 % of Berlin's 61 kebab places". */
export interface ReportRatingBenchmark {
	/** The all-time Google rating compared */
	rating: number;
	/** Against the food venues of its district */
	district?: ReportRatingBenchmarkEntry;
	/** Against the city's venues of its primary food topic, or of the nearest parent with 5+ */
	topic?: ReportRatingTopicBenchmark;
}

/** The business the report is on. */
export interface ReportBrand {
	id: string;
	name: string;
	/** The Google category most of its branches share */
	category?: string;
	/** Posts by others that named the brand but no branch: in `social`, in no branch's */
	brandOnlyPosts: number;
}

/** A venue's all-time Google figures at the close of a month (its latest snapshot). */
export interface ReportRatingPoint {
	/** The month the snapshot closes, `YYYY-MM`: one taken in a month's first week closes the month before */
	month: string;
	/** The snapshot's day, `YYYY-MM-DD` */
	date: string;
	rating?: number;
	reviewsCount?: number;
}

/** The month before the report's, cut down to the KPI band. */
export interface ReportPreviousMonth {
	month: string;
	social: Pick<
		ReportSocialStats,
		'postCount' | 'views' | 'engagements' | 'creators' | 'promotional'
	>;
	/**
	 * Absent when no review of that month is stored: reviews were not scraped for it. The star
	 * histogram and the complaint counts let the analysis see shifts; absent in reports built before
	 */
	reviews?: Pick<ReportReviewStats, 'count' | 'written' | 'avgStars' | 'replyRate'> &
		Partial<Pick<ReportReviewStats, 'stars' | 'complaints' | 'complaintThemes'>>;
	/** The dishes named most that month (top eight); absent in reports built before */
	dishes?: Pick<ReportDishCount, 'name' | 'count'>[];
	/** The actions its report suggested, when one was built */
	actions?: ReportPoint[];
}

/**
 * Everything a monthly report shows, computed once when it is built. The brand's figures (posts,
 * reviews, dishes, creators, competitors, own accounts, comments, press, correlations) cover
 * every branch in `branches`; each place figure is in its branch's entry.
 */
export interface ReportData {
	brand: ReportBrand;
	/** Every open branch covered, the most Google reviews first */
	branches: ReportBranch[];
	/** Absent for a first report: the brand has neither posts nor reviews the month before */
	previous?: ReportPreviousMonth;
	month: string;
	social: ReportSocialStats;
	posts: ReportPost[];
	/** Posts from the brand's own accounts: not word of mouth, kept out of `social` */
	ownPosts: ReportPost[];
	reviews: ReportReviewStats;
	dishes: ReportDishCount[];
	/** The places and rival brands the brand competes with (brand-wide and per branch) */
	competitors: ReportCompetitor[];
	/** The top eight creators by views of their posts about the brand, one row per author */
	creators: ReportCreator[];
	/** Creators who covered its branches' district neighbours but not the brand, top eight by followers */
	creatorsNearby: ReportNearbyCreator[];
	/** What the city talked about and the brand against the month's report brands; absent below 200 matched mentions in the city, and across cities */
	city?: ReportCitySection;
	/** The month's weather, public holidays and events in the city (`CityDayService.month`); absent across cities */
	context?: MonthContext;
	/** Buzz to reviews, complaints by time, paid against organic, over every branch's Google reviews; absent below the floors */
	correlations?: ReportCorrelations;
	/** The brand's own TikTok and Instagram accounts at the month's close (a branch's own named); absent when none is tracked */
	ownAccounts?: ReportOwnAccount[];
	/** What viewers said under the brand's top TikTok posts; absent when no comment was scraped */
	comments?: ReportComments;
	/** The month's press and listicles naming the brand; absent when none was found */
	press?: ReportPress;
}

/** A rising row of the city's trend tables: shares of the month, in percent. */
export interface ReportTrendRow {
	key: string;
	label: string;
	/** Mentions (cuisines) or posts and reviews (dishes) this month */
	count: number;
	share: number;
	prevShare: number;
	/** In percentage points */
	delta: number;
}

/** One figure of the venue against the month's report venues of its city. */
export interface ReportBaselineMetric {
	/** Absent when the venue has none (no reviews this month) */
	venue?: number;
	/** Median over the report venues that have one */
	median?: number;
	/** Share of the other report venues that have one it is ahead of, ties counted half, 0–100 */
	percentile?: number;
	/** Report venues that have one, the venue included */
	venues: number;
}

/** The venue's kind of food and where it stands among the month's venues of that kind. */
export interface ReportCuisinePlacement {
	key: string;
	label: string;
	/** Venues mentioned for this kind of food this month, in posts by others */
	venues: number;
	/** The venue's place among them by views; absent when nobody posted about it */
	rank?: number;
	/** Its share of the city's mentions now and the month before, when the trend table lists it */
	share?: number;
	prevShare?: number;
	delta?: number;
}

/** "What the city is talking about": its rising cuisines and dishes and the venue's standing. */
export interface ReportCitySection {
	cityName: string;
	/** The city's matched mentions in posts by others this month */
	mentions: number;
	/** Up to five rows each, the biggest climb in share first */
	risingCuisines: ReportTrendRow[];
	risingDishes: ReportTrendRow[];
	cuisine?: ReportCuisinePlacement;
	baseline: {
		/** The month's report venues compared, the venue included */
		venues: number;
		/** Posts by others and their views */
		posts: ReportBaselineMetric;
		views: ReportBaselineMetric;
		/** This month's Google reviews */
		avgStars: ReportBaselineMetric;
		/** 0–1 */
		replyRate: ReportBaselineMetric;
	};
	/** Google search interest against mention share per cuisine (`SEARCH_INTEREST`); absent when not pulled */
	searches?: SearchDelta[];
	/**
	 * The complaint themes of the brand's written reviews against the month's report venues
	 * (`cityThemes`), the biggest gap first; absent below 5 written reviews or 5 peers, while a
	 * point is unfiled, and in reports built before it
	 */
	themes?: ReportCityTheme[];
}

/** A complaint theme of the brand's month against the month's report venues of its city */
export interface ReportCityTheme {
	key: string;
	label: string;
	topic: string;
	/** The brand's written reviews raising it */
	reviews: number;
	/** 0–1 of the brand's written reviews */
	venueShare: number;
	/** 0–1: the median share at the other report venues with 5+ written reviews */
	median: number;
	/** How many report venues the median is over */
	venues: number;
}

/** One finding or suggestion in a report's summary. */
export interface ReportPoint {
	/** At most 6 words */
	title: string;
	text: string;
}

export interface ReportHighlights {
	/** The cover title, at most 8 words */
	title: string;
	headline: string;
	highlights: ReportPoint[];
	actions: ReportPoint[];
}

/** A neighbour that opened, closed or reopened this quarter. */
export interface ReportNeighbourhoodChange {
	venueId: string;
	name: string;
	category?: string;
	street?: string;
	kind: 'opened' | 'temporarily_closed' | 'permanently_closed' | 'reopened';
	/** When a scrape first saw it, or the first post saying it had just opened, `YYYY-MM-DD` */
	date: string;
	/** On the venue's own street */
	sameStreet: boolean;
	/** `posts`: an opening only a matched post announced (`Mention.isNewOpening`); absent when a scrape saw it */
	source?: 'posts';
}

/** Openings and closures around the venue over the three months ending with the report's. */
export interface ReportNeighbourhoodChanges {
	/** First and last month of the window, `YYYY-MM` */
	from: string;
	to: string;
	district: string;
	/** In the district, the venue left out; `closed` is temporary and permanent closures; `opened` counts post-flagged openings too */
	opened: number;
	closed: number;
	reopened: number;
	/** Of `opened`, the ones only a post announced; absent when none */
	openedFromPosts?: number;
	/** The same on the venue's street; absent when its street is unknown */
	street?: { name: string; opened: number; closed: number; reopened: number; openedFromPosts?: number };
	/** Newest first, the street's first, twelve at most */
	venues: ReportNeighbourhoodChange[];
}

export interface ReportNeighbourhood {
	changes: ReportNeighbourhoodChanges;
}

/** The venue's place on one Google Maps search ("ramen Mitte") in the report month. */
export interface ReportSearchRank {
	query: string;
	/** 1-based; absent when it was not among the `results` places */
	rank?: number;
	results: number;
	/** The first ten places in Google's order */
	top: { name: string; rating?: number; reviewsCount?: number; isVenue: boolean }[];
	/** The same search in earlier months, oldest first, five at most; `rank` absent when not among the results */
	history: { month: string; rank?: number }[];
}
