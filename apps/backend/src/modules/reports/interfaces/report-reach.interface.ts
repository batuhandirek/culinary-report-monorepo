// The report's reach and press sections: the venue's own accounts, what viewers said under the
// top posts, the month's press, and the review platforms side by side. All optional in
// `ReportData`: absent when nothing was scraped for them.

/** One of the brand's own accounts at the close of the month (the brand's, or a branch's in the report's city). */
export interface ReportOwnAccount {
	platform: 'tiktok' | 'instagram';
	handle: string;
	url: string;
	/** A branch's own account (a chain may have one per branch): the branch's name and street */
	branch?: string;
	followers?: number;
	/** Since the month before's snapshot; absent without one */
	followersChange?: number;
	/** Everything the profile shows */
	posts?: number;
	/** Posts added since the month before's snapshot; absent without one */
	postsAdded?: number;
	/** Over its latest posts, ten at most */
	avgViews?: number;
	avgLikes?: number;
	postsLast30Days?: number;
	/**
	 * Average views of this month's posts by others on the same platform over `avgViews`, one
	 * decimal: "creators got 18× the views of your own posts". Absent when either is unknown
	 */
	creatorViewsMultiple?: number;
}

/** One post's comments by what they say. */
export interface ReportCommentPost {
	postId: string;
	url: string;
	author?: string;
	views: number;
	/** Classified comments stored for it */
	comments: number;
	/** intent → comments: `intent`, `confirmation`, `disagreement`, `question`, `tag`, `other` */
	intents: Record<string, number>;
	/** One line on what the disagreeing comments say */
	disagreement?: string;
}

/** A kind of question viewers kept asking. */
export interface ReportCommentQuestion {
	/** `location`, `price`, `hours`, `menu`, `dietary`, `payment`, `reservation`, `other` */
	topic: string;
	count: number;
	/** The most liked wording of it, in English */
	example: string;
	/** What to do about it, when enough people asked */
	action?: string;
}

/** What viewers said under the venue's top TikTok posts of the month. */
export interface ReportComments {
	/** Classified comments over all posts */
	comments: number;
	intents: Record<string, number>;
	/** Most viewed first */
	posts: ReportCommentPost[];
	/** The three most asked kinds of question, most asked first */
	questions: ReportCommentQuestion[];
}

/** An article or web page naming the venue, found by the month's search. */
export interface ReportPressItem {
	url: string;
	title: string;
	outlet?: string;
	/** `YYYY-MM-DD`; web results often have none */
	publishedAt?: string;
	kind: 'feature' | 'listicle' | 'passing';
	summary?: string;
}

/** The month's press: features first, then listicles, then passing mentions. */
export interface ReportPress {
	features: number;
	listicles: number;
	passing: number;
	items: ReportPressItem[];
}

/** One review platform's month. */
export interface ReportReviewPlatform {
	platform: 'google' | 'tripadvisor';
	count: number;
	written: number;
	avgStars?: number;
	/** 0–1 */
	replyRate?: number;
	/** All-time figures on that platform */
	rating?: number;
	reviewsCount?: number;
	/** topic → written reviews that raised it */
	praise: Record<string, number>;
	complaints: Record<string, number>;
}

/** A topic Google (mostly locals) and TripAdvisor (mostly visitors) reviewers see differently. */
export interface ReportPlatformGap {
	topic: string;
	side: 'praise' | 'complaints';
	/** Shares of each platform's written reviews, 0–1 */
	google: number;
	tripadvisor: number;
}
