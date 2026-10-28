export type AddBrandAccountData = AdminAccountOutputDto[];

export type AddBrandBranchesData = AdminBrandOutputDto;

export type AddBrandCompetitorData = AdminCompetitorOutputDto[];

export type AddCityEventData = AdminCityEventOutputDto;

export type AddCitySourceData = AdminCitySourceOutputDto;

export type AddPortalCompetitorData = PortalCompetitorsOutputDto;

export type AddProspectData = AdminProspectOutputDto;

export interface AdminAccountBrandRefOutputDto {
	id: string;
	name: string;
}

/** A TikTok or Instagram account: whose it is, its profile and what we saw it post. */
export interface AdminAccountOutputDto {
	/** A branch's own account */
	branch?: {
		id: string;
		name: string;
		street?: string;
	};
	/** The brand whose own account it is */
	brand?: AdminAccountBrandRefOutputDto;
	brandSource?: AdminAccountOutputDtoBrandSourceEnum;
	creator: {
		id: string;
		name: string;
	};
	displayName?: string;
	/** The latest follower count an item or a profile scrape gave */
	followers?: number;
	/** @format date-time */
	followersAt?: string;
	/** Followers against the newest count 30 or more days older; absent without one */
	followersChange?: number;
	handle: string;
	id: string;
	/** Its newest figures; absent when no scrape gave a follower count */
	latest?: AdminAccountSnapshotOutputDto;
	platform: AdminAccountOutputDtoPlatformEnum;
	/** Brands an admin said it is not */
	rejections: {
		brand: {
			id: string;
			name: string;
		};
	}[];
	/** What our own scrapes saw an account post. */
	stats: AdminAccountStatsOutputDto;
	/** The matcher's likely brand, waiting for an admin */
	suggestedBrand?: AdminAccountBrandRefOutputDto;
	/** How close the handle is to it, 0–1 */
	suggestedScore?: number;
	url: string;
}

export enum AdminAccountOutputDtoBrandSourceEnum {
	Handle = 'handle',
	Website = 'website',
	Site = 'site',
	Profile = 'profile',
	Prospect = 'prospect',
	Admin = 'admin',
}

export enum AdminAccountOutputDtoPlatformEnum {
	Tiktok = 'tiktok',
	Instagram = 'instagram',
	Blog = 'blog',
}

/** An account's newest figures: each from the newest snapshot that has it. */
export interface AdminAccountSnapshotOutputDto {
	postsLast30Days?: number;
	avgLikes?: number;
	/** Over its latest posts, ten at most: from the newest profile scrape that gave them */
	avgViews?: number;
	followers?: number;
	following?: number;
	posts?: number;
	/**
	 * The newest snapshot, and the scrape that took it
	 * @format date-time
	 */
	scrapedAt: string;
	source: AdminAccountSnapshotOutputDtoSourceEnum;
}

export enum AdminAccountSnapshotOutputDtoSourceEnum {
	Profile = 'profile',
	Lookup = 'lookup',
	Post = 'post',
}

/** What our own scrapes saw an account post. */
export interface AdminAccountStatsOutputDto {
	/** @format date-time */
	lastPostedAt?: string;
	/** Its posts we stored in the month asked for, and their views */
	monthPosts: number;
	monthViews: number;
	/** Every post of it we stored */
	posts: number;
}

export interface AdminAddBrandAccountInputDto {
	/**
	 * One branch's own account; absent for the whole brand
	 * @format uuid
	 */
	branchId?: string;
	/**
	 * A handle with or without the
	 * @minLength 1
	 * @maxLength 200
	 */
	handle: string;
	/** A brand's own accounts are profiles: never a blog */
	platform: AdminAddBrandAccountInputDtoPlatformEnum;
}

/** A brand's own accounts are profiles: never a blog */
export enum AdminAddBrandAccountInputDtoPlatformEnum {
	Tiktok = 'tiktok',
	Instagram = 'instagram',
}

export interface AdminAddCityEventInputDto {
	/** @pattern ^\d{4}-\d{2}-\d{2}$ */
	endDate: string;
	kind: AdminAddCityEventInputDtoKindEnum;
	/**
	 * @minLength 1
	 * @maxLength 120
	 */
	name: string;
	/** @pattern ^\d{4}-\d{2}-\d{2}$ */
	startDate: string;
}

export enum AdminAddCityEventInputDtoKindEnum {
	SchoolHoliday = 'school_holiday',
	Event = 'event',
}

export interface AdminAddCitySourceInputDto {
	enabled?: boolean;
	kind: AdminAddCitySourceInputDtoKindEnum;
	/** @maxLength 500 */
	note?: string;
	/**
	 * A hashtag (with or without #), a search query, a blog's URL (the site, a section or its feed), or an account's handle (with or without
	 * @minLength 1
	 * @maxLength 500
	 */
	value: string;
}

export enum AdminAddCitySourceInputDtoKindEnum {
	TiktokHashtag = 'tiktok_hashtag',
	TiktokSearch = 'tiktok_search',
	InstagramHashtag = 'instagram_hashtag',
	Blog = 'blog',
	TiktokAccount = 'tiktok_account',
	InstagramAccount = 'instagram_account',
}

/**
 * A competitor to add: one place (`venueId`) or a whole brand (`brandId`), exactly one; for the
 * whole brand, or for one of its branches (`branchId`).
 */
export interface AdminAddCompetitorInputDto {
	/** @format uuid */
	branchId?: string;
	/** @format uuid */
	brandId?: string;
	/** @format uuid */
	venueId?: string;
}

export interface AdminAddProspectInputDto {
	/** @format uuid */
	brandId: string;
	/** @format email */
	contactEmail?: string | null;
	/** @maxLength 200 */
	contactName?: string | null;
	/** @maxLength 2000 */
	hook?: string | null;
	/**
	 * A handle, `@handle` or a profile URL
	 * @maxLength 300
	 */
	instagram?: string | null;
	language?: AdminAddProspectInputDtoLanguageEnum;
	/** @maxLength 10000 */
	notes?: string | null;
}

export enum AdminAddProspectInputDtoLanguageEnum {
	En = 'en',
	De = 'de',
}

export interface AdminApifyRunOutputDto {
	actorId: string;
	apifyRunId?: string;
	costUsd?: number;
	/** @format date-time */
	createdAt: string;
	error?: string;
	/** @format date-time */
	finishedAt?: string;
	id: string;
	itemCount?: number;
	maxCostUsd: number;
	purpose: string;
	status: AdminApifyRunOutputDtoStatusEnum;
}

export enum AdminApifyRunOutputDtoStatusEnum {
	RUNNING = 'RUNNING',
	SUCCEEDED = 'SUCCEEDED',
	PARTIAL = 'PARTIAL',
	FAILED = 'FAILED',
}

/** One backlog's day (`BacklogRun`) */
export interface AdminBacklogRunOutputDto {
	batches: number;
	/** YYYY-MM-DD, UTC */
	day: string;
	done: number;
	error?: string;
	/** @format date-time */
	finishedAt?: string;
	remaining?: number;
	stopReason?: AdminBacklogRunOutputDtoStopReasonEnum;
	tokens?: number;
}

export enum AdminBacklogRunOutputDtoStopReasonEnum {
	Error = 'error',
	Empty = 'empty',
	Budget = 'budget',
	Allowance = 'allowance',
	Shutdown = 'shutdown',
}

export interface AdminBlogEntryAuthorOutputDto {
	firstName: string;
	id: string;
	lastName: string;
	publicName: string;
}

export interface AdminBlogEntryListItem {
	author?: AdminBlogEntryAuthorOutputDto;
	coverImage?: BlogEntryCoverImageOutputDto;
	/** @format date-time */
	createdAt: string;
	excerpt?: string | null;
	id: string;
	/** @format date-time */
	publishedAt?: string | null;
	slug: string;
	state: AdminBlogEntryListItemStateEnum;
	tags?: BlogTagOutputDto[];
	title: string;
	/** @format date-time */
	updatedAt: string;
	viewCount: number;
}

export enum AdminBlogEntryListItemStateEnum {
	DRAFT = 'DRAFT',
	PUBLISHED = 'PUBLISHED',
	REMOVED = 'REMOVED',
}

export interface AdminBlogEntryOutputDto {
	author?: AdminBlogEntryAuthorOutputDto;
	content: string;
	coverImage?: BlogEntryCoverImageOutputDto;
	/** @format date-time */
	createdAt: string;
	excerpt?: string | null;
	id: string;
	/** @format date-time */
	publishedAt?: string | null;
	slug: string;
	state: AdminBlogEntryOutputDtoStateEnum;
	tags?: BlogTagOutputDto[];
	title: string;
	/** @format date-time */
	updatedAt: string;
	viewCount: number;
}

export enum AdminBlogEntryOutputDtoStateEnum {
	DRAFT = 'DRAFT',
	PUBLISHED = 'PUBLISHED',
	REMOVED = 'REMOVED',
}

/** A review with the branch it is about (a chain lists several). */
export interface AdminBranchReviewOutputDto {
	/** @format date-time */
	analysedAt?: string;
	branch: {
		district?: string;
		id: string;
		name: string;
		street?: string;
	};
	/** What it says, as feedback rows (none before it is analysed) */
	feedback: FeedbackPointOutputDto[];
	id: string;
	language?: string;
	likes: number;
	/** @format date-time */
	markedRepliedAt?: string;
	ownerResponse?: string;
	/** @format date-time */
	ownerResponseAt?: string;
	platform: AdminBranchReviewOutputDtoPlatformEnum;
	/** @format date-time */
	publishedAt: string;
	replyDraft?: string;
	reviewId: string;
	sentiment?: AdminBranchReviewOutputDtoSentimentEnum;
	stars?: number;
	text?: string;
	textTranslated?: string;
}

export enum AdminBranchReviewOutputDtoPlatformEnum {
	Google = 'google',
	Tripadvisor = 'tripadvisor',
}

export enum AdminBranchReviewOutputDtoSentimentEnum {
	Mixed = 'mixed',
	Positive = 'positive',
	Negative = 'negative',
	Neutral = 'neutral',
}

export interface AdminBrandAccountsInputDto {
	/**
	 * The month the post figures are for; the last finished month without
	 * @pattern ^[0-9]{4}-[0-9]{2}$
	 */
	month?: string;
}

/** A branch (or a possible one): the venue, its city and the mentions linked to it. */
export interface AdminBrandBranchOutputDto {
	category?: string;
	/** A city as a filter or a select offers it. */
	city: AdminCityRefOutputDto;
	closed: boolean;
	district?: string;
	/** Its website's icon; absent until found */
	favicon?: ImageOutputDto;
	id: string;
	/** Mentions linked to it (its branch known), of any month */
	mentions: number;
	name: string;
	placeId: string;
	rating?: number;
	reviewsCount?: number;
	street?: string;
}

/** What social media and Google reviews said about a brand in one month. */
export interface AdminBrandMonthFiguresOutputDto {
	/** Distinct authors of those posts */
	creators: number;
	/** Posts by its own accounts */
	ownPosts: number;
	/** Posts by others naming it (its own accounts left out) */
	posts: number;
	/** Google and TripAdvisor reviews of its branches posted that month */
	reviews: number;
	/** Their mean stars; absent without reviews */
	stars?: number;
	/** Written reviews of 3 stars or fewer nobody answered */
	unanswered: number;
	views: number;
}

export interface AdminBrandOutputDto {
	branches: AdminBrandBranchOutputDto[];
	/** When its name was last searched on Google Maps, per city id */
	branchesSearchedAt: Recordstringstring;
	/** Mentions that name the brand but no branch, of any month */
	brandOnlyMentions: number;
	/** Places with a branch name that are a brand of their own, in any city */
	candidates: AdminBrandBranchOutputDto[];
	/** @format date-time */
	createdAt: string;
	id: string;
	key: string;
	leadScore?: number;
	/** How we scored it as an outreach prospect (`BrandLeadScoreService`) */
	leadSignals?: LeadSignals;
	name: string;
	reportScope: AdminBrandOutputDtoReportScopeEnum;
}

export enum AdminBrandOutputDtoReportScopeEnum {
	City = 'city',
	All = 'all',
}

/** A brand as other pages name it. */
export interface AdminBrandRefOutputDto {
	id: string;
	leadScore?: number;
	name: string;
	/** One report per city, or one across all its cities */
	reportScope: AdminBrandRefOutputDtoReportScopeEnum;
}

/** One report per city, or one across all its cities */
export enum AdminBrandRefOutputDtoReportScopeEnum {
	City = 'city',
	All = 'all',
}

export interface AdminBrandRowOutputDto {
	/** Open branches (in the city) */
	branches: number;
	/** The Google category most of them share */
	category?: string;
	/** The districts they are in */
	districts: string[];
	/** A website icon one of them has */
	favicon?: ImageOutputDto;
	id: string;
	leadScore?: number;
	/** What social media and Google reviews said about a brand in one month. */
	month: AdminBrandMonthFiguresOutputDto;
	name: string;
	/** Posts and views the month before */
	previous: {
		posts: number;
		views: number;
	};
	/** Its place on the sales list */
	prospect?: {
		id: string;
		/** @format date-time */
		nextFollowUpAt?: string;
		stage: AdminBrandRowOutputDtoStageEnum;
	};
	/** Their all-time Google stars over all their reviews (one branch's own rating); absent when none is rated */
	rating?: number;
	/** The month's report (for the city, or across the brand's cities) */
	report?: {
		id: string;
		/** @format date-time */
		sentAt?: string;
		/** @format date-time */
		updatedAt: string;
	};
	/** Their Google reviews, all time */
	reviewsCount?: number;
}

export enum AdminBrandRowOutputDtoStageEnum {
	TO_CONTACT = 'TO_CONTACT',
	CONTACTED = 'CONTACTED',
	REPLIED = 'REPLIED',
	MEETING = 'MEETING',
	WON = 'WON',
	LOST = 'LOST',
	OPTED_OUT = 'OPTED_OUT',
}

/** One month of a brand's figures, for the six-month strip. */
export interface AdminBrandSeriesPointOutputDto {
	/** Distinct authors of those posts */
	creators: number;
	month: string;
	/** Posts by its own accounts */
	ownPosts: number;
	/** Posts by others naming it (its own accounts left out) */
	posts: number;
	/** Google and TripAdvisor reviews of its branches posted that month */
	reviews: number;
	/** Their mean stars; absent without reviews */
	stars?: number;
	/** Written reviews of 3 stars or fewer nobody answered */
	unanswered: number;
	views: number;
}

export interface AdminBrandSuggestionOutputDto {
	key: string;
	name: string;
	reason: AdminBrandSuggestionOutputDtoReasonEnum;
	venues: AdminBrandBranchOutputDto[];
}

export enum AdminBrandSuggestionOutputDtoReasonEnum {
	SameName = 'same name',
	NamePrefix = 'name prefix',
	SameWebsite = 'same website',
	SameInstagram = 'same Instagram',
	SameTikTok = 'same TikTok',
}

export interface AdminBrandSummaryOutputDto {
	/** Posts of the month naming the brand but no branch (a chain) */
	brandOnlyPosts: number;
	competitors: number;
	/** What social media and Google reviews said about a brand in one month. */
	figures: AdminBrandMonthFiguresOutputDto;
	month: string;
	/** What social media and Google reviews said about a brand in one month. */
	previous: AdminBrandMonthFiguresOutputDto;
	prospect?: {
		id: string;
		/** @format date-time */
		lastTouchAt?: string;
		/** @format date-time */
		nextFollowUpAt?: string;
		outreachCount: number;
		stage: AdminBrandSummaryOutputDtoStageEnum;
	};
	/** The month's report, else the newest one */
	report?: {
		headline?: string;
		id: string;
		month: string;
		/** @format date-time */
		sentAt?: string;
		title?: string;
		/** @format date-time */
		updatedAt: string;
	};
	/**
	 * What its Google reviews often mention ("people often mention"), summed over its branches
	 * (in the city), most first, twelve at most. All-time counts, not the month's; empty until a
	 * detail-page refresh.
	 */
	reviewTags: {
		count: number;
		title: string;
	}[];
	/** The six months up to `month`, oldest first */
	series: AdminBrandSeriesPointOutputDto[];
	todos: AdminBrandTodoOutputDto[];
	/** The month's most viewed posts by others, up to five */
	topPosts: AdminBrandTopPostOutputDto[];
}

export enum AdminBrandSummaryOutputDtoStageEnum {
	TO_CONTACT = 'TO_CONTACT',
	CONTACTED = 'CONTACTED',
	REPLIED = 'REPLIED',
	MEETING = 'MEETING',
	WON = 'WON',
	LOST = 'LOST',
	OPTED_OUT = 'OPTED_OUT',
}

/**
 * Something about the brand an admin can act on, and the brand page tab where it is done.
 * `tone`: `urgent` (a customer is losing out), `todo` (our work), `info`.
 */
export interface AdminBrandTodoOutputDto {
	key: string;
	tab: AdminBrandTodoOutputDtoTabEnum;
	text: string;
	tone: AdminBrandTodoOutputDtoToneEnum;
}

export enum AdminBrandTodoOutputDtoTabEnum {
	Posts = 'posts',
	Reports = 'reports',
	Branches = 'branches',
	Reviews = 'reviews',
	Settings = 'settings',
	Competitors = 'competitors',
	Overview = 'overview',
	Signals = 'signals',
	Sales = 'sales',
}

export enum AdminBrandTodoOutputDtoToneEnum {
	Info = 'info',
	Urgent = 'urgent',
	Todo = 'todo',
}

/** A post by someone else that named the brand. */
export interface AdminBrandTopPostOutputDto {
	author?: string;
	/** The branch it named; absent when it named only the brand */
	branch?: {
		id: string;
		name: string;
	};
	id: string;
	platform: AdminBrandTopPostOutputDtoPlatformEnum;
	/** @format date-time */
	postedAt: string;
	sentiment: string;
	/** What the post said about the brand (the mention's summary) */
	summary: string;
	url: string;
	views: number;
}

export enum AdminBrandTopPostOutputDtoPlatformEnum {
	Tiktok = 'tiktok',
	Instagram = 'instagram',
	Blog = 'blog',
}

export interface AdminBrandVenueInputDto {
	/** @format uuid */
	venueId: string;
}

export interface AdminBrandVenuesInputDto {
	/** @minItems 1 */
	venueIds: string[];
}

export interface AdminBuildCityHighlightInputDto {
	/** @format uuid */
	cityId: string;
	/** @pattern ^[0-9]{4}-(0[1-9]|1[0-2])$ */
	month: string;
}

export interface AdminBuildLandingEditionInputDto {
	/** @format uuid */
	cityId: string;
}

export interface AdminBuildReportInputDto {
	/** @format uuid */
	brandId: string;
	/**
	 * The city whose branches it covers; absent for the report across all the brand's cities
	 * @format uuid
	 */
	cityId?: string;
	/**
	 * Only this configuration's report (a rebuild); absent builds every active configuration's
	 * @format uuid
	 */
	configId?: string;
	/** @pattern ^[0-9]{4}-[0-9]{2}$ */
	month: string;
}

export interface AdminChangeVenueFoodTopicInputDto {
	/** `tag` adds the topic, `exclude` keeps it off, `clear` lets categories and posts decide again */
	change: AdminChangeVenueFoodTopicInputDtoChangeEnum;
}

/** `tag` adds the topic, `exclude` keeps it off, `clear` lets categories and posts decide again */
export enum AdminChangeVenueFoodTopicInputDtoChangeEnum {
	Exclude = 'exclude',
	Tag = 'tag',
	Clear = 'clear',
}

export interface AdminCityContextQueryDto {
	/** @pattern ^\d{4}-\d{2}$ */
	month: string;
}

export interface AdminCityDayOutputDto {
	date: string;
	holiday?: string;
	rainMm?: number;
	tMax?: number;
}

export interface AdminCityDaysQueryDto {
	/** @pattern ^\d{4}-\d{2}-\d{2}$ */
	from: string;
	/** @pattern ^\d{4}-\d{2}-\d{2}$ */
	to: string;
}

export interface AdminCityDistrictInputDto {
	/**
	 * @minLength 1
	 * @maxLength 100
	 */
	name: string;
	neighbours: string[];
	postalCodes: string[];
}

export interface AdminCityDistrictSuggestionsOutputDto {
	items: AdminSuggestedDistrictOutputDto[];
}

export interface AdminCityEventOutputDto {
	/** @format date-time */
	createdAt: string;
	endDate: string;
	id: string;
	kind: AdminCityEventOutputDtoKindEnum;
	name: string;
	startDate: string;
}

export enum AdminCityEventOutputDtoKindEnum {
	SchoolHoliday = 'school_holiday',
	Event = 'event',
}

/** A tag the city doesn't scrape that keeps coming up on its matched posts. */
export interface AdminCityHashtagSuggestionOutputDto {
	brands: number;
	hashtagId: number;
	/** The source it would be */
	kind: AdminCityHashtagSuggestionOutputDtoKindEnum;
	matchedPosts: number;
	sampleBrands: string[];
	tag: string;
}

/** The source it would be */
export enum AdminCityHashtagSuggestionOutputDtoKindEnum {
	TiktokHashtag = 'tiktok_hashtag',
	TiktokSearch = 'tiktok_search',
	InstagramHashtag = 'instagram_hashtag',
	Blog = 'blog',
	TiktokAccount = 'tiktok_account',
	InstagramAccount = 'instagram_account',
}

export interface AdminCityHashtagSuggestionsOutputDto {
	items: AdminCityHashtagSuggestionOutputDto[];
}

export interface AdminCityHighlightMonthOutputDto {
	/** @format date-time */
	builtAt: string;
	month: string;
	/** @format date-time */
	publishedAt?: string;
}

/** A month as the admin page shows it: published or not. */
export interface AdminCityHighlightOutputDto {
	/** @format date-time */
	builtAt: string;
	city: CityHighlightCityOutputDtoidstring;
	/**
	 * A city's month in public: what `CityHighlight.data` stores and the public page draws. Our own
	 * counts only (posts, views, creators, shares): no Google rating, no review text, nothing from
	 * OSM. Positive lists only. Optional fields are absent, never null (`serialize({ skipNull })`
	 * drops a null inside the jsonb too).
	 */
	data: CityHighlightData;
	id: string;
	month: string;
	/** @format date-time */
	publishedAt?: string;
	/** @format date-time */
	updatedAt: string;
}

export interface AdminCityHighlightsOutputDto {
	/** The asked month, when it was built */
	highlight?: AdminCityHighlightOutputDto;
	/** Every built month of the city, newest first */
	months: AdminCityHighlightMonthOutputDto[];
}

export interface AdminCityListItemOutputDto {
	active: boolean;
	country: string;
	/** @format date-time */
	createdAt: string;
	cronEnabled: boolean;
	/** For district filters across cities */
	districts: CityDistrict[];
	enabledSources: number;
	id: string;
	instagramEnabled: boolean;
	language: string;
	name: string;
	slug: string;
	sources: number;
	venues: number;
}

export interface AdminCityOutputDto {
	active: boolean;
	aliases: string[];
	chainDenyList: string[];
	country: string;
	/** @format date-time */
	createdAt: string;
	cronEnabled: boolean;
	/** Days between two dish-search snapshots; 0 = off */
	dishSearchEveryDays: number;
	districts: CityDistrict[];
	doNotListCreators: string[];
	doNotListVenues: string[];
	id: string;
	instagramEnabled: boolean;
	language: string;
	lat?: number;
	lng?: number;
	locationQuery: string;
	name: string;
	nameStopwords: string[];
	osmRelationId?: number;
	region?: string;
	slug: string;
	/** Make all properties in T optional */
	stepBudgetsUsd: PartialRecordPipelineStepEnumnumber;
	tiktokRegion: string;
	timezone: string;
	topBrands: number;
	/** @format date-time */
	updatedAt: string;
}

/** A city as a filter or a select offers it. */
export interface AdminCityRefOutputDto {
	id: string;
	name: string;
	slug: string;
}

export interface AdminCitySourceOutputDto {
	/**
	 * When `SCRAPE_BLOGS` last read the blog, and what went wrong then
	 * @format date-time
	 */
	checkedAt?: string;
	/** @format date-time */
	createdAt: string;
	enabled: boolean;
	error?: string;
	/** A blog's feed, once `SCRAPE_BLOGS` found it */
	feedUrl?: string;
	id: string;
	kind: AdminCitySourceOutputDtoKindEnum;
	note?: string;
	/** Added by the suggestion agent and not reviewed yet */
	suggested: boolean;
	value: string;
}

export enum AdminCitySourceOutputDtoKindEnum {
	TiktokHashtag = 'tiktok_hashtag',
	TiktokSearch = 'tiktok_search',
	InstagramHashtag = 'instagram_hashtag',
	Blog = 'blog',
	TiktokAccount = 'tiktok_account',
	InstagramAccount = 'instagram_account',
}

/** A source with what it brought in over the last three months. */
export interface AdminCitySourceYieldOutputDto {
	/**
	 * When `SCRAPE_BLOGS` last read the blog, and what went wrong then
	 * @format date-time
	 */
	checkedAt?: string;
	/** @format date-time */
	createdAt: string;
	enabled: boolean;
	error?: string;
	/** A blog's feed, once `SCRAPE_BLOGS` found it */
	feedUrl?: string;
	id: string;
	kind: AdminCitySourceYieldOutputDtoKindEnum;
	/** Of those, posts with a matched mention */
	matchedPosts: number;
	note?: string;
	/** Posts it found, whichever source found them too */
	posts: number;
	/** Added by the suggestion agent and not reviewed yet */
	suggested: boolean;
	/** Matched posts no other enabled source, venue search or watched brand profile found: what turning it off loses */
	uniqueMatchedPosts: number;
	value: string;
	views: number;
}

export enum AdminCitySourceYieldOutputDtoKindEnum {
	TiktokHashtag = 'tiktok_hashtag',
	TiktokSearch = 'tiktok_search',
	InstagramHashtag = 'instagram_hashtag',
	Blog = 'blog',
	TiktokAccount = 'tiktok_account',
	InstagramAccount = 'instagram_account',
}

/** A whole brand on the competition list. */
export interface AdminCompetitorBrandOutputDto {
	/** Its open branches */
	branches: number;
	/** The cities they are in */
	cities: AdminCityRefOutputDto[];
	id: string;
	name: string;
}

/** One entry on a brand's competition list: a place or a whole brand, and who put it there. */
export interface AdminCompetitorOutputDto {
	/** The branch it competes with; absent for the whole brand */
	branch?: {
		id: string;
		name: string;
		street?: string;
	};
	id: number;
	pickedBy: AdminCompetitorOutputDtoPickedByEnum;
	/** A whole brand on the competition list. */
	rival?: AdminCompetitorBrandOutputDto;
	/** A place as the competition list shows it. */
	venue?: AdminCompetitorVenueOutputDto;
}

export enum AdminCompetitorOutputDtoPickedByEnum {
	Admin = 'admin',
	Owner = 'owner',
	Suggested = 'suggested',
}

/** A venue that could be added as a competitor (or its whole brand), and why it was picked. */
export interface AdminCompetitorSuggestionOutputDto {
	/** How many open branches its brand has: more than one offers adding the whole brand */
	brandBranches: number;
	/** "same category", "neighbouring district", … */
	reasons: string[];
	score: number;
	venue: AdminVenueListItemOutputDto;
}

/** A place as the competition list shows it. */
export interface AdminCompetitorVenueOutputDto {
	/** The brand it is a branch of: its lead score is the brand's */
	brand: AdminBrandRefOutputDto;
	category?: string;
	/** A city as a filter or a select offers it. */
	city: AdminCityRefOutputDto;
	closed: boolean;
	district?: string;
	/** Its website's icon; absent until found */
	favicon?: ImageOutputDto;
	id: string;
	mentionCount: number;
	name: string;
	placeId: string;
	rating?: number;
	reviewsCount?: number;
	street?: string;
}

export interface AdminConfirmBrandInputDto {
	/**
	 * @minLength 1
	 * @maxLength 120
	 */
	name: string;
	/**
	 * Its branches: their brands are merged into one
	 * @minItems 1
	 */
	venueIds: string[];
}

export interface AdminCreateCityInputDto {
	active?: boolean;
	aliases?: string[];
	chainDenyList?: string[];
	/**
	 * ISO 3166-1 alpha-2, e.g. DE
	 * @pattern ^[A-Z]{2}$
	 */
	country: string;
	cronEnabled?: boolean;
	/**
	 * Days between two dish-search snapshots (every dish × district); 0 turns them off
	 * @min 0
	 * @max 365
	 */
	dishSearchEveryDays?: number;
	districts?: AdminCityDistrictInputDto[];
	/** Creators who asked to be left out of public pages (handles, with or without */
	doNotListCreators?: string[];
	/** Venues who asked to be left out of public pages (names) */
	doNotListVenues?: string[];
	instagramEnabled?: boolean;
	/**
	 * ISO 639-1, e.g. de: the reports' and outreach's language
	 * @pattern ^[a-z]{2}$
	 */
	language: string;
	/**
	 * @min -90
	 * @max 90
	 */
	lat?: number | null;
	/**
	 * @min -180
	 * @max 180
	 */
	lng?: number | null;
	/**
	 * Google Maps location, e.g. "Berlin, Germany"
	 * @minLength 1
	 * @maxLength 200
	 */
	locationQuery: string;
	/**
	 * @minLength 1
	 * @maxLength 100
	 */
	name: string;
	nameStopwords?: string[];
	/**
	 * The city's boundary on OpenStreetMap, a relation id (Berlin: 62422): the OSM place checklist
	 * @min 1
	 */
	osmRelationId?: number | null;
	/**
	 * ISO 3166-2 subdivision, e.g. DE-BE: regional holidays and the Google Trends region
	 * @pattern ^[A-Z]{2}-[A-Z0-9]{1,3}$
	 */
	region?: string | null;
	/**
	 * @maxLength 60
	 * @pattern ^[a-z0-9]+(-[a-z0-9]+)*$
	 */
	slug: string;
	/** Make all properties in T optional */
	stepBudgetsUsd?: PartialRecordPipelineStepEnumnumberMinimum0Maximum100;
	/**
	 * TikTok search region, ISO-2
	 * @pattern ^[A-Z]{2}$
	 */
	tiktokRegion: string;
	/**
	 * IANA time zone, e.g. Europe/Berlin
	 * @minLength 1
	 * @maxLength 60
	 */
	timezone: string;
	/**
	 * @min 1
	 * @max 200
	 */
	topBrands?: number;
}

export interface AdminCreateFoodTopicInputDto {
	/** @maxItems 100 */
	aliases?: string[];
	/**
	 * Defaults to the label's `normalizeCuisine` key; must be one
	 * @maxLength 80
	 */
	key?: string;
	kind: AdminCreateFoodTopicInputDtoKindEnum;
	/**
	 * @minLength 1
	 * @maxLength 80
	 */
	label: string;
	parentKey?: string;
	/** @maxLength 100 */
	trendsQuery?: string;
	/** @pattern ^/(m|g)/[0-9A-Za-z_]+$ */
	trendsTopicId?: string;
}

export enum AdminCreateFoodTopicInputDtoKindEnum {
	Cuisine = 'cuisine',
	Dish = 'dish',
	Drink = 'drink',
	Diet = 'diet',
	Format = 'format',
	Meal = 'meal',
}

export interface AdminCreateReportConfigInputDto {
	/**
	 * Absent: the template's name (numbered when the brand has it already)
	 * @minLength 1
	 * @maxLength 80
	 */
	name?: string;
	/**
	 * The template to copy; absent for a custom configuration starting from the full layout
	 * @format uuid
	 */
	templateId?: string;
}

export interface AdminCreateReportTemplateInputDto {
	/** @maxLength 400 */
	description?: string;
	/**
	 * @minLength 1
	 * @maxLength 80
	 */
	name: string;
	/**
	 * The cover first, each kind once; absent starts from the full layout
	 * @minItems 1
	 */
	sections?: ReportSectionDto[];
}

/** One of a creator's accounts in a list row. */
export interface AdminCreatorAccountRefOutputDto {
	/** A brand's own account */
	brand?: {
		id: string;
		name: string;
	};
	followers?: number;
	handle: string;
	id: string;
	platform: AdminCreatorAccountRefOutputDtoPlatformEnum;
}

export enum AdminCreatorAccountRefOutputDtoPlatformEnum {
	Tiktok = 'tiktok',
	Instagram = 'instagram',
	Blog = 'blog',
}

export interface AdminCreatorDetailInputDto {
	/**
	 * The month the accounts' figures are for, and the last of the six months; the last finished month without
	 * @pattern ^[0-9]{4}-[0-9]{2}$
	 */
	month?: string;
}

/** One thing that found a creator's posts: a city's source, a venue search or place page, or their own profile. */
export interface AdminCreatorFindOutputDto {
	city: {
		id: string;
		name: string;
	};
	kind: AdminCreatorFindOutputDtoKindEnum;
	/** @format date-time */
	lastPostedAt: string;
	posts: number;
	sourceEnabled?: boolean;
	/** The city's source it is (absent for a venue search, or a watched brand's profile) */
	sourceId?: string;
	/** A tag without #, a query, a blog's URL, the venue's search name or the profile's handle */
	value: string;
	venue?: {
		id: string;
		name: string;
	};
}

export enum AdminCreatorFindOutputDtoKindEnum {
	TiktokHashtag = 'tiktok_hashtag',
	TiktokSearch = 'tiktok_search',
	InstagramHashtag = 'instagram_hashtag',
	Blog = 'blog',
	VenueSearch = 'venue_search',
	VenuePlace = 'venue_place',
	TiktokAccount = 'tiktok_account',
	InstagramAccount = 'instagram_account',
}

/** A creator's posts in the month asked for, over all their accounts. */
export interface AdminCreatorMonthOutputDto {
	/** Brands their posts named */
	brands: number;
	/** @format date-time */
	lastPostedAt?: string;
	/** Ads, or paid or gifted as the caption says */
	paid: number;
	posts: number;
	views: number;
}

export interface AdminCreatorOutputDto {
	accounts: AdminAccountOutputDto[];
	/** The brands their posts named most, all time; `own` when it is their own account's brand */
	brands: {
		id: string;
		/** @format date-time */
		lastPostedAt: string;
		name: string;
		own: boolean;
		posts: number;
		views: number;
	}[];
	/** @format date-time */
	createdAt: string;
	/** What found their posts, the most posts first (15 at most) */
	foundBy: AdminCreatorFindOutputDto[];
	id: string;
	/** Posts and views per month, six months up to the one asked for, oldest first */
	months: {
		month: string;
		posts: number;
		views: number;
	}[];
	name: string;
	/** Every post of theirs we stored, and their views */
	posts: number;
	views: number;
}

export interface AdminCreatorRowOutputDto {
	accounts: AdminCreatorAccountRefOutputDto[];
	/** The most followers of any of their accounts */
	followers?: number;
	id: string;
	/** A creator's posts in the month asked for, over all their accounts. */
	month: AdminCreatorMonthOutputDto;
	name: string;
	/** Every account is a brand's own */
	own: boolean;
}

export interface AdminCreatorWatchInputDto {
	/**
	 * The report month whose brands decide (customers, top brands, rivals); the last finished month without
	 * @pattern ^[0-9]{4}-[0-9]{2}$
	 */
	month?: string;
}

export interface AdminCreatorWatchOutputDto {
	/** Each of the creator's profiles (blogs are read through their feeds, never watched) */
	accounts: {
		accountId: string;
		handle: string;
		platform: AdminCreatorWatchOutputDtoPlatformEnum;
		reasons: AdminWatchReasonOutputDto[];
	}[];
	month: string;
}

export enum AdminCreatorWatchOutputDtoPlatformEnum {
	Tiktok = 'tiktok',
	Instagram = 'instagram',
	Blog = 'blog',
}

export interface AdminDataCoverageOutputDto {
	cityId: string;
	/** Newest first */
	months: AdminDataMonthOutputDto[];
	/** Runs waiting or running now */
	queue: {
		/** @format date-time */
		createdAt: string;
		month: string;
		runId: string;
		state: AdminDataCoverageOutputDtoStateEnum;
		step: AdminDataCoverageOutputDtoStepEnum;
	}[];
	/** Steps that run on their own schedule, whatever the month: their latest run */
	recurring: AdminDataStepOutputDto[];
	/** The month the monthly cron reports on now: the last finished one */
	reportMonth: string;
}

export enum AdminDataCoverageOutputDtoStateEnum {
	Queued = 'queued',
	Running = 'running',
}

export enum AdminDataCoverageOutputDtoStepEnum {
	SCRAPE_VENUES = 'SCRAPE_VENUES',
	SEARCH_BRANCHES = 'SEARCH_BRANCHES',
	SYNC_OSM_PLACES = 'SYNC_OSM_PLACES',
	LOOKUP_OSM_PLACES = 'LOOKUP_OSM_PLACES',
	SCRAPE_TIKTOK = 'SCRAPE_TIKTOK',
	SCRAPE_TIKTOK_RECENT = 'SCRAPE_TIKTOK_RECENT',
	SCRAPE_INSTAGRAM = 'SCRAPE_INSTAGRAM',
	SCRAPE_INSTAGRAM_RECENT = 'SCRAPE_INSTAGRAM_RECENT',
	SCRAPE_INSTAGRAM_REELS = 'SCRAPE_INSTAGRAM_REELS',
	SCRAPE_BLOGS = 'SCRAPE_BLOGS',
	EXTRACT_MENTIONS = 'EXTRACT_MENTIONS',
	MATCH_MENTIONS = 'MATCH_MENTIONS',
	LOOKUP_VENUES = 'LOOKUP_VENUES',
	SCRAPE_VENUE_SOCIAL = 'SCRAPE_VENUE_SOCIAL',
	FILL_COMPETITORS = 'FILL_COMPETITORS',
	SCRAPE_REVIEWS = 'SCRAPE_REVIEWS',
	ANALYSE_REVIEWS = 'ANALYSE_REVIEWS',
	REFRESH_VENUE_DETAILS = 'REFRESH_VENUE_DETAILS',
	SCRAPE_ACCOUNTS = 'SCRAPE_ACCOUNTS',
	SCRAPE_ACCOUNTS_RECENT = 'SCRAPE_ACCOUNTS_RECENT',
	FILL_ACCOUNT_FOLLOWERS = 'FILL_ACCOUNT_FOLLOWERS',
	FIND_OWN_ACCOUNTS = 'FIND_OWN_ACCOUNTS',
	SCRAPE_COMMENTS = 'SCRAPE_COMMENTS',
	ANALYSE_COMMENTS = 'ANALYSE_COMMENTS',
	SCRAPE_PRESS = 'SCRAPE_PRESS',
	TRACK_SEARCH_RANKS = 'TRACK_SEARCH_RANKS',
	TRACK_DISH_SEARCHES = 'TRACK_DISH_SEARCHES',
	SEARCH_INTEREST = 'SEARCH_INTEREST',
	BUILD_REPORTS = 'BUILD_REPORTS',
	SCORE_LEADS = 'SCORE_LEADS',
	WATCH_REVIEWS = 'WATCH_REVIEWS',
	SAMPLE_BUSYNESS = 'SAMPLE_BUSYNESS',
	SAMPLE_RESERVATIONS = 'SAMPLE_RESERVATIONS',
	SNAPSHOT_RATINGS = 'SNAPSHOT_RATINGS',
	SCRAPE_DELIVERY = 'SCRAPE_DELIVERY',
	REFRESH_POST_COUNTS = 'REFRESH_POST_COUNTS',
	MONTHLY = 'MONTHLY',
}

export interface AdminDataMonthOutputDto {
	/** Apify spend of the month's pipeline runs (runs started before 2026-10-18 carry no run link) */
	apifyUsd: number;
	/** Every step of the monthly run succeeded (or was skipped as done) */
	complete: boolean;
	/** The current month: still filling up */
	inProgress: boolean;
	mentions: {
		matched: number;
		otherCity: number;
		unmatched: number;
	};
	month: string;
	posts: {
		blog: number;
		instagram: number;
		tiktok: number;
		unanalysed: number;
	};
	reports: {
		built: number;
		sent: number;
	};
	reviews: {
		total: number;
		unanalysed: number;
		venues: number;
	};
	steps: AdminDataStepOutputDto[];
}

/** One step's latest attempt for a month; no `state` when it never ran for it. */
export interface AdminDataStepOutputDto {
	/** @format date-time */
	at?: string;
	error?: string;
	/** Spends on Apify: "finish the month" pays for it only when it has not succeeded */
	paid: boolean;
	runId?: string;
	state?: AdminDataStepOutputDtoStateEnum;
	step: AdminDataStepOutputDtoStepEnum;
	/** Its result's figures in a line, e.g. "found 2000 · saved 412" */
	summary?: string;
}

export enum AdminDataStepOutputDtoStateEnum {
	Failed = 'failed',
	Queued = 'queued',
	Running = 'running',
	Skipped = 'skipped',
	Succeeded = 'succeeded',
}

export enum AdminDataStepOutputDtoStepEnum {
	SCRAPE_VENUES = 'SCRAPE_VENUES',
	SEARCH_BRANCHES = 'SEARCH_BRANCHES',
	SYNC_OSM_PLACES = 'SYNC_OSM_PLACES',
	LOOKUP_OSM_PLACES = 'LOOKUP_OSM_PLACES',
	SCRAPE_TIKTOK = 'SCRAPE_TIKTOK',
	SCRAPE_TIKTOK_RECENT = 'SCRAPE_TIKTOK_RECENT',
	SCRAPE_INSTAGRAM = 'SCRAPE_INSTAGRAM',
	SCRAPE_INSTAGRAM_RECENT = 'SCRAPE_INSTAGRAM_RECENT',
	SCRAPE_INSTAGRAM_REELS = 'SCRAPE_INSTAGRAM_REELS',
	SCRAPE_BLOGS = 'SCRAPE_BLOGS',
	EXTRACT_MENTIONS = 'EXTRACT_MENTIONS',
	MATCH_MENTIONS = 'MATCH_MENTIONS',
	LOOKUP_VENUES = 'LOOKUP_VENUES',
	SCRAPE_VENUE_SOCIAL = 'SCRAPE_VENUE_SOCIAL',
	FILL_COMPETITORS = 'FILL_COMPETITORS',
	SCRAPE_REVIEWS = 'SCRAPE_REVIEWS',
	ANALYSE_REVIEWS = 'ANALYSE_REVIEWS',
	REFRESH_VENUE_DETAILS = 'REFRESH_VENUE_DETAILS',
	SCRAPE_ACCOUNTS = 'SCRAPE_ACCOUNTS',
	SCRAPE_ACCOUNTS_RECENT = 'SCRAPE_ACCOUNTS_RECENT',
	FILL_ACCOUNT_FOLLOWERS = 'FILL_ACCOUNT_FOLLOWERS',
	FIND_OWN_ACCOUNTS = 'FIND_OWN_ACCOUNTS',
	SCRAPE_COMMENTS = 'SCRAPE_COMMENTS',
	ANALYSE_COMMENTS = 'ANALYSE_COMMENTS',
	SCRAPE_PRESS = 'SCRAPE_PRESS',
	TRACK_SEARCH_RANKS = 'TRACK_SEARCH_RANKS',
	TRACK_DISH_SEARCHES = 'TRACK_DISH_SEARCHES',
	SEARCH_INTEREST = 'SEARCH_INTEREST',
	BUILD_REPORTS = 'BUILD_REPORTS',
	SCORE_LEADS = 'SCORE_LEADS',
	WATCH_REVIEWS = 'WATCH_REVIEWS',
	SAMPLE_BUSYNESS = 'SAMPLE_BUSYNESS',
	SAMPLE_RESERVATIONS = 'SAMPLE_RESERVATIONS',
	SNAPSHOT_RATINGS = 'SNAPSHOT_RATINGS',
	SCRAPE_DELIVERY = 'SCRAPE_DELIVERY',
	REFRESH_POST_COUNTS = 'REFRESH_POST_COUNTS',
	MONTHLY = 'MONTHLY',
}

export interface AdminDishNameOutputDto {
	/** Who decided: `match` (the name is the topic or one of its other names), `ai`, `admin`; absent while undecided */
	decidedBy?: AdminDishNameOutputDtoDecidedByEnum;
	foodTopic?: {
		key: string;
		label: string;
	};
	id: number;
	key: string;
	name: string;
	/** The city's feedback rows naming it */
	notes: number;
	/** The agent's label for a topic that would fit, when none does */
	suggestion?: string;
}

/** Who decided: `match` (the name is the topic or one of its other names), `ai`, `admin`; absent while undecided */
export enum AdminDishNameOutputDtoDecidedByEnum {
	Match = 'match',
	Admin = 'admin',
	Ai = 'ai',
}

export interface AdminDishNameSuggestionOutputDto {
	examples: string[];
	label: string;
	names: number;
	notes: number;
}

export interface AdminDishNamesOutputDto {
	names: AdminDishNameOutputDto[];
	suggestions: AdminDishNameSuggestionOutputDto[];
	summary: {
		linkedNames: number;
		linkedNotes: number;
		names: number;
		notes: number;
		pendingNames: number;
	};
	total: number;
}

/** One dish's search in one district ("pasta Mitte Berlin"). */
export interface AdminDishSearchDistrictOutputDto {
	district: string;
	places: AdminDishSearchPlaceOutputDto[];
	/** Whether the same search ran in the snapshot before: without it a place's move is unknown */
	previousSearched: boolean;
	/** @format date-time */
	searchedAt: string;
}

/** One place in a dish search's top ten. */
export interface AdminDishSearchPlaceOutputDto {
	name: string;
	placeId: string;
	/** Its rank on the same search in the snapshot before; absent when it was not in that top ten */
	previousRank?: number;
	rank: number;
	rating?: number;
	reviewsCount?: number;
	/** Our venue, when we keep the place */
	venueId?: string;
}

/** A dish's Google Maps top ten in each district of a city, in one dated snapshot. */
export interface AdminDishSearchesOutputDto {
	/** Districts searched in the snapshot, alphabetical */
	districts: AdminDishSearchDistrictOutputDto[];
	/** The snapshot before it, what `previousRank` compares with; absent for the first */
	previousOn?: string;
	/** The snapshot shown; absent when the dish was never searched */
	searchedOn?: string;
	/** Every snapshot the dish was searched in (`YYYY-MM-DD`), newest first */
	snapshots: string[];
}

export interface AdminDismissBrandInputDto {
	/**
	 * @minLength 1
	 * @maxLength 120
	 */
	key: string;
	/**
	 * The suggestion's name and key, as `listBrandSuggestions` gave them
	 * @maxLength 120
	 */
	name: string;
}

export interface AdminExportUsersCsvInputDto {
	roles?: AdminExportUsersCsvInputDtoRolesEnum[];
}

export enum AdminExportUsersCsvInputDtoRolesEnum {
	System = 'system',
	Admin = 'admin',
	Promoter = 'promoter',
	User = 'user',
	VenueOwner = 'venue_owner',
}

export interface AdminFileFeedbackThemesInputDto {
	/**
	 * Only this city's points
	 * @format uuid
	 */
	cityId?: string;
	/**
	 * Points filed this call (newest month first), default 600
	 * @min 1
	 * @max 5000
	 */
	limit?: number;
}

export interface AdminFileFeedbackThemesOutputDto {
	/** Points filed this call */
	points: number;
	/** What `realign` changed first: topics moved to their theme's, points sent back to filing */
	realigned: {
		topicsMoved: number;
		unfiled: number;
	};
	/** Points still without a theme (of the city, when given) */
	remaining: number;
}

export interface AdminFillCityDaysInputDto {
	/** @pattern ^\d{4}-\d{2}-\d{2}$ */
	from: string;
	/** @pattern ^\d{4}-\d{2}-\d{2}$ */
	to: string;
}

export interface AdminFillCityDaysOutputDto {
	/** Days written or updated */
	written: number;
}

export interface AdminFillCompetitorsInputDto {
	/** @format uuid */
	cityId: string;
	/** @pattern ^[0-9]{4}-[0-9]{2}$ */
	month: string;
	/**
	 * How many of the month's most talked-about venues to cover.
	 * @min 1
	 * @max 200
	 */
	top?: number;
}

export interface AdminFillCompetitorsOutputDto {
	/** Competitors added in all */
	added: number;
	/** The month's report brands looked at */
	brands: number;
	/** Brands that had none and got some */
	filled: number;
	/** Brands that already had competitors, left as they were */
	skipped: number;
}

export interface AdminFoodTopicBaseOutputDto {
	aliases: string[];
	id: string;
	key: string;
	kind: AdminFoodTopicBaseOutputDtoKindEnum;
	label: string;
	/** The parent topic's key: a child counts for it too */
	parentKey?: string;
	trendsQuery?: string;
	/** Google Trends topic id, e.g. "/m/01xw9"; searched before `trendsQuery` */
	trendsTopicId?: string;
}

export enum AdminFoodTopicBaseOutputDtoKindEnum {
	Cuisine = 'cuisine',
	Dish = 'dish',
	Drink = 'drink',
	Diet = 'diet',
	Format = 'format',
	Meal = 'meal',
}

export interface AdminFoodTopicOutputDto {
	aliases: string[];
	id: string;
	key: string;
	kind: AdminFoodTopicOutputDtoKindEnum;
	label: string;
	/** The city's matched mentions resolving to it, all time */
	mentions: number;
	/** The parent topic's key: a child counts for it too */
	parentKey?: string;
	trendsQuery?: string;
	/** Google Trends topic id, e.g. "/m/01xw9"; searched before `trendsQuery` */
	trendsTopicId?: string;
	/** The city's venues whose Google category resolves to it */
	venues: number;
}

export enum AdminFoodTopicOutputDtoKindEnum {
	Cuisine = 'cuisine',
	Dish = 'dish',
	Drink = 'drink',
	Diet = 'diet',
	Format = 'format',
	Meal = 'meal',
}

export interface AdminFoodTopicsOutputDto {
	/** Words an admin dismissed (every city), left out of `unmapped` */
	ignored: string[];
	topics: AdminFoodTopicOutputDto[];
	/** Cuisine keys of the city that resolve to no topic, most used first */
	unmapped: AdminUnmappedCuisineOutputDto[];
}

export interface AdminFoodTrendsOutputDto {
	/** What an anchored pull would compare and roughly cost */
	pull: {
		estimatedUsd: number;
		groups: number;
		topics: number;
	};
	/** Every stored quarter of the city, newest first */
	quarters: AdminFoodTrendsQuarterOutputDto[];
	/** The asked quarter, when anything is stored for it */
	report?: AdminFoodTrendsReportOutputDto;
}

export interface AdminFoodTrendsQuarterInputDto {
	/** @format uuid */
	cityId: string;
	/** @pattern ^[0-9]{4}-q[1-4]$ */
	quarter: string;
}

export interface AdminFoodTrendsQuarterOutputDto {
	/** @format date-time */
	builtAt?: string;
	/** @format date-time */
	publishedAt?: string;
	quarter: string;
}

/** A quarter as the admin page shows it: pulled, built, published or not. */
export interface AdminFoodTrendsReportOutputDto {
	/** @format date-time */
	builtAt?: string;
	city: FoodTrendsCityOutputDtoidstring;
	/** Absent until built */
	data?: FoodTrendsData;
	id: string;
	/** @format date-time */
	publishedAt?: string;
	quarter: string;
	/** The anchored search pull's state; absent when none was asked for */
	searchPull?: FoodTrendsSearchPull;
	/** @format date-time */
	updatedAt: string;
}

export interface AdminGetBrandSummaryInputDto {
	/**
	 * Figures in this city only; every city without
	 * @format uuid
	 */
	cityId?: string;
	/**
	 * The last finished month without
	 * @pattern ^[0-9]{4}-[0-9]{2}$
	 */
	month?: string;
}

export interface AdminGetCityHighlightsInputDto {
	/** @format uuid */
	cityId: string;
	/** @pattern ^[0-9]{4}-(0[1-9]|1[0-2])$ */
	month: string;
}

export interface AdminGetDataCoverageInputDto {
	/** @format uuid */
	cityId: string;
	/**
	 * How many months back from the current one; 6 without
	 * @min 1
	 * @max 24
	 */
	months?: number;
}

export interface AdminGetDishNamesInputDto {
	/** @format uuid */
	cityId: string;
	/**
	 * @min 1
	 * @max 200
	 */
	limit?: number;
	/** @min 0 */
	offset?: number;
	/**
	 * Part of the name
	 * @maxLength 100
	 */
	q?: string;
	/** `unlinked` (decided, no topic; the default), `linked`, `pending` (not decided yet) or `all` */
	status?: AdminGetDishNamesInputDtoStatusEnum;
	/**
	 * Only the names the agent suggested this topic for
	 * @maxLength 100
	 */
	suggestion?: string;
	/**
	 * Only the names of this topic
	 * @maxLength 64
	 */
	topicKey?: string;
}

/** `unlinked` (decided, no topic; the default), `linked`, `pending` (not decided yet) or `all` */
export enum AdminGetDishNamesInputDtoStatusEnum {
	All = 'all',
	Pending = 'pending',
	Unlinked = 'unlinked',
	Linked = 'linked',
}

export interface AdminGetDishSearchesInputDto {
	/** @format uuid */
	cityId: string;
	/**
	 * The snapshot to show, `YYYY-MM-DD`; the newest when absent
	 * @pattern ^[0-9]{4}-[0-9]{2}-[0-9]{2}$
	 */
	searchedOn?: string;
	/**
	 * The dish topic's key, e.g. `pasta`
	 * @minLength 1
	 */
	topicKey: string;
}

export interface AdminGetFoodTopicsInputDto {
	/** @format uuid */
	cityId: string;
}

export interface AdminGetFoodTrendsInputDto {
	/** @format uuid */
	cityId: string;
	/** @pattern ^[0-9]{4}-q[1-4]$ */
	quarter: string;
}

export interface AdminGetSearchInterestInputDto {
	/** @format uuid */
	cityId: string;
	/** @pattern ^[0-9]{4}-[0-9]{2}$ */
	month: string;
}

export interface AdminGetThemeInsightInputDto {
	/**
	 * Only this brand's sentences
	 * @format uuid
	 */
	brandId?: string;
	/** @format uuid */
	cityId: string;
	/**
	 * Only the sentences about one dish: a `dishes` row's key (`topic:<key>` or `dish:<key>`)
	 * @maxLength 200
	 */
	dish?: string;
	/**
	 * Only the brands of one kind of food: a food topic's key
	 * @maxLength 64
	 */
	food?: string;
	/** Only reviews, or only posts */
	kind?: AdminGetThemeInsightInputDtoKindEnum;
	/**
	 * 50 when absent
	 * @min 1
	 * @max 200
	 */
	limit?: number;
	/** @pattern ^[0-9]{4}-[0-9]{2}$ */
	month: string;
	/** @min 0 */
	offset?: number;
	/** Complaints when absent */
	side?: AdminGetThemeInsightInputDtoSideEnum;
}

/** Only reviews, or only posts */
export enum AdminGetThemeInsightInputDtoKindEnum {
	Post = 'post',
	Review = 'review',
}

/** Complaints when absent */
export enum AdminGetThemeInsightInputDtoSideEnum {
	Praise = 'praise',
	Complaints = 'complaints',
	Changes = 'changes',
}

export interface AdminGetThemeInsightsInputDto {
	/** @format uuid */
	cityId: string;
	/**
	 * A food topic's key: only the brands whose food it is (most of their places' main food)
	 * @maxLength 64
	 */
	food?: string;
	/** @pattern ^[0-9]{4}-[0-9]{2}$ */
	month: string;
}

export interface AdminGetTopicInsightsInputDto {
	/** @format uuid */
	cityId: string;
	/** @pattern ^[0-9]{4}-[0-9]{2}$ */
	month: string;
}

export interface AdminGetTrendsInputDto {
	/** @format uuid */
	cityId: string;
	/** @pattern ^[0-9]{4}-[0-9]{2}$ */
	month: string;
}

export interface AdminGetVenueStatusChangesInputDto {
	/** @format uuid */
	cityId: string;
	/**
	 * The last month of the three-month window
	 * @pattern ^[0-9]{4}-[0-9]{2}$
	 */
	month: string;
}

export interface AdminHashtagOutputDto {
	brand?: {
		id: string;
		name: string;
	};
	foodTopic?: {
		key: string;
		label: string;
	};
	id: number;
	ignored: boolean;
	tag: string;
}

export interface AdminIgnoreWordInputDto {
	ignored: boolean;
	/**
	 * The word as listed; true dismisses it, false brings it back
	 * @minLength 1
	 * @maxLength 80
	 */
	word: string;
}

export interface AdminInviteToPortalInputDto {
	/**
	 * Who to invite; the prospect's contact e-mail when absent
	 * @format email
	 */
	email?: string;
	/** OWNER when absent */
	role?: AdminInviteToPortalInputDtoRoleEnum;
}

/** OWNER when absent */
export enum AdminInviteToPortalInputDtoRoleEnum {
	OWNER = 'OWNER',
	STAFF = 'STAFF',
}

/** One edition, published or not, with everything it shows. */
export interface AdminLandingEditionOutputDto {
	/** @format date-time */
	builtAt: string;
	city: LandingCityOutputDtoidstring;
	/**
	 * What the model wrote for an edition, each line checked against its numbers; a line that
	 * failed or was missing is the plain fallback. The page joins it to `data` by key.
	 */
	copy: LandingCopy;
	/** Why every line fell back, when the model's call failed */
	copyError?: string;
	/**
	 * The front page's live edition of a city: the last 30 days of what the city posted about
	 * eating out, against the 30 days before. Our own counts of public posts by others only (a
	 * brand's own account and paid or promotional posts left out): no Google rating, no review
	 * text, nothing from OSM. Positive lists only. Optional fields are absent, never null
	 * (`serialize({ skipNull })` drops a null inside the jsonb too).
	 */
	data: LandingEditionData;
	id: string;
	/** @format date-time */
	publishedAt?: string;
	/** @format date-time */
	windowEnd: string;
	/** @format date-time */
	windowStart: string;
}

/** An edition as the admin lists it. */
export interface AdminLandingEditionSummaryOutputDto {
	/** @format date-time */
	builtAt: string;
	/** Why every line fell back, when the model's call failed */
	copyError?: string;
	id: string;
	/** @format date-time */
	publishedAt?: string;
	/** @format date-time */
	windowEnd: string;
	/** @format date-time */
	windowStart: string;
}

export interface AdminLandingEditionsInputDto {
	/** @format uuid */
	cityId: string;
}

export interface AdminLandingEditionsOutputDto {
	editions: AdminLandingEditionSummaryOutputDto[];
	/** The edition `/` shows now, if any */
	liveId?: string;
}

export interface AdminListAccountsInputDto {
	/**
	 * The accounts first seen in this city; the first active city's without
	 * @format uuid
	 */
	cityId?: string;
	/**
	 * The month the post figures are for; the last finished month without
	 * @pattern ^[0-9]{4}-[0-9]{2}$
	 */
	month?: string;
	/** @min 1 */
	page: number;
	platform?: AdminListAccountsInputDtoPlatformEnum;
	/** On the handle, the display name or the brand's name */
	q?: string;
	/** @min 1 */
	size: number;
	sort?: AdminListAccountsInputDtoSortEnum;
	status?: AdminListAccountsInputDtoStatusEnum;
}

export enum AdminListAccountsInputDtoPlatformEnum {
	Tiktok = 'tiktok',
	Instagram = 'instagram',
	Blog = 'blog',
}

export enum AdminListAccountsInputDtoSortEnum {
	ScoreAsc = 'score:asc',
	ScoreDesc = 'score:desc',
	FollowersAsc = 'followers:asc',
	FollowersDesc = 'followers:desc',
	HandleAsc = 'handle:asc',
	HandleDesc = 'handle:desc',
	MonthPostsAsc = 'monthPosts:asc',
	MonthPostsDesc = 'monthPosts:desc',
	MonthViewsAsc = 'monthViews:asc',
	MonthViewsDesc = 'monthViews:desc',
}

export enum AdminListAccountsInputDtoStatusEnum {
	Suggested = 'suggested',
	Linked = 'linked',
}

export interface AdminListAccountsOutputDto {
	/** The city's accounts per status, under the same search and platform */
	counts: {
		linked: number;
		suggested: number;
	};
	items: AdminAccountOutputDto[];
	page: number;
	pageSize: number;
	totalItems: number;
}

export interface AdminListApifyRunsInputDto {
	/** @min 1 */
	page: number;
	/** @min 1 */
	size: number;
}

export interface AdminListApifyRunsOutputDto {
	items: AdminApifyRunOutputDto[];
	/** What runs cost this calendar month, in USD. */
	monthCostUsd: number;
	page: number;
	pageSize: number;
	totalItems: number;
}

export interface AdminListBlogEntriesInputDto {
	/** @min 1 */
	page: number;
	q?: string;
	/** @min 1 */
	size: number;
	sort?: AdminListBlogEntriesInputDtoSortEnum;
	/** @minItems 1 */
	states?: AdminListBlogEntriesInputDtoStatesEnum[];
	/** @format uuid */
	tagId?: string;
}

export enum AdminListBlogEntriesInputDtoSortEnum {
	ViewCountASC = 'viewCount:ASC',
	ViewCountDESC = 'viewCount:DESC',
	PublishedAtASC = 'publishedAt:ASC',
	PublishedAtDESC = 'publishedAt:DESC',
	CreatedAtASC = 'createdAt:ASC',
	CreatedAtDESC = 'createdAt:DESC',
	TitleASC = 'title:ASC',
	TitleDESC = 'title:DESC',
}

export enum AdminListBlogEntriesInputDtoStatesEnum {
	DRAFT = 'DRAFT',
	PUBLISHED = 'PUBLISHED',
	REMOVED = 'REMOVED',
}

export interface AdminListBlogEntriesOutputDto {
	items: AdminBlogEntryListItem[];
	page: number;
	pageSize: number;
	totalItems: number;
}

export interface AdminListBrandSuggestionsInputDto {
	/** @format uuid */
	cityId: string;
}

export interface AdminListBrandsInputDto {
	/**
	 * The brands with an open branch in this city, and their figures there; every city without
	 * @format uuid
	 */
	cityId?: string;
	/** Brands with an open branch in this district */
	district?: string;
	/**
	 * The month the figures are for; the last finished month without
	 * @pattern ^[0-9]{4}-[0-9]{2}$
	 */
	month?: string;
	/** @min 1 */
	page: number;
	/** On the brand's name or any of its branches' */
	q?: string;
	segment?: AdminListBrandsInputDtoSegmentEnum;
	/** @min 1 */
	size: number;
	sort?: AdminListBrandsInputDtoSortEnum;
	stage?: AdminListBrandsInputDtoStageEnum;
}

export enum AdminListBrandsInputDtoSegmentEnum {
	All = 'all',
	Prospects = 'prospects',
	Talked = 'talked',
	Customers = 'customers',
	Chains = 'chains',
}

export enum AdminListBrandsInputDtoSortEnum {
	NameAsc = 'name:asc',
	NameDesc = 'name:desc',
	LeadScoreAsc = 'leadScore:asc',
	LeadScoreDesc = 'leadScore:desc',
	RatingAsc = 'rating:asc',
	RatingDesc = 'rating:desc',
	ViewsAsc = 'views:asc',
	ViewsDesc = 'views:desc',
	PostsAsc = 'posts:asc',
	PostsDesc = 'posts:desc',
	ChangeAsc = 'change:asc',
	ChangeDesc = 'change:desc',
	BranchesAsc = 'branches:asc',
	BranchesDesc = 'branches:desc',
	ReviewsAsc = 'reviews:asc',
	ReviewsDesc = 'reviews:desc',
	FollowUpAsc = 'followUp:asc',
	FollowUpDesc = 'followUp:desc',
}

export enum AdminListBrandsInputDtoStageEnum {
	TO_CONTACT = 'TO_CONTACT',
	CONTACTED = 'CONTACTED',
	REPLIED = 'REPLIED',
	MEETING = 'MEETING',
	WON = 'WON',
	LOST = 'LOST',
	OPTED_OUT = 'OPTED_OUT',
}

export interface AdminListBrandsOutputDto {
	items: AdminBrandRowOutputDto[];
	month: string;
	page: number;
	pageSize: number;
	/** How many brands each segment holds under the same search and district */
	segments: RecordAdminBrandSegmentnumber;
	totalItems: number;
}

export interface AdminListCitiesOutputDto {
	items: AdminCityListItemOutputDto[];
}

export interface AdminListCityDaysOutputDto {
	items: AdminCityDayOutputDto[];
}

export interface AdminListCityEventsOutputDto {
	items: AdminCityEventOutputDto[];
}

export interface AdminListCitySourcesOutputDto {
	/**
	 * The day every source that finds a post is recorded (YYYY-MM-DD): before it a post kept only
	 * its first source, so unique counts over a window starting earlier are too high
	 */
	allFindsSince: string;
	items: AdminCitySourceYieldOutputDto[];
}

export interface AdminListCompetitorSuggestionsInputDto {
	/**
	 * Suggest around this branch instead of the city's most reviewed one
	 * @format uuid
	 */
	branchId?: string;
	/**
	 * The city to suggest in; the brand's first city without it
	 * @format uuid
	 */
	cityId?: string;
}

export interface AdminListCreatorsInputDto {
	/**
	 * Posts found in this city; every city's without
	 * @format uuid
	 */
	cityId?: string;
	/** Also venues' own accounts (every account of the creator linked to a brand) */
	includeOwn?: boolean;
	/**
	 * The month counted; the last finished month without
	 * @pattern ^[0-9]{4}-[0-9]{2}$
	 */
	month?: string;
	/** @min 1 */
	page: number;
	platform?: AdminListCreatorsInputDtoPlatformEnum;
	/** On the creator's name, handles and display names */
	q?: string;
	/** @min 1 */
	size: number;
	sort?: AdminListCreatorsInputDtoSortEnum;
}

export enum AdminListCreatorsInputDtoPlatformEnum {
	Tiktok = 'tiktok',
	Instagram = 'instagram',
	Blog = 'blog',
}

export enum AdminListCreatorsInputDtoSortEnum {
	NameAsc = 'name:asc',
	NameDesc = 'name:desc',
	FollowersAsc = 'followers:asc',
	FollowersDesc = 'followers:desc',
	ViewsAsc = 'views:asc',
	ViewsDesc = 'views:desc',
	PostsAsc = 'posts:asc',
	PostsDesc = 'posts:desc',
	BrandsAsc = 'brands:asc',
	BrandsDesc = 'brands:desc',
}

export interface AdminListCreatorsOutputDto {
	items: AdminCreatorRowOutputDto[];
	page: number;
	pageSize: number;
	totalItems: number;
}

export interface AdminListMentionsInputDto {
	/**
	 * The brand's mentions: of every branch and of the brand alone
	 * @format uuid
	 */
	brandId?: string;
	matchMethod?: AdminListMentionsInputDtoMatchMethodEnum;
	/** @pattern ^[0-9]{4}-[0-9]{2}$ */
	month?: string;
	/** @min 1 */
	page: number;
	/** @min 1 */
	size: number;
	/** @format uuid */
	venueId?: string;
}

export enum AdminListMentionsInputDtoMatchMethodEnum {
	Exact = 'exact',
	Fuzzy = 'fuzzy',
	Llm = 'llm',
	None = 'none',
	OtherCity = 'other_city',
	Manual = 'manual',
	Ignored = 'ignored',
}

export interface AdminListMentionsOutputDto {
	items: AdminMentionWithPostOutputDto[];
	page: number;
	pageSize: number;
	totalItems: number;
}

export interface AdminListPipelineRunsInputDto {
	/** @format uuid */
	cityId?: string;
	/** @min 1 */
	page: number;
	/** @min 1 */
	size: number;
}

export interface AdminListPipelineRunsOutputDto {
	items: AdminPipelineRunOutputDto[];
	page: number;
	pageSize: number;
	totalItems: number;
}

export interface AdminListPostsInputDto {
	/**
	 * Only posts by this account
	 * @format uuid
	 */
	accountId?: string;
	/**
	 * Only posts that mention this brand, a branch of it or the brand alone.
	 * @format uuid
	 */
	brandId?: string;
	/** @format uuid */
	cityId?: string;
	/**
	 * Only posts by this creator's accounts
	 * @format uuid
	 */
	creatorId?: string;
	/**
	 * Only posts whose caption carries this hashtag (with or without #, any case)
	 * @maxLength 200
	 */
	hashtag?: string;
	/** Only posts with at least one mention matched to a brand. */
	matchedOnly?: boolean;
	/** @pattern ^[0-9]{4}-[0-9]{2}$ */
	month?: string;
	/** @min 1 */
	page: number;
	platform?: AdminListPostsInputDtoPlatformEnum;
	q?: string;
	/** @min 1 */
	size: number;
	sort?: AdminListPostsInputDtoSortEnum;
	/** Only posts with a mention nothing matched (`none`): to link by hand. */
	unmatchedOnly?: boolean;
	/**
	 * Only posts that mention this venue.
	 * @format uuid
	 */
	venueId?: string;
}

export enum AdminListPostsInputDtoPlatformEnum {
	Tiktok = 'tiktok',
	Instagram = 'instagram',
	Blog = 'blog',
}

export enum AdminListPostsInputDtoSortEnum {
	ViewsAsc = 'views:asc',
	ViewsDesc = 'views:desc',
	PostedAtAsc = 'postedAt:asc',
	PostedAtDesc = 'postedAt:desc',
}

export interface AdminListPostsOutputDto {
	items: AdminSocialPostListItemOutputDto[];
	page: number;
	pageSize: number;
	totalItems: number;
}

export interface AdminListProspectsInputDto {
	/** @format uuid */
	brandId?: string;
	/**
	 * Prospects with a branch in this city
	 * @format uuid
	 */
	cityId?: string;
	/** Only those whose follow-up is due by the end of today */
	due?: boolean;
	/** @min 1 */
	page: number;
	/** Part of the brand's name */
	q?: string;
	/** @min 1 */
	size: number;
	sort?: AdminListProspectsInputDtoSortEnum;
	stage?: AdminListProspectsInputDtoStageEnum;
}

export enum AdminListProspectsInputDtoSortEnum {
	CreatedAtAsc = 'createdAt:asc',
	CreatedAtDesc = 'createdAt:desc',
	NameAsc = 'name:asc',
	NameDesc = 'name:desc',
	LeadScoreAsc = 'leadScore:asc',
	LeadScoreDesc = 'leadScore:desc',
	NextFollowUpAtAsc = 'nextFollowUpAt:asc',
	NextFollowUpAtDesc = 'nextFollowUpAt:desc',
	LastTouchAtAsc = 'lastTouchAt:asc',
	LastTouchAtDesc = 'lastTouchAt:desc',
}

export enum AdminListProspectsInputDtoStageEnum {
	TO_CONTACT = 'TO_CONTACT',
	CONTACTED = 'CONTACTED',
	REPLIED = 'REPLIED',
	MEETING = 'MEETING',
	WON = 'WON',
	LOST = 'LOST',
	OPTED_OUT = 'OPTED_OUT',
}

export interface AdminListProspectsOutputDto {
	items: AdminProspectListItemOutputDto[];
	page: number;
	pageSize: number;
	totalItems: number;
}

export interface AdminListReportsInputDto {
	/** @format uuid */
	brandId?: string;
	/**
	 * Reports on this city's branches
	 * @format uuid
	 */
	cityId?: string;
	/**
	 * Reports of this configuration
	 * @format uuid
	 */
	configId?: string;
	/** @pattern ^[0-9]{4}-[0-9]{2}$ */
	month?: string;
	/** @min 1 */
	page: number;
	/** @min 1 */
	size: number;
	sort?: AdminListReportsInputDtoSortEnum;
	/**
	 * Reports made from this template
	 * @format uuid
	 */
	templateId?: string;
}

export enum AdminListReportsInputDtoSortEnum {
	PostCountAsc = 'postCount:asc',
	PostCountDesc = 'postCount:desc',
	ReviewCountAsc = 'reviewCount:asc',
	ReviewCountDesc = 'reviewCount:desc',
	UpdatedAtAsc = 'updatedAt:asc',
	UpdatedAtDesc = 'updatedAt:desc',
	MonthAsc = 'month:asc',
	MonthDesc = 'month:desc',
}

export interface AdminListReportsOutputDto {
	items: AdminReportListItemOutputDto[];
	page: number;
	pageSize: number;
	totalItems: number;
}

export interface AdminListReviewsInputDto {
	/**
	 * Every branch's reviews
	 * @format uuid
	 */
	brandId?: string;
	/**
	 * Branches in this city
	 * @format uuid
	 */
	cityId?: string;
	/**
	 * YYYY-MM
	 * @pattern ^[0-9]{4}-[0-9]{2}$
	 */
	month?: string;
	/** Written, 3 stars or fewer, nobody answered (no owner reply, not marked answered): lowest first */
	needsReply?: boolean;
	/** @min 1 */
	page: number;
	platform?: AdminListReviewsInputDtoPlatformEnum;
	/** @min 1 */
	size: number;
	/**
	 * @min 1
	 * @max 5
	 */
	stars?: number;
	/** @format uuid */
	venueId?: string;
}

export enum AdminListReviewsInputDtoPlatformEnum {
	Google = 'google',
	Tripadvisor = 'tripadvisor',
}

export interface AdminListReviewsOutputDto {
	items: AdminBranchReviewOutputDto[];
	page: number;
	pageSize: number;
	totalItems: number;
}

export interface AdminListSessionsInputDto {
	activeOnly?: boolean;
	/** @min 1 */
	page: number;
	platform?: AdminListSessionsInputDtoPlatformEnum;
	/** @min 1 */
	size: number;
	sort?: AdminListSessionsInputDtoSortEnum;
	userId?: string;
}

export enum AdminListSessionsInputDtoPlatformEnum {
	Web = 'web',
	Android = 'android',
	Ios = 'ios',
}

export enum AdminListSessionsInputDtoSortEnum {
	CreatedAtAsc = 'createdAt:asc',
	CreatedAtDesc = 'createdAt:desc',
	ExpiresAtAsc = 'expiresAt:asc',
	ExpiresAtDesc = 'expiresAt:desc',
	LastSeenAtAsc = 'lastSeenAt:asc',
	LastSeenAtDesc = 'lastSeenAt:desc',
}

export interface AdminListSessionsOutputDto {
	items: AdminSessionOutputDto[];
	page: number;
	pageSize: number;
	totalItems: number;
}

export interface AdminListSuggestedProspectsInputDto {
	/**
	 * How many to list, best first
	 * @min 1
	 * @max 100
	 */
	size?: number;
}

export interface AdminListUsersInputDto {
	isMarkedForDeletion?: boolean;
	/** @min 1 */
	page: number;
	q?: string;
	/** @min 1 */
	size: number;
	sort?: AdminListUsersInputDtoSortEnum;
}

export enum AdminListUsersInputDtoSortEnum {
	CreatedAtAsc = 'createdAt:asc',
	CreatedAtDesc = 'createdAt:desc',
	FirstNameAsc = 'firstName:asc',
	FirstNameDesc = 'firstName:desc',
}

export interface AdminListUsersOutputDto {
	items: AdminUserOutputDto[];
	page: number;
	pageSize: number;
	totalItems: number;
}

export interface AdminListVenueReviewsInputDto {
	/**
	 * YYYY-MM
	 * @pattern ^[0-9]{4}-[0-9]{2}$
	 */
	month?: string;
	/** @min 1 */
	page: number;
	/** @min 1 */
	size: number;
}

export interface AdminListVenueReviewsOutputDto {
	items: AdminReviewOutputDto[];
	page: number;
	pageSize: number;
	totalItems: number;
}

export interface AdminListVenuesInputDto {
	/** @format uuid */
	cityId?: string;
	district?: string;
	/** Only venues at least one social media mention is linked to. */
	mentionedOnly?: boolean;
	/** Only venues that opened (a city-wide scrape first saw them) in the last `LEAD_NEW_PLACE_MONTHS` months. */
	newOnly?: boolean;
	/** @min 1 */
	page: number;
	/** Only venues whose brand scored at or above `LEAD_PROSPECT_SCORE`. */
	prospectsOnly?: boolean;
	q?: string;
	/** @min 1 */
	size: number;
	sort?: AdminListVenuesInputDtoSortEnum;
}

export enum AdminListVenuesInputDtoSortEnum {
	CreatedAtAsc = 'createdAt:asc',
	CreatedAtDesc = 'createdAt:desc',
	NameAsc = 'name:asc',
	NameDesc = 'name:desc',
	MentionCountAsc = 'mentionCount:asc',
	MentionCountDesc = 'mentionCount:desc',
	LeadScoreAsc = 'leadScore:asc',
	LeadScoreDesc = 'leadScore:desc',
	RatingAsc = 'rating:asc',
	RatingDesc = 'rating:desc',
	ReviewsCountAsc = 'reviewsCount:asc',
	ReviewsCountDesc = 'reviewsCount:desc',
}

export interface AdminListVenuesOutputDto {
	items: AdminVenueListItemOutputDto[];
	page: number;
	pageSize: number;
	totalItems: number;
}

export interface AdminLlmBacklogOutputDto {
	doneLast7Days: number;
	tokensLast7Days: number;
	key: string;
	label: string;
	/**
	 * When a run last settled anything
	 * @format date-time
	 */
	lastMovedAt?: string;
	/** The newest day's run */
	lastRun?: AdminBacklogRunOutputDto;
	priority: number;
	/** Absent when counting failed */
	remaining?: number;
}

export interface AdminLlmBacklogsOutputDto {
	/** `LLM_BACKLOG_DAILY_TOKENS`: what a day's runs may spend over every backlog */
	dailyTokens: number;
	items: AdminLlmBacklogOutputDto[];
	/** Reported by today's batches (UTC day) */
	spentToday: number;
}

export interface AdminLogOutreachTouchInputDto {
	/**
	 * When it happened; defaults to now
	 * @format date-time
	 */
	at?: string;
	/** @maxLength 20000 */
	body?: string;
	/**
	 * VISIT or CALL only: when to come back; it becomes the follow-up, over `followUpAt`
	 * @format date-time
	 */
	comeBackAt?: string;
	/** VISIT or CALL only: they said we may e-mail them; sets the prospect's `emailConsentAt` */
	emailConsent?: boolean;
	/**
	 * The next follow-up: a date, `null` for none, absent for the usual gap
	 * @format date-time
	 */
	followUpAt?: string | null;
	kind: AdminLogOutreachTouchInputDtoKindEnum;
	/** VISIT or CALL only: who we got hold of */
	outcome?: AdminLogOutreachTouchInputDtoOutcomeEnum;
	/**
	 * The report it sent: the brand's own
	 * @format uuid
	 */
	reportId?: string;
	/**
	 * The link it sent (`POST /admin/reports/:id/shares`): one of that report's
	 * @format uuid
	 */
	shareId?: string;
	/** @maxLength 500 */
	subject?: string;
	/**
	 * The template it started from
	 * @maxLength 100
	 */
	template?: string;
}

export enum AdminLogOutreachTouchInputDtoKindEnum {
	EMAIL = 'EMAIL',
	DM = 'DM',
	CALL = 'CALL',
	VISIT = 'VISIT',
	REPLY = 'REPLY',
	NOTE = 'NOTE',
	STAGE = 'STAGE',
}

/** VISIT or CALL only: who we got hold of */
export enum AdminLogOutreachTouchInputDtoOutcomeEnum {
	SpokeToOwner = 'spoke_to_owner',
	SpokeToStaff = 'spoke_to_staff',
	Closed = 'closed',
	Nobody = 'nobody',
}

export interface AdminMatchAccountsInputDto {
	/** @format uuid */
	cityId: string;
}

export interface AdminMatchAccountsOutputDto {
	/** Accounts of the city looked at */
	accounts: number;
	/** Linked because the brand's own website links the profile */
	fromSites: number;
	/** Accounts created for handles posts about a brand tagged, named like that brand */
	fromTags: number;
	/** Newly linked to a brand by their handle */
	linked: number;
	/** Suggested because the brand's own website links the profile */
	siteSuggested: number;
	/** Open suggestions after the run */
	suggested: number;
	/** The matcher's earlier links that no longer hold */
	unlinked: number;
	/** Linked because a branch's Google website is the profile */
	websites: number;
}

export interface AdminMentionOutputDto {
	/** The brand it was matched to */
	brand?: {
		id: string;
		name: string;
	};
	city?: string;
	cuisine?: string;
	/** What it says, as feedback rows */
	feedback: FeedbackPointOutputDto[];
	/** The kinds of food it is about (on a post's page): its cuisine's, else its venue's category's */
	foodTopics?: {
		source: AdminMentionOutputDtoSourceEnum;
		topic: {
			key: string;
			label: string;
		};
	}[];
	id: number;
	locationHint?: string;
	matchMethod?: AdminMentionOutputDtoMatchMethodEnum;
	matchNote?: string;
	matchScore?: number;
	sentiment: AdminMentionOutputDtoSentimentEnum;
	summary: string;
	/** The branch, when the post says which; a chain's mention may have the brand only */
	venue?: AdminVenueRefOutputDto;
	venueName: string;
	visited: boolean;
}

export enum AdminMentionOutputDtoMatchMethodEnum {
	Exact = 'exact',
	Fuzzy = 'fuzzy',
	Llm = 'llm',
	None = 'none',
	OtherCity = 'other_city',
	Manual = 'manual',
	Ignored = 'ignored',
}

export enum AdminMentionOutputDtoSentimentEnum {
	Mixed = 'mixed',
	Positive = 'positive',
	Negative = 'negative',
	Neutral = 'neutral',
}

export enum AdminMentionOutputDtoSourceEnum {
	Category = 'category',
	Cuisine = 'cuisine',
}

export interface AdminMentionWithPostOutputDto {
	/** The brand it was matched to */
	brand?: {
		id: string;
		name: string;
	};
	city?: string;
	cuisine?: string;
	/** What it says, as feedback rows */
	feedback: FeedbackPointOutputDto[];
	/** The kinds of food it is about (on a post's page): its cuisine's, else its venue's category's */
	foodTopics?: {
		source: AdminMentionWithPostOutputDtoSourceEnum;
		topic: {
			key: string;
			label: string;
		};
	}[];
	id: number;
	locationHint?: string;
	matchMethod?: AdminMentionWithPostOutputDtoMatchMethodEnum;
	matchNote?: string;
	matchScore?: number;
	/** Construct a type with the properties of T except for those in type K. */
	post: OmitAdminSocialPostListItemOutputDtomentionsfoundByaccount;
	sentiment: AdminMentionWithPostOutputDtoSentimentEnum;
	summary: string;
	/** The branch, when the post says which; a chain's mention may have the brand only */
	venue?: AdminVenueRefOutputDto;
	venueName: string;
	visited: boolean;
}

export enum AdminMentionWithPostOutputDtoMatchMethodEnum {
	Exact = 'exact',
	Fuzzy = 'fuzzy',
	Llm = 'llm',
	None = 'none',
	OtherCity = 'other_city',
	Manual = 'manual',
	Ignored = 'ignored',
}

export enum AdminMentionWithPostOutputDtoSentimentEnum {
	Mixed = 'mixed',
	Positive = 'positive',
	Negative = 'negative',
	Neutral = 'neutral',
}

export enum AdminMentionWithPostOutputDtoSourceEnum {
	Category = 'category',
	Cuisine = 'cuisine',
}

/** Accounts that are this creator's too: they move under it, and creators left empty go. */
export interface AdminMergeCreatorAccountsInputDto {
	/**
	 * @maxItems 20
	 * @minItems 1
	 */
	accountIds: string[];
}

export interface AdminNewsletterCountsInputDto {
	/** @format uuid */
	cityId: string;
}

export interface AdminNewsletterCountsOutputDto {
	confirmed: number;
	pending: number;
	unsubscribed: number;
}

export interface AdminOutreachSummaryOutputDto {
	/** Emails, DMs, calls and visits in the last 7 days */
	outreachLast7Days: number;
	/** Follow-ups due by the end of today */
	due: number;
	stages: {
		count: number;
		stage: AdminOutreachSummaryOutputDtoStageEnum;
	}[];
}

export type AdminOutreachSummaryOutputDtoNullable = {
	/** Emails, DMs, calls and visits in the last 7 days */
	outreachLast7Days: number;
	/** Follow-ups due by the end of today */
	due: number;
	stages: {
		count: number;
		stage: AdminOutreachSummaryOutputDtoNullableStageEnum;
	}[];
} | null;

export enum AdminOutreachSummaryOutputDtoNullableStageEnum {
	TO_CONTACT = 'TO_CONTACT',
	CONTACTED = 'CONTACTED',
	REPLIED = 'REPLIED',
	MEETING = 'MEETING',
	WON = 'WON',
	LOST = 'LOST',
	OPTED_OUT = 'OPTED_OUT',
}

export enum AdminOutreachSummaryOutputDtoStageEnum {
	TO_CONTACT = 'TO_CONTACT',
	CONTACTED = 'CONTACTED',
	REPLIED = 'REPLIED',
	MEETING = 'MEETING',
	WON = 'WON',
	LOST = 'LOST',
	OPTED_OUT = 'OPTED_OUT',
}

export interface AdminOutreachTouchOutputDto {
	/** @format date-time */
	at: string;
	body?: string;
	/**
	 * A visit's or call's: when they said to come back
	 * @format date-time
	 */
	comeBackAt?: string;
	/** @format date-time */
	createdAt: string;
	/** A visit's or call's: they said we may e-mail them */
	emailConsent: boolean;
	id: string;
	kind: AdminOutreachTouchOutputDtoKindEnum;
	/** A visit's or call's: who we got hold of */
	outcome?: AdminOutreachTouchOutputDtoOutcomeEnum;
	/** The report it sent */
	report?: {
		id: string;
		month: string;
	};
	/** The link it sent, with its opens */
	share?: {
		id: string;
		/** @format date-time */
		lastOpenedAt?: string;
		openCount: number;
		/** @format date-time */
		revokedAt?: string;
	};
	stage?: AdminOutreachTouchOutputDtoStageEnum;
	subject?: string;
	template?: string;
}

export enum AdminOutreachTouchOutputDtoKindEnum {
	EMAIL = 'EMAIL',
	DM = 'DM',
	CALL = 'CALL',
	VISIT = 'VISIT',
	REPLY = 'REPLY',
	NOTE = 'NOTE',
	STAGE = 'STAGE',
}

/** A visit's or call's: who we got hold of */
export enum AdminOutreachTouchOutputDtoOutcomeEnum {
	SpokeToOwner = 'spoke_to_owner',
	SpokeToStaff = 'spoke_to_staff',
	Closed = 'closed',
	Nobody = 'nobody',
}

export enum AdminOutreachTouchOutputDtoStageEnum {
	TO_CONTACT = 'TO_CONTACT',
	CONTACTED = 'CONTACTED',
	REPLIED = 'REPLIED',
	MEETING = 'MEETING',
	WON = 'WON',
	LOST = 'LOST',
	OPTED_OUT = 'OPTED_OUT',
}

/**
 * The morning view: did the run work, what did it cost, who to write to today. Every figure is
 * `null` when its query failed, so the page shows "—" instead of a zero.
 */
export interface AdminOverviewOutputDto {
	/** Apify spend this calendar month (UTC) */
	apifyMonthCostUsd: number | null;
	apifyMonthlyCreditUsd: number;
	/** Due by the end of today, the most overdue first */
	dueFollowUps: AdminProspectListItemOutputDto[] | null;
	/** The newest `MONTHLY` run; `null` when there is none (or it failed to load) */
	lastMonthlyRun: AdminPipelineRunOutputDtoNullable;
	/** The newest run of any step, for when the monthly one is old or missing */
	lastRun: AdminPipelineRunOutputDtoNullable;
	/**
	 * When the cron queues the next monthly run
	 * @format date-time
	 */
	nextMonthlyRunAt: string;
	outreach: AdminOutreachSummaryOutputDtoNullable;
	/** The month the reports cover now: the one that just ended */
	reportMonth: string;
	/** Reports built for `reportMonth` */
	reportsBuilt: number | null;
	/** The best lead scores not on the outreach list yet */
	suggestedProspects: AdminSuggestedProspectOutputDto[] | null;
	/** Mentions no venue fits yet (match method `none`) */
	unmatchedMentions: number | null;
}

export interface AdminPipelineRunOutputDto {
	/** A city as a filter or a select offers it. */
	city: AdminCityRefOutputDto;
	/** @format date-time */
	createdAt: string;
	error?: string;
	/** @format date-time */
	finishedAt?: string;
	id: string;
	month: string;
	params?: {
		budgetUsd?: number;
		onlyMissing?: boolean;
		since?: string;
		top?: number;
	};
	/** Construct a type with a set of properties K of type T */
	result?: Recordstringunknown;
	/** How often a backend restart cut it short and it went on where it stopped */
	resumes: number;
	/** @format date-time */
	startedAt?: string;
	status: AdminPipelineRunOutputDtoStatusEnum;
	step: AdminPipelineRunOutputDtoStepEnum;
}

export type AdminPipelineRunOutputDtoNullable = {
	/** A city as a filter or a select offers it. */
	city: AdminCityRefOutputDto;
	/** @format date-time */
	createdAt: string;
	error?: string;
	/** @format date-time */
	finishedAt?: string;
	id: string;
	month: string;
	params?: {
		budgetUsd?: number;
		onlyMissing?: boolean;
		since?: string;
		top?: number;
	};
	/** Construct a type with a set of properties K of type T */
	result?: Recordstringunknown;
	/** How often a backend restart cut it short and it went on where it stopped */
	resumes: number;
	/** @format date-time */
	startedAt?: string;
	status: AdminPipelineRunOutputDtoNullableStatusEnum;
	step: AdminPipelineRunOutputDtoNullableStepEnum;
} | null;

export enum AdminPipelineRunOutputDtoNullableStatusEnum {
	QUEUED = 'QUEUED',
	RUNNING = 'RUNNING',
	SUCCEEDED = 'SUCCEEDED',
	FAILED = 'FAILED',
}

export enum AdminPipelineRunOutputDtoNullableStepEnum {
	SCRAPE_VENUES = 'SCRAPE_VENUES',
	SEARCH_BRANCHES = 'SEARCH_BRANCHES',
	SYNC_OSM_PLACES = 'SYNC_OSM_PLACES',
	LOOKUP_OSM_PLACES = 'LOOKUP_OSM_PLACES',
	SCRAPE_TIKTOK = 'SCRAPE_TIKTOK',
	SCRAPE_TIKTOK_RECENT = 'SCRAPE_TIKTOK_RECENT',
	SCRAPE_INSTAGRAM = 'SCRAPE_INSTAGRAM',
	SCRAPE_INSTAGRAM_RECENT = 'SCRAPE_INSTAGRAM_RECENT',
	SCRAPE_INSTAGRAM_REELS = 'SCRAPE_INSTAGRAM_REELS',
	SCRAPE_BLOGS = 'SCRAPE_BLOGS',
	EXTRACT_MENTIONS = 'EXTRACT_MENTIONS',
	MATCH_MENTIONS = 'MATCH_MENTIONS',
	LOOKUP_VENUES = 'LOOKUP_VENUES',
	SCRAPE_VENUE_SOCIAL = 'SCRAPE_VENUE_SOCIAL',
	FILL_COMPETITORS = 'FILL_COMPETITORS',
	SCRAPE_REVIEWS = 'SCRAPE_REVIEWS',
	ANALYSE_REVIEWS = 'ANALYSE_REVIEWS',
	REFRESH_VENUE_DETAILS = 'REFRESH_VENUE_DETAILS',
	SCRAPE_ACCOUNTS = 'SCRAPE_ACCOUNTS',
	SCRAPE_ACCOUNTS_RECENT = 'SCRAPE_ACCOUNTS_RECENT',
	FILL_ACCOUNT_FOLLOWERS = 'FILL_ACCOUNT_FOLLOWERS',
	FIND_OWN_ACCOUNTS = 'FIND_OWN_ACCOUNTS',
	SCRAPE_COMMENTS = 'SCRAPE_COMMENTS',
	ANALYSE_COMMENTS = 'ANALYSE_COMMENTS',
	SCRAPE_PRESS = 'SCRAPE_PRESS',
	TRACK_SEARCH_RANKS = 'TRACK_SEARCH_RANKS',
	TRACK_DISH_SEARCHES = 'TRACK_DISH_SEARCHES',
	SEARCH_INTEREST = 'SEARCH_INTEREST',
	BUILD_REPORTS = 'BUILD_REPORTS',
	SCORE_LEADS = 'SCORE_LEADS',
	WATCH_REVIEWS = 'WATCH_REVIEWS',
	SAMPLE_BUSYNESS = 'SAMPLE_BUSYNESS',
	SAMPLE_RESERVATIONS = 'SAMPLE_RESERVATIONS',
	SNAPSHOT_RATINGS = 'SNAPSHOT_RATINGS',
	SCRAPE_DELIVERY = 'SCRAPE_DELIVERY',
	REFRESH_POST_COUNTS = 'REFRESH_POST_COUNTS',
	MONTHLY = 'MONTHLY',
}

export enum AdminPipelineRunOutputDtoStatusEnum {
	QUEUED = 'QUEUED',
	RUNNING = 'RUNNING',
	SUCCEEDED = 'SUCCEEDED',
	FAILED = 'FAILED',
}

export enum AdminPipelineRunOutputDtoStepEnum {
	SCRAPE_VENUES = 'SCRAPE_VENUES',
	SEARCH_BRANCHES = 'SEARCH_BRANCHES',
	SYNC_OSM_PLACES = 'SYNC_OSM_PLACES',
	LOOKUP_OSM_PLACES = 'LOOKUP_OSM_PLACES',
	SCRAPE_TIKTOK = 'SCRAPE_TIKTOK',
	SCRAPE_TIKTOK_RECENT = 'SCRAPE_TIKTOK_RECENT',
	SCRAPE_INSTAGRAM = 'SCRAPE_INSTAGRAM',
	SCRAPE_INSTAGRAM_RECENT = 'SCRAPE_INSTAGRAM_RECENT',
	SCRAPE_INSTAGRAM_REELS = 'SCRAPE_INSTAGRAM_REELS',
	SCRAPE_BLOGS = 'SCRAPE_BLOGS',
	EXTRACT_MENTIONS = 'EXTRACT_MENTIONS',
	MATCH_MENTIONS = 'MATCH_MENTIONS',
	LOOKUP_VENUES = 'LOOKUP_VENUES',
	SCRAPE_VENUE_SOCIAL = 'SCRAPE_VENUE_SOCIAL',
	FILL_COMPETITORS = 'FILL_COMPETITORS',
	SCRAPE_REVIEWS = 'SCRAPE_REVIEWS',
	ANALYSE_REVIEWS = 'ANALYSE_REVIEWS',
	REFRESH_VENUE_DETAILS = 'REFRESH_VENUE_DETAILS',
	SCRAPE_ACCOUNTS = 'SCRAPE_ACCOUNTS',
	SCRAPE_ACCOUNTS_RECENT = 'SCRAPE_ACCOUNTS_RECENT',
	FILL_ACCOUNT_FOLLOWERS = 'FILL_ACCOUNT_FOLLOWERS',
	FIND_OWN_ACCOUNTS = 'FIND_OWN_ACCOUNTS',
	SCRAPE_COMMENTS = 'SCRAPE_COMMENTS',
	ANALYSE_COMMENTS = 'ANALYSE_COMMENTS',
	SCRAPE_PRESS = 'SCRAPE_PRESS',
	TRACK_SEARCH_RANKS = 'TRACK_SEARCH_RANKS',
	TRACK_DISH_SEARCHES = 'TRACK_DISH_SEARCHES',
	SEARCH_INTEREST = 'SEARCH_INTEREST',
	BUILD_REPORTS = 'BUILD_REPORTS',
	SCORE_LEADS = 'SCORE_LEADS',
	WATCH_REVIEWS = 'WATCH_REVIEWS',
	SAMPLE_BUSYNESS = 'SAMPLE_BUSYNESS',
	SAMPLE_RESERVATIONS = 'SAMPLE_RESERVATIONS',
	SNAPSHOT_RATINGS = 'SNAPSHOT_RATINGS',
	SCRAPE_DELIVERY = 'SCRAPE_DELIVERY',
	REFRESH_POST_COUNTS = 'REFRESH_POST_COUNTS',
	MONTHLY = 'MONTHLY',
}

/** Someone who may open the brand's portal. */
export interface AdminPortalMemberOutputDto {
	/**
	 * Their first sign-in after the invite; absent while it is open
	 * @format date-time
	 */
	acceptedAt?: string;
	/** @format date-time */
	createdAt: string;
	id: string;
	role: AdminPortalMemberOutputDtoRoleEnum;
	user: {
		email?: string;
		firstName: string;
		id: string;
		lastName: string;
	};
}

export enum AdminPortalMemberOutputDtoRoleEnum {
	OWNER = 'OWNER',
	STAFF = 'STAFF',
}

/** Who posted it: the account, its creator, and the brand when it is a brand's own. */
export interface AdminPostAccountOutputDto {
	brand?: {
		id: string;
		name: string;
	};
	creator: {
		id: string;
		name: string;
	};
	handle: string;
	id: string;
}

/** A comment under a post, as stored: no author. */
export interface AdminPostCommentOutputDto {
	commentedAt?: string;
	externalId: string;
	id: string;
	/** Absent until the comment analysis ran */
	intent?: AdminPostCommentOutputDtoIntentEnum;
	language?: string;
	likes: number;
	question?: string;
	questionTopic?: AdminPostCommentOutputDtoQuestionTopicEnum;
	replies: number;
	text: string;
}

/** Absent until the comment analysis ran */
export enum AdminPostCommentOutputDtoIntentEnum {
	Intent = 'intent',
	Confirmation = 'confirmation',
	Disagreement = 'disagreement',
	Question = 'question',
	Tag = 'tag',
	Other = 'other',
}

export enum AdminPostCommentOutputDtoQuestionTopicEnum {
	Location = 'location',
	Price = 'price',
	Hours = 'hours',
	Menu = 'menu',
	Dietary = 'dietary',
	Payment = 'payment',
	Reservation = 'reservation',
	Other = 'other',
}

/** A post's scraped comments, most liked first. */
export interface AdminPostCommentsOutputDto {
	comments: AdminPostCommentOutputDto[];
	/** What the disagreeing comments say, in one line */
	disagreement?: string;
	/** Absent when its comments were never scraped */
	scrapedAt?: string;
}

/** One find of a post (`PostSource`). */
export interface AdminPostFindOutputDto {
	/** @format date-time */
	foundAt: string;
	kind: AdminPostFindOutputDtoKindEnum;
	/** The city source it is, when it is one */
	source?: {
		enabled: boolean;
		id: string;
	};
	/** The tag, query, blog URL or venue name the scrape looked for */
	value: string;
	/** The venue a venue search or place page was for */
	venue?: AdminVenueRefOutputDto;
}

export enum AdminPostFindOutputDtoKindEnum {
	TiktokHashtag = 'tiktok_hashtag',
	TiktokSearch = 'tiktok_search',
	InstagramHashtag = 'instagram_hashtag',
	Blog = 'blog',
	VenueSearch = 'venue_search',
	VenuePlace = 'venue_place',
	TiktokAccount = 'tiktok_account',
	InstagramAccount = 'instagram_account',
}

export interface AdminPostHashtagOutputDto {
	hashtag: AdminHashtagOutputDto;
}

/** One read of a post's counts: a scrape that found it, or the refresh at seven days. */
export interface AdminPostSnapshotOutputDto {
	/** @format date-time */
	at: string;
	comments: number;
	id: string;
	likes: number;
	saves: number;
	shares: number;
	views: number;
}

/** The business a prospect is. */
export interface AdminProspectBrandOutputDto {
	/** Its open branches */
	branches: number;
	id: string;
	/** 0–100, how good a prospect it is; absent until scored */
	leadScore?: number;
	name: string;
}

export interface AdminProspectListItemOutputDto {
	/** The business a prospect is. */
	brand: AdminProspectBrandOutputDto;
	contactEmail?: string;
	contactName?: string;
	/** @format date-time */
	createdAt: string;
	/**
	 * When they said we may e-mail them (UWG §7); absent until a visit or call logged it
	 * @format date-time
	 */
	emailConsentAt?: string;
	hook?: string;
	id: string;
	instagram?: string;
	language: AdminProspectListItemOutputDtoLanguageEnum;
	/** @format date-time */
	lastTouchAt?: string;
	/** @format date-time */
	nextFollowUpAt?: string;
	notes?: string;
	outreachCount: number;
	stage: AdminProspectListItemOutputDtoStageEnum;
	/** @format date-time */
	updatedAt: string;
	/** Its most reviewed open branch; absent when every branch closed */
	venue?: AdminProspectVenueOutputDto;
}

export enum AdminProspectListItemOutputDtoLanguageEnum {
	En = 'en',
	De = 'de',
}

export enum AdminProspectListItemOutputDtoStageEnum {
	TO_CONTACT = 'TO_CONTACT',
	CONTACTED = 'CONTACTED',
	REPLIED = 'REPLIED',
	MEETING = 'MEETING',
	WON = 'WON',
	LOST = 'LOST',
	OPTED_OUT = 'OPTED_OUT',
}

export interface AdminProspectOutputDto {
	/** The business a prospect is. */
	brand: AdminProspectBrandOutputDto;
	/** The city of `venue` (`City.name`): the templates' {city} */
	city?: string;
	contactEmail?: string;
	contactName?: string;
	/** @format date-time */
	createdAt: string;
	/**
	 * When they said we may e-mail them (UWG §7); absent until a visit or call logged it
	 * @format date-time
	 */
	emailConsentAt?: string;
	hook?: string;
	id: string;
	instagram?: string;
	language: AdminProspectOutputDtoLanguageEnum;
	/** @format date-time */
	lastTouchAt?: string;
	/** The brand's newest report, cut down to what an outreach email quotes. */
	latestReport?: AdminProspectReportOutputDto;
	/** @format date-time */
	nextFollowUpAt?: string;
	notes?: string;
	outreachCount: number;
	/** Who has the brand's portal, invited first first */
	portalMembers: AdminPortalMemberOutputDto[];
	stage: AdminProspectOutputDtoStageEnum;
	/** Newest first */
	touches: AdminOutreachTouchOutputDto[];
	/** @format date-time */
	updatedAt: string;
	/** Its most reviewed open branch; absent when every branch closed */
	venue?: AdminProspectVenueOutputDto;
}

export enum AdminProspectOutputDtoLanguageEnum {
	En = 'en',
	De = 'de',
}

export enum AdminProspectOutputDtoStageEnum {
	TO_CONTACT = 'TO_CONTACT',
	CONTACTED = 'CONTACTED',
	REPLIED = 'REPLIED',
	MEETING = 'MEETING',
	WON = 'WON',
	LOST = 'LOST',
	OPTED_OUT = 'OPTED_OUT',
}

/** The brand's newest report, cut down to what an outreach email quotes. */
export interface AdminProspectReportOutputDto {
	avgStars?: number;
	creators: number;
	headline: string;
	id: string;
	month: string;
	/** The brand's own accounts, from its own posts */
	ownAccounts: {
		handle: string;
		platform: AdminProspectReportOutputDtoPlatformEnum;
	}[];
	/** Posts by others, the creators behind them and their views */
	posts: number;
	replyRate?: number;
	/** Google reviews that month */
	reviews: number;
	title: string;
	views: number;
}

export enum AdminProspectReportOutputDtoPlatformEnum {
	Instagram = 'instagram',
	Tiktok = 'tiktok',
}

/** A brand's branch as outreach shows it: the address, website and phone to reach it by. */
export interface AdminProspectVenueOutputDto {
	category?: string;
	district?: string;
	googleUrl?: string;
	id: string;
	name: string;
	phone?: string;
	rating?: number;
	reviewsCount?: number;
	street?: string;
	website?: string;
}

export interface AdminRecheckDishLinksOutputDto {
	/** Dish-only rows the links had dropped, back */
	dishOnlyRows: number;
	/** Points sent back to the `feedback-dish-links` backlog */
	points: number;
	/** Points the backlog now has to look at */
	remaining: number;
}

export interface AdminReflagOpeningsInputDto {
	/**
	 * Only posts extracted before this moment (before the flag existed)
	 * @format date-time
	 */
	analysedBefore?: string;
	/**
	 * Only this city's posts
	 * @format uuid
	 */
	cityId?: string;
	/**
	 * At most this many posts a call; 100 by default
	 * @min 1
	 * @max 500
	 */
	limit?: number;
	/**
	 * The month the posts were posted in, `YYYY-MM`
	 * @pattern ^\d{4}-\d{2}$
	 */
	month: string;
	/**
	 * Skip this many posts of the scope, most viewed first: the previous call's `nextOffset`
	 * @min 0
	 */
	offset?: number;
	/**
	 * Only posts with a mention flagged now: after a wording change that can only take flags away,
	 * re-reading those is enough
	 */
	onlyFlagged?: boolean;
}

export interface AdminReflagOpeningsOutputDto {
	/** Mentions that were flagged and the re-read cleared */
	cleared: number;
	/** Posts whose call failed (left as they were) */
	failed: number;
	/** Mentions set as a new opening this call */
	flaggedMentions: number;
	/** Posts holding at least one of them */
	flaggedPosts: number;
	/** The `offset` for the next call */
	nextOffset: number;
	/** Posts the agent read this call */
	read: number;
	/** Posts of the scope after `nextOffset` */
	remaining: number;
	/** Tokens the calls used */
	tokens: number;
	/** Stored mentions the agent's answer named no venue for (left as they were) */
	unpaired: number;
}

export interface AdminRelinkFoodTopicsOutputDto {
	queued: boolean;
}

export interface AdminReportConfigOutputDto {
	brandId: string;
	/** @format date-time */
	createdAt: string;
	id: string;
	name: string;
	sections: ReportSectionDto[];
	/** Inactive: not built until switched back on */
	status: AdminReportConfigOutputDtoStatusEnum;
	/** The template it was copied from; absent for a custom one or once that template is deleted */
	template?: {
		id: string;
		name: string;
	};
	/** @format date-time */
	updatedAt: string;
}

/** Inactive: not built until switched back on */
export enum AdminReportConfigOutputDtoStatusEnum {
	Active = 'active',
	Inactive = 'inactive',
}

export interface AdminReportListItemOutputDto {
	/** The business it is on */
	brand: {
		id: string;
		name: string;
	};
	/** The city its branches are in; absent for a report across all the brand's cities */
	city?: {
		id: string;
		name: string;
		slug: string;
	};
	/** The brand's configuration it was built for; absent for a default report or once deleted */
	config?: {
		id: string;
		name: string;
	};
	/** @format date-time */
	createdAt: string;
	headline: string;
	id: string;
	month: string;
	/** Its configuration's (or the default template's) name at the build */
	name: string;
	postCount: number;
	reviewCount: number;
	/**
	 * When it was last e-mailed to the brand
	 * @format date-time
	 */
	sentAt?: string;
	/** The template behind it; absent for a custom configuration or once the template is deleted */
	template?: {
		id: string;
		name: string;
	};
	/** @format date-time */
	updatedAt: string;
}

/** Its configuration and template are named on the admin's routes only (not on the portal or a shared link). */
export interface AdminReportOutputDto {
	/** What moved, and why it might have, with the admin's trace; absent for reports built before it */
	analysis?: ReportAnalysis;
	/** The business it is on */
	brand: {
		id: string;
		name: string;
	};
	/** The city its branches are in; absent for a report across all the brand's cities */
	city?: {
		id: string;
		name: string;
		slug: string;
	};
	/** The brand's configuration it was built for; absent for a default report or once deleted */
	config?: {
		id: string;
		name: string;
	};
	/** @format date-time */
	createdAt: string;
	/**
	 * Everything a monthly report shows, computed once when it is built. The brand's figures (posts,
	 * reviews, dishes, creators, competitors, own accounts, comments, press, correlations) cover
	 * every branch in `branches`; each place figure is in its branch's entry.
	 */
	data: ReportData;
	highlights: ReportHighlights;
	id: string;
	month: string;
	/** Its configuration's (or the default template's) name at the build */
	name: string;
	postCount: number;
	reviewCount: number;
	/** What it shows, in order: its type's sections as they were at the build */
	sections: ReportSectionDto[];
	/**
	 * When it was last e-mailed to the brand
	 * @format date-time
	 */
	sentAt?: string;
	/** The template behind it; absent for a custom configuration or once the template is deleted */
	template?: {
		id: string;
		name: string;
	};
	/** @format date-time */
	updatedAt: string;
}

/** A private link to a report, as the admin report page lists it. */
export interface AdminReportShareOutputDto {
	/** @format date-time */
	createdAt: string;
	createdBy?: {
		firstName: string;
		id: string;
		lastName: string;
	};
	id: string;
	/** @format date-time */
	lastOpenedAt?: string;
	/** Opens in a browser by someone who is not an admin */
	openCount: number;
	/**
	 * Set once the link is turned off; it then answers 404
	 * @format date-time
	 */
	revokedAt?: string;
	token: string;
	/** The page the link opens, `<app>/r/<token>` */
	url: string;
}

export interface AdminReportTemplateOutputDto {
	/** Brands with a configuration copied from it */
	brands: number;
	/** @format date-time */
	createdAt: string;
	description?: string;
	id: string;
	/** What brands without an active configuration get */
	isDefault: boolean;
	name: string;
	sections: ReportSectionDto[];
	/** @format date-time */
	updatedAt: string;
}

export interface AdminReviewOutputDto {
	/** @format date-time */
	analysedAt?: string;
	/** What it says, as feedback rows (none before it is analysed) */
	feedback: FeedbackPointOutputDto[];
	id: string;
	language?: string;
	likes: number;
	ownerResponse?: string;
	/** @format date-time */
	ownerResponseAt?: string;
	/** @format date-time */
	publishedAt: string;
	reviewId: string;
	sentiment?: AdminReviewOutputDtoSentimentEnum;
	stars?: number;
	text?: string;
	textTranslated?: string;
}

export enum AdminReviewOutputDtoSentimentEnum {
	Mixed = 'mixed',
	Positive = 'positive',
	Negative = 'negative',
	Neutral = 'neutral',
}

export interface AdminRunLlmBacklogsOutputDto {
	queued: boolean;
}

export interface AdminSearchBrandInputDto {
	/** @format uuid */
	cityId: string;
}

export interface AdminSearchInterestOutputDto {
	brands: AdminSearchInterestRowOutputDto[];
	geo: string;
	month: string;
	months: string[];
	topics: AdminSearchInterestRowOutputDto[];
}

export interface AdminSearchInterestRowOutputDto {
	brandId?: string;
	/** Google's 0–100 per month, oldest first; null where it has too little data */
	interest: (number | null)[];
	kind: AdminSearchInterestRowOutputDtoKindEnum;
	label: string;
	mentionChange?: number | null;
	/** Topics: share of the city's matched mentions with a topic that name it or a child of it, per month, percent */
	mentionShare?: (number | null)[];
	/** Google's related queries over the twelve months ending with the month; absent without them */
	related?: AdminSearchRelatedQueriesOutputDto;
	/** The month against the one before: 0.4 = up 40 % */
	searchChange: number | null;
	/** The topic's key or the venue name searched */
	term: string;
	/** Topics: the kind of food it is */
	topicKind?: AdminSearchInterestRowOutputDtoTopicKindEnum;
}

export enum AdminSearchInterestRowOutputDtoKindEnum {
	Topic = 'topic',
	Brand = 'brand',
}

/** Topics: the kind of food it is */
export enum AdminSearchInterestRowOutputDtoTopicKindEnum {
	Cuisine = 'cuisine',
	Dish = 'dish',
	Drink = 'drink',
	Diet = 'diet',
	Format = 'format',
	Meal = 'meal',
}

export interface AdminSearchRelatedQueriesOutputDto {
	/** Grown most against the twelve months before */
	rising: AdminSearchRelatedQueryOutputDto[];
	/** Most searched alongside the term, in Google's order */
	top: AdminSearchRelatedQueryOutputDto[];
}

export interface AdminSearchRelatedQueryOutputDto {
	/** Rising past +5,000 % */
	breakout?: boolean;
	query: string;
	/** Top: 0–100 against the most searched one. Rising: percent growth (250 = +250 %) */
	value: number;
}

export interface AdminSessionOutputDto {
	/** @format date-time */
	createdAt: string;
	/** @format date-time */
	expiresAt: string;
	id: string;
	/** @format date-time */
	lastSeenAt?: string | null;
	platform?: AdminSessionOutputDtoPlatformEnum;
	user?: AdminSessionOutputDtoUser;
	visitorInfo: {
		browser?: UAParserIBrowser;
		countryCode?: string;
		cpu?: UAParserICPU;
		device?: UAParserIDevice;
		engine?: UAParserIEngine;
		ip?: string;
		os?: UAParserIOS;
		ua?: string;
		userAgent?: string;
	};
}

export enum AdminSessionOutputDtoPlatformEnum {
	Web = 'web',
	Android = 'android',
	Ios = 'ios',
}

export interface AdminSessionOutputDtoUser {
	acceptedCallCommunications?: boolean;
	acceptedEmailCommunications?: boolean;
	acceptedMarketing?: boolean;
	acceptedSmsCommunications?: boolean;
	/** @format date-time */
	createdAt: string;
	email?: string | null;
	/** @format date-time */
	emailVerifiedAt?: string | null;
	firstName: string;
	id: string;
	isMarkedForDeletion?: boolean;
	lastName: string;
	markedForDeletionAt?: string | null | boolean | null;
	mobileNumber?: string | null;
	/** @format date-time */
	mobileNumberVerifiedAt?: string | null;
	/** @format date-time */
	passwordLastChangedAt?: string | null;
	profileImage?: ImageOutputDto;
	roles: AdminSessionOutputDtoUserRolesEnum[];
	/** @format date-time */
	updatedAt: string;
}

export enum AdminSessionOutputDtoUserRolesEnum {
	System = 'system',
	Admin = 'admin',
	Promoter = 'promoter',
	User = 'user',
	VenueOwner = 'venue_owner',
}

export interface AdminSocialPostListItemOutputDto {
	/** Who posted it: the account, its creator, and the brand when it is a brand's own. */
	account?: AdminPostAccountOutputDto;
	/** @format date-time */
	analysedAt?: string;
	author?: string;
	authorFans?: number;
	comments: number;
	externalId: string;
	/** Every source that found it, the first find first */
	foundBy: AdminPostFindOutputDto[];
	id: string;
	isAd: boolean;
	isPromotional?: boolean;
	likes: number;
	locationName?: string;
	mentions: AdminMentionOutputDto[];
	platform: AdminSocialPostListItemOutputDtoPlatformEnum;
	/** @format date-time */
	postedAt: string;
	saves: number;
	shares: number;
	text?: string;
	url: string;
	views: number;
}

export enum AdminSocialPostListItemOutputDtoPlatformEnum {
	Tiktok = 'tiktok',
	Instagram = 'instagram',
	Blog = 'blog',
}

export interface AdminSocialPostOutputDto {
	/** Who posted it: the account, its creator, and the brand when it is a brand's own. */
	account?: AdminPostAccountOutputDto;
	/** @format date-time */
	analysedAt?: string;
	analysisTokens?: number;
	author?: string;
	authorFans?: number;
	/** The city whose scrape found it */
	city: AdminCityRefOutputDto;
	comments: number;
	/**
	 * When the counts shown were read; absent for a blog article
	 * @format date-time
	 */
	countsAt?: string;
	/**
	 * When they became final: read at seven days or later (or the post was found gone)
	 * @format date-time
	 */
	countsFinalAt?: string;
	/** @format date-time */
	createdAt: string;
	externalId: string;
	/** Every source that found it, the first find first */
	foundBy: AdminPostFindOutputDto[];
	/** The caption's hashtags, in its order, with the food topic or brand each names */
	hashtagLinks: AdminPostHashtagOutputDto[];
	id: string;
	isAd: boolean;
	isPromotional?: boolean;
	likes: number;
	locationName?: string;
	mentions: AdminMentionOutputDto[];
	platform: AdminSocialPostOutputDtoPlatformEnum;
	/** @format date-time */
	postedAt: string;
	saves: number;
	shares: number;
	/** Every read of its counts, oldest first, also those after they became final */
	snapshots: AdminPostSnapshotOutputDto[];
	subtitles?: string;
	subtitlesLanguage?: string;
	taggedHandles?: string[];
	text?: string;
	url: string;
	views: number;
}

export enum AdminSocialPostOutputDtoPlatformEnum {
	Tiktok = 'tiktok',
	Instagram = 'instagram',
	Blog = 'blog',
}

/** The creator an account was split into. */
export interface AdminSplitAccountOutputDto {
	creatorId: string;
}

export interface AdminStartPipelineRunInputDto {
	/**
	 * Apify spending cap for the step, in USD. Ignored by the monthly run, which uses each step's default.
	 * @min 0
	 * @max 100
	 */
	budgetUsd?: number;
	/** @format uuid */
	cityId: string;
	/** @pattern ^[0-9]{4}-[0-9]{2}$ */
	month: string;
	/** `MONTHLY` only: skip the paid steps that already succeeded for the month */
	onlyMissing?: boolean;
	/**
	 * `SCRAPE_REVIEWS` only: scrape from this day instead of the month's first (a backfill)
	 * @pattern ^[0-9]{4}-[0-9]{2}-[0-9]{2}$
	 */
	since?: string;
	step: AdminStartPipelineRunInputDtoStepEnum;
	/**
	 * How many of the month's most talked-about venues the step covers; the city's default otherwise.
	 * @min 1
	 * @max 200
	 */
	top?: number;
}

export enum AdminStartPipelineRunInputDtoStepEnum {
	SCRAPE_VENUES = 'SCRAPE_VENUES',
	SEARCH_BRANCHES = 'SEARCH_BRANCHES',
	SYNC_OSM_PLACES = 'SYNC_OSM_PLACES',
	LOOKUP_OSM_PLACES = 'LOOKUP_OSM_PLACES',
	SCRAPE_TIKTOK = 'SCRAPE_TIKTOK',
	SCRAPE_TIKTOK_RECENT = 'SCRAPE_TIKTOK_RECENT',
	SCRAPE_INSTAGRAM = 'SCRAPE_INSTAGRAM',
	SCRAPE_INSTAGRAM_RECENT = 'SCRAPE_INSTAGRAM_RECENT',
	SCRAPE_INSTAGRAM_REELS = 'SCRAPE_INSTAGRAM_REELS',
	SCRAPE_BLOGS = 'SCRAPE_BLOGS',
	EXTRACT_MENTIONS = 'EXTRACT_MENTIONS',
	MATCH_MENTIONS = 'MATCH_MENTIONS',
	LOOKUP_VENUES = 'LOOKUP_VENUES',
	SCRAPE_VENUE_SOCIAL = 'SCRAPE_VENUE_SOCIAL',
	FILL_COMPETITORS = 'FILL_COMPETITORS',
	SCRAPE_REVIEWS = 'SCRAPE_REVIEWS',
	ANALYSE_REVIEWS = 'ANALYSE_REVIEWS',
	REFRESH_VENUE_DETAILS = 'REFRESH_VENUE_DETAILS',
	SCRAPE_ACCOUNTS = 'SCRAPE_ACCOUNTS',
	SCRAPE_ACCOUNTS_RECENT = 'SCRAPE_ACCOUNTS_RECENT',
	FILL_ACCOUNT_FOLLOWERS = 'FILL_ACCOUNT_FOLLOWERS',
	FIND_OWN_ACCOUNTS = 'FIND_OWN_ACCOUNTS',
	SCRAPE_COMMENTS = 'SCRAPE_COMMENTS',
	ANALYSE_COMMENTS = 'ANALYSE_COMMENTS',
	SCRAPE_PRESS = 'SCRAPE_PRESS',
	TRACK_SEARCH_RANKS = 'TRACK_SEARCH_RANKS',
	TRACK_DISH_SEARCHES = 'TRACK_DISH_SEARCHES',
	SEARCH_INTEREST = 'SEARCH_INTEREST',
	BUILD_REPORTS = 'BUILD_REPORTS',
	SCORE_LEADS = 'SCORE_LEADS',
	WATCH_REVIEWS = 'WATCH_REVIEWS',
	SAMPLE_BUSYNESS = 'SAMPLE_BUSYNESS',
	SAMPLE_RESERVATIONS = 'SAMPLE_RESERVATIONS',
	SNAPSHOT_RATINGS = 'SNAPSHOT_RATINGS',
	SCRAPE_DELIVERY = 'SCRAPE_DELIVERY',
	REFRESH_POST_COUNTS = 'REFRESH_POST_COUNTS',
	MONTHLY = 'MONTHLY',
}

export interface AdminSuggestCitySourcesInputDto {
	/**
	 * What the city eats, for the searches, e.g. "known for döner, Vietnamese, brunch"
	 * @maxLength 1000
	 */
	cuisineNotes?: string;
}

export interface AdminSuggestCitySourcesOutputDto {
	/** The suggestions added, disabled */
	items: AdminCitySourceOutputDto[];
	/** Suggestions the city already had */
	skipped: number;
}

/** A district as the venue scrape suggests it. */
export interface AdminSuggestedDistrictOutputDto {
	isNew: boolean;
	name: string;
	neighbours: string[];
	postalCodes: string[];
	venues: number;
}

/** A brand with a high lead score that is not a prospect yet; the place figures are its most reviewed open branch's. */
export interface AdminSuggestedProspectOutputDto {
	/** Its open branches */
	branches: number;
	category?: string;
	city?: string;
	district?: string;
	/** The brand's */
	id: string;
	leadScore: number;
	/** Why it scores as it does */
	leadSignals?: LeadSignals;
	name: string;
	rating?: number;
	reviewsCount?: number;
	website?: string;
}

export interface AdminThemeAmountOutputDto {
	max: number;
	median: number;
	min: number;
	/** Reviews and posts stating one; a source stating two keeps its largest */
	sources: number;
	/** Minutes for a wait, euro for a price */
	unit: AdminThemeAmountOutputDtoUnitEnum;
}

/** Minutes for a wait, euro for a price */
export enum AdminThemeAmountOutputDtoUnitEnum {
	Minutes = 'minutes',
	Money = 'money',
}

export interface AdminThemeBrandOutputDto {
	id: string;
	name: string;
	/** Its reviews and posts raising the theme */
	sources: number;
}

export interface AdminThemeCoverageOutputDto {
	postBrands: number;
	/** Posts by others with any point about a matched venue */
	posts: number;
	/** The brands those reviews are of (reviews are scraped for report venues and their competitors) */
	reviewBrands: number;
	/** Written reviews of the month with any praise or complaint point */
	reviews: number;
	unfiledPosts: number;
	/** Of those, the ones with a point not filed under a theme yet: counted under no theme */
	unfiledReviews: number;
}

export interface AdminThemeCurrentOutputDto {
	/** Brands it came up at */
	brands: number;
	/** YYYY-MM */
	month: string;
	/** Of the month's posts by others with any point, percent */
	postShare: number | null;
	postShareChange: number | null;
	posts: number;
	/** Of the month's written reviews with any point (any row, changes included, for `changes`), percent */
	reviewShare: number | null;
	/** Against the month before, in percentage points */
	reviewShareChange: number | null;
	reviews: number;
}

/** One theme, praised or criticised, in the city and month. */
export interface AdminThemeDishOutputDto {
	/** The food topic's key, for its page */
	foodTopic?: string;
	/** `topic:<key>` or `dish:<key>` */
	key: string;
	label: string;
	/** Of the reviews and posts with a point of this side about it, percent */
	share: number;
	/** Reviews and posts raising the theme about it */
	sources: number;
}

/** One kind of food in the month. */
export interface AdminThemeFoodCoverageOutputDto {
	brands: number;
	key: string;
	label: string;
	/** Posts by others about its brands with any point */
	posts: number;
	/** Its brands' written reviews with any point */
	reviews: number;
}

export interface AdminThemeFoodOutputDto {
	key: string;
	/** "Döner & kebab" */
	label: string;
	/** Of its brands' reviews and posts with any point this month, percent */
	share: number;
	/** Reviews and posts of its brands raising the theme */
	sources: number;
}

export interface AdminThemeInsightOutputDto {
	/** The numbers its points state, per unit */
	amounts: AdminThemeAmountOutputDto[];
	/** The ten brands it came up at most */
	brands: AdminThemeBrandOutputDto[];
	/** The side this month: the whole month's, whatever the filters */
	current: AdminThemeCurrentOutputDto;
	/** The ten dishes its points were about most: a food topic's dishes as one */
	dishes: AdminThemePageDishOutputDto[];
	/** The five kinds of food it came up at most, each a share of its brands' sources with any point */
	foods: AdminThemeFoodOutputDto[];
	/** What the theme covers, as the agents are told */
	hint: string;
	key: AdminThemeInsightOutputDtoKeyEnum;
	/** "Price increase" */
	label: string;
	month: string;
	/** The side over the six months up to the month, oldest first */
	months: AdminThemeMonthOutputDto[];
	/** The month's sentences of the side, filtered, newest first, one page */
	points: AdminThemePointOutputDto[];
	/** The month the changes are against */
	previous: string;
	side: AdminThemeInsightOutputDtoSideEnum;
	/** Each side's reviews and posts this month */
	sides: AdminThemeSideCountOutputDto[];
	topic: AdminThemeInsightOutputDtoTopicEnum;
	/** Sentences matching the filters */
	total: number;
	/** The reviews and posts they come from */
	totalSources: number;
}

export enum AdminThemeInsightOutputDtoKeyEnum {
	Language = 'language',
	Taste = 'taste',
	Other = 'other',
	Freshness = 'freshness',
	Temperature = 'temperature',
	Cooking = 'cooking',
	Seasoning = 'seasoning',
	PortionSize = 'portion_size',
	IngredientQuality = 'ingredient_quality',
	MenuVariety = 'menu_variety',
	Availability = 'availability',
	QualityChange = 'quality_change',
	Authenticity = 'authenticity',
	Presentation = 'presentation',
	FoodOther = 'food_other',
	DrinkQuality = 'drink_quality',
	DrinkSelection = 'drink_selection',
	DrinksOther = 'drinks_other',
	Friendliness = 'friendliness',
	Attentiveness = 'attentiveness',
	SpeedOfService = 'speed_of_service',
	OrderAccuracy = 'order_accuracy',
	Advice = 'advice',
	ReservationHandling = 'reservation_handling',
	ComplaintHandling = 'complaint_handling',
	TakeawayHandling = 'takeaway_handling',
	StaffChange = 'staff_change',
	ServiceOther = 'service_other',
	Atmosphere = 'atmosphere',
	Noise = 'noise',
	Space = 'space',
	Interior = 'interior',
	OutdoorSeating = 'outdoor_seating',
	Crowding = 'crowding',
	Location = 'location',
	FamilyPets = 'family_pets',
	VibeOther = 'vibe_other',
	PriceLevel = 'price_level',
	ValueForMoney = 'value_for_money',
	PriceIncrease = 'price_increase',
	ExtraCharges = 'extra_charges',
	PriceOther = 'price_other',
	CashOnly = 'cash_only',
	CardPayment = 'card_payment',
	Tipping = 'tipping',
	Billing = 'billing',
	PaymentOther = 'payment_other',
	Queue = 'queue',
	WaitForFood = 'wait_for_food',
	WaitForTable = 'wait_for_table',
	WaitOther = 'wait_other',
	Toilets = 'toilets',
	DiningArea = 'dining_area',
	FoodHygiene = 'food_hygiene',
	CleanlinessOther = 'cleanliness_other',
	OpeningHours = 'opening_hours',
	Accessibility = 'accessibility',
	OwnershipChange = 'ownership_change',
	Renovation = 'renovation',
	DeliveryPlatform = 'delivery_platform',
	Amenities = 'amenities',
}

export enum AdminThemeInsightOutputDtoSideEnum {
	Praise = 'praise',
	Complaints = 'complaints',
	Changes = 'changes',
}

export enum AdminThemeInsightOutputDtoTopicEnum {
	Food = 'food',
	Drinks = 'drinks',
	Service = 'service',
	Vibe = 'vibe',
	Price = 'price',
	Payment = 'payment',
	Wait = 'wait',
	Cleanliness = 'cleanliness',
	Other = 'other',
}

export interface AdminThemeInsightRowOutputDto {
	/** The five dishes its points were about most: a food topic's dishes as one */
	dishes: AdminThemeDishOutputDto[];
	/** The three kinds of food it came up at most */
	foods: AdminThemeFoodOutputDto[];
	key: AdminThemeInsightRowOutputDtoKeyEnum;
	/** "Price increase" */
	label: string;
	/** Of the month's posts by others with any point, percent */
	postShare: number | null;
	postShareChange: number | null;
	/** Posts by others raising it */
	posts: number;
	/** Of the month's written reviews with any point, percent */
	reviewShare: number | null;
	/** Against the month before, in percentage points */
	reviewShareChange: number | null;
	/** Written reviews raising it */
	reviews: number;
	/** Up to five distinct details, newest first */
	samples: string[];
	/** The three it came up at most */
	topBrands: AdminThemeBrandOutputDto[];
	topic: AdminThemeInsightRowOutputDtoTopicEnum;
	/** Brands it came up at */
	venues: number;
}

export enum AdminThemeInsightRowOutputDtoKeyEnum {
	Language = 'language',
	Taste = 'taste',
	Other = 'other',
	Freshness = 'freshness',
	Temperature = 'temperature',
	Cooking = 'cooking',
	Seasoning = 'seasoning',
	PortionSize = 'portion_size',
	IngredientQuality = 'ingredient_quality',
	MenuVariety = 'menu_variety',
	Availability = 'availability',
	QualityChange = 'quality_change',
	Authenticity = 'authenticity',
	Presentation = 'presentation',
	FoodOther = 'food_other',
	DrinkQuality = 'drink_quality',
	DrinkSelection = 'drink_selection',
	DrinksOther = 'drinks_other',
	Friendliness = 'friendliness',
	Attentiveness = 'attentiveness',
	SpeedOfService = 'speed_of_service',
	OrderAccuracy = 'order_accuracy',
	Advice = 'advice',
	ReservationHandling = 'reservation_handling',
	ComplaintHandling = 'complaint_handling',
	TakeawayHandling = 'takeaway_handling',
	StaffChange = 'staff_change',
	ServiceOther = 'service_other',
	Atmosphere = 'atmosphere',
	Noise = 'noise',
	Space = 'space',
	Interior = 'interior',
	OutdoorSeating = 'outdoor_seating',
	Crowding = 'crowding',
	Location = 'location',
	FamilyPets = 'family_pets',
	VibeOther = 'vibe_other',
	PriceLevel = 'price_level',
	ValueForMoney = 'value_for_money',
	PriceIncrease = 'price_increase',
	ExtraCharges = 'extra_charges',
	PriceOther = 'price_other',
	CashOnly = 'cash_only',
	CardPayment = 'card_payment',
	Tipping = 'tipping',
	Billing = 'billing',
	PaymentOther = 'payment_other',
	Queue = 'queue',
	WaitForFood = 'wait_for_food',
	WaitForTable = 'wait_for_table',
	WaitOther = 'wait_other',
	Toilets = 'toilets',
	DiningArea = 'dining_area',
	FoodHygiene = 'food_hygiene',
	CleanlinessOther = 'cleanliness_other',
	OpeningHours = 'opening_hours',
	Accessibility = 'accessibility',
	OwnershipChange = 'ownership_change',
	Renovation = 'renovation',
	DeliveryPlatform = 'delivery_platform',
	Amenities = 'amenities',
}

export enum AdminThemeInsightRowOutputDtoTopicEnum {
	Food = 'food',
	Drinks = 'drinks',
	Service = 'service',
	Vibe = 'vibe',
	Price = 'price',
	Payment = 'payment',
	Wait = 'wait',
	Cleanliness = 'cleanliness',
	Other = 'other',
}

export interface AdminThemeInsightsOutputDto {
	complaints: AdminThemeInsightRowOutputDto[];
	coverage: AdminThemeCoverageOutputDto;
	/** The kind of food the counts are narrowed to, null for every brand */
	food: {
		key: string;
		label: string;
	} | null;
	/** The month's kinds of food, the most reviews and posts first, whatever `food` is */
	foods: AdminThemeFoodCoverageOutputDto[];
	month: string;
	praise: AdminThemeInsightRowOutputDto[];
	/** The month the changes are against */
	previous: string;
}

export interface AdminThemeMonthOutputDto {
	/** YYYY-MM */
	month: string;
	/** Of the month's posts by others with any point, percent */
	postShare: number | null;
	posts: number;
	/** Of the month's written reviews with any point (any row, changes included, for `changes`), percent */
	reviewShare: number | null;
	reviews: number;
}

export interface AdminThemePageDishOutputDto {
	/** The food topic's key, for its page */
	foodTopic?: string;
	/** `topic:<key>` or `dish:<key>`: what `dish=` takes */
	key: string;
	label: string;
	/** Reviews and posts of the side about it */
	sources: number;
}

/** One sentence filed under the theme, with the review or post it came from. */
export interface AdminThemePointOutputDto {
	/** The number it states */
	amount?: number;
	/**
	 * When the review was published or the post posted
	 * @format date-time
	 */
	at: string;
	/** A post's author handle */
	author?: string;
	brand: {
		id: string;
		name: string;
	};
	/** The phrase, in English */
	detail: string;
	/** The dish or drink it is about, as the source names it */
	dish?: string;
	foodTopic?: {
		key: string;
		label: string;
	};
	/** The feedback row's id */
	id: string;
	kind: AdminThemePointOutputDtoKindEnum;
	postPlatform?: AdminThemePointOutputDtoPostPlatformEnum;
	reviewPlatform?: AdminThemePointOutputDtoReviewPlatformEnum;
	sentiment: AdminThemePointOutputDtoSentimentEnum;
	/** The review's or the post's id (a post's page is `/admin/posts/<id>`) */
	sourceId: string;
	/** A review's stars */
	stars?: number;
	/** What the post says about the brand */
	summary?: string;
	/** A review's text (translated when it was), cut at 400 characters */
	text?: string;
	unit?: AdminThemePointOutputDtoUnitEnum;
	/** The branch: a review's place, a post's when it named one */
	venue?: {
		id: string;
		name: string;
	};
}

export enum AdminThemePointOutputDtoKindEnum {
	Post = 'post',
	Review = 'review',
}

export enum AdminThemePointOutputDtoPostPlatformEnum {
	Tiktok = 'tiktok',
	Instagram = 'instagram',
	Blog = 'blog',
}

export enum AdminThemePointOutputDtoReviewPlatformEnum {
	Google = 'google',
	Tripadvisor = 'tripadvisor',
}

export enum AdminThemePointOutputDtoSentimentEnum {
	Mixed = 'mixed',
	Positive = 'positive',
	Negative = 'negative',
	Neutral = 'neutral',
}

export enum AdminThemePointOutputDtoUnitEnum {
	Minutes = 'minutes',
	Money = 'money',
}

export interface AdminThemeSideCountOutputDto {
	/** Posts by others likewise */
	posts: number;
	/** Written reviews of the month with a point of this side filed under the theme */
	reviews: number;
	side: AdminThemeSideCountOutputDtoSideEnum;
}

export enum AdminThemeSideCountOutputDtoSideEnum {
	Praise = 'praise',
	Complaints = 'complaints',
	Changes = 'changes',
}

export interface AdminTodayOutputDto {
	reportMonth: string;
	todos: AdminTodoOutputDto[];
	/** Of the report month and the month in progress */
	unmatchedPosts: AdminUnmatchedPostOutputDto[];
}

/**
 * Something waiting on an admin, and the page where it is handled. `urgent`: a customer or a
 * reply is waiting; `todo`: our own work; `info`: worth a look.
 */
export interface AdminTodoOutputDto {
	/** What to click: "Open", "Fix", "Send" */
	cta: string;
	href: string;
	key: string;
	/** One line, numbers included */
	text: string;
	tone: AdminTodoOutputDtoToneEnum;
}

export enum AdminTodoOutputDtoToneEnum {
	Info = 'info',
	Urgent = 'urgent',
	Todo = 'todo',
}

export interface AdminTopicInsightOutputDto {
	aliases: string[];
	children: AdminTopicInsightRowOutputDto[];
	id: string;
	/**
	 * The month's delivery menus (scraped for report venues and their competitors only, so they
	 * lean to those): `menus` venues have one; the rest is absent when none has the topic
	 */
	menu: AdminTopicMenuOutputDto;
	months: string[];
	parent?: {
		key: string;
		label: string;
	};
	postsByMonth: number[];
	/** Google's related searches over the twelve months; absent when the pull had none */
	related?: AdminSearchRelatedQueriesOutputDto;
	row: AdminTopicInsightRowOutputDto;
	shareByMonth: (number | null)[];
	trendsQuery?: string;
	trendsTopicId?: string;
	venues: AdminTopicVenueOutputDto[];
}

export interface AdminTopicInsightRowOutputDto {
	/** Topics directly under it */
	children: number;
	key: string;
	kind: AdminTopicInsightRowOutputDtoKindEnum;
	label: string;
	parentKey?: string;
	/** The month's posts by others naming it or a child */
	posts: number;
	/** Of those, the ones it (or a child) is the main food of */
	primaryVenues: number;
	/** This month's searches against last month's: 0.4 = up 40 % */
	searchChange: number | null;
	/** Google's 0–100 per month, oldest first; null: too little data or not pulled */
	searches: (number | null)[];
	/** Their share of the month's posts with a kind of food, percent */
	share: number | null;
	/** Against the month before, in percentage points */
	shareChange: number | null;
	/** Open food venues tagged with it or a child of it */
	venues: number;
}

export enum AdminTopicInsightRowOutputDtoKindEnum {
	Cuisine = 'cuisine',
	Dish = 'dish',
	Drink = 'drink',
	Diet = 'diet',
	Format = 'format',
	Meal = 'meal',
}

export interface AdminTopicInsightsOutputDto {
	month: string;
	months: string[];
	topics: AdminTopicInsightRowOutputDto[];
}

export interface AdminTopicMenuOutputDto {
	p25?: number;
	p75?: number;
	/** Districts with 5+ such venues */
	districts?: {
		district: string;
		median: number;
		venues: number;
	}[];
	items?: number;
	/** Median and quartiles of those venues' own median price for it */
	median?: number;
	/** Open venues of the city with a menu stored for the month */
	menus: number;
	/** Of those, the ones with the topic (or a child) on it */
	venues?: number;
}

export interface AdminTopicVenueOutputDto {
	category?: string;
	district?: string;
	id: string;
	name: string;
	/** The month's posts about it by others */
	posts: number;
	/** The topic (or the child) is its main food */
	primary: boolean;
	rating?: number;
	reviewsCount?: number;
	/** What gives the tag: its Google categories, its posts, its menu, Google's review tags, or an admin */
	source: AdminTopicVenueOutputDtoSourceEnum;
	/** The tag that puts it under the topic: the topic's key or a child's */
	viaKey: string;
	viaLabel: string;
}

/** What gives the tag: its Google categories, its posts, its menu, Google's review tags, or an admin */
export enum AdminTopicVenueOutputDtoSourceEnum {
	Mentions = 'mentions',
	Category = 'category',
	Menu = 'menu',
	Reviews = 'reviews',
	Manual = 'manual',
}

export interface AdminTrendsLookupInputDto {
	/**
	 * @minLength 2
	 * @maxLength 80
	 */
	q: string;
}

export interface AdminTrendsLookupOutputDto {
	topics: AdminTrendsTopicOutputDto[];
}

export interface AdminTrendsOutputDto {
	/** By share of views (reach); `count` is posts */
	creators: TrendShareRow[];
	/** By share of mentions; `viewsShare` by share of views */
	cuisines: TrendShareRow[];
	/** By share of the posts and reviews naming a dish */
	dishes: TrendShareRow[];
	/** By share of mentions; `viewsShare` by share of views */
	districts: TrendShareRow[];
	month: string;
	prevTotals: CityTrendsTotals;
	previousMonth: string;
	risingBrands: TrendRisingBrandRow[];
	totals: CityTrendsTotals;
}

/** One of Google Trends' suggestions for a search: an id to search instead of the words. */
export interface AdminTrendsTopicOutputDto {
	/** "/m/07_19" */
	id: string;
	/** "Vietnamese cuisine" */
	title: string;
	/** What Google calls it: "Cuisine", "Dish", "Topic", "Restaurant chain"… */
	type: string;
}

export interface AdminUnmappedCuisineOutputDto {
	/** Venues the word was said of (posts) or is the Google category of, most first */
	examples: string[];
	key: string;
	mentions: number;
	venues: number;
}

/** A post naming a place no venue matched yet, the most viewed first. */
export interface AdminUnmatchedPostOutputDto {
	author?: string;
	/** The name the post used */
	name: string;
	platform: AdminUnmatchedPostOutputDtoPlatformEnum;
	postId: string;
	/** @format date-time */
	postedAt: string;
	views: number;
}

export enum AdminUnmatchedPostOutputDtoPlatformEnum {
	Tiktok = 'tiktok',
	Instagram = 'instagram',
	Blog = 'blog',
}

export interface AdminUpdateBrandAccountInputDto {
	/**
	 * The branch it belongs to; `null` for the whole brand
	 * @format uuid
	 */
	branchId: string | null;
}

export interface AdminUpdateBrandInputDto {
	/**
	 * @minLength 1
	 * @maxLength 120
	 */
	name?: string;
	/** One report per city, or one across all its cities */
	reportScope?: AdminUpdateBrandInputDtoReportScopeEnum;
}

/** One report per city, or one across all its cities */
export enum AdminUpdateBrandInputDtoReportScopeEnum {
	City = 'city',
	All = 'all',
}

export interface AdminUpdateCityEventInputDto {
	/** @pattern ^\d{4}-\d{2}-\d{2}$ */
	endDate?: string;
	kind?: AdminUpdateCityEventInputDtoKindEnum;
	/**
	 * @minLength 1
	 * @maxLength 120
	 */
	name?: string;
	/** @pattern ^\d{4}-\d{2}-\d{2}$ */
	startDate?: string;
}

export enum AdminUpdateCityEventInputDtoKindEnum {
	SchoolHoliday = 'school_holiday',
	Event = 'event',
}

export interface AdminUpdateCityInputDto {
	active?: boolean;
	aliases?: string[];
	chainDenyList?: string[];
	/**
	 * ISO 3166-1 alpha-2, e.g. DE
	 * @pattern ^[A-Z]{2}$
	 */
	country?: string;
	cronEnabled?: boolean;
	/**
	 * Days between two dish-search snapshots (every dish × district); 0 turns them off
	 * @min 0
	 * @max 365
	 */
	dishSearchEveryDays?: number;
	districts?: AdminCityDistrictInputDto[];
	/** Creators who asked to be left out of public pages (handles, with or without */
	doNotListCreators?: string[];
	/** Venues who asked to be left out of public pages (names) */
	doNotListVenues?: string[];
	instagramEnabled?: boolean;
	/**
	 * ISO 639-1, e.g. de: the reports' and outreach's language
	 * @pattern ^[a-z]{2}$
	 */
	language?: string;
	/**
	 * @min -90
	 * @max 90
	 */
	lat?: number | null;
	/**
	 * @min -180
	 * @max 180
	 */
	lng?: number | null;
	/**
	 * Google Maps location, e.g. "Berlin, Germany"
	 * @minLength 1
	 * @maxLength 200
	 */
	locationQuery?: string;
	/**
	 * @minLength 1
	 * @maxLength 100
	 */
	name?: string;
	nameStopwords?: string[];
	/**
	 * The city's boundary on OpenStreetMap, a relation id (Berlin: 62422): the OSM place checklist
	 * @min 1
	 */
	osmRelationId?: number | null;
	/**
	 * ISO 3166-2 subdivision, e.g. DE-BE: regional holidays and the Google Trends region
	 * @pattern ^[A-Z]{2}-[A-Z0-9]{1,3}$
	 */
	region?: string | null;
	/**
	 * @maxLength 60
	 * @pattern ^[a-z0-9]+(-[a-z0-9]+)*$
	 */
	slug?: string;
	/** Make all properties in T optional */
	stepBudgetsUsd?: PartialRecordPipelineStepEnumnumberMinimum0Maximum100;
	/**
	 * TikTok search region, ISO-2
	 * @pattern ^[A-Z]{2}$
	 */
	tiktokRegion?: string;
	/**
	 * IANA time zone, e.g. Europe/Berlin
	 * @minLength 1
	 * @maxLength 60
	 */
	timezone?: string;
	/**
	 * @min 1
	 * @max 200
	 */
	topBrands?: number;
}

export interface AdminUpdateCitySourceInputDto {
	enabled?: boolean;
	/** @maxLength 500 */
	note?: string | null;
}

export interface AdminUpdateCreatorInputDto {
	/**
	 * @minLength 1
	 * @maxLength 200
	 */
	name: string;
}

/** A topic key, null for "no topic", or `auto: true` to hand the name back to the name match and the agent */
export interface AdminUpdateDishNameInputDto {
	auto?: boolean;
	/** @maxLength 64 */
	topicKey?: string | null;
}

/** Only the fields given change; null clears a parent, a Trends id or a query. The key never changes. */
export interface AdminUpdateFoodTopicInputDto {
	/** @maxItems 100 */
	aliases?: string[];
	kind?: AdminUpdateFoodTopicInputDtoKindEnum;
	/**
	 * @minLength 1
	 * @maxLength 80
	 */
	label?: string;
	parentKey?: string | null;
	/** @maxLength 100 */
	trendsQuery?: string | null;
	/** @pattern ^/(m|g)/[0-9A-Za-z_]+$ */
	trendsTopicId?: string | null;
}

export enum AdminUpdateFoodTopicInputDtoKindEnum {
	Cuisine = 'cuisine',
	Dish = 'dish',
	Drink = 'drink',
	Diet = 'diet',
	Format = 'format',
	Meal = 'meal',
}

export interface AdminUpdateHashtagInputDto {
	/** Noise (#fyp, #viral): never suggested as a source */
	ignored: boolean;
}

/** An admin's correction of a mention's brand and venue. */
export interface AdminUpdateMentionInputDto {
	/**
	 * With no `venueId`: the brand it means, no branch known (a chain named without a branch).
	 * @format uuid
	 */
	brandId?: string | null;
	/** Not a venue at all: no venue, never matched again. */
	ignored?: boolean;
	/**
	 * Why, for whoever looks at it next.
	 * @maxLength 500
	 */
	note?: string;
	/**
	 * The venue it means (and so its brand); null unlinks it, unless `brandId` is given.
	 * @format uuid
	 */
	venueId: string | null;
}

export interface AdminUpdateProspectInputDto {
	/** @format email */
	contactEmail?: string | null;
	/** @maxLength 200 */
	contactName?: string | null;
	/**
	 * When they said we may e-mail them; `null` takes it back
	 * @format date-time
	 */
	emailConsentAt?: string | null;
	/** @maxLength 2000 */
	hook?: string | null;
	/**
	 * A handle, `@handle` or a profile URL
	 * @maxLength 300
	 */
	instagram?: string | null;
	language?: AdminUpdateProspectInputDtoLanguageEnum;
	/** @format date-time */
	nextFollowUpAt?: string | null;
	/** @maxLength 10000 */
	notes?: string | null;
	stage?: AdminUpdateProspectInputDtoStageEnum;
}

export enum AdminUpdateProspectInputDtoLanguageEnum {
	En = 'en',
	De = 'de',
}

export enum AdminUpdateProspectInputDtoStageEnum {
	TO_CONTACT = 'TO_CONTACT',
	CONTACTED = 'CONTACTED',
	REPLIED = 'REPLIED',
	MEETING = 'MEETING',
	WON = 'WON',
	LOST = 'LOST',
	OPTED_OUT = 'OPTED_OUT',
}

export interface AdminUpdateReportConfigInputDto {
	/**
	 * @minLength 1
	 * @maxLength 80
	 */
	name?: string;
	/**
	 * The cover first, each kind once
	 * @minItems 1
	 */
	sections?: ReportSectionDto[];
	status?: AdminUpdateReportConfigInputDtoStatusEnum;
}

export enum AdminUpdateReportConfigInputDtoStatusEnum {
	Active = 'active',
	Inactive = 'inactive',
}

export interface AdminUpdateReportTemplateInputDto {
	/** @maxLength 400 */
	description?: string | null;
	/**
	 * @minLength 1
	 * @maxLength 80
	 */
	name?: string;
	/**
	 * The cover first, each kind once
	 * @minItems 1
	 */
	sections?: ReportSectionDto[];
}

export interface AdminUpdateUserRolesInputDto {
	/** Anything outside `ASSIGNABLE_USER_ROLES` is rejected — `system` above all. */
	roles: AdminUpdateUserRolesInputDtoRolesEnum[];
}

export enum AdminUpdateUserRolesInputDtoRolesEnum {
	Admin = 'admin',
	Promoter = 'promoter',
	User = 'user',
}

/** What an admin edits on a venue; an absent field is left as it is. */
export interface AdminUpdateVenueInputDto {
	/**
	 * Its TheFork, OpenTable or Google booking page, sampled before Google's reservation link; null clears it
	 * @maxLength 500
	 */
	bookingUrl?: string | null;
}

export interface AdminUpdatedDishNameOutputDto {
	decidedBy?: AdminUpdatedDishNameOutputDtoDecidedByEnum;
	foodTopic?: {
		key: string;
		label: string;
	};
	id: number;
	key: string;
	name: string;
	suggestion?: string;
}

export enum AdminUpdatedDishNameOutputDtoDecidedByEnum {
	Match = 'match',
	Admin = 'admin',
	Ai = 'ai',
}

export interface AdminUserOutputDto {
	acceptedCallCommunications?: boolean;
	acceptedEmailCommunications?: boolean;
	acceptedMarketing?: boolean;
	acceptedSmsCommunications?: boolean;
	/** @format date-time */
	createdAt: string;
	email?: string | null;
	/** @format date-time */
	emailVerifiedAt?: string | null;
	firstName: string;
	id: string;
	isMarkedForDeletion?: boolean;
	lastName: string;
	markedForDeletionAt?: string | null | boolean | null;
	mobileNumber?: string | null;
	/** @format date-time */
	mobileNumberVerifiedAt?: string | null;
	/** @format date-time */
	passwordLastChangedAt?: string | null;
	profileImage?: ImageOutputDto;
	roles: AdminUserOutputDtoRolesEnum[];
	/** @format date-time */
	updatedAt: string;
	verificationRequests?: PartialOmitCredentialVerificationRequestuser[];
}

export enum AdminUserOutputDtoRolesEnum {
	System = 'system',
	Admin = 'admin',
	Promoter = 'promoter',
	User = 'user',
	VenueOwner = 'venue_owner',
}

/** The venue page's brand: what the lead score panel and the brand panel show. */
export interface AdminVenueBrandOutputDto {
	/** All its branches, closed ones too: more than one makes it a chain */
	branches: number;
	id: string;
	leadScore?: number;
	/** How we scored it as an outreach prospect */
	leadSignals?: LeadSignals;
	name: string;
	/** One report per city, or one across all its cities */
	reportScope: AdminVenueBrandOutputDtoReportScopeEnum;
}

/** One report per city, or one across all its cities */
export enum AdminVenueBrandOutputDtoReportScopeEnum {
	City = 'city',
	All = 'all',
}

/** One twice-weekly sample of Google popular times. */
export interface AdminVenueBusynessSampleOutputDto {
	/** Mean of the week's ten busiest hours, 0–100 */
	busynessIndex?: number;
	/** Absent when Google showed no popular times that day */
	histogram?: PartialRecordPopularTimesDayArrayPopularTimesHour;
	id: number;
	livePercent?: number;
	liveText?: string;
	/** @format date-time */
	sampledAt: string;
}

export interface AdminVenueDeliveryListingOutputDto {
	currency?: string;
	deliveryFee?: number;
	/** @format date-time */
	fetchedAt: string;
	id: string;
	menuItems: number;
	/** The latest month with a stored menu, and how many dishes it has */
	menuMonth?: string;
	minOrder?: number;
	platform: AdminVenueDeliveryListingOutputDtoPlatformEnum;
	rating?: number;
	reviewsCount?: number;
	url: string;
}

export enum AdminVenueDeliveryListingOutputDtoPlatformEnum {
	Wolt = 'wolt',
	Lieferando = 'lieferando',
}

/** What the demand samples and delivery scrapes stored for a venue, newest first. */
export interface AdminVenueDemandOutputDto {
	busyness: AdminVenueBusynessSampleOutputDto[];
	delivery: AdminVenueDeliveryListingOutputDto[];
	reservations: AdminVenueReservationSampleOutputDto[];
}

/** One dish search a venue was in the top ten of. */
export interface AdminVenueDishSearchOutputDto {
	district: string;
	/** One per snapshot the search ran in, newest first; `rank` absent when it was not in the top ten */
	ranks: {
		rank?: number;
		searchedOn: string;
	}[];
	topicKey: string;
	topicLabel: string;
}

/** A venue's places on the dish searches of its city. */
export interface AdminVenueDishSearchesOutputDto {
	searches: AdminVenueDishSearchOutputDto[];
	/** Its city's latest snapshots (`YYYY-MM-DD`), newest first (six at most) */
	snapshots: string[];
}

export interface AdminVenueFoodTopicOutputDto {
	key: string;
	kind: AdminVenueFoodTopicOutputDtoKindEnum;
	label: string;
	/** The one kind of food it is known for */
	primary: boolean;
	/** 1 for its main category or an admin's tag, 0.5 for another category, else its share of the posts, menu items or review tags */
	score: number;
	/** What gives it: its Google categories, its posts, its menu, Google's review tags, or an admin */
	source: AdminVenueFoodTopicOutputDtoSourceEnum;
}

export enum AdminVenueFoodTopicOutputDtoKindEnum {
	Cuisine = 'cuisine',
	Dish = 'dish',
	Drink = 'drink',
	Diet = 'diet',
	Format = 'format',
	Meal = 'meal',
}

/** What gives it: its Google categories, its posts, its menu, Google's review tags, or an admin */
export enum AdminVenueFoodTopicOutputDtoSourceEnum {
	Mentions = 'mentions',
	Category = 'category',
	Menu = 'menu',
	Reviews = 'reviews',
	Manual = 'manual',
}

export interface AdminVenueFoodTopicsOutputDto {
	/** Topics an admin keeps off it */
	excluded: {
		key: string;
		label: string;
	}[];
	tags: AdminVenueFoodTopicOutputDto[];
}

export interface AdminVenueListItemOutputDto {
	/** The brand it is a branch of: its lead score is the brand's */
	brand: AdminBrandRefOutputDto;
	category?: string;
	closed: boolean;
	district?: string;
	/** Its website's icon; absent until found */
	favicon?: ImageOutputDto;
	id: string;
	mentionCount: number;
	name: string;
	placeId: string;
	rating?: number;
	reviewsCount?: number;
	street?: string;
}

export interface AdminVenueOutputDto {
	/** Its booking page (TheFork, OpenTable or Google's), set by hand; open tables are sampled from it first */
	bookingUrl?: string;
	/** The venue page's brand: what the lead score panel and the brand panel show. */
	brand: AdminVenueBrandOutputDto;
	categories?: string[];
	category?: string;
	/** The city whose pipeline covers it */
	city: AdminCityRefOutputDto;
	closed: boolean;
	/** @format date-time */
	createdAt: string;
	/** Hours, amenities, popular times, "people also search"; absent fields are unknown */
	details?: VenueDetails;
	/** @format date-time */
	detailsAt?: string;
	district?: string;
	/** Its website's icon; absent until found */
	favicon?: ImageOutputDto;
	/**
	 * When the website's icon was last looked for, found or not
	 * @format date-time
	 */
	faviconCheckedAt?: string;
	googleUrl?: string;
	id: string;
	lat?: number;
	lng?: number;
	/** Google's own city or locality field */
	locality?: string;
	mentionCount: number;
	name: string;
	phone?: string;
	placeId: string;
	postalCode?: string;
	priceLevel?: string;
	rating?: number;
	/** The platform behind its Google booking page ("OpenTable"), from the latest Google sample */
	reservationPartner?: string;
	reviewsCount?: number;
	snapshots: AdminVenueSnapshotOutputDto[];
	street?: string;
	/** @format date-time */
	updatedAt: string;
	website?: string;
}

export interface AdminVenueRefOutputDto {
	district?: string;
	id: string;
	name: string;
}

/** Open evening slots on a booking platform for one date. */
export interface AdminVenueReservationSampleOutputDto {
	forDate: string;
	id: number;
	partySize?: number;
	platform: AdminVenueReservationSampleOutputDtoPlatformEnum;
	/** @format date-time */
	sampledAt: string;
	slotsAsked: number;
	slotsOpen: number;
}

export enum AdminVenueReservationSampleOutputDtoPlatformEnum {
	Thefork = 'thefork',
	Opentable = 'opentable',
	Google = 'google',
}

export interface AdminVenueSearchRankOutputDto {
	id: string;
	/** `YYYY-MM` */
	month: string;
	query: string;
	/** Absent when the venue was not among the results */
	rank?: number;
	results: number;
	/** @format date-time */
	searchedAt: string;
	top: VenueSearchRankEntry[];
}

export interface AdminVenueSnapshotOutputDto {
	rating?: number;
	reviewsCount?: number;
	snapshotDate: string;
}

export interface AdminVenueStatusChangesOutputDto {
	/** By the venue's main food topic (`VenueFoodTopicService.tags`), else its Google category */
	byCategory: VenueStatusGroup[];
	byDistrict: VenueStatusGroup[];
	/** Newest first; an opening a post flagged carries the source `posts` */
	changes: VenueStatusChangeRow[];
	/** First and last month of the window, `YYYY-MM` */
	from: string;
	to: string;
	/** Changes counted per kind. */
	totals: VenueStatusCounts;
}

export interface AdminWaitComplaintsInputDto {
	/** @format uuid */
	cityId: string;
	/** @pattern ^[0-9]{4}-[0-9]{2}$ */
	month: string;
}

export interface AdminWaitComplaintsOutputDto {
	brands: number;
	byTheme: {
		brands: number;
		sources: number;
		theme: AdminWaitComplaintsOutputDtoThemeEnum;
		venues: number;
	}[];
	month: string;
	posts: number;
	reviews: number;
	sources: number;
	stated: {
		complaints: number;
		max?: number;
		median?: number;
		of: number;
		upperQuartile?: number;
	};
	venues: number;
}

export enum AdminWaitComplaintsOutputDtoThemeEnum {
	Language = 'language',
	Taste = 'taste',
	Other = 'other',
	Freshness = 'freshness',
	Temperature = 'temperature',
	Cooking = 'cooking',
	Seasoning = 'seasoning',
	PortionSize = 'portion_size',
	IngredientQuality = 'ingredient_quality',
	MenuVariety = 'menu_variety',
	Availability = 'availability',
	QualityChange = 'quality_change',
	Authenticity = 'authenticity',
	Presentation = 'presentation',
	FoodOther = 'food_other',
	DrinkQuality = 'drink_quality',
	DrinkSelection = 'drink_selection',
	DrinksOther = 'drinks_other',
	Friendliness = 'friendliness',
	Attentiveness = 'attentiveness',
	SpeedOfService = 'speed_of_service',
	OrderAccuracy = 'order_accuracy',
	Advice = 'advice',
	ReservationHandling = 'reservation_handling',
	ComplaintHandling = 'complaint_handling',
	TakeawayHandling = 'takeaway_handling',
	StaffChange = 'staff_change',
	ServiceOther = 'service_other',
	Atmosphere = 'atmosphere',
	Noise = 'noise',
	Space = 'space',
	Interior = 'interior',
	OutdoorSeating = 'outdoor_seating',
	Crowding = 'crowding',
	Location = 'location',
	FamilyPets = 'family_pets',
	VibeOther = 'vibe_other',
	PriceLevel = 'price_level',
	ValueForMoney = 'value_for_money',
	PriceIncrease = 'price_increase',
	ExtraCharges = 'extra_charges',
	PriceOther = 'price_other',
	CashOnly = 'cash_only',
	CardPayment = 'card_payment',
	Tipping = 'tipping',
	Billing = 'billing',
	PaymentOther = 'payment_other',
	Queue = 'queue',
	WaitForFood = 'wait_for_food',
	WaitForTable = 'wait_for_table',
	WaitOther = 'wait_other',
	Toilets = 'toilets',
	DiningArea = 'dining_area',
	FoodHygiene = 'food_hygiene',
	CleanlinessOther = 'cleanliness_other',
	OpeningHours = 'opening_hours',
	Accessibility = 'accessibility',
	OwnershipChange = 'ownership_change',
	Renovation = 'renovation',
	DeliveryPlatform = 'delivery_platform',
	Amenities = 'amenities',
}

/** One reason a profile is scraped, or would be. */
export interface AdminWatchReasonOutputDto {
	/** Whether it gets the profile scraped now (a source switched off, or Instagram off in the city, does not) */
	active: boolean;
	/** The brand whose own account it is */
	brand?: AdminWatchRefOutputDto;
	city: AdminWatchRefOutputDto;
	enabled?: boolean;
	instagramOff?: boolean;
	kind: AdminWatchReasonOutputDtoKindEnum;
	month?: string;
	/** A top brand's place in the month's list, and its length */
	rank?: number;
	/** The report brands a rival competes with */
	rivalOf?: AdminWatchRefOutputDto[];
	/** A city source's id, and whether it is on */
	sourceId?: string;
	top?: number;
}

export enum AdminWatchReasonOutputDtoKindEnum {
	CitySource = 'city_source',
	Customer = 'customer',
	TopBrand = 'top_brand',
	Rival = 'rival',
}

export interface AdminWatchRefOutputDto {
	id: string;
	name: string;
}

export type AnalyseReportData = AdminReportOutputDto;

export interface BlogEntryAuthorOutputDto {
	id: string;
	profileImage?: {
		aspectRatio: number;
		fileName: string;
		height: number;
		url: string;
		width: number;
	};
	publicName: string;
}

export interface BlogEntryCoverImageOutputDto {
	aspectRatio: number;
	fileName: string;
	height: number;
	url: string;
	width: number;
}

/**
 * Full entry shape for the detail page — carries the server-rendered `contentHtml` (the public
 * page renders it via `{@html}`). The raw JSON `content` is admin-only (editor).
 */
export interface BlogEntryOutputDto {
	author?: BlogEntryAuthorOutputDto;
	contentHtml: string;
	coverImage?: BlogEntryCoverImageOutputDto;
	/** @format date-time */
	createdAt: string;
	excerpt?: string | null;
	id: string;
	/** @format date-time */
	publishedAt?: string | null;
	slug: string;
	state: BlogEntryOutputDtoStateEnum;
	tags?: BlogTagOutputDto[];
	title: string;
	viewCount: number;
}

export enum BlogEntryOutputDtoStateEnum {
	DRAFT = 'DRAFT',
	PUBLISHED = 'PUBLISHED',
	REMOVED = 'REMOVED',
}

/** Lightweight entry shape for lists/cards — no `content` body. */
export interface BlogEntrySummaryOutputDto {
	author?: BlogEntryAuthorOutputDto;
	coverImage?: BlogEntryCoverImageOutputDto;
	/** @format date-time */
	createdAt: string;
	excerpt?: string | null;
	id: string;
	/** @format date-time */
	publishedAt?: string | null;
	slug: string;
	state: BlogEntrySummaryOutputDtoStateEnum;
	tags?: BlogTagOutputDto[];
	title: string;
	viewCount: number;
}

export enum BlogEntrySummaryOutputDtoStateEnum {
	DRAFT = 'DRAFT',
	PUBLISHED = 'PUBLISHED',
	REMOVED = 'REMOVED',
}

export interface BlogTagOutputDto {
	id: string;
	name: string;
	slug: string;
}

/** One brand the signed-in person may open in the portal. */
export interface BrandMembershipOutputDto {
	/**
	 * Their first sign-in after the invite; absent while it is open.
	 * @format date-time
	 */
	acceptedAt?: string;
	brand: {
		/** Its places, to tell two brands of one name apart */
		branches: {
			district?: string;
			id: string;
			/** Google's city or locality */
			locality?: string;
			name: string;
		}[];
		id: string;
		name: string;
	};
	id: string;
	role: BrandMembershipOutputDtoRoleEnum;
}

export enum BrandMembershipOutputDtoRoleEnum {
	OWNER = 'OWNER',
	STAFF = 'STAFF',
}

export type BuildCityHighlightData = AdminCityHighlightOutputDto;

export type BuildFoodTrendsData = AdminFoodTrendsReportOutputDto;

export type BuildLandingEditionData = any;

export type BuildReportData = AdminReportOutputDto;

export interface BuzzToReviews {
	/** The usual new reviews a week, from the six months before */
	baselinePerWeek: number;
	followingReviews: number;
	/** The week read after it: the next one, or the same when the next lies outside the data */
	followingWeek: string;
	/** The month's week with the most views */
	peakWeek: string;
	/** `followingReviews / baselinePerWeek` */
	ratio: number;
	sentence: string;
	weeks: BuzzWeek[];
}

export interface BuzzWeek {
	posts: number;
	reviews: number;
	views: number;
	/** The week's Monday, `YYYY-MM-DD` (city time) */
	week: string;
}

export interface ChangeBlogEntryStateInputDto {
	state: ChangeBlogEntryStateInputDtoStateEnum;
}

export enum ChangeBlogEntryStateInputDtoStateEnum {
	DRAFT = 'DRAFT',
	PUBLISHED = 'PUBLISHED',
	REMOVED = 'REMOVED',
}

export type ChangeEmailData = VerificationTokenOutputDto;

export interface ChangeEmailInputDto {
	/** @format email */
	email: string;
}

export type ChangeEntryStateData = AdminBlogEntryOutputDto;

export type ChangeForgottenPasswordData = OkResponse;

export interface ChangeForgottenPasswordInputDto {
	password: string;
	token: string;
}

export type ChangeMobileNumberData = VerificationTokenOutputDto;

export interface ChangeMobileNumberInputDto {
	mobileNumber: string;
}

export type ChangePasswordData = OkResponse;

export interface ChangePasswordInputDto {
	newPassword: string;
	oldPassword?: string;
}

export type ChangeVenueFoodTopicData = AdminVenueFoodTopicsOutputDto;

export type CheckStatusData = HealthCheckResponseDto;

/** One district of a city (`City.districts`). */
export interface CityDistrict {
	name: string;
	neighbours: string[];
	postalCodes: string[];
}

export interface CityHighlightBrand {
	brandId: string;
	category?: string;
	creators: number;
	/** Its most reviewed open branch's district and category, when known */
	district?: string;
	name: string;
	posts: number;
	rank: number;
	views: number;
}

/** The city as the public page names it. */
export interface CityHighlightCityOutputDto {
	name: string;
	slug: string;
}

export interface CityHighlightCityOutputDtoidstring {
	id: string;
	name: string;
	slug: string;
}

export interface CityHighlightCreator {
	/** How many of the city's places their posts named */
	brands: number;
	creatorId: string;
	/** The handle their most viewed account goes by, without @ */
	handle: string;
	platform: CityHighlightCreatorPlatformEnum;
	posts: number;
	profileUrl: string;
	views: number;
}

export enum CityHighlightCreatorPlatformEnum {
	Tiktok = 'tiktok',
	Instagram = 'instagram',
	Blog = 'blog',
}

/**
 * A city's month in public: what `CityHighlight.data` stores and the public page draws. Our own
 * counts only (posts, views, creators, shares): no Google rating, no review text, nothing from
 * OSM. Positive lists only. Optional fields are absent, never null (`serialize({ skipNull })`
 * drops a null inside the jsonb too).
 */
export interface CityHighlightData {
	/** The ten brands most posted about by others, by posts then views */
	brands: CityHighlightBrand[];
	/** The creators whose posts about the city's places reached the most views */
	creators: CityHighlightCreator[];
	/** Dishes whose share of the posts and reviews naming a dish rose on the month before */
	dishes: CityHighlightDish[];
	/** The district most mentions named a branch in */
	district?: CityHighlightDistrict;
	/** The five fastest climbers in the top 50 by posts from others */
	risers: CityHighlightRiser[];
	/** The month's most viewed post by someone other than the brand */
	topPost?: CityHighlightPost;
	totals: CityHighlightTotals;
}

export interface CityHighlightDish {
	count: number;
	delta: number;
	label: string;
	/** Share of the posts and reviews naming a dish, in percent, and the change in points */
	share: number;
}

export interface CityHighlightDistrict {
	mentions: number;
	name: string;
	/** Its share of the month's mentions naming a branch, in percent */
	share: number;
}

/** A published month of a city: what `/<city>/<month>` renders. */
export interface CityHighlightOutputDto {
	/** @format date-time */
	builtAt: string;
	/** The city as the public page names it. */
	city: CityHighlightCityOutputDto;
	/**
	 * A city's month in public: what `CityHighlight.data` stores and the public page draws. Our own
	 * counts only (posts, views, creators, shares): no Google rating, no review text, nothing from
	 * OSM. Positive lists only. Optional fields are absent, never null (`serialize({ skipNull })`
	 * drops a null inside the jsonb too).
	 */
	data: CityHighlightData;
	month: string;
	/** @format date-time */
	publishedAt: string;
	/** @format date-time */
	updatedAt: string;
}

export interface CityHighlightPost {
	/** The places it names, as the brand list names them */
	brands: {
		brandId: string;
		name: string;
	}[];
	/** The platform's official embed of it */
	embedUrl: string;
	/** The creator's handle, without @ */
	handle: string;
	platform: CityHighlightPostPlatformEnum;
	postId: string;
	postedAt: string;
	/** The creator's profile */
	profileUrl: string;
	/** The original, as the platform shows it */
	url: string;
	views: number;
}

export enum CityHighlightPostPlatformEnum {
	Tiktok = 'tiktok',
	Instagram = 'instagram',
	Blog = 'blog',
}

export interface CityHighlightRiser {
	brandId: string;
	district?: string;
	name: string;
	posts: number;
	prevPosts: number;
	/** Absent when it was not in the previous month's top 50 */
	prevRank?: number;
	rank: number;
}

export interface CityHighlightTotals {
	brands: number;
	/** People, not accounts: one creator's TikTok and Instagram count once */
	creators: number;
	/** Posts by others naming a place of the city */
	posts: number;
	views: number;
}

/** A month's weather and calendar in the city (`MonthContext`). */
export interface CityMonthContextOutputDto {
	avgTMax?: number;
	events: {
		endDate: string;
		kind: CityMonthContextOutputDtoKindEnum;
		name: string;
		startDate: string;
	}[];
	holidays: {
		date: string;
		name: string;
	}[];
	month: string;
	rainDays?: number;
	rainyWeekends?: number;
	weekends: number;
}

export enum CityMonthContextOutputDtoKindEnum {
	SchoolHoliday = 'school_holiday',
	Event = 'event',
}

export interface CityTrendsTotals {
	/** Posts and reviews naming at least one dish */
	dishSources: number;
	/** Matched mentions in posts by others */
	mentions: number;
	/** Their posts */
	posts: number;
	views: number;
}

export interface ComplaintTime {
	/** Google's usual busyness then, 0–100 of the venue's peak; absent without popular times */
	busyness?: number;
	/** `Mo` … `Su`, and the part of the day where they gather most against all reviews */
	day: string;
	daypart: ComplaintTimeDaypartEnum;
	/** Reviews raising it in the window */
	reviews: number;
	/** How many of them fell there (3 at least) */
	there: number;
	topic: string;
	/** Share of all written reviews posted then, 0–1: the usual share the topic is read against */
	usualShare: number;
}

export enum ComplaintTimeDaypartEnum {
	Morning = 'morning',
	Midday = 'midday',
	Afternoon = 'afternoon',
	Evening = 'evening',
	Night = 'night',
}

export interface ComplaintTimes {
	/** Written reviews with a complaint, by weekday (`Mo` first) × hour, city time */
	matrix: number[][];
	/** About the most raised topic */
	sentence: string;
	topics: ComplaintTime[];
	/** Written reviews in the window (the report month and the five before) */
	written: number;
}

export type ConfirmBrandData = AdminBrandOutputDto;

export type ConfirmNewsletterData = NewsletterSubscriptionOutputDto;

export interface ContextEvent {
	endDate: string;
	kind: ContextEventKindEnum;
	name: string;
	startDate: string;
}

export enum ContextEventKindEnum {
	SchoolHoliday = 'school_holiday',
	Event = 'event',
}

export interface CreateBlogEntryInputDto {
	content: string;
	coverImage?: string;
	/** @maxLength 600 */
	excerpt?: string;
	tagNames?: string[];
	/**
	 * @minLength 1
	 * @maxLength 300
	 */
	title: string;
}

export type CreateBrandReportConfigData = AdminReportConfigOutputDto;

export type CreateCityData = AdminCityOutputDto;

export type CreateEntryData = AdminBlogEntryOutputDto;

export type CreateFoodTopicData = AdminFoodTopicBaseOutputDto;

export type CreateReportShareData = AdminReportShareOutputDto;

export type CreateReportTemplateData = AdminReportTemplateOutputDto;

export type CreateTagData = BlogTagOutputDto;

export enum DecideAccountActionEnum {
	Link = 'link',
}

export enum DecideAccountActionEnum1 {
	Reject = 'reject',
}

export enum DecideAccountActionEnum2 {
	Confirm = 'confirm',
}

export enum DecideAccountActionEnum3 {
	Branch = 'branch',
}

export type DecideAccountData = AdminAccountOutputDto;

export type DecideAccountPayload =
	| {
			action: DecideAccountActionEnum;
			/** @format uuid */
			branchId?: string | null;
			/** @format uuid */
			brandId: string;
	  }
	| {
			action: DecideAccountActionEnum1;
	  }
	| {
			action: DecideAccountActionEnum2;
	  }
	| {
			action: DecideAccountActionEnum3;
			/** @format uuid */
			branchId: string | null;
	  };

export type DeleteMeData = GetMeOutputDto;

export type DeleteReportConfigData = any;

export type DeleteReportTemplateData = any;

export type DeleteTagData = OkResponse;

export type DeleteUserData = OkResponseO1;

export type DeleteUserSessionData = OkResponse;

export interface DishPrice {
	dish: string;
	/** The median of the other menus' medians for it; absent when none has it */
	othersMedian?: number;
	othersWithDish: number;
	/** The venue's median for the dish */
	price: number;
}

export type DismissBrandSuggestionData = any;

export type ExcludeBrandVenueData = AdminBrandOutputDto;

export type ExportUsersCsvData = any;

export enum ExportUsersCsvParamsRolesEnum {
	System = 'system',
	Admin = 'admin',
	Promoter = 'promoter',
	User = 'user',
	VenueOwner = 'venue_owner',
}

/**
 * One thing a review or a mention says (a `FeedbackPoint` row). A point has a `detail`, praise
 * `positive` and a complaint `negative`; a dish-only row has a `dish`, the dish's sentiment and no
 * topic or detail; a noticed change (`change`) is `neutral`, its phrase the detail. Pages group
 * them by sentiment themselves.
 */
export interface FeedbackPointOutputDto {
	/** The number it states: minutes for a wait, the price for a price */
	amount?: number;
	/** A change the reviewer noticed since before ("new owner"), not a praise or complaint */
	change: boolean;
	detail?: string;
	/** The dish or drink it is about */
	dish?: string;
	/** The food topic the dish is (`FeedbackPoint.foodTopic`): its page is `/admin/trends/<key>` */
	foodTopic?: {
		key: string;
		label: string;
	};
	sentiment: FeedbackPointOutputDtoSentimentEnum;
	/** Absent until the point is filed, and on a dish-only row */
	theme?: FeedbackPointOutputDtoThemeEnum;
	topic?: FeedbackPointOutputDtoTopicEnum;
	unit?: FeedbackPointOutputDtoUnitEnum;
}

export enum FeedbackPointOutputDtoSentimentEnum {
	Mixed = 'mixed',
	Positive = 'positive',
	Negative = 'negative',
	Neutral = 'neutral',
}

/** Absent until the point is filed, and on a dish-only row */
export enum FeedbackPointOutputDtoThemeEnum {
	Language = 'language',
	Taste = 'taste',
	Other = 'other',
	Freshness = 'freshness',
	Temperature = 'temperature',
	Cooking = 'cooking',
	Seasoning = 'seasoning',
	PortionSize = 'portion_size',
	IngredientQuality = 'ingredient_quality',
	MenuVariety = 'menu_variety',
	Availability = 'availability',
	QualityChange = 'quality_change',
	Authenticity = 'authenticity',
	Presentation = 'presentation',
	FoodOther = 'food_other',
	DrinkQuality = 'drink_quality',
	DrinkSelection = 'drink_selection',
	DrinksOther = 'drinks_other',
	Friendliness = 'friendliness',
	Attentiveness = 'attentiveness',
	SpeedOfService = 'speed_of_service',
	OrderAccuracy = 'order_accuracy',
	Advice = 'advice',
	ReservationHandling = 'reservation_handling',
	ComplaintHandling = 'complaint_handling',
	TakeawayHandling = 'takeaway_handling',
	StaffChange = 'staff_change',
	ServiceOther = 'service_other',
	Atmosphere = 'atmosphere',
	Noise = 'noise',
	Space = 'space',
	Interior = 'interior',
	OutdoorSeating = 'outdoor_seating',
	Crowding = 'crowding',
	Location = 'location',
	FamilyPets = 'family_pets',
	VibeOther = 'vibe_other',
	PriceLevel = 'price_level',
	ValueForMoney = 'value_for_money',
	PriceIncrease = 'price_increase',
	ExtraCharges = 'extra_charges',
	PriceOther = 'price_other',
	CashOnly = 'cash_only',
	CardPayment = 'card_payment',
	Tipping = 'tipping',
	Billing = 'billing',
	PaymentOther = 'payment_other',
	Queue = 'queue',
	WaitForFood = 'wait_for_food',
	WaitForTable = 'wait_for_table',
	WaitOther = 'wait_other',
	Toilets = 'toilets',
	DiningArea = 'dining_area',
	FoodHygiene = 'food_hygiene',
	CleanlinessOther = 'cleanliness_other',
	OpeningHours = 'opening_hours',
	Accessibility = 'accessibility',
	OwnershipChange = 'ownership_change',
	Renovation = 'renovation',
	DeliveryPlatform = 'delivery_platform',
	Amenities = 'amenities',
}

export enum FeedbackPointOutputDtoTopicEnum {
	Food = 'food',
	Drinks = 'drinks',
	Service = 'service',
	Vibe = 'vibe',
	Price = 'price',
	Payment = 'payment',
	Wait = 'wait',
	Cleanliness = 'cleanliness',
	Other = 'other',
}

export enum FeedbackPointOutputDtoUnitEnum {
	Minutes = 'minutes',
	Money = 'money',
}

export type FileFeedbackThemesData = AdminFileFeedbackThemesOutputDto;

export type FillCityDaysData = AdminFillCityDaysOutputDto;

export type FillCompetitorsData = AdminFillCompetitorsOutputDto;

export interface FoodTrendsBreakout {
	/** Rising past +5,000 % */
	breakout?: boolean;
	/** Growth against the twelve months before, percent; absent for a breakout */
	growth?: number;
	/** As Google lists it; may name a venue, Google's own words */
	query: string;
	/** The kind of food it was found under */
	topic: string;
}

export interface FoodTrendsBreakouts {
	/** The twelve months Google's rising queries cover, `YYYY-MM` */
	from: string;
	queries: FoodTrendsBreakout[];
	to: string;
}

/** The city as the public page names it. */
export interface FoodTrendsCityOutputDto {
	name: string;
	slug: string;
}

export interface FoodTrendsCityOutputDtoidstring {
	id: string;
	name: string;
	slug: string;
}

/**
 * A city's quarter of food trends in public: what `FoodTrendsReport.data` stores and the page
 * `/<city>/trends/<YYYY>-q<N>` draws. Topics only: our own counts of posts, Google's public search
 * figures, openings counted by kind of food; no venue figure, and no venue name except inside
 * Google's own rising queries. Positive framing: rises only. Optional fields are absent, never
 * null (`serialize({ skipNull })` drops a null inside the jsonb too).
 */
export interface FoodTrendsData {
	/** Google's rising related queries; absent without a pull for the quarter's last month */
	breakouts?: FoodTrendsBreakouts;
	/** The quarter's three months, `YYYY-MM` */
	months: string[];
	/** Openings and closures by kind of food; absent when none was seen */
	openings?: FoodTrendsOpenings;
	/** Google searches on one scale across topics; absent until the anchored pull ran */
	searches?: FoodTrendsSearches;
	/** The kinds of food posts by others named most; absent below `MIN_QUARTER_MENTIONS` */
	talked?: FoodTrendsTalked;
}

export interface FoodTrendsOpenings {
	/** By the venue's kind of food (else its Google category), most openings first */
	byTopic: {
		closed: number;
		label: string;
		opened: number;
	}[];
	closed: number;
	opened: number;
}

/** A published quarter of a city: what `/<city>/trends/<YYYY>-q<N>` renders. */
export interface FoodTrendsReportOutputDto {
	/** @format date-time */
	builtAt: string;
	/** The city as the public page names it. */
	city: FoodTrendsCityOutputDto;
	/**
	 * A city's quarter of food trends in public: what `FoodTrendsReport.data` stores and the page
	 * `/<city>/trends/<YYYY>-q<N>` draws. Topics only: our own counts of posts, Google's public search
	 * figures, openings counted by kind of food; no venue figure, and no venue name except inside
	 * Google's own rising queries. Positive framing: rises only. Optional fields are absent, never
	 * null (`serialize({ skipNull })` drops a null inside the jsonb too).
	 */
	data: FoodTrendsData;
	/** @format date-time */
	publishedAt: string;
	quarter: string;
	/** @format date-time */
	updatedAt: string;
}

/** Where an anchored pull stands, for the admin page. */
export interface FoodTrendsSearchPull {
	finishedAt?: string;
	/** What it fetched, or why it failed */
	note?: string;
	requestedAt: string;
	state: FoodTrendsSearchPullStateEnum;
}

export enum FoodTrendsSearchPullStateEnum {
	Done = 'done',
	Failed = 'failed',
	Queued = 'queued',
	Running = 'running',
}

export interface FoodTrendsSearchTopic {
	/** Present on the anchor's row */
	anchor?: boolean;
	/** `level / prevYearLevel - 1`: 0.4 = up 40 % */
	change?: number;
	key: string;
	kind: FoodTrendsSearchTopicKindEnum;
	label: string;
	/** The quarter's mean search level, the anchor's two-year mean = 100 */
	level: number;
	/** The same quarter a year earlier, on the same scale */
	prevYearLevel?: number;
}

export enum FoodTrendsSearchTopicKindEnum {
	Cuisine = 'cuisine',
	Dish = 'dish',
	Drink = 'drink',
	Diet = 'diet',
	Format = 'format',
	Meal = 'meal',
}

export interface FoodTrendsSearches {
	/** The topic every comparison carried (pizza): its two-year average is 100 */
	anchor: {
		key: string;
		label: string;
	};
	/** First and last month of the pulled window */
	from: string;
	/** The Google Trends region */
	geo: string;
	/** The biggest rises on the same quarter a year earlier, positive only */
	rising: FoodTrendsSearchTopic[];
	to: string;
	/** The quarter's most searched kinds of food, highest first */
	top: FoodTrendsSearchTopic[];
}

export interface FoodTrendsTalked {
	/** Mentions by others with a kind of food, in the quarter */
	mentions: number;
	topics: FoodTrendsTalkedTopic[];
}

export interface FoodTrendsTalkedTopic {
	/** Points gained on the quarter before; absent when it fell or that quarter is too thin */
	gain?: number;
	key: string;
	kind: FoodTrendsTalkedTopicKindEnum;
	label: string;
	mentions: number;
	/** Share of the quarter's mentions with a kind of food naming it or a kind under it, percent */
	share: number;
}

export enum FoodTrendsTalkedTopicKindEnum {
	Cuisine = 'cuisine',
	Dish = 'dish',
	Drink = 'drink',
	Diet = 'diet',
	Format = 'format',
	Meal = 'meal',
}

export type ForgotPasswordData = VerificationTokenOutputDto;

export interface ForgotPasswordInputDto {
	/** @format email */
	email?: string;
	mobileNumber?: string;
}

export type GetAdminOverviewData = AdminOverviewOutputDto;

export type GetAdminTodayData = AdminTodayOutputDto;

export type GetBrandData = AdminBrandOutputDto;

export type GetBrandSummaryData = AdminBrandSummaryOutputDto;

export type GetCityData = AdminCityOutputDto;

export type GetCityHighlightData = CityHighlightOutputDto;

export type GetCityHighlightsData = AdminCityHighlightsOutputDto;

export type GetCityMonthContextData = CityMonthContextOutputDto;

export type GetCreatorData = AdminCreatorOutputDto;

export type GetCreatorWatchData = AdminCreatorWatchOutputDto;

export type GetDataCoverageData = AdminDataCoverageOutputDto;

export type GetDishNamesData = AdminDishNamesOutputDto;

/** `unlinked` (decided, no topic; the default), `linked`, `pending` (not decided yet) or `all` */
export enum GetDishNamesParamsStatusEnum {
	All = 'all',
	Pending = 'pending',
	Unlinked = 'unlinked',
	Linked = 'linked',
}

export type GetDishSearchesData = AdminDishSearchesOutputDto;

export type GetEntriesData = SitemapEntriesOutputDto;

export type GetEntryData = BlogEntryOutputDto;

export type GetEntryResult = AdminBlogEntryOutputDto;

export type GetFoodTopicsData = AdminFoodTopicsOutputDto;

export type GetFoodTrendsData = AdminFoodTrendsOutputDto;

export type GetFoodTrendsReportData = FoodTrendsReportOutputDto;

export type GetLandingEditionData = LandingEditionOutputDto;

export type GetLandingEditionResult = AdminLandingEditionOutputDto;

export type GetLandingEditionsData = AdminLandingEditionsOutputDto;

export type GetMeData = GetMeOutputDto;

export interface GetMeOutputDto {
	acceptedCallCommunications?: boolean;
	acceptedEmailCommunications?: boolean;
	acceptedMarketing?: boolean;
	acceptedSmsCommunications?: boolean;
	/** The brands whose portal they may open, by name. Admins open any brand's without one. */
	brandMemberships: BrandMembershipOutputDto[];
	/** Their public bio; absent when they wrote none. */
	description?: string;
	email?: string;
	/** @format date-time */
	emailVerifiedAt?: string;
	firstName: string;
	id: string;
	isMarkedForDeletion?: boolean;
	lastName: string;
	/** @format date-time */
	markedForDeletionAt?: string;
	mobileNumber?: string;
	/** @format date-time */
	mobileNumberVerifiedAt?: string;
	/** Every notification switch with its state. Always complete. */
	notificationPreferences: NotificationPreferences;
	/** @format date-time */
	passwordLastChangedAt?: string;
	profileImage?: ImageOutputDto;
	publicName?: string;
	roles: GetMeOutputDtoRolesEnum[];
}

export enum GetMeOutputDtoRolesEnum {
	System = 'system',
	Admin = 'admin',
	Promoter = 'promoter',
	User = 'user',
	VenueOwner = 'venue_owner',
}

export type GetNewsletterCountsData = AdminNewsletterCountsOutputDto;

export type GetOutreachSummaryData = AdminOutreachSummaryOutputDto;

export type GetPortalBrandData = PortalBrandOutputDto;

export type GetPortalPatternsData = PortalPatternsOutputDto;

export type GetPortalPostFiltersData = PortalPostFiltersOutputDto;

export type GetPortalReportData = PortalReportOutputDto;

export type GetPortalReportPdfData = any;

export type GetPortalReviewFiltersData = PortalReviewFiltersOutputDto;

export type GetPortalSeriesData = PortalSeriesOutputDto;

export type GetPortalSettingsData = PortalSettingsOutputDto;

export type GetPostData = AdminSocialPostOutputDto;

export type GetProspectData = AdminProspectOutputDto;

export type GetReportConfigData = AdminReportConfigOutputDto;

export type GetReportData = AdminReportOutputDto;

export type GetReportLeaveBehindPdfData = any;

export type GetReportPdfData = any;

export type GetReportTemplateData = AdminReportTemplateOutputDto;

export type GetSearchInterestData = AdminSearchInterestOutputDto;

export type GetSectionsData = SitemapSectionsOutputDto;

export type GetSharedReportData = SharedReportOutputDto;

export type GetSharedReportPdfData = any;

export type GetTagData = BlogTagOutputDto;

export type GetThemeInsightData = AdminThemeInsightOutputDto;

/** Only reviews, or only posts */
export enum GetThemeInsightParamsKindEnum {
	Post = 'post',
	Review = 'review',
}

/** Complaints when absent */
export enum GetThemeInsightParamsSideEnum {
	Praise = 'praise',
	Complaints = 'complaints',
	Changes = 'changes',
}

export type GetThemeInsightsData = AdminThemeInsightsOutputDto;

export type GetTopicInsightData = AdminTopicInsightOutputDto;

export type GetTopicInsightsData = AdminTopicInsightsOutputDto;

export type GetTrendsData = AdminTrendsOutputDto;

export type GetUserData = AdminUserOutputDto;

export type GetVenueData = AdminVenueOutputDto;

export type GetVenueDemandData = AdminVenueDemandOutputDto;

export type GetVenueDishSearchesData = AdminVenueDishSearchesOutputDto;

export type GetVenueFoodTopicsData = AdminVenueFoodTopicsOutputDto;

export type GetVenueStatusChangesData = AdminVenueStatusChangesOutputDto;

export type GetWaitComplaintsData = AdminWaitComplaintsOutputDto;

export interface HealthCheckResponseDto {
	ok: boolean;
	/** @format date-time */
	since: string;
}

export interface ImageOutputDto {
	aspectRatio: number;
	fileName: string;
	height: number;
	path: string;
	url: string;
	width: number;
}

export type InviteToPortalData = AdminProspectOutputDto;

/** The city as the front page names it. */
export interface LandingCityOutputDto {
	name: string;
	slug: string;
}

export interface LandingCityOutputDtoidstring {
	id: string;
	name: string;
	slug: string;
}

/**
 * What the model wrote for an edition, each line checked against its numbers; a line that
 * failed or was missing is the plain fallback. The page joins it to `data` by key.
 */
export interface LandingCopy {
	dishes: LandingDishCopy[];
	fallbacks: number;
	/** The hero's paragraph */
	lede: string;
	openings: LandingOpeningCopy[];
	places: LandingPlaceCopy[];
	/** The "right now" strip, in order */
	ticker: LandingStoryCopy[];
	/** Three trend tiles, in order */
	trends: LandingStoryCopy[];
	/** Lines the model wrote and that passed the checks, and lines that fell back */
	written: number;
}

export interface LandingDish {
	delta: number;
	/** The food topic's key, else the dish key */
	key: string;
	label: string;
	/** Places whose posts named it */
	places: number;
	posts: number;
	role: LandingDishRoleEnum;
	/** Share of the posts naming a dish, percent with one decimal, and the change in points */
	share: number;
	/** The places whose posts named it most */
	topPlaces: LandingDishPlace[];
}

export interface LandingDishCopy {
	key: string;
	/** One or two words on the tile's sticker */
	sticker: string;
	text: string;
}

export interface LandingDishPlace {
	brandId: string;
	district?: string;
	name: string;
	posts: number;
}

export enum LandingDishRoleEnum {
	Drink = 'drink',
	Rising = 'rising',
	DishOfTheMonth = 'dish_of_the_month',
	MostNamed = 'most_named',
}

/**
 * The front page's live edition of a city: the last 30 days of what the city posted about
 * eating out, against the 30 days before. Our own counts of public posts by others only (a
 * brand's own account and paid or promotional posts left out): no Google rating, no review
 * text, nothing from OSM. Positive lists only. Optional fields are absent, never null
 * (`serialize({ skipNull })` drops a null inside the jsonb too).
 */
export interface LandingEditionData {
	/** Up to four dishes with a role each (Dish of the Month, still rising, most named, drink) */
	dishes: LandingDish[];
	/** The window's most named dishes, for the marquee */
	marquee: string[];
	/** Places posts called new in the last 14 days, most talked about first (three at most) */
	openings: LandingOpening[];
	/** How many places posts called new in the last 14 days */
	openingsCount: number;
	/** The ten places the most people posted about, then by posts, then views */
	places: LandingPlace[];
	/** Facts the model may tell: trend tiles pick three, the ticker the rest */
	stories: LandingStory[];
	totals: LandingTotals;
}

/** The newest published edition of a city's front page: what `/` renders. */
export interface LandingEditionOutputDto {
	/** @format date-time */
	builtAt: string;
	/** The city as the front page names it. */
	city: LandingCityOutputDto;
	/**
	 * What the model wrote for an edition, each line checked against its numbers; a line that
	 * failed or was missing is the plain fallback. The page joins it to `data` by key.
	 */
	copy: LandingCopy;
	/**
	 * The front page's live edition of a city: the last 30 days of what the city posted about
	 * eating out, against the 30 days before. Our own counts of public posts by others only (a
	 * brand's own account and paid or promotional posts left out): no Google rating, no review
	 * text, nothing from OSM. Positive lists only. Optional fields are absent, never null
	 * (`serialize({ skipNull })` drops a null inside the jsonb too).
	 */
	data: LandingEditionData;
	/** @format date-time */
	publishedAt: string;
	/** @format date-time */
	windowEnd: string;
	/**
	 * The counted window [windowStart, windowEnd)
	 * @format date-time
	 */
	windowStart: string;
}

export interface LandingNamedDish {
	label: string;
	posts: number;
}

export interface LandingOpening {
	brandId: string;
	creators: number;
	dish?: LandingNamedDish;
	district?: string;
	/** The day of the first post calling it new (`YYYY-MM-DD`), else of the scrape that saw it open */
	firstSeen: string;
	name: string;
	posts: number;
	street?: string;
	views: number;
}

export interface LandingOpeningCopy {
	brandId: string;
	text: string;
}

export interface LandingPlace {
	/** The brand's open places in the city */
	branches: number;
	brandId: string;
	/** Places climbed, for `up` */
	climb?: number;
	creators: number;
	/** The dish its posts named most, with 2+ posts */
	dish?: LandingNamedDish;
	/** The branch the window's posts named most (else its most reviewed open one) */
	district?: string;
	/** A post in the last 14 days called it new */
	isNew?: boolean;
	move: LandingPlaceMoveEnum;
	name: string;
	posts: number;
	/** Its rank in the 30 days before, when it was in the top 50 */
	prevRank?: number;
	rank: number;
	/** Its street without the house number, as Google writes it */
	street?: string;
	views: number;
}

export interface LandingPlaceCopy {
	brandId: string;
	/** What the city said, two sentences at most */
	said: string;
	/** A few words under the name on the hero's ticket */
	tagline: string;
}

export enum LandingPlaceMoveEnum {
	New = 'new',
	None = 'none',
	Up = 'up',
	Held = 'held',
}

/**
 * One fact with its numbers. `fact` is the plain sentence the page falls back to when the
 * model's line is missing or states a number the fact doesn't hold.
 */
export interface LandingStory {
	/** The district it is about, for the ticker's tag */
	district?: string;
	fact: string;
	/** Credit, for a story about a post */
	handle?: string;
	/** Stable within an edition: `district`, `place:<brandId>`, … */
	id: string;
	kind: LandingStoryKindEnum;
	platform?: LandingStoryPlatformEnum;
	/** A short fallback title, for a trend tile */
	title: string;
	/** Trend tiles pick among these; the ticker takes the others */
	trend: boolean;
	url?: string;
}

export interface LandingStoryCopy {
	storyId: string;
	text: string;
	title: string;
}

export enum LandingStoryKindEnum {
	District = 'district',
	Street = 'street',
	Cuisine = 'cuisine',
	Dish = 'dish',
	Praise = 'praise',
	Openings = 'openings',
	Place = 'place',
	Crowd = 'crowd',
	TopPost = 'top_post',
	Climber = 'climber',
}

export enum LandingStoryPlatformEnum {
	Tiktok = 'tiktok',
	Instagram = 'instagram',
	Blog = 'blog',
}

export interface LandingTotals {
	/** People, not accounts */
	creators: number;
	places: number;
	/** Posts by others naming a place of the city */
	posts: number;
	views: number;
}

/**
 * One signal: its 0–1 value (`null` = unknown, counted at half), its weight and the raw inputs.
 * `value` is optional because responses serialize with `skipNull`, which drops the null inside the
 * jsonb too: absent reads as unknown.
 */
export interface LeadSignal {
	/** Construct a type with a set of properties K of type T */
	inputs: Recordstringstringnumberbooleannull;
	value?: number | null;
	weight: number;
}

export interface LeadSignals {
	/**
	 * One signal: its 0–1 value (`null` = unknown, counted at half), its weight and the raw inputs.
	 * `value` is optional because responses serialize with `skipNull`, which drops the null inside the
	 * jsonb too: absent reads as unknown.
	 */
	buzz: LeadSignal;
	/** On the city's `chainDenyList`: the score is halved (`LEAD_DENY_LIST_FACTOR`) */
	denyListed?: boolean;
	/** What would make the score complete, e.g. `reviews not scraped`. */
	missing: string[];
	/** The report month scored; the window is it and the month before. */
	month: string;
	/** Points added for a place first seen recently with few Google reviews. */
	newPlaceBonus: number;
	/** Press and listicle features in the window; absent in scores computed before it existed */
	press?: LeadSignal;
	/**
	 * One signal: its 0–1 value (`null` = unknown, counted at half), its weight and the raw inputs.
	 * `value` is optional because responses serialize with `skipNull`, which drops the null inside the
	 * jsonb too: absent reads as unknown.
	 */
	problem: LeadSignal;
	/**
	 * One signal: its 0–1 value (`null` = unknown, counted at half), its weight and the raw inputs.
	 * `value` is optional because responses serialize with `skipNull`, which drops the null inside the
	 * jsonb too: absent reads as unknown.
	 */
	reachable: LeadSignal;
	/**
	 * One signal: its 0–1 value (`null` = unknown, counted at half), its weight and the raw inputs.
	 * `value` is optional because responses serialize with `skipNull`, which drops the null inside the
	 * jsonb too: absent reads as unknown.
	 */
	spends: LeadSignal;
}

export type ListAccountsData = AdminListAccountsOutputDto;

export enum ListAccountsParamsPlatformEnum {
	Tiktok = 'tiktok',
	Instagram = 'instagram',
	Blog = 'blog',
}

export enum ListAccountsParamsSortEnum {
	ScoreAsc = 'score:asc',
	ScoreDesc = 'score:desc',
	FollowersAsc = 'followers:asc',
	FollowersDesc = 'followers:desc',
	HandleAsc = 'handle:asc',
	HandleDesc = 'handle:desc',
	MonthPostsAsc = 'monthPosts:asc',
	MonthPostsDesc = 'monthPosts:desc',
	MonthViewsAsc = 'monthViews:asc',
	MonthViewsDesc = 'monthViews:desc',
}

export enum ListAccountsParamsStatusEnum {
	Suggested = 'suggested',
	Linked = 'linked',
}

export type ListApifyRunsData = AdminListApifyRunsOutputDto;

export interface ListBlogEntriesInputDto {
	/** @min 1 */
	page: number;
	q?: string;
	/** @min 1 */
	size: number;
	sort?: ListBlogEntriesInputDtoSortEnum;
	tag?: string;
}

export enum ListBlogEntriesInputDtoSortEnum {
	ViewCountASC = 'viewCount:ASC',
	ViewCountDESC = 'viewCount:DESC',
	PublishedAtASC = 'publishedAt:ASC',
	PublishedAtDESC = 'publishedAt:DESC',
}

export interface ListBlogEntriesOutputDto {
	items: BlogEntrySummaryOutputDto[];
	page: number;
	pageSize: number;
	totalItems: number;
}

export interface ListBlogTagsOutputDto {
	items: BlogTagOutputDto[];
}

export type ListBrandAccountsData = AdminAccountOutputDto[];

export type ListBrandCompetitorSuggestionsData = AdminCompetitorSuggestionOutputDto[];

export type ListBrandCompetitorsData = AdminCompetitorOutputDto[];

export type ListBrandReportConfigsData = AdminReportConfigOutputDto[];

export type ListBrandSuggestionsData = AdminBrandSuggestionOutputDto[];

export type ListBrandsData = AdminListBrandsOutputDto;

export enum ListBrandsParamsSegmentEnum {
	All = 'all',
	Prospects = 'prospects',
	Talked = 'talked',
	Customers = 'customers',
	Chains = 'chains',
}

export enum ListBrandsParamsSortEnum {
	NameAsc = 'name:asc',
	NameDesc = 'name:desc',
	LeadScoreAsc = 'leadScore:asc',
	LeadScoreDesc = 'leadScore:desc',
	RatingAsc = 'rating:asc',
	RatingDesc = 'rating:desc',
	ViewsAsc = 'views:asc',
	ViewsDesc = 'views:desc',
	PostsAsc = 'posts:asc',
	PostsDesc = 'posts:desc',
	ChangeAsc = 'change:asc',
	ChangeDesc = 'change:desc',
	BranchesAsc = 'branches:asc',
	BranchesDesc = 'branches:desc',
	ReviewsAsc = 'reviews:asc',
	ReviewsDesc = 'reviews:desc',
	FollowUpAsc = 'followUp:asc',
	FollowUpDesc = 'followUp:desc',
}

export enum ListBrandsParamsStageEnum {
	TO_CONTACT = 'TO_CONTACT',
	CONTACTED = 'CONTACTED',
	REPLIED = 'REPLIED',
	MEETING = 'MEETING',
	WON = 'WON',
	LOST = 'LOST',
	OPTED_OUT = 'OPTED_OUT',
}

export type ListCitiesData = AdminListCitiesOutputDto;

export type ListCityDaysData = AdminListCityDaysOutputDto;

export type ListCityDistrictSuggestionsData = AdminCityDistrictSuggestionsOutputDto;

export type ListCityEventsData = AdminListCityEventsOutputDto;

export type ListCityHashtagSuggestionsData = AdminCityHashtagSuggestionsOutputDto;

export type ListCitySourcesData = AdminListCitySourcesOutputDto;

export type ListCreatorsData = AdminListCreatorsOutputDto;

export enum ListCreatorsParamsPlatformEnum {
	Tiktok = 'tiktok',
	Instagram = 'instagram',
	Blog = 'blog',
}

export enum ListCreatorsParamsSortEnum {
	NameAsc = 'name:asc',
	NameDesc = 'name:desc',
	FollowersAsc = 'followers:asc',
	FollowersDesc = 'followers:desc',
	ViewsAsc = 'views:asc',
	ViewsDesc = 'views:desc',
	PostsAsc = 'posts:asc',
	PostsDesc = 'posts:desc',
	BrandsAsc = 'brands:asc',
	BrandsDesc = 'brands:desc',
}

export type ListEntriesData = ListBlogEntriesOutputDto;

export enum ListEntriesParams1SortEnum {
	ViewCountASC = 'viewCount:ASC',
	ViewCountDESC = 'viewCount:DESC',
	PublishedAtASC = 'publishedAt:ASC',
	PublishedAtDESC = 'publishedAt:DESC',
	CreatedAtASC = 'createdAt:ASC',
	CreatedAtDESC = 'createdAt:DESC',
	TitleASC = 'title:ASC',
	TitleDESC = 'title:DESC',
}

export enum ListEntriesParams1StatesEnum {
	DRAFT = 'DRAFT',
	PUBLISHED = 'PUBLISHED',
	REMOVED = 'REMOVED',
}

export enum ListEntriesParamsSortEnum {
	ViewCountASC = 'viewCount:ASC',
	ViewCountDESC = 'viewCount:DESC',
	PublishedAtASC = 'publishedAt:ASC',
	PublishedAtDESC = 'publishedAt:DESC',
}

export type ListEntriesResult = AdminListBlogEntriesOutputDto;

export type ListLlmBacklogsData = AdminLlmBacklogsOutputDto;

export type ListMentionsData = AdminListMentionsOutputDto;

export enum ListMentionsParamsMatchMethodEnum {
	Exact = 'exact',
	Fuzzy = 'fuzzy',
	Llm = 'llm',
	None = 'none',
	OtherCity = 'other_city',
	Manual = 'manual',
	Ignored = 'ignored',
}

export type ListNotificationsData = ListNotificationsOutputDto;

export interface ListNotificationsInputDto {
	/** @format date */
	from?: string;
	/** @min 1 */
	page: number;
	/** @min 1 */
	size: number;
	unreadOnly?: boolean;
}

export interface ListNotificationsItem {
	/** @format date-time */
	createdAt: string;
	description?: string;
	id: string;
	path?: string;
	/** @format date-time */
	readAt?: string;
	title?: string;
	type: ListNotificationsItemTypeEnum;
}

export enum ListNotificationsItemTypeEnum {
	GENERAL = 'GENERAL',
}

export interface ListNotificationsOutputDto {
	items: ListNotificationsItem[];
	page: number;
	pageSize: number;
	totalItems: number;
}

export type ListPipelineRunsData = AdminListPipelineRunsOutputDto;

export type ListPortalBrandsData = PortalBrandsOutputDto;

export type ListPortalCompetitorsData = PortalCompetitorsOutputDto;

export type ListPortalCreatorsData = PortalCreatorsOutputDto;

export enum ListPortalCreatorsParamsPlatformEnum {
	Tiktok = 'tiktok',
	Instagram = 'instagram',
	Blog = 'blog',
}

export type ListPortalPostsData = PortalPostsOutputDto;

export enum ListPortalPostsParamsPlatformEnum {
	Tiktok = 'tiktok',
	Instagram = 'instagram',
	Blog = 'blog',
}

export type ListPortalReportsData = PortalReportsOutputDto;

export type ListPortalReviewsData = PortalReviewsOutputDto;

/** Google or TripAdvisor */
export enum ListPortalReviewsParamsPlatformEnum {
	Google = 'google',
	Tripadvisor = 'tripadvisor',
}

/** A topic the review praised or criticised */
export enum ListPortalReviewsParamsTopicEnum {
	Food = 'food',
	Drinks = 'drinks',
	Service = 'service',
	Vibe = 'vibe',
	Price = 'price',
	Payment = 'payment',
	Wait = 'wait',
	Cleanliness = 'cleanliness',
	Other = 'other',
}

export type ListPostCommentsData = AdminPostCommentsOutputDto;

export type ListPostsData = AdminListPostsOutputDto;

export enum ListPostsParamsPlatformEnum {
	Tiktok = 'tiktok',
	Instagram = 'instagram',
	Blog = 'blog',
}

export enum ListPostsParamsSortEnum {
	ViewsAsc = 'views:asc',
	ViewsDesc = 'views:desc',
	PostedAtAsc = 'postedAt:asc',
	PostedAtDesc = 'postedAt:desc',
}

export type ListProspectsData = AdminListProspectsOutputDto;

export enum ListProspectsParamsSortEnum {
	CreatedAtAsc = 'createdAt:asc',
	CreatedAtDesc = 'createdAt:desc',
	NameAsc = 'name:asc',
	NameDesc = 'name:desc',
	LeadScoreAsc = 'leadScore:asc',
	LeadScoreDesc = 'leadScore:desc',
	NextFollowUpAtAsc = 'nextFollowUpAt:asc',
	NextFollowUpAtDesc = 'nextFollowUpAt:desc',
	LastTouchAtAsc = 'lastTouchAt:asc',
	LastTouchAtDesc = 'lastTouchAt:desc',
}

export enum ListProspectsParamsStageEnum {
	TO_CONTACT = 'TO_CONTACT',
	CONTACTED = 'CONTACTED',
	REPLIED = 'REPLIED',
	MEETING = 'MEETING',
	WON = 'WON',
	LOST = 'LOST',
	OPTED_OUT = 'OPTED_OUT',
}

export type ListReportSharesData = AdminReportShareOutputDto[];

export type ListReportTemplatesData = AdminReportTemplateOutputDto[];

export type ListReportsData = AdminListReportsOutputDto;

export enum ListReportsParamsSortEnum {
	PostCountAsc = 'postCount:asc',
	PostCountDesc = 'postCount:desc',
	ReviewCountAsc = 'reviewCount:asc',
	ReviewCountDesc = 'reviewCount:desc',
	UpdatedAtAsc = 'updatedAt:asc',
	UpdatedAtDesc = 'updatedAt:desc',
	MonthAsc = 'month:asc',
	MonthDesc = 'month:desc',
}

export type ListReviewsData = AdminListReviewsOutputDto;

export enum ListReviewsParamsPlatformEnum {
	Google = 'google',
	Tripadvisor = 'tripadvisor',
}

export type ListSessionsData = ListSessionsOutputDto;

export interface ListSessionsInputDto {
	/** @min 1 */
	page: number;
	/** @min 1 */
	size: number;
}

export interface ListSessionsItem {
	/** @format date-time */
	createdAt: string;
	/** @format date-time */
	expiresAt: string;
	id: string;
	isCurrent: boolean;
	/** @format date-time */
	lastSeenAt?: string;
	visitorInfo: {
		browser?: UAParserIBrowser;
		countryCode?: string;
		cpu?: UAParserICPU;
		device?: UAParserIDevice;
		engine?: UAParserIEngine;
		ip?: string;
		os?: UAParserIOS;
		ua?: string;
		userAgent?: string;
	};
}

export interface ListSessionsOutputDto {
	items: ListSessionsItem[];
	page: number;
	pageSize: number;
	totalItems: number;
}

export type ListSuggestedProspectsData = AdminSuggestedProspectOutputDto[];

export type ListTagsData = ListBlogTagsOutputDto;

export type ListTagsResult = ListBlogTagsOutputDto;

export type ListUserSessionsData = AdminListSessionsOutputDto;

export enum ListUserSessionsParamsPlatformEnum {
	Web = 'web',
	Android = 'android',
	Ios = 'ios',
}

export enum ListUserSessionsParamsSortEnum {
	CreatedAtAsc = 'createdAt:asc',
	CreatedAtDesc = 'createdAt:desc',
	ExpiresAtAsc = 'expiresAt:asc',
	ExpiresAtDesc = 'expiresAt:desc',
	LastSeenAtAsc = 'lastSeenAt:asc',
	LastSeenAtDesc = 'lastSeenAt:desc',
}

export type ListUsersData = AdminListUsersOutputDto;

export enum ListUsersParamsSortEnum {
	CreatedAtAsc = 'createdAt:asc',
	CreatedAtDesc = 'createdAt:desc',
	FirstNameAsc = 'firstName:asc',
	FirstNameDesc = 'firstName:desc',
}

export type ListVenueReviewsData = AdminListVenueReviewsOutputDto;

export type ListVenueSearchRanksData = AdminVenueSearchRankOutputDto[];

export type ListVenuesData = AdminListVenuesOutputDto;

export enum ListVenuesParamsSortEnum {
	CreatedAtAsc = 'createdAt:asc',
	CreatedAtDesc = 'createdAt:desc',
	NameAsc = 'name:asc',
	NameDesc = 'name:desc',
	MentionCountAsc = 'mentionCount:asc',
	MentionCountDesc = 'mentionCount:desc',
	LeadScoreAsc = 'leadScore:asc',
	LeadScoreDesc = 'leadScore:desc',
	RatingAsc = 'rating:asc',
	RatingDesc = 'rating:desc',
	ReviewsCountAsc = 'reviewsCount:asc',
	ReviewsCountDesc = 'reviewsCount:desc',
}

export type LogOutreachTouchData = AdminProspectOutputDto;

/** Asks for a sign-in code to an account's e-mail (the venue portal's login). */
export interface LoginCodeInputDto {
	/** @format email */
	email: string;
}

export interface LoginEmailInputDto {
	/** @format email */
	email: string;
	password: string;
}

export interface LoginMobileNumberInputDto {
	mobileNumber: string;
	password: string;
}

export interface LoginOutputDto {
	accessToken: string;
	/** @format date-time */
	accessTokenExpiresAt: string;
	/** @format date-time */
	expiresAt: string;
	refreshToken: string;
}

export type LoginWithCodeData = LoginOutputDto;

export type LoginWithEmailData = VerificationTokenOutputDto | LoginOutputDto;

export type LoginWithMobileNumberData = VerificationTokenOutputDto | LoginOutputDto;

export type LogoutData = OkResponse;

export type LookupTrendsTopicsData = AdminTrendsLookupOutputDto;

export type MarkPortalReviewRepliedData = PortalReviewOutputDto;

export type MatchAccountsData = AdminMatchAccountsOutputDto;

export type MergeCreatorAccountsData = AdminCreatorOutputDto;

/** A month's weather and calendar in the venue's city: why a month may be quiet or loud. */
export interface MonthContext {
	/** Mean daily high, °C, one decimal; absent without weather */
	avgTMax?: number;
	/** School holidays and events overlapping the month, by start */
	events: ContextEvent[];
	/** The month's public holidays, by date */
	holidays: {
		date: string;
		name: string;
	}[];
	month: string;
	/** Days with rain (≥ 1 mm); absent without weather */
	rainDays?: number;
	/** Of those, the ones with rain (≥ 1 mm) on the Saturday or the Sunday; absent without weather */
	rainyWeekends?: number;
	/** Weekends whose Saturday falls in the month */
	weekends: number;
}

export interface NewsletterSubscribeInputDto {
	/** @maxLength 60 */
	citySlug: string;
	/**
	 * @format email
	 * @maxLength 254
	 */
	email: string;
}

/** What the confirm and unsubscribe pages show: the address and the city edition. */
export interface NewsletterSubscriptionOutputDto {
	city: {
		name: string;
		slug: string;
	};
	/** @format date-time */
	confirmedAt?: string;
	email: string;
	/** @format date-time */
	unsubscribedAt?: string;
}

export interface NewsletterTokenInputDto {
	/**
	 * @minLength 10
	 * @maxLength 64
	 */
	token: string;
}

/** Every switch with its state: what `GET /auth/me` returns. */
export interface NotificationPreferences {
	alerts: {
		email: boolean;
		sms: boolean;
	};
	reports: {
		email: boolean;
	};
}

/** Any subset of the switches: what `PATCH /auth/me` takes. */
export interface NotificationPreferencesPatch {
	alerts?: {
		email?: boolean;
		sms?: boolean;
	};
	reports?: {
		email?: boolean;
	};
}

export interface ObservationPoint {
	/** A month `YYYY-MM`, or a week's Monday `YYYY-MM-DD` */
	at: string;
	value: number;
}

export interface OkResponse {
	ok: boolean;
}

export interface OkResponseO1 {
	ok: boolean;
}

/** Construct a type with the properties of T except for those in type K. */
export interface OmitAdminSocialPostListItemOutputDtomentionsfoundByaccount {
	/** @format date-time */
	analysedAt?: string;
	author?: string;
	authorFans?: number;
	comments: number;
	externalId: string;
	id: string;
	isAd: boolean;
	isPromotional?: boolean;
	likes: number;
	locationName?: string;
	platform: OmitAdminSocialPostListItemOutputDtomentionsfoundByaccountPlatformEnum;
	/** @format date-time */
	postedAt: string;
	saves: number;
	shares: number;
	text?: string;
	url: string;
	views: number;
}

export enum OmitAdminSocialPostListItemOutputDtomentionsfoundByaccountPlatformEnum {
	Tiktok = 'tiktok',
	Instagram = 'instagram',
	Blog = 'blog',
}

/** One day's opening hours as Google words them: `{ day: 'Monday', hours: '5 to 11 PM' }`. */
export interface OpeningHoursDay {
	day: string;
	hours: string;
}

/** A delivery or ordering platform Google links from the place ("Order online"). */
export interface OrderPlatform {
	name: string;
	url?: string;
}

export interface PaidVsOrganic {
	/** The usual new reviews a week, for scale */
	baselinePerWeek?: number;
	organic: PostGroupOutcome;
	paid: PostGroupOutcome;
	sentence: string;
}

/** Make all properties in T optional */
export interface PartialOmitCredentialVerificationRequestuser {
	'__@OptionalProps@1124'?: PartialOmitCredentialVerificationRequestuserOptionalProps1124Enum;
	code?: string;
	/** @format date-time */
	createdAt?: string;
	/** @format date-time */
	deletedAt?: string | null;
	email?: string;
	/** @format date-time */
	expiresAt?: string;
	hashedPassword?: string;
	id?: string;
	identifier?: string;
	/** @format date-time */
	lastSentAt?: string;
	mobileNumber?: string;
	sendCount?: number;
	/** From T, pick a set of properties whose keys are in the union K */
	signupInfo?: PickUserfirstNamelastNameacceptedMarketing;
	type?: PartialOmitCredentialVerificationRequestuserTypeEnum;
	/** @format date-time */
	updatedAt?: string;
	/** @format date-time */
	verifiedAt?: string;
	visitorInfo?: Visitor;
}

export enum PartialOmitCredentialVerificationRequestuserOptionalProps1124Enum {
	LastSentAt = 'lastSentAt',
	SendCount = 'sendCount',
	CreatedAt = 'createdAt',
	UpdatedAt = 'updatedAt',
}

export enum PartialOmitCredentialVerificationRequestuserTypeEnum {
	SIGNUP_EMAIL = 'SIGNUP_EMAIL',
	SIGNUP_MOBILE_NUMBER = 'SIGNUP_MOBILE_NUMBER',
	CHANGE_EMAIL = 'CHANGE_EMAIL',
	CHANGE_MOBILE_NUMBER = 'CHANGE_MOBILE_NUMBER',
	FORGOT_PASSWORD = 'FORGOT_PASSWORD',
	LOGIN_EMAIL = 'LOGIN_EMAIL',
}

/** Make all properties in T optional */
export interface PartialRecordPipelineStepEnumnumber {
	ANALYSE_COMMENTS?: number;
	ANALYSE_REVIEWS?: number;
	BUILD_REPORTS?: number;
	EXTRACT_MENTIONS?: number;
	FILL_ACCOUNT_FOLLOWERS?: number;
	FILL_COMPETITORS?: number;
	FIND_OWN_ACCOUNTS?: number;
	LOOKUP_OSM_PLACES?: number;
	LOOKUP_VENUES?: number;
	MATCH_MENTIONS?: number;
	MONTHLY?: number;
	REFRESH_POST_COUNTS?: number;
	REFRESH_VENUE_DETAILS?: number;
	SAMPLE_BUSYNESS?: number;
	SAMPLE_RESERVATIONS?: number;
	SCORE_LEADS?: number;
	SCRAPE_ACCOUNTS?: number;
	SCRAPE_ACCOUNTS_RECENT?: number;
	SCRAPE_BLOGS?: number;
	SCRAPE_COMMENTS?: number;
	SCRAPE_DELIVERY?: number;
	SCRAPE_INSTAGRAM?: number;
	SCRAPE_INSTAGRAM_RECENT?: number;
	SCRAPE_INSTAGRAM_REELS?: number;
	SCRAPE_PRESS?: number;
	SCRAPE_REVIEWS?: number;
	SCRAPE_TIKTOK?: number;
	SCRAPE_TIKTOK_RECENT?: number;
	SCRAPE_VENUES?: number;
	SCRAPE_VENUE_SOCIAL?: number;
	SEARCH_BRANCHES?: number;
	SEARCH_INTEREST?: number;
	SNAPSHOT_RATINGS?: number;
	SYNC_OSM_PLACES?: number;
	TRACK_DISH_SEARCHES?: number;
	TRACK_SEARCH_RANKS?: number;
	WATCH_REVIEWS?: number;
}

/** Make all properties in T optional */
export interface PartialRecordPipelineStepEnumnumberMinimum0Maximum100 {
	/**
	 * @min 0
	 * @max 100
	 */
	ANALYSE_COMMENTS?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	ANALYSE_REVIEWS?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	BUILD_REPORTS?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	EXTRACT_MENTIONS?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	FILL_ACCOUNT_FOLLOWERS?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	FILL_COMPETITORS?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	FIND_OWN_ACCOUNTS?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	LOOKUP_OSM_PLACES?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	LOOKUP_VENUES?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	MATCH_MENTIONS?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	MONTHLY?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	REFRESH_POST_COUNTS?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	REFRESH_VENUE_DETAILS?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	SAMPLE_BUSYNESS?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	SAMPLE_RESERVATIONS?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	SCORE_LEADS?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	SCRAPE_ACCOUNTS?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	SCRAPE_ACCOUNTS_RECENT?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	SCRAPE_BLOGS?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	SCRAPE_COMMENTS?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	SCRAPE_DELIVERY?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	SCRAPE_INSTAGRAM?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	SCRAPE_INSTAGRAM_RECENT?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	SCRAPE_INSTAGRAM_REELS?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	SCRAPE_PRESS?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	SCRAPE_REVIEWS?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	SCRAPE_TIKTOK?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	SCRAPE_TIKTOK_RECENT?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	SCRAPE_VENUES?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	SCRAPE_VENUE_SOCIAL?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	SEARCH_BRANCHES?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	SEARCH_INTEREST?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	SNAPSHOT_RATINGS?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	SYNC_OSM_PLACES?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	TRACK_DISH_SEARCHES?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	TRACK_SEARCH_RANKS?: number;
	/**
	 * @min 0
	 * @max 100
	 */
	WATCH_REVIEWS?: number;
}

/** Make all properties in T optional */
export interface PartialRecordPopularTimesDayArrayPopularTimesHour {
	Fr?: PopularTimesHour[];
	Mo?: PopularTimesHour[];
	Sa?: PopularTimesHour[];
	Su?: PopularTimesHour[];
	Th?: PopularTimesHour[];
	Tu?: PopularTimesHour[];
	We?: PopularTimesHour[];
}

/** A place Google lists under "People also search for". It carries no place id. */
export interface PeopleAlsoSearchPlace {
	category?: string;
	reviewsCount?: number;
	title: string;
	totalScore?: number;
}

/** From T, pick a set of properties whose keys are in the union K */
export interface PickReportDishCountnamecount {
	count: number;
	name: string;
}

/** From T, pick a set of properties whose keys are in the union K */
export interface PickReportReviewStatscountpraisecomplaintswrittenreplyRateavgStars {
	avgStars?: number;
	/** Construct a type with a set of properties K of type T */
	complaints: Recordstringnumber;
	count: number;
	/** topic → how many reviews praised / criticised it */
	praise: Recordstringnumber;
	/** Share of the month's reviews the owner answered, 0–1 */
	replyRate?: number;
	/** Reviews with text; the rest are stars only */
	written: number;
}

export interface PickReportReviewStatscountwrittenreplyRateavgStarsPartialPickReportReviewStatsstarscomplaintscomplaintThemes {
	avgStars?: number;
	/** Construct a type with a set of properties K of type T */
	complaintThemes?: Recordstringnumber;
	/** Construct a type with a set of properties K of type T */
	complaints?: Recordstringnumber;
	count: number;
	/** Share of the month's reviews the owner answered, 0–1 */
	replyRate?: number;
	stars?: {
		count: number;
		stars: number;
	}[];
	/** Reviews with text; the rest are stars only */
	written: number;
}

/** From T, pick a set of properties whose keys are in the union K */
export interface PickReportSocialStatsviewspostCountcreatorsengagements {
	creators: number;
	engagements: number;
	postCount: number;
	views: number;
}

/** From T, pick a set of properties whose keys are in the union K */
export interface PickReportSocialStatsviewspostCountcreatorsengagementspromotional {
	creators: number;
	engagements: number;
	postCount: number;
	promotional: number;
	views: number;
}

/** From T, pick a set of properties whose keys are in the union K */
export interface PickUserfirstNamelastNameacceptedMarketing {
	acceptedMarketing?: boolean;
	firstName: string;
	lastName: string;
}

/** How busy the place usually is in one hour of the day, 0–100 (relative to its own peak). */
export interface PopularTimesHour {
	hour: number;
	occupancyPercent: number;
}

/** A place (`venueId`) or a whole brand (`brandId`), exactly one; for one of the brand's branches with `branchId`. */
export interface PortalAddCompetitorInputDto {
	/** @format uuid */
	branchId?: string;
	/** @format uuid */
	brandId?: string;
	/** @format uuid */
	venueId?: string;
}

/** A branch the portal's place charts can show. */
export interface PortalBranchChoiceOutputDto {
	id: string;
	name: string;
	street?: string;
}

/** A brand as its portal shows it: its open branches, the most reviewed first, and their cities. */
export interface PortalBrandOutputDto {
	branches: PortalVenueOutputDto[];
	/** The most branches first: the first is the portal's city by default */
	cities: PortalCityOutputDto[];
	id: string;
	name: string;
	/** `all`: one report across its cities, so Trends and Patterns read no single city */
	reportScope: PortalBrandOutputDtoReportScopeEnum;
}

/** `all`: one report across its cities, so Trends and Patterns read no single city */
export enum PortalBrandOutputDtoReportScopeEnum {
	City = 'city',
	All = 'all',
}

export interface PortalBrandsOutputDto {
	/** By brand name */
	items: PortalMembershipOutputDto[];
}

/** A city a brand has branches in. */
export interface PortalCityOutputDto {
	id: string;
	name: string;
}

/** A whole brand on the list. */
export interface PortalCompetitorBrandOutputDto {
	/** Its open branches */
	branches: number;
	id: string;
	name: string;
}

/** One entry on the list: a place or a whole brand. */
export interface PortalCompetitorOutputDto {
	/** The brand's branch it competes with; absent for the whole brand */
	branch?: {
		id: string;
		name: string;
		street?: string;
	};
	/** A whole brand on the list. */
	brand?: PortalCompetitorBrandOutputDto;
	/** Its id on the list, to take it off */
	id: number;
	/** Who put it on the list: the brand's people, us, or our first suggestions */
	pickedBy: PortalCompetitorOutputDtoPickedByEnum;
	/** A place the owner can compare with, and its brand. */
	venue?: PortalCompetitorVenueOutputDto;
}

/** Who put it on the list: the brand's people, us, or our first suggestions */
export enum PortalCompetitorOutputDtoPickedByEnum {
	Admin = 'admin',
	Owner = 'owner',
	Suggested = 'suggested',
}

export interface PortalCompetitorSearchOutputDto {
	items: PortalCompetitorVenueOutputDto[];
}

export interface PortalCompetitorSuggestionOutputDto {
	/** "same category", "neighbouring district", … */
	reasons: string[];
	/** A place the owner can compare with, and its brand. */
	venue: PortalCompetitorVenueOutputDto;
}

/** A place the owner can compare with, and its brand. */
export interface PortalCompetitorVenueOutputDto {
	/** Its brand: one with more than one open branch can be added whole */
	brand: {
		branches: number;
		id: string;
		name: string;
	};
	category?: string;
	district?: string;
	id: string;
	name: string;
	rating?: number;
	reviewsCount?: number;
	street?: string;
}

/** The brand's competitors (one list, whoever picked them) and places to add. */
export interface PortalCompetitorsOutputDto {
	/** By name */
	items: PortalCompetitorOutputDto[];
	/** How many a brand can have */
	max: number;
	/** Best first; none when the list is full */
	suggestions: PortalCompetitorSuggestionOutputDto[];
}

/** One author's posts about the brand. */
export interface PortalCreatorOutputDto {
	author: string;
	authorFans?: number;
	/** @format date-time */
	lastPostedAt: string;
	own: boolean;
	/** Of which paid or gifted */
	paid: number;
	platform: PortalCreatorOutputDtoPlatformEnum;
	posts: number;
	/** Their most viewed post */
	url: string;
	views: number;
}

export enum PortalCreatorOutputDtoPlatformEnum {
	Tiktok = 'tiktok',
	Instagram = 'instagram',
	Blog = 'blog',
}

export interface PortalCreatorsOutputDto {
	/** Most viewed first */
	items: PortalCreatorOutputDto[];
}

export interface PortalListCreatorsInputDto {
	/** @pattern ^[0-9]{4}-[0-9]{2}$ */
	month?: string;
	platform?: PortalListCreatorsInputDtoPlatformEnum;
}

export enum PortalListCreatorsInputDtoPlatformEnum {
	Tiktok = 'tiktok',
	Instagram = 'instagram',
	Blog = 'blog',
}

export interface PortalListPostsInputDto {
	/** @pattern ^[0-9]{4}-[0-9]{2}$ */
	month?: string;
	/** @min 1 */
	page: number;
	platform?: PortalListPostsInputDtoPlatformEnum;
	/**
	 * @min 1
	 * @max 50
	 */
	size: number;
}

export enum PortalListPostsInputDtoPlatformEnum {
	Tiktok = 'tiktok',
	Instagram = 'instagram',
	Blog = 'blog',
}

export interface PortalListReviewsInputDto {
	/** Answered on Google or marked answered here */
	answered?: boolean;
	/**
	 * The review's original language, e.g. `de`
	 * @maxLength 12
	 */
	language?: string;
	/** @pattern ^[0-9]{4}-[0-9]{2}$ */
	month?: string;
	/** Written, three stars or fewer, unanswered: the lowest stars first */
	needsReply?: boolean;
	/** @min 1 */
	page: number;
	/** Google or TripAdvisor */
	platform?: PortalListReviewsInputDtoPlatformEnum;
	/**
	 * @min 1
	 * @max 50
	 */
	size: number;
	/**
	 * @min 1
	 * @max 5
	 */
	stars?: number;
	/** A topic the review praised or criticised */
	topic?: PortalListReviewsInputDtoTopicEnum;
}

/** Google or TripAdvisor */
export enum PortalListReviewsInputDtoPlatformEnum {
	Google = 'google',
	Tripadvisor = 'tripadvisor',
}

/** A topic the review praised or criticised */
export enum PortalListReviewsInputDtoTopicEnum {
	Food = 'food',
	Drinks = 'drinks',
	Service = 'service',
	Vibe = 'vibe',
	Price = 'price',
	Payment = 'payment',
	Wait = 'wait',
	Cleanliness = 'cleanliness',
	Other = 'other',
}

export interface PortalMarkReviewRepliedInputDto {
	/** True: the owner answered it on Google; false takes the mark back */
	replied: boolean;
}

/** A brand the signed-in person is a member of. */
export interface PortalMembershipOutputDto {
	/** A brand as its portal shows it: its open branches, the most reviewed first, and their cities. */
	brand: PortalBrandOutputDto;
	id: string;
	role: PortalMembershipOutputDtoRoleEnum;
}

export enum PortalMembershipOutputDtoRoleEnum {
	OWNER = 'OWNER',
	STAFF = 'STAFF',
}

export interface PortalPatternsInputDto {
	/**
	 * The branch whose busyness and open tables to show; the most reviewed when absent
	 * @format uuid
	 */
	branchId?: string;
	/**
	 * The city whose reports to read; the brand's first city when absent
	 * @format uuid
	 */
	cityId?: string;
	/**
	 * How many months, ending with the last finished one; 6 when absent
	 * @min 1
	 * @max 24
	 */
	months?: number;
}

/**
 * One month's computed relations, as its stored report holds them (`ReportData.correlations`).
 * A relation is absent when the report has none (below its floors, or built before relations
 * existed); `reportId` is null for a month without a report.
 */
export interface PortalPatternsMonthOutputDto {
	buzzToReviews?: BuzzToReviews;
	complaintTimes?: ComplaintTimes;
	month: string;
	paidVsOrganic?: PaidVsOrganic;
	reportId: string | null;
}

/** `GET /portal/brands/:brandId/patterns`: the relations month by month and the weeks across months. */
export interface PortalPatternsOutputDto {
	/** The branch they are of; absent without one */
	branchId?: string;
	/** The open branches busyness and booked out can be of */
	branches: PortalBranchChoiceOutputDto[];
	/** Oldest first, ending with the last finished month or a newer report */
	months: PortalPatternsMonthOutputDto[];
	/** Every week touching those months, oldest first */
	weeks: PortalPatternsWeekOutputDto[];
}

/**
 * One week (by its Monday, city time) across the months. Posts, views, reviews and booked-out
 * evenings come from the stored reports, busyness from the Google popular-times samples; each is
 * absent where nothing covers it, never zero.
 */
export interface PortalPatternsWeekOutputDto {
	/** How booked out the week's sampled evenings were, 0–100 */
	booked?: number;
	/** Mean busyness index (0–100 of the venue's own peak) of the week's samples with popular times */
	busyness?: number;
	/** Some of its days fall in a month without a report: the counts cover only part of it */
	partial?: boolean;
	/** Posts by others about the venue and their views, on the week's days that have a report */
	posts?: number;
	/** New Google reviews, on the same days; absent when a covering report lists no reviews */
	reviews?: number;
	views?: number;
	/** `YYYY-MM-DD`, a Monday */
	week: string;
}

export interface PortalPostFiltersOutputDto {
	/** Months with a post about the brand, newest first */
	months: {
		count: number;
		month: string;
	}[];
}

/** A post about the brand and what it said about it. */
export interface PortalPostOutputDto {
	author?: string;
	authorFans?: number;
	comments: number;
	/** What it says about the brand, as feedback rows */
	feedback: FeedbackPointOutputDto[];
	id: string;
	likes: number;
	/** Posted by the brand's own account */
	own: boolean;
	/** An ad, or paid / gifted as the caption reads */
	paid: boolean;
	platform: PortalPostOutputDtoPlatformEnum;
	/** @format date-time */
	postedAt: string;
	saves: number;
	sentiment: PortalPostOutputDtoSentimentEnum;
	shares: number;
	/** What the post said about the brand, one or two sentences */
	summary: string;
	url: string;
	views: number;
	/** False when the creator says they have not been there */
	visited: boolean;
}

export enum PortalPostOutputDtoPlatformEnum {
	Tiktok = 'tiktok',
	Instagram = 'instagram',
	Blog = 'blog',
}

export enum PortalPostOutputDtoSentimentEnum {
	Mixed = 'mixed',
	Positive = 'positive',
	Negative = 'negative',
	Neutral = 'neutral',
}

export interface PortalPostsOutputDto {
	items: PortalPostOutputDto[];
	page: number;
	pageSize: number;
	totalItems: number;
}

/** A month in the archive. */
export interface PortalReportListItemOutputDto {
	/** The city whose branches it covers; absent for a report across all its cities */
	city?: PortalCityOutputDto;
	headline: string;
	id: string;
	month: string;
	/** Which of the brand's reports it is ("Full report", "Reviews"): a month may have several */
	name: string;
	postCount: number;
	reviewCount: number;
	title: string;
	/** @format date-time */
	updatedAt: string;
}

/** A report as the brand reads it: the shared link's document, without the delivery record. */
export interface PortalReportOutputDto {
	/** What moved, and why it might have; absent for reports built before it */
	analysis?: ReportAnalysisPublic;
	/** The business it is on */
	brand: {
		id: string;
		name: string;
	};
	/** The city its branches are in; absent for a report across all the brand's cities */
	city?: {
		id: string;
		name: string;
		slug: string;
	};
	/** The brand's configuration it was built for; absent for a default report or once deleted */
	config?: {
		id: string;
		name: string;
	};
	/** @format date-time */
	createdAt: string;
	/**
	 * Everything a monthly report shows, computed once when it is built. The brand's figures (posts,
	 * reviews, dishes, creators, competitors, own accounts, comments, press, correlations) cover
	 * every branch in `branches`; each place figure is in its branch's entry.
	 */
	data: ReportData;
	highlights: ReportHighlights;
	id: string;
	month: string;
	/** Its configuration's (or the default template's) name at the build */
	name: string;
	postCount: number;
	reviewCount: number;
	/** What it shows, in order: its type's sections as they were at the build */
	sections: ReportSectionDto[];
	/** The template behind it; absent for a custom configuration or once the template is deleted */
	template?: {
		id: string;
		name: string;
	};
	/** @format date-time */
	updatedAt: string;
}

export interface PortalReportsOutputDto {
	/** Newest month first */
	items: PortalReportListItemOutputDto[];
}

/** The values the brand's reviews can be filtered by, with how many reviews carry each. */
export interface PortalReviewFiltersOutputDto {
	languages: {
		count: number;
		language: string;
	}[];
	/** Newest first */
	months: {
		count: number;
		month: string;
	}[];
	/** Written, three stars or fewer, unanswered */
	needsReply: number;
	/** The platforms the brand has reviews on */
	platforms: {
		count: number;
		platform: PortalReviewFiltersOutputDtoPlatformEnum;
	}[];
	topics: {
		count: number;
		topic: PortalReviewFiltersOutputDtoTopicEnum;
	}[];
}

export enum PortalReviewFiltersOutputDtoPlatformEnum {
	Google = 'google',
	Tripadvisor = 'tripadvisor',
}

export enum PortalReviewFiltersOutputDtoTopicEnum {
	Food = 'food',
	Drinks = 'drinks',
	Service = 'service',
	Vibe = 'vibe',
	Price = 'price',
	Payment = 'payment',
	Wait = 'wait',
	Cleanliness = 'cleanliness',
	Other = 'other',
}

/** A Google or TripAdvisor review as the portal lists it. The entity stores no reviewer names. */
export interface PortalReviewOutputDto {
	/** Answered on Google, or marked answered here */
	answered: boolean;
	/** The branch it is about, for a chain's portal (which shows every branch's reviews) */
	branch?: string;
	/** What it says, as feedback rows (none before it is analysed) */
	feedback: FeedbackPointOutputDto[];
	id: string;
	language?: string;
	/**
	 * When the owner marked it answered here
	 * @format date-time
	 */
	markedRepliedAt?: string;
	ownerResponse?: string;
	/** @format date-time */
	ownerResponseAt?: string;
	platform: PortalReviewOutputDtoPlatformEnum;
	/** @format date-time */
	publishedAt: string;
	/** A reply ready to post, in the review's language: unanswered written reviews only, when drafted */
	replyDraft?: string;
	sentiment?: PortalReviewOutputDtoSentimentEnum;
	stars?: number;
	text?: string;
	/** Google's English translation */
	textTranslated?: string;
}

export enum PortalReviewOutputDtoPlatformEnum {
	Google = 'google',
	Tripadvisor = 'tripadvisor',
}

export enum PortalReviewOutputDtoSentimentEnum {
	Mixed = 'mixed',
	Positive = 'positive',
	Negative = 'negative',
	Neutral = 'neutral',
}

export interface PortalReviewsOutputDto {
	items: PortalReviewOutputDto[];
	page: number;
	pageSize: number;
	totalItems: number;
}

export interface PortalSearchCompetitorsInputDto {
	/**
	 * @minLength 2
	 * @maxLength 80
	 */
	q: string;
}

/**
 * The month's busyness: the mean busyness index (the week's ten busiest hours of Google's popular
 * times, 0–100) over the month's samples, and the busiest hour of their mean histogram.
 */
export interface PortalSeriesBusynessOutputDto {
	index: number;
	/** `Mo` … `Su` */
	peakDay?: string;
	peakHour?: number;
	samples: number;
}

/** One competitor's same month, from the venue's report. */
export interface PortalSeriesCompetitorOutputDto {
	avgStars?: number;
	/** Its Friday and Saturday evenings booked out that month (0–100); absent without samples */
	booked?: number;
	creators: number;
	name: string;
	posts: number;
	/** All-time Google rating as of the report */
	rating?: number;
	replyRate?: number;
	reviews?: number;
	/** False when we don't scrape its reviews: the review fields are then unknown, not zero */
	reviewsTracked: boolean;
	venueId: string;
	views: number;
}

export interface PortalSeriesInputDto {
	/**
	 * The branch whose rating, busyness and open tables to show; the most reviewed when absent
	 * @format uuid
	 */
	branchId?: string;
	/**
	 * The city whose reports to read; the brand's first city when absent
	 * @format uuid
	 */
	cityId?: string;
	/**
	 * How many months, ending with the last finished one; 12 when absent
	 * @min 1
	 * @max 24
	 */
	months?: number;
}

/** One month of the venue's series. `null` where the month has no data. */
export interface PortalSeriesMonthOutputDto {
	/** Its Friday and Saturday evenings booked out (0–100), the month's mean; absent without samples */
	booked?: number;
	/** Google popular times sampled in the month; absent when none were (not tracked, or no popular times) */
	busyness?: PortalSeriesBusynessOutputDto;
	/** The competitors picked that month; empty when none were */
	competitors: PortalSeriesCompetitorOutputDto[];
	/** The month's most talked-about dishes, most first, eight at most */
	dishes:
		| {
				count: number;
				name: string;
		  }[]
		| null;
	/**
	 * The median booked-out share of the other venues of its district sampled on its evenings that
	 * month; absent without its own samples or below 5 venues
	 */
	districtBooked?: number;
	/** `YYYY-MM` */
	month: string;
	/** The venue's own accounts as scraped at the month's close; absent when none was */
	ownAccounts?: PortalSeriesOwnAccountOutputDto[];
	/** All-time Google rating and review count at the close of the month */
	rating: number | null;
	/** The month's report, to open from the chart; null when there is none */
	reportId: string | null;
	/** The month's Google reviews. */
	reviews: PortalSeriesReviewsOutputDtoNullable;
	reviewsCount: number | null;
	/** The posts by others about a venue in a month (its own account's never count). */
	social: PortalSeriesSocialOutputDtoNullable;
	/** Topic → how many written reviews raised it that month (a review counts once per topic). */
	topics: PortalSeriesTopicsOutputDtoNullable;
}

export interface PortalSeriesOutputDto {
	/** The branch they are of; absent without one */
	branchId?: string;
	/** The open branches the place figures (rating, busyness, open tables) can be of */
	branches: PortalBranchChoiceOutputDto[];
	/** The city's weather, holidays and events per month, same months: the charts' bands */
	calendar: CityMonthContextOutputDto[];
	/** Every competitor that appears in the window, by name: the charts' faint lines */
	competitors: {
		name: string;
		venueId: string;
	}[];
	/** Oldest first, one row per month, months without a report included */
	months: PortalSeriesMonthOutputDto[];
}

/** One own account at a month's close (`SocialAccountSnapshot`). */
export interface PortalSeriesOwnAccountOutputDto {
	/** Over its latest posts, ten at most */
	avgViews?: number;
	followers?: number;
	handle: string;
	platform: PortalSeriesOwnAccountOutputDtoPlatformEnum;
	/** Everything the profile shows */
	posts?: number;
}

export enum PortalSeriesOwnAccountOutputDtoPlatformEnum {
	Instagram = 'instagram',
	Tiktok = 'tiktok',
}

/** The month's Google reviews. */
export interface PortalSeriesReviewsOutputDto {
	avgStars?: number;
	count: number;
	/** 0–1 */
	replyRate?: number;
	/** Reviews with text: what topic shares are out of */
	written: number;
}

/** The month's Google reviews. */
export type PortalSeriesReviewsOutputDtoNullable = {
	avgStars?: number;
	count: number;
	/** 0–1 */
	replyRate?: number;
	/** Reviews with text: what topic shares are out of */
	written: number;
} | null;

/** The posts by others about a venue in a month (its own account's never count). */
export interface PortalSeriesSocialOutputDto {
	creators: number;
	engagements: number;
	posts: number;
	/** Absent for a month read from the next report's look back */
	sentiment?: {
		mixed: number;
		negative: number;
		neutral: number;
		positive: number;
	};
	views: number;
}

/** The posts by others about a venue in a month (its own account's never count). */
export type PortalSeriesSocialOutputDtoNullable = {
	creators: number;
	engagements: number;
	posts: number;
	/** Absent for a month read from the next report's look back */
	sentiment?: {
		mixed: number;
		negative: number;
		neutral: number;
		positive: number;
	};
	views: number;
} | null;

/** Topic → how many written reviews raised it that month (a review counts once per topic). */
export interface PortalSeriesTopicsOutputDto {
	/** Construct a type with a set of properties K of type T */
	complaints: Recordstringnumber;
	/** Construct a type with a set of properties K of type T */
	praise: Recordstringnumber;
}

/** Topic → how many written reviews raised it that month (a review counts once per topic). */
export type PortalSeriesTopicsOutputDtoNullable = {
	/** Construct a type with a set of properties K of type T */
	complaints: Recordstringnumber;
	/** Construct a type with a set of properties K of type T */
	praise: Recordstringnumber;
} | null;

/** Where the monthly report goes and in which language. */
export interface PortalSettingsOutputDto {
	/** The address the report mail goes to */
	contactEmail?: string;
	/** False when we keep no record to write to (the brand is not on our list) */
	editable: boolean;
	/** The language of our mails to them */
	language: PortalSettingsOutputDtoLanguageEnum;
}

/** The language of our mails to them */
export enum PortalSettingsOutputDtoLanguageEnum {
	En = 'en',
	De = 'de',
}

export interface PortalUpdateSettingsInputDto {
	/**
	 * `null` clears it
	 * @format email
	 * @maxLength 300
	 */
	contactEmail?: string | null;
	language?: PortalUpdateSettingsInputDtoLanguageEnum;
}

export enum PortalUpdateSettingsInputDtoLanguageEnum {
	En = 'en',
	De = 'de',
}

/** One of a brand's places, as its portal shows it. */
export interface PortalVenueOutputDto {
	category?: string;
	district?: string;
	googleUrl?: string;
	id: string;
	/** Google's city or locality, e.g. "Berlin" */
	locality?: string;
	name: string;
	rating?: number;
	reviewsCount?: number;
	street?: string;
}

export interface PostGroupOutcome {
	medianViews: number;
	posts: number;
	/** New reviews in the seven days after a post, on average */
	reviewsAfter: number;
}

export type PreviewEntryData = BlogEntryOutputDto;

export type PreviewReportDataData = ReportData;

export type PublishCityHighlightData = AdminCityHighlightOutputDto;

export type PublishFoodTrendsData = AdminFoodTrendsReportOutputDto;

export type PublishLandingEditionData = AdminLandingEditionOutputDto;

export type PullFoodTrendsSearchesData = AdminFoodTrendsReportOutputDto;

export type ReadAllNotificationsData = OkResponse;

export type ReadNotificationData = OkResponse;

export type RecheckDishLinksData = AdminRecheckDishLinksOutputDto;

/** Construct a type with a set of properties K of type T */
export interface RecordAdminBrandSegmentnumber {
	all: number;
	chains: number;
	customers: number;
	prospects: number;
	talked: number;
}

export type RecordSharedReportOpenData = any;

/** Construct a type with a set of properties K of type T */
export type RecordstringRecordstringboolean = Record<string, Recordstringboolean>;

/** Construct a type with a set of properties K of type T */
export type Recordstringboolean = Record<string, boolean>;

/** Construct a type with a set of properties K of type T */
export type Recordstringnumber = Record<string, number>;

/** Construct a type with a set of properties K of type T */
export type Recordstringstring = Record<string, string>;

/** Construct a type with a set of properties K of type T */
export type Recordstringstringnumberbooleannull = Record<
	string,
	string | null | number | null | boolean | null
>;

/** Construct a type with a set of properties K of type T */
export type Recordstringunknown = Record<string, any>;

export type ReflagOpeningsData = AdminReflagOpeningsOutputDto;

export type RefreshTokenData = RefreshTokenOutputDto;

export interface RefreshTokenInputDto {
	/**
	 * Optional since the `refreshToken` cookie is accepted as a fallback; a value sent here
	 * takes precedence over the cookie.
	 */
	refreshToken?: string;
}

export interface RefreshTokenOutputDto {
	accessToken: string;
	/** @format date-time */
	accessTokenExpiresAt: string;
}

export type RegisterViewData = OkResponse;

export type RelinkFoodTopicsData = AdminRelinkFoodTopicsOutputDto;

export type RemoveBrandAccountData = AdminAccountOutputDto[];

export type RemoveBrandBranchData = AdminBrandOutputDto;

export type RemoveBrandCompetitorData = AdminCompetitorOutputDto[];

export type RemoveCityEventData = any;

export type RemoveOutreachTouchData = AdminProspectOutputDto;

export type RemovePortalCompetitorData = PortalCompetitorsOutputDto;

export type RemovePortalMemberData = AdminProspectOutputDto;

export type RemoveProspectData = any;

export interface ReportAnalysis {
	builtAt: string;
	/** For the top observations, in their order */
	investigations: ReportInvestigation[];
	/** Ranked, the most important first, every one found (capped), each with its checks */
	observations: ReportObservation[];
	/** How the analysis went: for the admin report page. */
	trace: ReportAnalysisTrace;
}

/** What a shared link or the portal gets: the trace is the admin's. */
export interface ReportAnalysisPublic {
	builtAt: string;
	/** For the top observations, in their order */
	investigations: ReportInvestigation[];
	/** Ranked, the most important first, every one found (capped), each with its checks */
	observations: ReportObservation[];
}

/** How the analysis went: for the admin report page. */
export interface ReportAnalysisTrace {
	durationMs: number;
	/** The agent failed: the investigations are fallbacks */
	error?: string;
	model: string;
	/** The model's own steps (each tool round is one) */
	modelSteps?: number;
	/** The model's own notes on what it looked up and why each label is what it is */
	notes?: string;
	/** Lines the check dropped or replaced */
	problems: {
		problem: string;
		where: string;
	}[];
	/** The model's reasoning text, cut */
	reasoning?: string;
	/** The agent was not called: `no notable move`, `no previous month` */
	skipped?: string;
	steps: ReportAnalysisTraceStep[];
	/** Tool calls that ran (a refused one is in `steps` only) */
	toolCalls: number;
	usage?: {
		inputTokens?: number;
		outputTokens?: number;
		totalTokens?: number;
	};
}

export interface ReportAnalysisTraceStep {
	durationMs?: number;
	input: any;
	/** The result cut short */
	resultSummary: string;
	step: number;
	tool: string;
}

/** One figure of the venue against the month's report venues of its city. */
export interface ReportBaselineMetric {
	/** Median over the report venues that have one */
	median?: number;
	/** Share of the other report venues that have one it is ahead of, ties counted half, 0–100 */
	percentile?: number;
	/** Absent when the venue has none (no reviews this month) */
	venue?: number;
	/** Report venues that have one, the venue included */
	venues: number;
}

/** The median booked-out share (0–100) of a group of venues, and how many venues it covers. */
export interface ReportBookedMedian {
	median: number;
	venues: number;
}

/**
 * One open branch the report covers: where it is, its own month beside the brand's (the posts
 * that named it and its reviews, cut like a competitor) and its place figures. A one-branch
 * brand has one. Place figures are never summed or averaged across branches: Google scales
 * busyness to each place's own peak, and a search rank or a neighbourhood belongs to one address.
 */
export interface ReportBranch {
	/** What Google Maps says it offers ("Outdoor seating", "Delivery", …); absent when unknown */
	amenities?: string[];
	/** Google popular times by week next to the brand's views ("Did the buzz fill the place?"); absent when not sampled */
	busyness?: ReportBusyness;
	category?: string;
	/** Its city, in a report across cities (the brand's `reportScope` `all`) */
	city?: string;
	/** Open Friday and Saturday tables on its booking platform; absent when not sampled */
	demand?: ReportDemand;
	district?: string;
	/** The branch's Google Maps page */
	googleUrl?: string;
	name: string;
	/** Its district this quarter; absent without a district */
	neighbourhood?: ReportNeighbourhood;
	/** Other food places talked about this month in its district, its brand's left out */
	neighbours: ReportNeighbour[];
	/** Its delivery listings and its menu's price position; absent without a delivery listing */
	prices?: ReportPrices;
	/** All-time Google figures */
	rating?: number;
	/** Its all-time Google rating against its district's and its kind of food's venues; absent without a rating or 5 peers either way */
	ratingBenchmark?: ReportRatingBenchmark;
	/** The last six months' closing snapshots up to the report month, oldest first */
	ratingTrend: ReportRatingPoint[];
	/** From T, pick a set of properties whose keys are in the union K */
	reviews: PickReportReviewStatscountpraisecomplaintswrittenreplyRateavgStars;
	reviewsCount?: number;
	/** All-time Google review count per star, as of the build; absent when unknown */
	reviewsDistribution?: ReviewsDistribution;
	/** Where it ranks on the Google Maps searches a guest would type; absent when not tracked this month */
	searchRanks?: ReportSearchRank[];
	/** From T, pick a set of properties whose keys are in the union K */
	social: PickReportSocialStatsviewspostCountcreatorsengagements;
	street?: string;
	/** Its place: the competing venue, or a rival brand's most reviewed branch in the city (busyness, open tables and menus are that branch's) */
	venueId: string;
}

/** The business the report is on. */
export interface ReportBrand {
	/** Posts by others that named the brand but no branch: in `social`, in no branch's */
	brandOnlyPosts: number;
	/** The Google category most of its branches share */
	category?: string;
	id: string;
	name: string;
}

/** "Did the buzz fill the place?": Google popular times sampled twice a week. */
export interface ReportBusyness {
	/** Mean busyness index (the week's ten busiest hours, 0–100) over the month's samples */
	index: number;
	/** Mean of the live percent where Google showed one at sampling (19:00 local) */
	livePercent?: number;
	/** Google's busiest hour, from the mean of the month's samples. */
	peak?: ReportPeakHour;
	/** The month before, the same way; absent when it had no sample with popular times */
	previous?: {
		index: number;
		month: string;
		/** Google's busiest hour, from the mean of the month's samples. */
		peak?: ReportPeakHour;
		samples: number;
		weeks: ReportBusynessWeek[];
	};
	samples: number;
	/** The month's weeks, first to last */
	weeks: ReportBusynessWeek[];
}

/** One week (by its Monday, city time) of the month. */
export interface ReportBusynessWeek {
	/** How booked out the sampled evenings were, 0–100; absent when not sampled */
	booked?: number;
	/** Mean busyness index of the week's samples; absent when none had popular times */
	index?: number;
	/** Posts by others and their views that week (the report month only) */
	posts?: number;
	views?: number;
	week: string;
}

/** The changes guests noticed about one thing (a feedback theme), across the month's reviews. */
export interface ReportChangeTheme {
	/** How they put it, each spelling once */
	details: string[];
	label: string;
	/** Reviews noticing it, each once */
	reviews: number;
	/** Absent while the changes are not filed yet */
	theme?: ReportChangeThemeThemeEnum;
}

/** Absent while the changes are not filed yet */
export enum ReportChangeThemeThemeEnum {
	Language = 'language',
	Taste = 'taste',
	Other = 'other',
	Freshness = 'freshness',
	Temperature = 'temperature',
	Cooking = 'cooking',
	Seasoning = 'seasoning',
	PortionSize = 'portion_size',
	IngredientQuality = 'ingredient_quality',
	MenuVariety = 'menu_variety',
	Availability = 'availability',
	QualityChange = 'quality_change',
	Authenticity = 'authenticity',
	Presentation = 'presentation',
	FoodOther = 'food_other',
	DrinkQuality = 'drink_quality',
	DrinkSelection = 'drink_selection',
	DrinksOther = 'drinks_other',
	Friendliness = 'friendliness',
	Attentiveness = 'attentiveness',
	SpeedOfService = 'speed_of_service',
	OrderAccuracy = 'order_accuracy',
	Advice = 'advice',
	ReservationHandling = 'reservation_handling',
	ComplaintHandling = 'complaint_handling',
	TakeawayHandling = 'takeaway_handling',
	StaffChange = 'staff_change',
	ServiceOther = 'service_other',
	Atmosphere = 'atmosphere',
	Noise = 'noise',
	Space = 'space',
	Interior = 'interior',
	OutdoorSeating = 'outdoor_seating',
	Crowding = 'crowding',
	Location = 'location',
	FamilyPets = 'family_pets',
	VibeOther = 'vibe_other',
	PriceLevel = 'price_level',
	ValueForMoney = 'value_for_money',
	PriceIncrease = 'price_increase',
	ExtraCharges = 'extra_charges',
	PriceOther = 'price_other',
	CashOnly = 'cash_only',
	CardPayment = 'card_payment',
	Tipping = 'tipping',
	Billing = 'billing',
	PaymentOther = 'payment_other',
	Queue = 'queue',
	WaitForFood = 'wait_for_food',
	WaitForTable = 'wait_for_table',
	WaitOther = 'wait_other',
	Toilets = 'toilets',
	DiningArea = 'dining_area',
	FoodHygiene = 'food_hygiene',
	CleanlinessOther = 'cleanliness_other',
	OpeningHours = 'opening_hours',
	Accessibility = 'accessibility',
	OwnershipChange = 'ownership_change',
	Renovation = 'renovation',
	DeliveryPlatform = 'delivery_platform',
	Amenities = 'amenities',
}

/** A standard question about a move, answered in code before the model sees it. */
export interface ReportCheck {
	/** One quotable sentence with its numbers */
	answer: string;
	question: string;
	resolution: ReportCheckResolutionEnum;
	/** What the answer does to "something at your place changed"; `unknown` when the data is missing */
	verdict: ReportCheckVerdictEnum;
}

export enum ReportCheckResolutionEnum {
	Week = 'week',
	Day = 'day',
	Month = 'month',
}

/** What the answer does to "something at your place changed"; `unknown` when the data is missing */
export enum ReportCheckVerdictEnum {
	Unknown = 'unknown',
	Neutral = 'neutral',
	Supports = 'supports',
	Weakens = 'weakens',
}

/** "What the city is talking about": its rising cuisines and dishes and the venue's standing. */
export interface ReportCitySection {
	baseline: {
		/** This month's Google reviews */
		avgStars: ReportBaselineMetric;
		/** Posts by others and their views */
		posts: ReportBaselineMetric;
		/** 0–1 */
		replyRate: ReportBaselineMetric;
		/** The month's report venues compared, the venue included */
		venues: number;
		/** One figure of the venue against the month's report venues of its city. */
		views: ReportBaselineMetric;
	};
	cityName: string;
	/** The venue's kind of food and where it stands among the month's venues of that kind. */
	cuisine?: ReportCuisinePlacement;
	/** The city's matched mentions in posts by others this month */
	mentions: number;
	/** Up to five rows each, the biggest climb in share first */
	risingCuisines: ReportTrendRow[];
	risingDishes: ReportTrendRow[];
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
	/** 0–1: the median share at the other report venues with 5+ written reviews */
	median: number;
	/** The brand's written reviews raising it */
	reviews: number;
	topic: string;
	/** 0–1 of the brand's written reviews */
	venueShare: number;
	/** How many report venues the median is over */
	venues: number;
}

/** One post's comments by what they say. */
export interface ReportCommentPost {
	author?: string;
	/** Classified comments stored for it */
	comments: number;
	/** One line on what the disagreeing comments say */
	disagreement?: string;
	/** intent → comments: `intent`, `confirmation`, `disagreement`, `question`, `tag`, `other` */
	intents: Recordstringnumber;
	postId: string;
	url: string;
	views: number;
}

/** A kind of question viewers kept asking. */
export interface ReportCommentQuestion {
	/** What to do about it, when enough people asked */
	action?: string;
	count: number;
	/** The most liked wording of it, in English */
	example: string;
	/** `location`, `price`, `hours`, `menu`, `dietary`, `payment`, `reservation`, `other` */
	topic: string;
}

/** What viewers said under the venue's top TikTok posts of the month. */
export interface ReportComments {
	/** Classified comments over all posts */
	comments: number;
	/** Construct a type with a set of properties K of type T */
	intents: Recordstringnumber;
	/** Most viewed first */
	posts: ReportCommentPost[];
	/** The three most asked kinds of question, most asked first */
	questions: ReportCommentQuestion[];
}

/** A venue the owner competes with, over the same month. */
export interface ReportCompetitor {
	/** Picked for one of a chain's branches, not the whole brand: that branch's name and street */
	against?: string;
	/** Picked for one of the brand's branches: that branch's id (`against` names it); absent for the whole brand */
	branchId?: string;
	/** A whole chain: its open branches in the city, counted together */
	branches?: number;
	/**
	 * Its mean busyness index this month and the month before; absent without a sample with popular
	 * times. Google scales each venue to its own peak, so only the change is shown, never the level
	 */
	busyness?: {
		index: number;
		previousIndex?: number;
	};
	category?: string;
	/**
	 * Its Friday and Saturday evenings booked out (0–100), the month's mean over its sampled
	 * evenings; absent without samples. Comparable with the venue's: the same question is asked of each
	 */
	demand?: {
		booked: number;
		evenings: number;
	};
	district?: string;
	name: string;
	/** All-time Google figures */
	rating?: number;
	/** From T, pick a set of properties whose keys are in the union K */
	reviews: PickReportReviewStatscountpraisecomplaintswrittenreplyRateavgStars;
	reviewsCount?: number;
	/** Whether we scrape its Google reviews at all: without, `reviews` is empty, not zero */
	reviewsTracked: boolean;
	/** From T, pick a set of properties whose keys are in the union K */
	social: PickReportSocialStatsviewspostCountcreatorsengagements;
	/** Its place: the competing venue, or a rival brand's most reviewed branch in the city (busyness, open tables and menus are that branch's) */
	venueId: string;
}

/** The computed relations; each absent below its floors (10 reviews, 3 posts). */
export interface ReportCorrelations {
	buzzToReviews?: BuzzToReviews;
	complaintTimes?: ComplaintTimes;
	paidVsOrganic?: PaidVsOrganic;
}

/** One creator's posts about the venue this month. */
export interface ReportCreator {
	author: string;
	authorFans?: number;
	platform: ReportCreatorPlatformEnum;
	posts: number;
	/** How many of their posts were paid or gifted */
	promotional: number;
	/** Their most viewed post */
	url: string;
	views: number;
	/** Whether any of their posts shows a visit */
	visited: boolean;
}

export enum ReportCreatorPlatformEnum {
	Blog = 'blog',
	Instagram = 'instagram',
	Tiktok = 'tiktok',
}

/** The venue's kind of food and where it stands among the month's venues of that kind. */
export interface ReportCuisinePlacement {
	delta?: number;
	key: string;
	label: string;
	prevShare?: number;
	/** The venue's place among them by views; absent when nobody posted about it */
	rank?: number;
	/** Its share of the city's mentions now and the month before, when the trend table lists it */
	share?: number;
	/** Venues mentioned for this kind of food this month, in posts by others */
	venues: number;
}

/**
 * Everything a monthly report shows, computed once when it is built. The brand's figures (posts,
 * reviews, dishes, creators, competitors, own accounts, comments, press, correlations) cover
 * every branch in `branches`; each place figure is in its branch's entry.
 */
export interface ReportData {
	/** Every open branch covered, the most Google reviews first */
	branches: ReportBranch[];
	/** The business the report is on. */
	brand: ReportBrand;
	/** What the city talked about and the brand against the month's report brands; absent below 200 matched mentions in the city, and across cities */
	city?: ReportCitySection;
	/** What viewers said under the brand's top TikTok posts; absent when no comment was scraped */
	comments?: ReportComments;
	/** The places and rival brands the brand competes with (brand-wide and per branch) */
	competitors: ReportCompetitor[];
	/** The month's weather, public holidays and events in the city (`CityDayService.month`); absent across cities */
	context?: MonthContext;
	/** Buzz to reviews, complaints by time, paid against organic, over every branch's Google reviews; absent below the floors */
	correlations?: ReportCorrelations;
	/** The top eight creators by views of their posts about the brand, one row per author */
	creators: ReportCreator[];
	/** Creators who covered its branches' district neighbours but not the brand, top eight by followers */
	creatorsNearby: ReportNearbyCreator[];
	dishes: ReportDishCount[];
	month: string;
	/** The brand's own TikTok and Instagram accounts at the month's close (a branch's own named); absent when none is tracked */
	ownAccounts?: ReportOwnAccount[];
	/** Posts from the brand's own accounts: not word of mouth, kept out of `social` */
	ownPosts: ReportPost[];
	posts: ReportPost[];
	/** The month's press and listicles naming the brand; absent when none was found */
	press?: ReportPress;
	/** Absent for a first report: the brand has neither posts nor reviews the month before */
	previous?: ReportPreviousMonth;
	reviews: ReportReviewStats;
	social: ReportSocialStats;
}

/** The venue's (or a competitor's) page on a delivery platform. */
export interface ReportDeliveryListing {
	currency?: string;
	deliveryFee?: number;
	minOrder?: number;
	platform: string;
	rating?: number;
	reviewsCount?: number;
	url: string;
}

export interface ReportDeliveryListingnamestring {
	currency?: string;
	deliveryFee?: number;
	minOrder?: number;
	name: string;
	platform: string;
	rating?: number;
	reviewsCount?: number;
	url: string;
}

/** Open tables on a booking platform for Friday and Saturday evenings. */
export interface ReportDemand {
	/** Mean share of closed evening slots over the month's sampled evenings, 0–100 */
	booked: number;
	/** The same over the city */
	city?: ReportBookedMedian;
	/**
	 * The median booked-out share of the other venues sampled in its district for the same
	 * evenings, and how many; absent below 5 venues
	 */
	district?: ReportBookedMedian;
	evenings: {
		booked: number;
		date: string;
	}[];
	/** The platform behind Google's booking page ("OpenTable"), when the page names one */
	partner?: string;
	/** `google` (Google's own booking page), `thefork` or `opentable` */
	platform: string;
	/** The month before, when sampled */
	previousBooked?: number;
}

export interface ReportDishCount {
	count: number;
	name: string;
	negative: number;
	positive: number;
}

/**
 * A praise or complaint point as a report keeps it: the report's own copy, built from the feedback
 * rows at build time, so a stored report never moves with them.
 */
export interface ReportFeedbackPoint {
	detail: string;
	theme?: ReportFeedbackPointThemeEnum;
	topic: ReportFeedbackPointTopicEnum;
}

export enum ReportFeedbackPointThemeEnum {
	Language = 'language',
	Taste = 'taste',
	Other = 'other',
	Freshness = 'freshness',
	Temperature = 'temperature',
	Cooking = 'cooking',
	Seasoning = 'seasoning',
	PortionSize = 'portion_size',
	IngredientQuality = 'ingredient_quality',
	MenuVariety = 'menu_variety',
	Availability = 'availability',
	QualityChange = 'quality_change',
	Authenticity = 'authenticity',
	Presentation = 'presentation',
	FoodOther = 'food_other',
	DrinkQuality = 'drink_quality',
	DrinkSelection = 'drink_selection',
	DrinksOther = 'drinks_other',
	Friendliness = 'friendliness',
	Attentiveness = 'attentiveness',
	SpeedOfService = 'speed_of_service',
	OrderAccuracy = 'order_accuracy',
	Advice = 'advice',
	ReservationHandling = 'reservation_handling',
	ComplaintHandling = 'complaint_handling',
	TakeawayHandling = 'takeaway_handling',
	StaffChange = 'staff_change',
	ServiceOther = 'service_other',
	Atmosphere = 'atmosphere',
	Noise = 'noise',
	Space = 'space',
	Interior = 'interior',
	OutdoorSeating = 'outdoor_seating',
	Crowding = 'crowding',
	Location = 'location',
	FamilyPets = 'family_pets',
	VibeOther = 'vibe_other',
	PriceLevel = 'price_level',
	ValueForMoney = 'value_for_money',
	PriceIncrease = 'price_increase',
	ExtraCharges = 'extra_charges',
	PriceOther = 'price_other',
	CashOnly = 'cash_only',
	CardPayment = 'card_payment',
	Tipping = 'tipping',
	Billing = 'billing',
	PaymentOther = 'payment_other',
	Queue = 'queue',
	WaitForFood = 'wait_for_food',
	WaitForTable = 'wait_for_table',
	WaitOther = 'wait_other',
	Toilets = 'toilets',
	DiningArea = 'dining_area',
	FoodHygiene = 'food_hygiene',
	CleanlinessOther = 'cleanliness_other',
	OpeningHours = 'opening_hours',
	Accessibility = 'accessibility',
	OwnershipChange = 'ownership_change',
	Renovation = 'renovation',
	DeliveryPlatform = 'delivery_platform',
	Amenities = 'amenities',
}

export enum ReportFeedbackPointTopicEnum {
	Food = 'food',
	Drinks = 'drinks',
	Service = 'service',
	Vibe = 'vibe',
	Price = 'price',
	Payment = 'payment',
	Wait = 'wait',
	Cleanliness = 'cleanliness',
	Other = 'other',
}

export interface ReportHighlights {
	actions: ReportPoint[];
	headline: string;
	highlights: ReportPoint[];
	/** The cover title, at most 8 words */
	title: string;
}

export interface ReportHypothesis {
	confidence: ReportHypothesisConfidenceEnum;
	evidenceAgainst: string[];
	evidenceFor: string[];
	/** Worded as a possibility ("could", "may have"), never a fact */
	reason: string;
}

export enum ReportHypothesisConfidenceEnum {
	Likely = 'likely',
	Possible = 'possible',
	Unclear = 'unclear',
}

/** What the model made of one observation, after the check. */
export interface ReportInvestigation {
	/** What the data cannot settle */
	cannotTell?: string;
	/** `whatHappened` is the observation's own sentence: the model's line failed the check or was missing */
	fallback?: boolean;
	hypotheses: ReportHypothesis[];
	/** The observation's key */
	key: string;
	whatHappened: string;
	/** Things only the owner can check, each starting with a verb */
	worthChecking: string[];
}

/** A creator who covered district neighbours this month but not the venue: someone to invite. */
export interface ReportNearbyCreator {
	author: string;
	authorFans?: number;
	platform: ReportNearbyCreatorPlatformEnum;
	/** Their non-promotional posts about neighbours this month */
	posts: number;
	/** Their most viewed of those posts */
	url: string;
	/** The neighbours they covered, most viewed first */
	venues: string[];
	views: number;
}

export enum ReportNearbyCreatorPlatformEnum {
	Blog = 'blog',
	Instagram = 'instagram',
	Tiktok = 'tiktok',
}

export interface ReportNeighbour {
	category?: string;
	name: string;
	posts: number;
	venueId: string;
	views: number;
}

export interface ReportNeighbourhood {
	/** Openings and closures around the venue over the three months ending with the report's. */
	changes: ReportNeighbourhoodChanges;
}

/** A neighbour that opened, closed or reopened this quarter. */
export interface ReportNeighbourhoodChange {
	category?: string;
	/** When a scrape first saw it, or the first post saying it had just opened, `YYYY-MM-DD` */
	date: string;
	kind: ReportNeighbourhoodChangeKindEnum;
	name: string;
	/** On the venue's own street */
	sameStreet: boolean;
	/** `posts`: an opening only a matched post announced (`Mention.isNewOpening`); absent when a scrape saw it */
	source?: ReportNeighbourhoodChangeSourceEnum;
	street?: string;
	venueId: string;
}

export enum ReportNeighbourhoodChangeKindEnum {
	Reopened = 'reopened',
	Opened = 'opened',
	TemporarilyClosed = 'temporarily_closed',
	PermanentlyClosed = 'permanently_closed',
}

/** `posts`: an opening only a matched post announced (`Mention.isNewOpening`); absent when a scrape saw it */
export enum ReportNeighbourhoodChangeSourceEnum {
	Posts = 'posts',
}

/** Openings and closures around the venue over the three months ending with the report's. */
export interface ReportNeighbourhoodChanges {
	closed: number;
	district: string;
	/** First and last month of the window, `YYYY-MM` */
	from: string;
	/** In the district, the venue left out; `closed` is temporary and permanent closures; `opened` counts post-flagged openings too */
	opened: number;
	/** Of `opened`, the ones only a post announced; absent when none */
	openedFromPosts?: number;
	reopened: number;
	/** The same on the venue's street; absent when its street is unknown */
	street?: {
		closed: number;
		name: string;
		opened: number;
		openedFromPosts?: number;
		reopened: number;
	};
	to: string;
	/** Newest first, the street's first, twelve at most */
	venues: ReportNeighbourhoodChange[];
}

/** One notable move of the month, found by `observe`. */
export interface ReportObservation {
	/** A place figure's branch; never summed across branches */
	branchId?: string;
	branchName?: string;
	/** In the unit; shares and points as percentage points */
	change: number;
	/** For counts */
	changePercent?: number;
	/** The playbook's answers */
	checks: ReportCheck[];
	/** "August 2026", "your usual pace (6 months)", "the city median" */
	comparedWith: string;
	competitor?: string;
	from: number;
	/** Stable: `views`, `rating:<venueId>`, `search_rank:<venueId>:<query>`, `complaint_theme:wait` */
	key: string;
	kind: ReportObservationKindEnum;
	/** "Views", "Google rating · Oranienstraße" */
	label: string;
	metric: ReportObservationMetricEnum;
	/** The report month, `YYYY-MM` */
	month: string;
	query?: string;
	/** Keys of sibling observations (posts and views moving together) */
	related?: string[];
	resolution: ReportObservationResolutionEnum;
	/** Ranking score; admin only */
	score: number;
	/** The deterministic sentence: the fallback when the model's fails the check */
	sentence: string;
	/** For the sparkline, oldest first */
	series: ObservationPoint[];
	/** "TikTok and Instagram", "Google reviews", "Google Maps", "Instagram */
	source: string;
	theme?: string;
	to: number;
	unit: ReportObservationUnitEnum;
}

export enum ReportObservationKindEnum {
	Shift = 'shift',
	Dip = 'dip',
	Spike = 'spike',
	RankMove = 'rank_move',
}

export enum ReportObservationMetricEnum {
	Views = 'views',
	Posts = 'posts',
	Rating = 'rating',
	Reviews = 'reviews',
	Creators = 'creators',
	Followers = 'followers',
	Busyness = 'busyness',
	WrittenReviews = 'written_reviews',
	ReviewWeek = 'review_week',
	AvgStars = 'avg_stars',
	ReplyRate = 'reply_rate',
	FiveStarShare = 'five_star_share',
	Booked = 'booked',
	SearchRank = 'search_rank',
	ComplaintTheme = 'complaint_theme',
	DishShare = 'dish_share',
	CompetitorReach = 'competitor_reach',
}

export enum ReportObservationResolutionEnum {
	Week = 'week',
	Day = 'day',
	Month = 'month',
}

export enum ReportObservationUnitEnum {
	Views = 'views',
	Index = 'index',
	Count = 'count',
	Points = 'points',
	Share = 'share',
	Followers = 'followers',
	Rank = 'rank',
	Stars = 'stars',
}

/** One of the brand's own accounts at the close of the month (the brand's, or a branch's in the report's city). */
export interface ReportOwnAccount {
	postsLast30Days?: number;
	avgLikes?: number;
	/** Over its latest posts, ten at most */
	avgViews?: number;
	/** A branch's own account (a chain may have one per branch): the branch's name and street */
	branch?: string;
	/**
	 * Average views of this month's posts by others on the same platform over `avgViews`, one
	 * decimal: "creators got 18× the views of your own posts". Absent when either is unknown
	 */
	creatorViewsMultiple?: number;
	/**
	 * The follower count each day a scrape saw the profile in the month, oldest first (the weekly
	 * profile scrape, a post item repeating it): week-level points for the analysis; absent without any
	 */
	followerPoints?: {
		date: string;
		followers: number;
	}[];
	followers?: number;
	/** Since the month before's snapshot; absent without one */
	followersChange?: number;
	handle: string;
	platform: ReportOwnAccountPlatformEnum;
	/** Everything the profile shows */
	posts?: number;
	/** Posts added since the month before's snapshot; absent without one */
	postsAdded?: number;
	url: string;
}

export enum ReportOwnAccountPlatformEnum {
	Instagram = 'instagram',
	Tiktok = 'tiktok',
}

/** Google's busiest hour, from the mean of the month's samples. */
export interface ReportPeakHour {
	/** `Mo` … `Su` */
	day: string;
	hour: number;
	percent: number;
}

/** A topic Google (mostly locals) and TripAdvisor (mostly visitors) reviewers see differently. */
export interface ReportPlatformGap {
	/** Shares of each platform's written reviews, 0–1 */
	google: number;
	side: ReportPlatformGapSideEnum;
	topic: string;
	tripadvisor: number;
}

export enum ReportPlatformGapSideEnum {
	Praise = 'praise',
	Complaints = 'complaints',
}

/** One finding or suggestion in a report's summary. */
export interface ReportPoint {
	text: string;
	/** At most 6 words */
	title: string;
}

/** One post about the venue, as the report lists it. */
export interface ReportPost {
	author?: string;
	authorFans?: number;
	complaints: ReportFeedbackPoint[];
	dishes: ReportPostDish[];
	engagements: number;
	platform: ReportPostPlatformEnum;
	postId: string;
	postedAt: string;
	praise: ReportFeedbackPoint[];
	promotional: boolean;
	sentiment: ReportPostSentimentEnum;
	summary: string;
	/** A blog article's headline; absent for TikTok and Instagram, and in reports built before it was kept */
	title?: string;
	url: string;
	views: number;
	visited: boolean;
}

/** A dish a post names, with how it came across, as a report keeps it */
export interface ReportPostDish {
	name: string;
	sentiment: ReportPostDishSentimentEnum;
}

export enum ReportPostDishSentimentEnum {
	Mixed = 'mixed',
	Positive = 'positive',
	Negative = 'negative',
	Neutral = 'neutral',
}

export enum ReportPostPlatformEnum {
	Blog = 'blog',
	Instagram = 'instagram',
	Tiktok = 'tiktok',
}

export enum ReportPostSentimentEnum {
	Mixed = 'mixed',
	Positive = 'positive',
	Negative = 'negative',
	Neutral = 'neutral',
}

/** The month's press: features first, then listicles, then passing mentions. */
export interface ReportPress {
	features: number;
	items: ReportPressItem[];
	listicles: number;
	passing: number;
}

/** An article or web page naming the venue, found by the month's search. */
export interface ReportPressItem {
	kind: ReportPressItemKindEnum;
	outlet?: string;
	/** `YYYY-MM-DD`; web results often have none */
	publishedAt?: string;
	summary?: string;
	title: string;
	url: string;
}

export enum ReportPressItemKindEnum {
	Feature = 'feature',
	Listicle = 'listicle',
	Passing = 'passing',
}

/** The month before the report's, cut down to the KPI band. */
export interface ReportPreviousMonth {
	/** The actions its report suggested, when one was built */
	actions?: ReportPoint[];
	/** The dishes named most that month (top eight); absent in reports built before */
	dishes?: PickReportDishCountnamecount[];
	month: string;
	/**
	 * Absent when no review of that month is stored: reviews were not scraped for it. The star
	 * histogram and the complaint counts let the analysis see shifts; absent in reports built before
	 */
	reviews?: PickReportReviewStatscountwrittenreplyRateavgStarsPartialPickReportReviewStatsstarscomplaintscomplaintThemes;
	/** From T, pick a set of properties whose keys are in the union K */
	social: PickReportSocialStatsviewspostCountcreatorsengagementspromotional;
}

/** "Your prices next to your competitors'", and the delivery reputation. */
export interface ReportPrices {
	/** Competitors' listings, for the delivery-reputation line */
	competitorListings: ReportDeliveryListingnamestring[];
	/** The venue's own listings, Wolt first */
	listings: ReportDeliveryListing[];
	/** From the venue's Wolt menu; absent without one */
	menu?: {
		currency: string;
		/** `median / othersMedian - 1` */
		diff?: number;
		dishes: DishPrice[];
		/** Median main course */
		median: number;
		/** The month the menu was read */
		month: string;
		/** Who the others are */
		othersAre: ReportPricesOthersAreEnum;
		/** Median of the other menus' medians (competitors, else venues of its district) */
		othersMedian?: number;
		othersWithMenu: number;
		platform: string;
		/**
		 * Its primary food topic's items against the same on the other menus ("your ramen €14.50,
		 * theirs €12.90"), the line to lead with; `othersMedian` absent when no other menu has it.
		 * Absent when its menu has none of it
		 */
		topic?: TopicPrice;
	};
	/** Share of written reviews criticising price, 0–1, against tracked competitors' median */
	priceComplaints?: {
		others: number;
		othersMedian?: number;
		share: number;
		written: number;
	};
	/** The block's one-line read, for the prompt */
	sentence?: string;
}

/** Who the others are */
export enum ReportPricesOthersAreEnum {
	District = 'district',
	Competitors = 'competitors',
}

/** "4.3 · above 70 % of Kreuzberg's 212 food venues · above 55 % of Berlin's 61 kebab places". */
export interface ReportRatingBenchmark {
	/** Against the food venues of its district */
	district?: ReportRatingBenchmarkEntry;
	/** The all-time Google rating compared */
	rating: number;
	/** Against the city's venues of its primary food topic, or of the nearest parent with 5+ */
	topic?: ReportRatingTopicBenchmark;
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

/** A venue's all-time Google figures at the close of a month (its latest snapshot). */
export interface ReportRatingPoint {
	/** The snapshot's day, `YYYY-MM-DD` */
	date: string;
	/** The month the snapshot closes, `YYYY-MM`: one taken in a month's first week closes the month before */
	month: string;
	rating?: number;
	reviewsCount?: number;
}

/** Against the city's venues of a kind of food: `label` is the topic's. */
export interface ReportRatingTopicBenchmark {
	/** The city's name */
	city: string;
	/** The food topic compared: the primary one, or the nearest parent with 5+ peers */
	key: string;
	/** What it is compared with: the district's name, or the kind of food's label */
	label: string;
	/** The peers' median rating */
	median: number;
	/** Share of the peers its rating is ahead of, ties counted half, 0–100 */
	percentile: number;
	/** Peers compared, at least 5 */
	venues: number;
}

/** A reply the owner can post under a review, in the review's language. */
export interface ReportReplyDraft {
	draft: string;
	reviewId: string;
}

export interface ReportReviewGroup {
	complaintDetails: ReportFeedbackPoint[];
	/** Construct a type with a set of properties K of type T */
	complaintThemes?: Recordstringnumber;
	/** Construct a type with a set of properties K of type T */
	complaints: Recordstringnumber;
	count: number;
	/** Construct a type with a set of properties K of type T */
	praise: Recordstringnumber;
	/** What they said, the first few points of the group */
	praiseDetails: ReportFeedbackPoint[];
	/**
	 * theme (`FEEDBACK_THEMES`) → how many raised it, once per source like the topics; absent when
	 * a point has no theme yet (stored before themes, not backfilled) and in reports built before
	 */
	praiseThemes?: Recordstringnumber;
	written: number;
}

/** One Google review in the report's appendix. The entity stores no reviewer names. */
export interface ReportReviewItem {
	complaints: string[];
	/** At most 240 characters of the translated text, else the original; absent for stars only */
	excerpt?: string;
	/** The review's original language, e.g. `de` */
	language?: string;
	/** Set for a TripAdvisor review; absent means Google */
	platform?: ReportReviewItemPlatformEnum;
	/** Topics the review praised / criticised */
	praise: string[];
	publishedAt: string;
	replied: boolean;
	reviewId: string;
	stars?: number;
}

/** Set for a TripAdvisor review; absent means Google */
export enum ReportReviewItemPlatformEnum {
	Tripadvisor = 'tripadvisor',
}

/** One review platform's month. */
export interface ReportReviewPlatform {
	avgStars?: number;
	/** Construct a type with a set of properties K of type T */
	complaints: Recordstringnumber;
	count: number;
	platform: ReportReviewPlatformPlatformEnum;
	/** topic → written reviews that raised it */
	praise: Recordstringnumber;
	/** All-time figures on that platform */
	rating?: number;
	/** 0–1 */
	replyRate?: number;
	reviewsCount?: number;
	written: number;
}

export enum ReportReviewPlatformPlatformEnum {
	Google = 'google',
	Tripadvisor = 'tripadvisor',
}

export interface ReportReviewStats {
	avgStars?: number;
	/** Google and TripAdvisor side by side (the counts above cover both); absent without a TripAdvisor side */
	byPlatform?: ReportReviewPlatform[];
	/** The same changes by what changed (`groupChanges`): absent from reports built before them */
	changeThemes?: ReportChangeTheme[];
	/** Changes a reviewer noticed, one entry per review */
	changes: {
		changes: string[];
		stars?: number;
	}[];
	/** Construct a type with a set of properties K of type T */
	complaintThemes?: Recordstringnumber;
	/** Construct a type with a set of properties K of type T */
	complaints: Recordstringnumber;
	count: number;
	/** The month's critical reviews (3 stars or fewer) worth reading */
	critical: {
		replied: boolean;
		stars?: number;
		text: string;
	}[];
	/** Every review of the month, newest first: the appendix the counts can be checked against */
	list: ReportReviewItem[];
	/** Topics locals (Google) and visitors (TripAdvisor) see differently, biggest gap first */
	platformGaps?: ReportPlatformGap[];
	/** topic → how many reviews praised / criticised it */
	praise: Recordstringnumber;
	/**
	 * theme (`FEEDBACK_THEMES`) → how many raised it, once per source like the topics; absent when
	 * a point has no theme yet (stored before themes, not backfilled) and in reports built before
	 */
	praiseThemes?: Recordstringnumber;
	/** Ready-to-post replies to unanswered written reviews, critical first; filled at build */
	replyDrafts: ReportReplyDraft[];
	/** Share of the month's reviews the owner answered, 0–1 */
	replyRate?: number;
	/** The same counts for 5-star reviews and the rest: what separates a 5 from a 4 */
	split: {
		belowFive: ReportReviewGroup;
		fiveStar: ReportReviewGroup;
	};
	stars: {
		count: number;
		stars: number;
	}[];
	/** Reviews with text; the rest are stars only */
	written: number;
}

/** The venue's place on one Google Maps search ("ramen Mitte") in the report month. */
export interface ReportSearchRank {
	/** The same search in earlier months, oldest first, five at most; `rank` absent when not among the results */
	history: {
		month: string;
		rank?: number;
	}[];
	query: string;
	/** 1-based; absent when it was not among the `results` places */
	rank?: number;
	results: number;
	/** The first ten places in Google's order */
	top: {
		isVenue: boolean;
		name: string;
		rating?: number;
		reviewsCount?: number;
	}[];
}

/**
 * A report section as the API reads and writes it: its kind and the settings that kind has
 * (the others absent). One flat shape for every kind, so the client gets one type; the server
 * makes it the kind's own class (`toSections`).
 */
export interface ReportSectionDto {
	kind: ReportSectionDtoKindEnum;
	/** cover: the figure tiles, in order */
	kpis?: ReportSectionDtoKpisEnum[];
	/** posts: top posts shown as cards; media: blog articles shown; dishes: dishes listed; analysis: moves shown */
	limit?: number;
	/** creators: also the creators who covered the neighbours but not the brand */
	nearby?: boolean;
	/** places: each place's blocks, in order */
	parts?: ReportSectionDtoPartsEnum[];
	/** posts: the platforms it lists and counts; empty is every platform */
	platforms?: ReportSectionDtoPlatformsEnum[];
}

export enum ReportSectionDtoKindEnum {
	Cover = 'cover',
	Analysis = 'analysis',
	Stars = 'stars',
	Branches = 'branches',
	Competitors = 'competitors',
	Actions = 'actions',
	Posts = 'posts',
	OwnAccounts = 'own_accounts',
	Comments = 'comments',
	Press = 'press',
	Media = 'media',
	Creators = 'creators',
	Reviews = 'reviews',
	Replies = 'replies',
	Dishes = 'dishes',
	Places = 'places',
	Patterns = 'patterns',
	City = 'city',
	Appendix = 'appendix',
}

export enum ReportSectionDtoKpisEnum {
	Views = 'views',
	Creators = 'creators',
	Interactions = 'interactions',
	Stars = 'stars',
	Reviews = 'reviews',
	Answered = 'answered',
}

export enum ReportSectionDtoPartsEnum {
	Busyness = 'busyness',
	Prices = 'prices',
	Neighbourhood = 'neighbourhood',
	SearchRanks = 'search_ranks',
}

export enum ReportSectionDtoPlatformsEnum {
	Tiktok = 'tiktok',
	Instagram = 'instagram',
	Blog = 'blog',
}

export interface ReportSentimentCounts {
	mixed: number;
	negative: number;
	neutral: number;
	positive: number;
}

export interface ReportSocialStats {
	/** Construct a type with a set of properties K of type T */
	complaintThemes?: Recordstringnumber;
	/** Construct a type with a set of properties K of type T */
	complaints: Recordstringnumber;
	creators: number;
	engagements: number;
	instagramCount: number;
	postCount: number;
	/** topic → how many posts praised / criticised it */
	praise: Recordstringnumber;
	/**
	 * theme (`FEEDBACK_THEMES`) → how many raised it, once per source like the topics; absent when
	 * a point has no theme yet (stored before themes, not backfilled) and in reports built before
	 */
	praiseThemes?: Recordstringnumber;
	promotional: number;
	sentiment: ReportSentimentCounts;
	tiktokCount: number;
	views: number;
}

/** A rising row of the city's trend tables: shares of the month, in percent. */
export interface ReportTrendRow {
	/** Mentions (cuisines) or posts and reviews (dishes) this month */
	count: number;
	/** In percentage points */
	delta: number;
	key: string;
	label: string;
	prevShare: number;
	share: number;
}

export type RequestLoginCodeData = VerificationTokenOutputDto;

/** All-time count of Google reviews per star. */
export interface ReviewsDistribution {
	fiveStar: number;
	fourStar: number;
	oneStar: number;
	threeStar: number;
	twoStar: number;
}

export type RevokeOtherSessionsData = RevokeOtherSessionsOutputDto;

/** "Sign out everywhere else": how many sessions it ended. */
export interface RevokeOtherSessionsOutputDto {
	revoked: number;
}

export type RevokeReportShareData = AdminReportShareOutputDto;

export type RevokeSessionData = OkResponse;

export type RunLlmBacklogsData = AdminRunLlmBacklogsOutputDto;

export type SearchBrandBranchesData = any;

/** A topic's Google search interest and mention share, the month against the one before. */
export interface SearchDelta {
	/** Google's 0–100 this month (100 = the term's twelve-month peak) */
	interest: number;
	key: string;
	label: string;
	/** 1 = mentions' share doubled */
	mentionChange?: number;
	prevInterest?: number;
	prevShare?: number;
	/** 0.4 = searches up 40 %; absent when last month has no data */
	searchChange?: number;
	/** Its share of the city's mentions with a topic, percent (children counted) */
	share?: number;
}

export type SearchPortalCompetitorsData = PortalCompetitorSearchOutputDto;

export type SendReportData = AdminReportOutputDto;

export type SetDefaultReportTemplateData = AdminReportTemplateOutputDto;

export type SetIgnoredWordData = any;

/**
 * A report opened through a private link: the same document the admin sees, without its delivery
 * record and without the analysis's trace (`toPublicOutput`).
 */
export interface SharedReportOutputDto {
	/** What moved, and why it might have; absent for reports built before it */
	analysis?: ReportAnalysisPublic;
	/** The business it is on */
	brand: {
		id: string;
		name: string;
	};
	/** The city its branches are in; absent for a report across all the brand's cities */
	city?: {
		id: string;
		name: string;
		slug: string;
	};
	/** The brand's configuration it was built for; absent for a default report or once deleted */
	config?: {
		id: string;
		name: string;
	};
	/** @format date-time */
	createdAt: string;
	/**
	 * Everything a monthly report shows, computed once when it is built. The brand's figures (posts,
	 * reviews, dishes, creators, competitors, own accounts, comments, press, correlations) cover
	 * every branch in `branches`; each place figure is in its branch's entry.
	 */
	data: ReportData;
	highlights: ReportHighlights;
	id: string;
	month: string;
	/** Its configuration's (or the default template's) name at the build */
	name: string;
	postCount: number;
	reviewCount: number;
	/** What it shows, in order: its type's sections as they were at the build */
	sections: ReportSectionDto[];
	/** The template behind it; absent for a custom configuration or once the template is deleted */
	template?: {
		id: string;
		name: string;
	};
	/** @format date-time */
	updatedAt: string;
}

export interface SignupEmailInputDto {
	acceptedMarketing?: boolean;
	acceptedTerms?: boolean;
	/** @format email */
	email: string;
	/** @minLength 2 */
	firstName: string;
	/** @minLength 2 */
	lastName: string;
	password: string;
}

export interface SignupMobileInputDto {
	acceptedMarketing?: boolean;
	acceptedTerms?: boolean;
	/** @minLength 2 */
	firstName: string;
	/** @minLength 2 */
	lastName: string;
	mobileNumber: string;
	password: string;
}

export type SignupWithEmailData = VerificationTokenOutputDto;

export type SignupWithPhoneData = VerificationTokenOutputDto;

export interface SitemapEntriesOutputDto {
	items: SitemapEntryOutputDto[];
	totalItems: number;
}

export interface SitemapEntryOutputDto {
	/** App path, e.g. `/reports/123`; the frontend prefixes its origin. */
	path: string;
	updatedAt: string;
}

export interface SitemapPaginationInputDto {
	/** @min 1 */
	page: number;
	/**
	 * @min 1
	 * @max 10000
	 */
	size: number;
}

export interface SitemapSectionOutputDto {
	/** Lowercase letters only: it becomes part of the sitemap file name. */
	name: string;
	totalItems: number;
}

export interface SitemapSectionsOutputDto {
	items: SitemapSectionOutputDto[];
}

export type SplitAccountData = AdminSplitAccountOutputDto;

export type SplitBrandData = AdminBrandOutputDto;

export type StartPipelineRunData = AdminPipelineRunOutputDto;

export type SubscribeToNewsletterData = any;

export type SuggestCitySourcesData = AdminSuggestCitySourcesOutputDto;

/** The venue's own kind of food priced like a dish (`pricePosition`'s `topic`). */
export interface TopicPrice {
	/** `price / othersMedian - 1`; absent without others */
	diff?: number;
	key: string;
	label: string;
	/** The median of the other menus' medians for it; absent when none has it */
	othersMedian?: number;
	othersWithTopic: number;
	/** The venue's median for items of the topic */
	price: number;
}

/** A brand that entered the month's top 50 by posts from others, or climbed in it. */
export interface TrendRisingBrandRow {
	brandId: string;
	category?: string;
	delta: number;
	district?: string;
	name: string;
	posts: number;
	prevPosts: number;
	/** Absent when it was not in the previous month's top 50 */
	prevRank?: number;
	prevShare: number;
	rank: number;
	share: number;
}

/**
 * One row of a trend table: its share of the month and of the month before, in percent, and the
 * change in percentage points. Shares, not counts: the scrape budget moves the counts.
 */
export interface TrendShareRow {
	/** Mentions, sources, posts: what the table counts */
	count: number;
	/** `share - prevShare`, in percentage points */
	delta: number;
	key: string;
	label: string;
	/** The rest of the table folded into one row, so the shares add up to 100 */
	other?: boolean;
	prevCount: number;
	prevShare: number;
	prevViewsShare?: number;
	/** The most named brands of the row (cuisines, dishes) */
	sampleVenues?: TrendVenueRef[];
	share: number;
	venues?: number;
	/** Creators: the views of their posts and the brands they covered */
	views?: number;
	viewsDelta?: number;
	/** Share of the views of the posts counted, where the table has one */
	viewsShare?: number;
}

/** A brand named as an example in a trend row. */
export interface TrendVenueRef {
	id: string;
	name: string;
}

export interface UAParserIBrowser {
	major?: string;
	name?: string;
	type?: UaParserIBrowserTypeEnum;
	version?: string;
}

export interface UAParserICPU {
	architecture?: UaParserIcpuArchitectureEnum;
}

export interface UAParserIDevice {
	model?: string;
	type?: UaParserIDeviceTypeEnum;
	vendor?: string;
}

export interface UAParserIEngine {
	name?: UaParserIEngineNameEnum;
	version?: string;
}

export interface UAParserIOS {
	name?: string;
	version?: string;
}

export enum UaParserIBrowserTypeEnum {
	Email = 'email',
	Crawler = 'crawler',
	Cli = 'cli',
	Fetcher = 'fetcher',
	Inapp = 'inapp',
	Mediaplayer = 'mediaplayer',
	Library = 'library',
}

export enum UaParserIDeviceTypeEnum {
	Embedded = 'embedded',
	Console = 'console',
	Mobile = 'mobile',
	Smarttv = 'smarttv',
	Tablet = 'tablet',
	Wearable = 'wearable',
	Xr = 'xr',
	Desktop = 'desktop',
}

export enum UaParserIEngineNameEnum {
	KHTML = 'KHTML',
	Amaya = 'Amaya',
	ArkWeb = 'ArkWeb',
	Blink = 'Blink',
	Dillo = 'Dillo',
	EdgeHTML = 'EdgeHTML',
	Flow = 'Flow',
	Gecko = 'Gecko',
	Goanna = 'Goanna',
	ICab = 'iCab',
	LibWeb = 'LibWeb',
	Links = 'Links',
	Lynx = 'Lynx',
	NetFront = 'NetFront',
	NetSurf = 'NetSurf',
	Presto = 'Presto',
	Servo = 'Servo',
	Tasman = 'Tasman',
	Trident = 'Trident',
	W3M = 'w3m',
	WebKit = 'WebKit',
}

export enum UaParserIcpuArchitectureEnum {
	Value68K = '68k',
	Alpha = 'alpha',
	Arm = 'arm',
	Arm64 = 'arm64',
	Armhf = 'armhf',
	Avr = 'avr',
	Avr32 = 'avr32',
	Ia64 = 'ia64',
	Irix = 'irix',
	Irix64 = 'irix64',
	Mips = 'mips',
	Mips64 = 'mips64',
	PaRisc = 'pa-risc',
	Ppc = 'ppc',
	Sparc = 'sparc',
	Sparc64 = 'sparc64',
	Ia32 = 'ia32',
	Amd64 = 'amd64',
}

export type UnpublishCityHighlightData = AdminCityHighlightOutputDto;

export type UnpublishFoodTrendsData = AdminFoodTrendsReportOutputDto;

export type UnpublishLandingEditionData = AdminLandingEditionOutputDto;

export type UnreadNotificationData = OkResponse;

export type UnsubscribeFromNewsletterData = NewsletterSubscriptionOutputDto;

export interface UpdateBlogEntryInputDto {
	content?: string;
	coverImage?: string | null;
	/** @maxLength 600 */
	excerpt?: string | null;
	tagNames?: string[];
	/**
	 * @minLength 1
	 * @maxLength 300
	 */
	title?: string;
}

export type UpdateBrandAccountData = AdminAccountOutputDto[];

export type UpdateBrandData = AdminBrandOutputDto;

export type UpdateCityData = AdminCityOutputDto;

export type UpdateCityEventData = AdminCityEventOutputDto;

export type UpdateCitySourceData = AdminCitySourceOutputDto;

export type UpdateCreatorData = AdminCreatorOutputDto;

export type UpdateDishNameData = AdminUpdatedDishNameOutputDto;

export type UpdateEntryData = AdminBlogEntryOutputDto;

export type UpdateFoodTopicData = AdminFoodTopicBaseOutputDto;

export type UpdateHashtagData = AdminHashtagOutputDto;

export type UpdateMeData = GetMeOutputDto;

export interface UpdateMeInputDto {
	acceptedCallCommunications?: boolean;
	acceptedEmailCommunications?: boolean;
	acceptedMarketing?: boolean;
	acceptedSmsCommunications?: boolean;
	/**
	 * A short public bio, plain text. Stored trimmed; an empty string clears it. Refused
	 * with 422 `CONTACT_INFO_NOT_ALLOWED` when it carries a phone number, e-mail address
	 * or social handle.
	 * @maxLength 2000
	 */
	description?: string;
	firstName?: string;
	isMarkedForDeletion?: boolean;
	lastName?: string;
	/** Only the switches named change; the rest keep their stored value. */
	notificationPreferences?: NotificationPreferencesPatch;
	/** A new photo as a data URL. The current photo's own URL is accepted and changes nothing. */
	profileImage?: string;
}

export type UpdateMentionData = AdminMentionOutputDto;

export type UpdatePortalSettingsData = PortalSettingsOutputDto;

export type UpdateProspectData = AdminProspectOutputDto;

export type UpdateReportConfigData = AdminReportConfigOutputDto;

export type UpdateReportTemplateData = AdminReportTemplateOutputDto;

export type UpdateTagData = BlogTagOutputDto;

export type UpdateUserRolesData = OkResponseO1;

export type UpdateVenueData = AdminVenueOutputDto;

export interface UpsertBlogTagInputDto {
	/**
	 * @minLength 1
	 * @maxLength 100
	 */
	name: string;
	/** @maxLength 100 */
	slug?: string;
}

export interface VenueDetails {
	/**
	 * The actor's `additionalInfo`, flattened: section ("Service options", "Accessibility",
	 * "Payments", …) → option ("Outdoor seating", "Delivery", …) → offered or not. A list
	 * scrape returns only some sections (mostly Accessibility); a detail page returns them
	 * all, so sections are merged one by one.
	 */
	amenities?: RecordstringRecordstringboolean;
	imagesCount?: number;
	/** Link to the menu; detail page only. */
	menu?: string;
	openingHours?: OpeningHoursDay[];
	/** Delivery platforms; detail page only. */
	orderBy?: OrderPlatform[];
	/** Google's own similar places; detail page only. */
	peopleAlsoSearch?: PeopleAlsoSearchPlace[];
	/** Google's place-directory tags with counts, e.g. `{ title: 'Food & Drink', count: 37 }`. */
	placesTags?: {
		count: number;
		title: string;
	}[];
	/** Detail page only, and often missing (Google shows it mainly to logged-in users). */
	popularTimesHistogram?: PartialRecordPopularTimesDayArrayPopularTimesHour;
	/** How busy it was at scrape time, 0–100; detail page only. */
	popularTimesLivePercent?: number;
	popularTimesLiveText?: string;
	reserveTableUrl?: string;
	/** All-time count of Google reviews per star. */
	reviewsDistribution?: ReviewsDistribution;
	/**
	 * What reviews often mention, as Google counts it ("people often mention"): dishes, drinks,
	 * staff, the place, e.g. `{ title: 'vegan meat', count: 12 }`. Detail page only; all-time,
	 * not a month's.
	 */
	reviewsTags?: {
		count: number;
		title: string;
	}[];
	temporarilyClosed?: boolean;
}

/** One place in a Google Maps search's top ten. */
export interface VenueSearchRankEntry {
	name: string;
	placeId: string;
	rating?: number;
	reviewsCount?: number;
	/** Our venue, when we know the place */
	venueId?: string;
}

/** A status change with its venue, as the trends panel and the report read it. */
export interface VenueStatusChangeRow {
	/**
	 * The scrape's day, or the post's for `posts`; never an opening date
	 * @format date-time
	 */
	at: string;
	category?: string;
	district?: string;
	kind: VenueStatusChangeRowKindEnum;
	name: string;
	source: VenueStatusChangeRowSourceEnum;
	street?: string;
	venueId: string;
}

export enum VenueStatusChangeRowKindEnum {
	Opened = 'opened',
	TemporarilyClosed = 'temporarily_closed',
	PermanentlyClosed = 'permanently_closed',
	Reopened = 'reopened',
}

export enum VenueStatusChangeRowSourceEnum {
	Posts = 'posts',
	City = 'city',
	Lookup = 'lookup',
	Details = 'details',
}

/** Changes counted per kind. */
export interface VenueStatusCounts {
	opened: number;
	permanentlyClosed: number;
	reopened: number;
	temporarilyClosed: number;
}

export interface VenueStatusGroup {
	key: string;
	opened: number;
	permanentlyClosed: number;
	reopened: number;
	temporarilyClosed: number;
}

export interface VerificationTokenOutputDto {
	verificationToken: string;
}

export type VerifyChangeEmailData = OkResponse;

export type VerifyChangeMobileNumberData = OkResponse;

export interface VerifyCredentialInputDto {
	code: string;
	token: string;
}

export type VerifyForgotPasswordData = VerificationTokenOutputDto;

export type VerifySignupData = OkResponse;

export interface Visitor {
	browser?: UAParserIBrowser;
	countryCode?: string;
	cpu?: UAParserICPU;
	device?: UAParserIDevice;
	engine?: UAParserIEngine;
	ip?: string;
	os?: UAParserIOS;
	ua?: string;
	userAgent?: string;
}

export type WriteProspectHookData = AdminProspectOutputDto;

export type QueryParamsType = Record<string | number, any>;
export type ResponseFormat = keyof Omit<Body, 'body' | 'bodyUsed'>;

export interface FullRequestParams extends Omit<RequestInit, 'body'> {
	/** set parameter to `true` for call `securityWorker` for this request */
	secure?: boolean;
	/** request path */
	path: string;
	/** content type of request body */
	type?: ContentType;
	/** query params */
	query?: QueryParamsType;
	/** format of response (i.e. response.json() -> format: "json") */
	format?: ResponseFormat;
	/** request body */
	body?: unknown;
	/** base url */
	baseUrl?: string;
	/** request cancellation token */
	cancelToken?: CancelToken;
}

export type RequestParams = Omit<FullRequestParams, 'body' | 'method' | 'query' | 'path'>;

export interface ApiConfig<SecurityDataType = unknown> {
	baseUrl?: string;
	baseApiParams?: Omit<RequestParams, 'baseUrl' | 'cancelToken' | 'signal'>;
	securityWorker?: (
		securityData: SecurityDataType | null,
	) => Promise<RequestParams | void> | RequestParams | void;
	customFetch?: typeof fetch;
}

export interface HttpResponse<D extends unknown, E extends unknown = unknown> extends Response {
	data: D;
	error: E;
}

type CancelToken = Symbol | string | number;

export enum ContentType {
	Json = 'application/json',
	FormData = 'multipart/form-data',
	UrlEncoded = 'application/x-www-form-urlencoded',
	Text = 'text/plain',
}

export class HttpClient<SecurityDataType = unknown> {
	public baseUrl: string = '';
	private securityData: SecurityDataType | null = null;
	private securityWorker?: ApiConfig<SecurityDataType>['securityWorker'];
	private abortControllers = new Map<CancelToken, AbortController>();
	private customFetch = (...fetchParams: Parameters<typeof fetch>) => fetch(...fetchParams);

	private baseApiParams: RequestParams = {
		credentials: 'same-origin',
		headers: {},
		redirect: 'follow',
		referrerPolicy: 'no-referrer',
	};

	constructor(apiConfig: ApiConfig<SecurityDataType> = {}) {
		Object.assign(this, apiConfig);
	}

	public setSecurityData = (data: SecurityDataType | null) => {
		this.securityData = data;
	};

	protected encodeQueryParam(key: string, value: any) {
		const encodedKey = encodeURIComponent(key);
		return `${encodedKey}=${encodeURIComponent(typeof value === 'number' ? value : `${value}`)}`;
	}

	protected addQueryParam(query: QueryParamsType, key: string) {
		return this.encodeQueryParam(key, query[key]);
	}

	protected addArrayQueryParam(query: QueryParamsType, key: string) {
		const value = query[key];
		return value.map((v: any) => this.encodeQueryParam(key, v)).join('&');
	}

	protected toQueryString(rawQuery?: QueryParamsType): string {
		const query = rawQuery || {};
		const keys = Object.keys(query).filter(key => 'undefined' !== typeof query[key]);
		return keys
			.map(key =>
				Array.isArray(query[key]) ?
					this.addArrayQueryParam(query, key)
				:	this.addQueryParam(query, key),
			)
			.join('&');
	}

	protected addQueryParams(rawQuery?: QueryParamsType): string {
		const queryString = this.toQueryString(rawQuery);
		return queryString ? `?${queryString}` : '';
	}

	private contentFormatters: Record<ContentType, (input: any) => any> = {
		[ContentType.Json]: (input: any) =>
			input !== null && (typeof input === 'object' || typeof input === 'string') ?
				JSON.stringify(input)
			:	input,
		[ContentType.Text]: (input: any) =>
			input !== null && typeof input !== 'string' ? JSON.stringify(input) : input,
		[ContentType.FormData]: (input: any) =>
			Object.keys(input || {}).reduce((formData, key) => {
				const property = input[key];
				formData.append(
					key,
					property instanceof Blob ? property
					: typeof property === 'object' && property !== null ? JSON.stringify(property)
					: `${property}`,
				);
				return formData;
			}, new FormData()),
		[ContentType.UrlEncoded]: (input: any) => this.toQueryString(input),
	};

	protected mergeRequestParams(params1: RequestParams, params2?: RequestParams): RequestParams {
		return {
			...this.baseApiParams,
			...params1,
			...(params2 || {}),
			headers: {
				...(this.baseApiParams.headers || {}),
				...(params1.headers || {}),
				...((params2 && params2.headers) || {}),
			},
		};
	}

	protected createAbortSignal = (cancelToken: CancelToken): AbortSignal | undefined => {
		if (this.abortControllers.has(cancelToken)) {
			const abortController = this.abortControllers.get(cancelToken);
			if (abortController) {
				return abortController.signal;
			}
			return void 0;
		}

		const abortController = new AbortController();
		this.abortControllers.set(cancelToken, abortController);
		return abortController.signal;
	};

	public abortRequest = (cancelToken: CancelToken) => {
		const abortController = this.abortControllers.get(cancelToken);

		if (abortController) {
			abortController.abort();
			this.abortControllers.delete(cancelToken);
		}
	};

	public request = async <T = any, E = any>({
		body,
		secure,
		path,
		type,
		query,
		format,
		baseUrl,
		cancelToken,
		...params
	}: FullRequestParams): Promise<T> => {
		const secureParams =
			((typeof secure === 'boolean' ? secure : this.baseApiParams.secure) &&
				this.securityWorker &&
				(await this.securityWorker(this.securityData))) ||
			{};
		const requestParams = this.mergeRequestParams(params, secureParams);
		const queryString = query && this.toQueryString(query);
		const payloadFormatter = this.contentFormatters[type || ContentType.Json];
		const responseFormat = format || requestParams.format;

		return this.customFetch(
			`${baseUrl || this.baseUrl || ''}${path}${queryString ? `?${queryString}` : ''}`,
			{
				...requestParams,
credentials:"include",
				headers: {
					...(requestParams.headers || {}),
					...(type && type !== ContentType.FormData ? { 'Content-Type': type } : {}),
				},
				signal:
					(cancelToken ? this.createAbortSignal(cancelToken) : requestParams.signal) ||
					null,
				body: typeof body === 'undefined' || body === null ? null : payloadFormatter(body),
			},
		).then(async response => {
			const r = response.clone() as HttpResponse<T, E>;
			r.data = null as unknown as T;
			r.error = null as unknown as E;

			const data =
				!responseFormat ? r : (
					await response[responseFormat]()
						.then(data => {
							if (r.ok) {
								r.data = data;
							} else {
								r.error = data;
							}
							return r;
						})
						.catch(e => {
							r.error = e;
							return r;
						})
				);

			if (cancelToken) {
				this.abortControllers.delete(cancelToken);
			}

			if (!response.ok) throw data.error
			return data.data;
		});
	};
}

/**
 * @title swagger-build
 * @version 0.0.0
 *
 * CJS-scoped clone of apps/backend used to generate swagger.json and the API client. See bin/create-swagger.sh for the why.
 */
export class Api<SecurityDataType extends unknown> extends HttpClient<SecurityDataType> {
	healthCheck = {
		/**
		 * No description
		 *
		 * @name CheckStatus
		 * @request GET:/health-check
		 * @response `200` `CheckStatusData`
		 */
		checkStatus: (params: RequestParams = {}) =>
			this.request<CheckStatusData, any>({
				path: `/health-check`,
				method: 'GET',
				format: 'json',
				...params,
			}),
	};
	auth = {
		/**
		 * No description
		 *
		 * @name GetMe
		 * @request GET:/auth/me
		 * @response `200` `GetMeData`
		 */
		getMe: (params: RequestParams = {}) =>
			this.request<GetMeData, any>({
				path: `/auth/me`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name UpdateMe
		 * @request PATCH:/auth/me
		 * @response `200` `UpdateMeData`
		 */
		updateMe: (data: UpdateMeInputDto, params: RequestParams = {}) =>
			this.request<UpdateMeData, any>({
				path: `/auth/me`,
				method: 'PATCH',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name DeleteMe
		 * @request DELETE:/auth/me
		 * @response `200` `DeleteMeData`
		 */
		deleteMe: (params: RequestParams = {}) =>
			this.request<DeleteMeData, any>({
				path: `/auth/me`,
				method: 'DELETE',
				format: 'json',
				...params,
			}),

		/**
		 * @description Mails a sign-in code to an existing account; no password involved (the venue portal).
		 *
		 * @name RequestLoginCode
		 * @summary Mails a sign-in code to an existing account; no password involved (the venue portal)
		 * @request POST:/auth/login/code
		 * @response `201` `RequestLoginCodeData`
		 */
		requestLoginCode: (data: LoginCodeInputDto, params: RequestParams = {}) =>
			this.request<RequestLoginCodeData, any>({
				path: `/auth/login/code`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * @description Trades the code for a session, and accepts the person's open venue invites.
		 *
		 * @name LoginWithCode
		 * @summary Trades the code for a session, and accepts the person's open venue invites
		 * @request POST:/auth/login/code/verify
		 * @response `201` `LoginWithCodeData`
		 */
		loginWithCode: (data: VerifyCredentialInputDto, params: RequestParams = {}) =>
			this.request<LoginWithCodeData, any>({
				path: `/auth/login/code/verify`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name LoginWithEmail
		 * @request POST:/auth/login/email
		 * @response `201` `LoginWithEmailData`
		 */
		loginWithEmail: (data: LoginEmailInputDto, params: RequestParams = {}) =>
			this.request<LoginWithEmailData, any>({
				path: `/auth/login/email`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name LoginWithMobileNumber
		 * @request POST:/auth/login/phone
		 * @response `201` `LoginWithMobileNumberData`
		 */
		loginWithMobileNumber: (data: LoginMobileNumberInputDto, params: RequestParams = {}) =>
			this.request<LoginWithMobileNumberData, any>({
				path: `/auth/login/phone`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name Logout
		 * @request GET:/auth/logout
		 * @response `200` `LogoutData`
		 */
		logout: (params: RequestParams = {}) =>
			this.request<LogoutData, any>({
				path: `/auth/logout`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name SignupWithEmail
		 * @request POST:/auth/signup/email
		 * @response `201` `SignupWithEmailData`
		 */
		signupWithEmail: (data: SignupEmailInputDto, params: RequestParams = {}) =>
			this.request<SignupWithEmailData, any>({
				path: `/auth/signup/email`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name SignupWithPhone
		 * @request POST:/auth/signup/phone
		 * @response `201` `SignupWithPhoneData`
		 */
		signupWithPhone: (data: SignupMobileInputDto, params: RequestParams = {}) =>
			this.request<SignupWithPhoneData, any>({
				path: `/auth/signup/phone`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name VerifySignup
		 * @request POST:/auth/signup/verify
		 * @response `201` `VerifySignupData`
		 */
		verifySignup: (data: VerifyCredentialInputDto, params: RequestParams = {}) =>
			this.request<VerifySignupData, any>({
				path: `/auth/signup/verify`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name ForgotPassword
		 * @request POST:/auth/forgot-password
		 * @response `201` `ForgotPasswordData`
		 */
		forgotPassword: (data: ForgotPasswordInputDto, params: RequestParams = {}) =>
			this.request<ForgotPasswordData, any>({
				path: `/auth/forgot-password`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name VerifyForgotPassword
		 * @request POST:/auth/forgot-password/verify
		 * @response `201` `VerifyForgotPasswordData`
		 */
		verifyForgotPassword: (data: VerifyCredentialInputDto, params: RequestParams = {}) =>
			this.request<VerifyForgotPasswordData, any>({
				path: `/auth/forgot-password/verify`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name ChangeForgottenPassword
		 * @request POST:/auth/forgot-password/change
		 * @response `201` `ChangeForgottenPasswordData`
		 */
		changeForgottenPassword: (
			data: ChangeForgottenPasswordInputDto,
			params: RequestParams = {},
		) =>
			this.request<ChangeForgottenPasswordData, any>({
				path: `/auth/forgot-password/change`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name ChangePassword
		 * @request POST:/auth/change-password
		 * @response `201` `ChangePasswordData`
		 */
		changePassword: (data: ChangePasswordInputDto, params: RequestParams = {}) =>
			this.request<ChangePasswordData, any>({
				path: `/auth/change-password`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name ChangeMobileNumber
		 * @request POST:/auth/change-mobile-number
		 * @response `201` `ChangeMobileNumberData`
		 */
		changeMobileNumber: (data: ChangeMobileNumberInputDto, params: RequestParams = {}) =>
			this.request<ChangeMobileNumberData, any>({
				path: `/auth/change-mobile-number`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name VerifyChangeMobileNumber
		 * @request POST:/auth/change-mobile-number/verify
		 * @response `201` `VerifyChangeMobileNumberData`
		 */
		verifyChangeMobileNumber: (data: VerifyCredentialInputDto, params: RequestParams = {}) =>
			this.request<VerifyChangeMobileNumberData, any>({
				path: `/auth/change-mobile-number/verify`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name ChangeEmail
		 * @request POST:/auth/change-email
		 * @response `201` `ChangeEmailData`
		 */
		changeEmail: (data: ChangeEmailInputDto, params: RequestParams = {}) =>
			this.request<ChangeEmailData, any>({
				path: `/auth/change-email`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name VerifyChangeEmail
		 * @request POST:/auth/change-email/verify
		 * @response `201` `VerifyChangeEmailData`
		 */
		verifyChangeEmail: (data: VerifyCredentialInputDto, params: RequestParams = {}) =>
			this.request<VerifyChangeEmailData, any>({
				path: `/auth/change-email/verify`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name ListSessions
		 * @request GET:/auth/sessions
		 * @response `200` `ListSessionsData`
		 */
		listSessions: (
			query: {
				/** @min 1 */
				page: number;
				/** @min 1 */
				size: number;
			},
			params: RequestParams = {},
		) =>
			this.request<ListSessionsData, any>({
				path: `/auth/sessions`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * @description Every other session: the one asking stays signed in.
		 *
		 * @name RevokeOtherSessions
		 * @summary Every other session: the one asking stays signed in
		 * @request DELETE:/auth/sessions
		 * @response `200` `RevokeOtherSessionsData`
		 */
		revokeOtherSessions: (params: RequestParams = {}) =>
			this.request<RevokeOtherSessionsData, any>({
				path: `/auth/sessions`,
				method: 'DELETE',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name RevokeSession
		 * @request DELETE:/auth/sessions/{id}
		 * @response `200` `RevokeSessionData`
		 */
		revokeSession: (id: string, params: RequestParams = {}) =>
			this.request<RevokeSessionData, any>({
				path: `/auth/sessions/${id}`,
				method: 'DELETE',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name RefreshToken
		 * @request POST:/auth/refresh-token
		 * @response `201` `RefreshTokenData`
		 */
		refreshToken: (data: RefreshTokenInputDto, params: RequestParams = {}) =>
			this.request<RefreshTokenData, any>({
				path: `/auth/refresh-token`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),
	};
	admin = {
		/**
		 * No description
		 *
		 * @name ExportUsersCsv
		 * @request GET:/admin/users/export/csv
		 * @response `200` `ExportUsersCsvData`
		 */
		exportUsersCsv: (
			query?: {
				roles?: ExportUsersCsvParamsRolesEnum[];
			},
			params: RequestParams = {},
		) =>
			this.request<ExportUsersCsvData, any>({
				path: `/admin/users/export/csv`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name GetUser
		 * @request GET:/admin/users/{id}
		 * @response `200` `GetUserData`
		 */
		getUser: (id: string, params: RequestParams = {}) =>
			this.request<GetUserData, any>({
				path: `/admin/users/${id}`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name DeleteUser
		 * @request DELETE:/admin/users/{id}
		 * @response `200` `DeleteUserData`
		 */
		deleteUser: (id: string, params: RequestParams = {}) =>
			this.request<DeleteUserData, any>({
				path: `/admin/users/${id}`,
				method: 'DELETE',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name ListUsers
		 * @request GET:/admin/users
		 * @response `200` `ListUsersData`
		 */
		listUsers: (
			query: {
				isMarkedForDeletion?: boolean;
				/** @min 1 */
				page: number;
				q?: string;
				/** @min 1 */
				size: number;
				sort?: ListUsersParamsSortEnum;
			},
			params: RequestParams = {},
		) =>
			this.request<ListUsersData, any>({
				path: `/admin/users`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * @description Replaces a user's roles. `user` is always kept, `system` can never be handed out, and an admin cannot edit their own roles — see `UserService.updateUserRoles`.
		 *
		 * @name UpdateUserRoles
		 * @request PUT:/admin/users/{id}/roles
		 * @response `200` `UpdateUserRolesData`
		 */
		updateUserRoles: (
			id: string,
			data: AdminUpdateUserRolesInputDto,
			params: RequestParams = {},
		) =>
			this.request<UpdateUserRolesData, any>({
				path: `/admin/users/${id}/roles`,
				method: 'PUT',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name ListUserSessions
		 * @request GET:/admin/user-sessions
		 * @response `200` `ListUserSessionsData`
		 */
		listUserSessions: (
			query: {
				activeOnly?: boolean;
				/** @min 1 */
				page: number;
				platform?: ListUserSessionsParamsPlatformEnum;
				/** @min 1 */
				size: number;
				sort?: ListUserSessionsParamsSortEnum;
				userId?: string;
			},
			params: RequestParams = {},
		) =>
			this.request<ListUserSessionsData, any>({
				path: `/admin/user-sessions`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name DeleteUserSession
		 * @request DELETE:/admin/user-sessions/{id}
		 * @response `200` `DeleteUserSessionData`
		 */
		deleteUserSession: (id: string, params: RequestParams = {}) =>
			this.request<DeleteUserSessionData, any>({
				path: `/admin/user-sessions/${id}`,
				method: 'DELETE',
				format: 'json',
				...params,
			}),

		/**
		 * @description Every city with its venue and source counts, by name.
		 *
		 * @name ListCities
		 * @summary Every city with its venue and source counts, by name
		 * @request GET:/admin/cities
		 * @response `200` `ListCitiesData`
		 */
		listCities: (params: RequestParams = {}) =>
			this.request<ListCitiesData, any>({
				path: `/admin/cities`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name CreateCity
		 * @request POST:/admin/cities
		 * @response `201` `CreateCityData`
		 */
		createCity: (data: AdminCreateCityInputDto, params: RequestParams = {}) =>
			this.request<CreateCityData, any>({
				path: `/admin/cities`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name GetCity
		 * @request GET:/admin/cities/{id}
		 * @response `200` `GetCityData`
		 */
		getCity: (id: string, params: RequestParams = {}) =>
			this.request<GetCityData, any>({
				path: `/admin/cities/${id}`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name UpdateCity
		 * @request PATCH:/admin/cities/{id}
		 * @response `200` `UpdateCityData`
		 */
		updateCity: (id: string, data: AdminUpdateCityInputDto, params: RequestParams = {}) =>
			this.request<UpdateCityData, any>({
				path: `/admin/cities/${id}`,
				method: 'PATCH',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * @description The city's sources with their yield over the last three months.
		 *
		 * @name ListCitySources
		 * @summary The city's sources with their yield over the last three months
		 * @request GET:/admin/cities/{id}/sources
		 * @response `200` `ListCitySourcesData`
		 */
		listCitySources: (id: string, params: RequestParams = {}) =>
			this.request<ListCitySourcesData, any>({
				path: `/admin/cities/${id}/sources`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name AddCitySource
		 * @request POST:/admin/cities/{id}/sources
		 * @response `201` `AddCitySourceData`
		 */
		addCitySource: (id: string, data: AdminAddCitySourceInputDto, params: RequestParams = {}) =>
			this.request<AddCitySourceData, any>({
				path: `/admin/cities/${id}/sources`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * @description Tags the city doesn't scrape that keep coming up on its matched posts (three months, 3+ brands, 5+ posts): candidates to add, from the data, free. Nothing is saved.
		 *
		 * @name ListCityHashtagSuggestions
		 * @request GET:/admin/cities/{id}/hashtag-suggestions
		 * @response `200` `ListCityHashtagSuggestionsData`
		 */
		listCityHashtagSuggestions: (id: string, params: RequestParams = {}) =>
			this.request<ListCityHashtagSuggestionsData, any>({
				path: `/admin/cities/${id}/hashtag-suggestions`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * @description Asks the LLM for hashtags and searches (one call) and adds them as disabled, `suggested` sources for review; ones the city already has are skipped.
		 *
		 * @name SuggestCitySources
		 * @request POST:/admin/cities/{id}/suggest-sources
		 * @response `201` `SuggestCitySourcesData`
		 */
		suggestCitySources: (
			id: string,
			data: AdminSuggestCitySourcesInputDto,
			params: RequestParams = {},
		) =>
			this.request<SuggestCitySourcesData, any>({
				path: `/admin/cities/${id}/suggest-sources`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * @description Districts with postal codes as the city's venues place them; nothing is saved.
		 *
		 * @name ListCityDistrictSuggestions
		 * @summary Districts with postal codes as the city's venues place them; nothing is saved
		 * @request GET:/admin/cities/{id}/district-suggestions
		 * @response `200` `ListCityDistrictSuggestionsData`
		 */
		listCityDistrictSuggestions: (id: string, params: RequestParams = {}) =>
			this.request<ListCityDistrictSuggestionsData, any>({
				path: `/admin/cities/${id}/district-suggestions`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * @description Enables or disables a source (which reviews a suggestion), or edits its note.
		 *
		 * @name UpdateCitySource
		 * @summary Enables or disables a source (which reviews a suggestion), or edits its note
		 * @request PATCH:/admin/cities/{id}/sources/{sourceId}
		 * @response `200` `UpdateCitySourceData`
		 */
		updateCitySource: (
			id: string,
			sourceId: string,
			data: AdminUpdateCitySourceInputDto,
			params: RequestParams = {},
		) =>
			this.request<UpdateCitySourceData, any>({
				path: `/admin/cities/${id}/sources/${sourceId}`,
				method: 'PATCH',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name ListCityDays
		 * @request GET:/admin/cities/{id}/days
		 * @response `200` `ListCityDaysData`
		 */
		listCityDays: (
			id: string,
			query: {
				/** @pattern ^\d{4}-\d{2}-\d{2}$ */
				from: string;
				/** @pattern ^\d{4}-\d{2}-\d{2}$ */
				to: string;
			},
			params: RequestParams = {},
		) =>
			this.request<ListCityDaysData, any>({
				path: `/admin/cities/${id}/days`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * @description Fetches weather and public holidays for the dates (free sources), overwriting the days.
		 *
		 * @name FillCityDays
		 * @summary Fetches weather and public holidays for the dates (free sources), overwriting the days
		 * @request POST:/admin/cities/{id}/days/fill
		 * @response `201` `FillCityDaysData`
		 */
		fillCityDays: (id: string, data: AdminFillCityDaysInputDto, params: RequestParams = {}) =>
			this.request<FillCityDaysData, any>({
				path: `/admin/cities/${id}/days/fill`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name GetCityMonthContext
		 * @request GET:/admin/cities/{id}/context
		 * @response `200` `GetCityMonthContextData`
		 */
		getCityMonthContext: (
			id: string,
			query: {
				/** @pattern ^\d{4}-\d{2}$ */
				month: string;
			},
			params: RequestParams = {},
		) =>
			this.request<GetCityMonthContextData, any>({
				path: `/admin/cities/${id}/context`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name ListCityEvents
		 * @request GET:/admin/cities/{id}/events
		 * @response `200` `ListCityEventsData`
		 */
		listCityEvents: (id: string, params: RequestParams = {}) =>
			this.request<ListCityEventsData, any>({
				path: `/admin/cities/${id}/events`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name AddCityEvent
		 * @request POST:/admin/cities/{id}/events
		 * @response `201` `AddCityEventData`
		 */
		addCityEvent: (id: string, data: AdminAddCityEventInputDto, params: RequestParams = {}) =>
			this.request<AddCityEventData, any>({
				path: `/admin/cities/${id}/events`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name UpdateCityEvent
		 * @request PATCH:/admin/cities/{id}/events/{eventId}
		 * @response `200` `UpdateCityEventData`
		 */
		updateCityEvent: (
			id: string,
			eventId: string,
			data: AdminUpdateCityEventInputDto,
			params: RequestParams = {},
		) =>
			this.request<UpdateCityEventData, any>({
				path: `/admin/cities/${id}/events/${eventId}`,
				method: 'PATCH',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name RemoveCityEvent
		 * @request DELETE:/admin/cities/{id}/events/{eventId}
		 * @response `200` `RemoveCityEventData`
		 */
		removeCityEvent: (id: string, eventId: string, params: RequestParams = {}) =>
			this.request<RemoveCityEventData, any>({
				path: `/admin/cities/${id}/events/${eventId}`,
				method: 'DELETE',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name ListReviews
		 * @request GET:/admin/reviews
		 * @response `200` `ListReviewsData`
		 */
		listReviews: (
			query: {
				/**
				 * Every branch's reviews
				 * @format uuid
				 */
				brandId?: string;
				/**
				 * Branches in this city
				 * @format uuid
				 */
				cityId?: string;
				/**
				 * YYYY-MM
				 * @pattern ^[0-9]{4}-[0-9]{2}$
				 */
				month?: string;
				/** Written, 3 stars or fewer, nobody answered (no owner reply, not marked answered): lowest first */
				needsReply?: boolean;
				/** @min 1 */
				page: number;
				platform?: ListReviewsParamsPlatformEnum;
				/** @min 1 */
				size: number;
				/**
				 * @min 1
				 * @max 5
				 */
				stars?: number;
				/** @format uuid */
				venueId?: string;
			},
			params: RequestParams = {},
		) =>
			this.request<ListReviewsData, any>({
				path: `/admin/reviews`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name ListVenues
		 * @request GET:/admin/venues
		 * @response `200` `ListVenuesData`
		 */
		listVenues: (
			query: {
				/** @format uuid */
				cityId?: string;
				district?: string;
				/** Only venues at least one social media mention is linked to. */
				mentionedOnly?: boolean;
				/** Only venues that opened (a city-wide scrape first saw them) in the last `LEAD_NEW_PLACE_MONTHS` months. */
				newOnly?: boolean;
				/** @min 1 */
				page: number;
				/** Only venues whose brand scored at or above `LEAD_PROSPECT_SCORE`. */
				prospectsOnly?: boolean;
				q?: string;
				/** @min 1 */
				size: number;
				sort?: ListVenuesParamsSortEnum;
			},
			params: RequestParams = {},
		) =>
			this.request<ListVenuesData, any>({
				path: `/admin/venues`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name GetVenue
		 * @request GET:/admin/venues/{id}
		 * @response `200` `GetVenueData`
		 */
		getVenue: (id: string, params: RequestParams = {}) =>
			this.request<GetVenueData, any>({
				path: `/admin/venues/${id}`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * @description Edits the fields an admin sets by hand (today the booking-platform link).
		 *
		 * @name UpdateVenue
		 * @summary Edits the fields an admin sets by hand (today the booking-platform link)
		 * @request PATCH:/admin/venues/{id}
		 * @response `200` `UpdateVenueData`
		 */
		updateVenue: (id: string, data: AdminUpdateVenueInputDto, params: RequestParams = {}) =>
			this.request<UpdateVenueData, any>({
				path: `/admin/venues/${id}`,
				method: 'PATCH',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name ListVenueReviews
		 * @request GET:/admin/venues/{id}/reviews
		 * @response `200` `ListVenueReviewsData`
		 */
		listVenueReviews: (
			id: string,
			query: {
				/**
				 * YYYY-MM
				 * @pattern ^[0-9]{4}-[0-9]{2}$
				 */
				month?: string;
				/** @min 1 */
				page: number;
				/** @min 1 */
				size: number;
			},
			params: RequestParams = {},
		) =>
			this.request<ListVenueReviewsData, any>({
				path: `/admin/venues/${id}/reviews`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * @description The venue's busyness samples, open-table samples and delivery listings, newest first.
		 *
		 * @name GetVenueDemand
		 * @summary The venue's busyness samples, open-table samples and delivery listings, newest first
		 * @request GET:/admin/venues/{id}/demand
		 * @response `200` `GetVenueDemandData`
		 */
		getVenueDemand: (id: string, params: RequestParams = {}) =>
			this.request<GetVenueDemandData, any>({
				path: `/admin/venues/${id}/demand`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * @description The city's openings and closures in the three months ending with `month`, by district and food.
		 *
		 * @name GetVenueStatusChanges
		 * @summary The city's openings and closures in the three months ending with `month`, by district and food
		 * @request GET:/admin/venue-status-changes
		 * @response `200` `GetVenueStatusChangesData`
		 */
		getVenueStatusChanges: (
			query: {
				/** @format uuid */
				cityId: string;
				/**
				 * The last month of the three-month window
				 * @pattern ^[0-9]{4}-[0-9]{2}$
				 */
				month: string;
			},
			params: RequestParams = {},
		) =>
			this.request<GetVenueStatusChangesData, any>({
				path: `/admin/venue-status-changes`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * @description The venue's Google Maps search ranks (`TRACK_SEARCH_RANKS`), newest month first.
		 *
		 * @name ListVenueSearchRanks
		 * @summary The venue's Google Maps search ranks (`TRACK_SEARCH_RANKS`), newest month first
		 * @request GET:/admin/venues/{id}/search-ranks
		 * @response `200` `ListVenueSearchRanksData`
		 */
		listVenueSearchRanks: (id: string, params: RequestParams = {}) =>
			this.request<ListVenueSearchRanksData, any>({
				path: `/admin/venues/${id}/search-ranks`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * @description A dish's Google Maps top ten in each district of the city in one snapshot (`TRACK_DISH_SEARCHES`), the newest by default.
		 *
		 * @name GetDishSearches
		 * @summary A dish's Google Maps top ten in each district of the city in one snapshot (`TRACK_DISH_SEARCHES`), the newest by default
		 * @request GET:/admin/dish-searches
		 * @response `200` `GetDishSearchesData`
		 */
		getDishSearches: (
			query: {
				/** @format uuid */
				cityId: string;
				/**
				 * The snapshot to show, `YYYY-MM-DD`; the newest when absent
				 * @pattern ^[0-9]{4}-[0-9]{2}-[0-9]{2}$
				 */
				searchedOn?: string;
				/**
				 * The dish topic's key, e.g. `pasta`
				 * @minLength 1
				 */
				topicKey: string;
			},
			params: RequestParams = {},
		) =>
			this.request<GetDishSearchesData, any>({
				path: `/admin/dish-searches`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * @description The dish searches a venue was in the top ten of, over its city's last six snapshots.
		 *
		 * @name GetVenueDishSearches
		 * @summary The dish searches a venue was in the top ten of, over its city's last six snapshots
		 * @request GET:/admin/venues/{id}/dish-searches
		 * @response `200` `GetVenueDishSearchesData`
		 */
		getVenueDishSearches: (id: string, params: RequestParams = {}) =>
			this.request<GetVenueDishSearchesData, any>({
				path: `/admin/venues/${id}/dish-searches`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * @description Groups of a city's venues that look like one brand; nothing is saved until confirmed.
		 *
		 * @name ListBrandSuggestions
		 * @summary Groups of a city's venues that look like one brand; nothing is saved until confirmed
		 * @request GET:/admin/brands/suggestions
		 * @response `200` `ListBrandSuggestionsData`
		 */
		listBrandSuggestions: (
			query: {
				/** @format uuid */
				cityId: string;
			},
			params: RequestParams = {},
		) =>
			this.request<ListBrandSuggestionsData, any>({
				path: `/admin/brands/suggestions`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * @description Merges the venues' brands into one chain; their records move onto it, its mentions are matched again and the cities scored again.
		 *
		 * @name ConfirmBrand
		 * @request POST:/admin/brands
		 * @response `201` `ConfirmBrandData`
		 */
		confirmBrand: (data: AdminConfirmBrandInputDto, params: RequestParams = {}) =>
			this.request<ConfirmBrandData, any>({
				path: `/admin/brands`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * @description Every brand with an open branch in the city, with the month's posts, reviews, sales stage and report.
		 *
		 * @name ListBrands
		 * @summary Every brand with an open branch in the city, with the month's posts, reviews, sales stage and report
		 * @request GET:/admin/brands
		 * @response `200` `ListBrandsData`
		 */
		listBrands: (
			query: {
				/**
				 * The brands with an open branch in this city, and their figures there; every city without
				 * @format uuid
				 */
				cityId?: string;
				/** Brands with an open branch in this district */
				district?: string;
				/**
				 * The month the figures are for; the last finished month without
				 * @pattern ^[0-9]{4}-[0-9]{2}$
				 */
				month?: string;
				/** @min 1 */
				page: number;
				/** On the brand's name or any of its branches' */
				q?: string;
				segment?: ListBrandsParamsSegmentEnum;
				/** @min 1 */
				size: number;
				sort?: ListBrandsParamsSortEnum;
				stage?: ListBrandsParamsStageEnum;
			},
			params: RequestParams = {},
		) =>
			this.request<ListBrandsData, any>({
				path: `/admin/brands`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * @description "Not one brand": the suggestion never comes back.
		 *
		 * @name DismissBrandSuggestion
		 * @summary "Not one brand": the suggestion never comes back
		 * @request POST:/admin/brands/dismissals
		 * @response `201` `DismissBrandSuggestionData`
		 */
		dismissBrandSuggestion: (data: AdminDismissBrandInputDto, params: RequestParams = {}) =>
			this.request<DismissBrandSuggestionData, any>({
				path: `/admin/brands/dismissals`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name GetBrand
		 * @request GET:/admin/brands/{id}
		 * @response `200` `GetBrandData`
		 */
		getBrand: (id: string, params: RequestParams = {}) =>
			this.request<GetBrandData, any>({
				path: `/admin/brands/${id}`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name UpdateBrand
		 * @request PATCH:/admin/brands/{id}
		 * @response `200` `UpdateBrandData`
		 */
		updateBrand: (id: string, data: AdminUpdateBrandInputDto, params: RequestParams = {}) =>
			this.request<UpdateBrandData, any>({
				path: `/admin/brands/${id}`,
				method: 'PATCH',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * @description Undoes a chain: every branch but the most reviewed becomes a brand of its own again.
		 *
		 * @name SplitBrand
		 * @summary Undoes a chain: every branch but the most reviewed becomes a brand of its own again
		 * @request POST:/admin/brands/{id}/split
		 * @response `201` `SplitBrandData`
		 */
		splitBrand: (id: string, params: RequestParams = {}) =>
			this.request<SplitBrandData, any>({
				path: `/admin/brands/${id}/split`,
				method: 'POST',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name AddBrandBranches
		 * @request POST:/admin/brands/{id}/branches
		 * @response `201` `AddBrandBranchesData`
		 */
		addBrandBranches: (
			id: string,
			data: AdminBrandVenuesInputDto,
			params: RequestParams = {},
		) =>
			this.request<AddBrandBranchesData, any>({
				path: `/admin/brands/${id}/branches`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name RemoveBrandBranch
		 * @request DELETE:/admin/brands/{id}/branches/{venueId}
		 * @response `200` `RemoveBrandBranchData`
		 */
		removeBrandBranch: (id: string, venueId: string, params: RequestParams = {}) =>
			this.request<RemoveBrandBranchData, any>({
				path: `/admin/brands/${id}/branches/${venueId}`,
				method: 'DELETE',
				format: 'json',
				...params,
			}),

		/**
		 * @description "Not a branch": a namesake, never offered again (and taken off when it was a branch).
		 *
		 * @name ExcludeBrandVenue
		 * @summary "Not a branch": a namesake, never offered again (and taken off when it was a branch)
		 * @request POST:/admin/brands/{id}/exclusions
		 * @response `201` `ExcludeBrandVenueData`
		 */
		excludeBrandVenue: (
			id: string,
			data: AdminBrandVenueInputDto,
			params: RequestParams = {},
		) =>
			this.request<ExcludeBrandVenueData, any>({
				path: `/admin/brands/${id}/exclusions`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * @description "Find branches": queues one Google Maps search for the name in the city (about $0.20, half a minute); `branchesSearchedAt` moves when it is done.
		 *
		 * @name SearchBrandBranches
		 * @request POST:/admin/brands/{id}/searches
		 * @response `201` `SearchBrandBranchesData`
		 */
		searchBrandBranches: (
			id: string,
			data: AdminSearchBrandInputDto,
			params: RequestParams = {},
		) =>
			this.request<SearchBrandBranchesData, any>({
				path: `/admin/brands/${id}/searches`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * @description The places and brands this brand's reports compare it with.
		 *
		 * @name ListBrandCompetitors
		 * @summary The places and brands this brand's reports compare it with
		 * @request GET:/admin/brands/{id}/competitors
		 * @response `200` `ListBrandCompetitorsData`
		 */
		listBrandCompetitors: (id: string, params: RequestParams = {}) =>
			this.request<ListBrandCompetitorsData, any>({
				path: `/admin/brands/${id}/competitors`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * @description Adds a place or a whole brand as competition (`venueId` or `brandId`), for the brand or one branch (`branchId`).
		 *
		 * @name AddBrandCompetitor
		 * @summary Adds a place or a whole brand as competition (`venueId` or `brandId`), for the brand or one branch (`branchId`)
		 * @request POST:/admin/brands/{id}/competitors
		 * @response `201` `AddBrandCompetitorData`
		 */
		addBrandCompetitor: (
			id: string,
			data: AdminAddCompetitorInputDto,
			params: RequestParams = {},
		) =>
			this.request<AddBrandCompetitorData, any>({
				path: `/admin/brands/${id}/competitors`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name RemoveBrandCompetitor
		 * @request DELETE:/admin/brands/{id}/competitors/{competitorId}
		 * @response `200` `RemoveBrandCompetitorData`
		 */
		removeBrandCompetitor: (id: string, competitorId: number, params: RequestParams = {}) =>
			this.request<RemoveBrandCompetitorData, any>({
				path: `/admin/brands/${id}/competitors/${competitorId}`,
				method: 'DELETE',
				format: 'json',
				...params,
			}),

		/**
		 * @description Five likely competitors in a city to add with one click; nothing is added here.
		 *
		 * @name ListBrandCompetitorSuggestions
		 * @summary Five likely competitors in a city to add with one click; nothing is added here
		 * @request GET:/admin/brands/{id}/competitor-suggestions
		 * @response `200` `ListBrandCompetitorSuggestionsData`
		 */
		listBrandCompetitorSuggestions: (
			id: string,
			query?: {
				/**
				 * Suggest around this branch instead of the city's most reviewed one
				 * @format uuid
				 */
				branchId?: string;
				/**
				 * The city to suggest in; the brand's first city without it
				 * @format uuid
				 */
				cityId?: string;
			},
			params: RequestParams = {},
		) =>
			this.request<ListBrandCompetitorSuggestionsData, any>({
				path: `/admin/brands/${id}/competitor-suggestions`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * @description After the dish pass's instruction changed: its links whose phrase doesn't name the dish go back to the `feedback-dish-links` backlog, which looks at them again within the day's allowance.
		 *
		 * @name RecheckDishLinks
		 * @request POST:/admin/feedback/dish-links/recheck
		 * @response `201` `RecheckDishLinksData`
		 */
		recheckDishLinks: (params: RequestParams = {}) =>
			this.request<RecheckDishLinksData, any>({
				path: `/admin/feedback/dish-links/recheck`,
				method: 'POST',
				format: 'json',
				...params,
			}),

		/**
		 * @description After editing the vocabulary: `realign` (topics follow their theme, points of a removed theme go back to filing), then files up to `limit` unfiled points. Free (the LLM allowance). The daily LLM backlog `feedback-themes` files the rest on its own; this is for a city that can't wait.
		 *
		 * @name FileFeedbackThemes
		 * @request POST:/admin/feedback-themes/backfill
		 * @response `201` `FileFeedbackThemesData`
		 */
		fileFeedbackThemes: (data: AdminFileFeedbackThemesInputDto, params: RequestParams = {}) =>
			this.request<FileFeedbackThemesData, any>({
				path: `/admin/feedback-themes/backfill`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * @description How many venues had a waiting complaint in the city's month, and how long the stated waits were
		 *
		 * @name GetWaitComplaints
		 * @request GET:/admin/feedback/wait-complaints
		 * @response `200` `GetWaitComplaintsData`
		 */
		getWaitComplaints: (
			query: {
				/** @format uuid */
				cityId: string;
				/** @pattern ^[0-9]{4}-[0-9]{2}$ */
				month: string;
			},
			params: RequestParams = {},
		) =>
			this.request<GetWaitComplaintsData, any>({
				path: `/admin/feedback/wait-complaints`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * @description The city's dish names with the food topic each points at, who decided it, and the agent's suggested topics for those without one (the Trends "Dish names" tab)
		 *
		 * @name GetDishNames
		 * @request GET:/admin/dish-names
		 * @response `200` `GetDishNamesData`
		 */
		getDishNames: (
			query: {
				/** @format uuid */
				cityId: string;
				/**
				 * @min 1
				 * @max 200
				 */
				limit?: number;
				/** @min 0 */
				offset?: number;
				/**
				 * Part of the name
				 * @maxLength 100
				 */
				q?: string;
				/** `unlinked` (decided, no topic; the default), `linked`, `pending` (not decided yet) or `all` */
				status?: GetDishNamesParamsStatusEnum;
				/**
				 * Only the names the agent suggested this topic for
				 * @maxLength 100
				 */
				suggestion?: string;
				/**
				 * Only the names of this topic
				 * @maxLength 64
				 */
				topicKey?: string;
			},
			params: RequestParams = {},
		) =>
			this.request<GetDishNamesData, any>({
				path: `/admin/dish-names`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * @description An admin's topic for a name (or none, or back to automatic); its feedback rows follow at once
		 *
		 * @name UpdateDishName
		 * @request PATCH:/admin/dish-names/{id}
		 * @response `200` `UpdateDishNameData`
		 */
		updateDishName: (
			id: number,
			data: AdminUpdateDishNameInputDto,
			params: RequestParams = {},
		) =>
			this.request<UpdateDishNameData, any>({
				path: `/admin/dish-names/${id}`,
				method: 'PATCH',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * @description Every registered LLM backlog in run order: what is left, the last seven days, the newest run
		 *
		 * @name ListLlmBacklogs
		 * @request GET:/admin/llm-backlogs
		 * @response `200` `ListLlmBacklogsData`
		 */
		listLlmBacklogs: (params: RequestParams = {}) =>
			this.request<ListLlmBacklogsData, any>({
				path: `/admin/llm-backlogs`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * @description Queues the daily drain now; it goes on within what is left of today's budget
		 *
		 * @name RunLlmBacklogs
		 * @request POST:/admin/llm-backlogs/run
		 * @response `201` `RunLlmBacklogsData`
		 */
		runLlmBacklogs: (params: RequestParams = {}) =>
			this.request<RunLlmBacklogsData, any>({
				path: `/admin/llm-backlogs/run`,
				method: 'POST',
				format: 'json',
				...params,
			}),

		/**
		 * @description Every food topic with the city's mentions and venues on it, and the city's unmapped cuisine keys.
		 *
		 * @name GetFoodTopics
		 * @summary Every food topic with the city's mentions and venues on it, and the city's unmapped cuisine keys
		 * @request GET:/admin/food-topics
		 * @response `200` `GetFoodTopicsData`
		 */
		getFoodTopics: (
			query: {
				/** @format uuid */
				cityId: string;
			},
			params: RequestParams = {},
		) =>
			this.request<GetFoodTopicsData, any>({
				path: `/admin/food-topics`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * @description A new topic; 409 when its key exists.
		 *
		 * @name CreateFoodTopic
		 * @summary A new topic; 409 when its key exists
		 * @request POST:/admin/food-topics
		 * @response `201` `CreateFoodTopicData`
		 */
		createFoodTopic: (data: AdminCreateFoodTopicInputDto, params: RequestParams = {}) =>
			this.request<CreateFoodTopicData, any>({
				path: `/admin/food-topics`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * @description Queues the re-link of everything stored against food topics (`FoodTopicRelinkJob`: mentions, menu items, feedback dishes, then every city's venue tags). A topic or alias change queues it on its own; this is for a first fill or after a change made outside the admin.
		 *
		 * @name RelinkFoodTopics
		 * @request POST:/admin/food-topics/relink
		 * @response `201` `RelinkFoodTopicsData`
		 */
		relinkFoodTopics: (params: RequestParams = {}) =>
			this.request<RelinkFoodTopicsData, any>({
				path: `/admin/food-topics/relink`,
				method: 'POST',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name SetIgnoredWord
		 * @request PUT:/admin/food-topics/ignored-words
		 * @response `200` `SetIgnoredWordData`
		 */
		setIgnoredWord: (data: AdminIgnoreWordInputDto, params: RequestParams = {}) =>
			this.request<SetIgnoredWordData, any>({
				path: `/admin/food-topics/ignored-words`,
				method: 'PUT',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * @description Google Trends topic ids for some words (Trends' autocomplete), to set a topic's `trendsTopicId`.
		 *
		 * @name LookupTrendsTopics
		 * @summary Google Trends topic ids for some words (Trends' autocomplete), to set a topic's `trendsTopicId`
		 * @request GET:/admin/food-topics/trends-lookup
		 * @response `200` `LookupTrendsTopicsData`
		 */
		lookupTrendsTopics: (
			query: {
				/**
				 * @minLength 2
				 * @maxLength 80
				 */
				q: string;
			},
			params: RequestParams = {},
		) =>
			this.request<LookupTrendsTopicsData, any>({
				path: `/admin/food-topics/trends-lookup`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * @description Changes the fields given; an unmapped key is mapped by adding it to `aliases`.
		 *
		 * @name UpdateFoodTopic
		 * @summary Changes the fields given; an unmapped key is mapped by adding it to `aliases`
		 * @request PATCH:/admin/food-topics/{id}
		 * @response `200` `UpdateFoodTopicData`
		 */
		updateFoodTopic: (
			id: string,
			data: AdminUpdateFoodTopicInputDto,
			params: RequestParams = {},
		) =>
			this.request<UpdateFoodTopicData, any>({
				path: `/admin/food-topics/${id}`,
				method: 'PATCH',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * @description The venue's food topics, primary first, and the ones an admin keeps off it.
		 *
		 * @name GetVenueFoodTopics
		 * @summary The venue's food topics, primary first, and the ones an admin keeps off it
		 * @request GET:/admin/venues/{venueId}/food-topics
		 * @response `200` `GetVenueFoodTopicsData`
		 */
		getVenueFoodTopics: (venueId: string, params: RequestParams = {}) =>
			this.request<GetVenueFoodTopicsData, any>({
				path: `/admin/venues/${venueId}/food-topics`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * @description Tags the venue with a topic, keeps one off it, or clears the admin's word on it.
		 *
		 * @name ChangeVenueFoodTopic
		 * @summary Tags the venue with a topic, keeps one off it, or clears the admin's word on it
		 * @request PUT:/admin/venues/{venueId}/food-topics/{key}
		 * @response `200` `ChangeVenueFoodTopicData`
		 */
		changeVenueFoodTopic: (
			venueId: string,
			key: string,
			data: AdminChangeVenueFoodTopicInputDto,
			params: RequestParams = {},
		) =>
			this.request<ChangeVenueFoodTopicData, any>({
				path: `/admin/venues/${venueId}/food-topics/${key}`,
				method: 'PUT',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name ListPosts
		 * @request GET:/admin/posts
		 * @response `200` `ListPostsData`
		 */
		listPosts: (
			query: {
				/**
				 * Only posts by this account
				 * @format uuid
				 */
				accountId?: string;
				/**
				 * Only posts that mention this brand, a branch of it or the brand alone.
				 * @format uuid
				 */
				brandId?: string;
				/** @format uuid */
				cityId?: string;
				/**
				 * Only posts by this creator's accounts
				 * @format uuid
				 */
				creatorId?: string;
				/**
				 * Only posts whose caption carries this hashtag (with or without #, any case)
				 * @maxLength 200
				 */
				hashtag?: string;
				/** Only posts with at least one mention matched to a brand. */
				matchedOnly?: boolean;
				/** @pattern ^[0-9]{4}-[0-9]{2}$ */
				month?: string;
				/** @min 1 */
				page: number;
				platform?: ListPostsParamsPlatformEnum;
				q?: string;
				/** @min 1 */
				size: number;
				sort?: ListPostsParamsSortEnum;
				/** Only posts with a mention nothing matched (`none`): to link by hand. */
				unmatchedOnly?: boolean;
				/**
				 * Only posts that mention this venue.
				 * @format uuid
				 */
				venueId?: string;
			},
			params: RequestParams = {},
		) =>
			this.request<ListPostsData, any>({
				path: `/admin/posts`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name GetPost
		 * @request GET:/admin/posts/{id}
		 * @response `200` `GetPostData`
		 */
		getPost: (id: string, params: RequestParams = {}) =>
			this.request<GetPostData, any>({
				path: `/admin/posts/${id}`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name ListMentions
		 * @request GET:/admin/mentions
		 * @response `200` `ListMentionsData`
		 */
		listMentions: (
			query: {
				/**
				 * The brand's mentions: of every branch and of the brand alone
				 * @format uuid
				 */
				brandId?: string;
				matchMethod?: ListMentionsParamsMatchMethodEnum;
				/** @pattern ^[0-9]{4}-[0-9]{2}$ */
				month?: string;
				/** @min 1 */
				page: number;
				/** @min 1 */
				size: number;
				/** @format uuid */
				venueId?: string;
			},
			params: RequestParams = {},
		) =>
			this.request<ListMentionsData, any>({
				path: `/admin/mentions`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * @description Relinks, unlinks or ignores a mention; matching never overwrites it afterwards.
		 *
		 * @name UpdateMention
		 * @summary Relinks, unlinks or ignores a mention; matching never overwrites it afterwards
		 * @request PATCH:/admin/mentions/{id}
		 * @response `200` `UpdateMentionData`
		 */
		updateMention: (id: number, data: AdminUpdateMentionInputDto, params: RequestParams = {}) =>
			this.request<UpdateMentionData, any>({
				path: `/admin/mentions/${id}`,
				method: 'PATCH',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * @description Marks a tag as noise, so it is never suggested as a source, or takes that back.
		 *
		 * @name UpdateHashtag
		 * @summary Marks a tag as noise, so it is never suggested as a source, or takes that back
		 * @request PATCH:/admin/hashtags/{id}
		 * @response `200` `UpdateHashtagData`
		 */
		updateHashtag: (id: number, data: AdminUpdateHashtagInputDto, params: RequestParams = {}) =>
			this.request<UpdateHashtagData, any>({
				path: `/admin/hashtags/${id}`,
				method: 'PATCH',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name ListPostComments
		 * @request GET:/admin/posts/{id}/comments
		 * @response `200` `ListPostCommentsData`
		 */
		listPostComments: (id: string, params: RequestParams = {}) =>
			this.request<ListPostCommentsData, any>({
				path: `/admin/posts/${id}/comments`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name ListAccounts
		 * @request GET:/admin/accounts
		 * @response `200` `ListAccountsData`
		 */
		listAccounts: (
			query: {
				/**
				 * The accounts first seen in this city; the first active city's without
				 * @format uuid
				 */
				cityId?: string;
				/**
				 * The month the post figures are for; the last finished month without
				 * @pattern ^[0-9]{4}-[0-9]{2}$
				 */
				month?: string;
				/** @min 1 */
				page: number;
				platform?: ListAccountsParamsPlatformEnum;
				/** On the handle, the display name or the brand's name */
				q?: string;
				/** @min 1 */
				size: number;
				sort?: ListAccountsParamsSortEnum;
				status?: ListAccountsParamsStatusEnum;
			},
			params: RequestParams = {},
		) =>
			this.request<ListAccountsData, any>({
				path: `/admin/accounts`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * @description Links, confirms, rejects or re-branches one account.
		 *
		 * @name DecideAccount
		 * @summary Links, confirms, rejects or re-branches one account
		 * @request PATCH:/admin/accounts/{id}
		 * @response `200` `DecideAccountData`
		 */
		decideAccount: (id: string, data: DecideAccountPayload, params: RequestParams = {}) =>
			this.request<DecideAccountData, any>({
				path: `/admin/accounts/${id}`,
				method: 'PATCH',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * @description Runs the matcher for a city now (it runs after every mention matching anyway).
		 *
		 * @name MatchAccounts
		 * @summary Runs the matcher for a city now (it runs after every mention matching anyway)
		 * @request POST:/admin/accounts/match
		 * @response `201` `MatchAccountsData`
		 */
		matchAccounts: (data: AdminMatchAccountsInputDto, params: RequestParams = {}) =>
			this.request<MatchAccountsData, any>({
				path: `/admin/accounts/match`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * @description Takes an account out of its creator: "not the same person".
		 *
		 * @name SplitAccount
		 * @summary Takes an account out of its creator: "not the same person"
		 * @request POST:/admin/accounts/{id}/split
		 * @response `201` `SplitAccountData`
		 */
		splitAccount: (id: string, params: RequestParams = {}) =>
			this.request<SplitAccountData, any>({
				path: `/admin/accounts/${id}/split`,
				method: 'POST',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name ListBrandAccounts
		 * @request GET:/admin/brands/{id}/accounts
		 * @response `200` `ListBrandAccountsData`
		 */
		listBrandAccounts: (
			id: string,
			query?: {
				/**
				 * The month the post figures are for; the last finished month without
				 * @pattern ^[0-9]{4}-[0-9]{2}$
				 */
				month?: string;
			},
			params: RequestParams = {},
		) =>
			this.request<ListBrandAccountsData, any>({
				path: `/admin/brands/${id}/accounts`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * @description Adds a handle as the brand's own or one branch's: linked whoever had it, and no longer rejected.
		 *
		 * @name AddBrandAccount
		 * @summary Adds a handle as the brand's own or one branch's: linked whoever had it, and no longer rejected
		 * @request POST:/admin/brands/{id}/accounts
		 * @response `201` `AddBrandAccountData`
		 */
		addBrandAccount: (
			id: string,
			data: AdminAddBrandAccountInputDto,
			params: RequestParams = {},
		) =>
			this.request<AddBrandAccountData, any>({
				path: `/admin/brands/${id}/accounts`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * @description Says whose an account is: one branch's (`branchId`) or the whole brand's (`null`).
		 *
		 * @name UpdateBrandAccount
		 * @summary Says whose an account is: one branch's (`branchId`) or the whole brand's (`null`)
		 * @request PATCH:/admin/brands/{id}/accounts/{accountId}
		 * @response `200` `UpdateBrandAccountData`
		 */
		updateBrandAccount: (
			id: string,
			accountId: string,
			data: AdminUpdateBrandAccountInputDto,
			params: RequestParams = {},
		) =>
			this.request<UpdateBrandAccountData, any>({
				path: `/admin/brands/${id}/accounts/${accountId}`,
				method: 'PATCH',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * @description "Not this brand's": final for the matcher; only an admin's add links it back.
		 *
		 * @name RemoveBrandAccount
		 * @summary "Not this brand's": final for the matcher; only an admin's add links it back
		 * @request DELETE:/admin/brands/{id}/accounts/{accountId}
		 * @response `200` `RemoveBrandAccountData`
		 */
		removeBrandAccount: (id: string, accountId: string, params: RequestParams = {}) =>
			this.request<RemoveBrandAccountData, any>({
				path: `/admin/brands/${id}/accounts/${accountId}`,
				method: 'DELETE',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name ListCreators
		 * @request GET:/admin/creators
		 * @response `200` `ListCreatorsData`
		 */
		listCreators: (
			query: {
				/**
				 * Posts found in this city; every city's without
				 * @format uuid
				 */
				cityId?: string;
				/** Also venues' own accounts (every account of the creator linked to a brand) */
				includeOwn?: boolean;
				/**
				 * The month counted; the last finished month without
				 * @pattern ^[0-9]{4}-[0-9]{2}$
				 */
				month?: string;
				/** @min 1 */
				page: number;
				platform?: ListCreatorsParamsPlatformEnum;
				/** On the creator's name, handles and display names */
				q?: string;
				/** @min 1 */
				size: number;
				sort?: ListCreatorsParamsSortEnum;
			},
			params: RequestParams = {},
		) =>
			this.request<ListCreatorsData, any>({
				path: `/admin/creators`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name GetCreator
		 * @request GET:/admin/creators/{id}
		 * @response `200` `GetCreatorData`
		 */
		getCreator: (
			id: string,
			query?: {
				/**
				 * The month the accounts' figures are for, and the last of the six months; the last finished month without
				 * @pattern ^[0-9]{4}-[0-9]{2}$
				 */
				month?: string;
			},
			params: RequestParams = {},
		) =>
			this.request<GetCreatorData, any>({
				path: `/admin/creators/${id}`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name UpdateCreator
		 * @request PATCH:/admin/creators/{id}
		 * @response `200` `UpdateCreatorData`
		 */
		updateCreator: (id: string, data: AdminUpdateCreatorInputDto, params: RequestParams = {}) =>
			this.request<UpdateCreatorData, any>({
				path: `/admin/creators/${id}`,
				method: 'PATCH',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * @description "These are one person": the accounts move under this creator.
		 *
		 * @name MergeCreatorAccounts
		 * @summary "These are one person": the accounts move under this creator
		 * @request POST:/admin/creators/{id}/accounts
		 * @response `201` `MergeCreatorAccountsData`
		 */
		mergeCreatorAccounts: (
			id: string,
			data: AdminMergeCreatorAccountsInputDto,
			params: RequestParams = {},
		) =>
			this.request<MergeCreatorAccountsData, any>({
				path: `/admin/creators/${id}/accounts`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * @description Reads a month's stored posts again for the "just opened" flag only (`MentionExtractionService.reflagOpenings`): sets `isNewOpening` on the mentions already stored, adds none, and leaves matches and admins' corrections as they are. Most viewed first, `limit` posts a call (LLM allowance, ~3,000 tokens a post); call again with `nextOffset` until `remaining` is zero.
		 *
		 * @name ReflagOpenings
		 * @request POST:/admin/mentions/reflag-openings
		 * @response `201` `ReflagOpeningsData`
		 */
		reflagOpenings: (data: AdminReflagOpeningsInputDto, params: RequestParams = {}) =>
			this.request<ReflagOpeningsData, any>({
				path: `/admin/mentions/reflag-openings`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name ListReports
		 * @request GET:/admin/reports
		 * @response `200` `ListReportsData`
		 */
		listReports: (
			query: {
				/** @format uuid */
				brandId?: string;
				/**
				 * Reports on this city's branches
				 * @format uuid
				 */
				cityId?: string;
				/**
				 * Reports of this configuration
				 * @format uuid
				 */
				configId?: string;
				/** @pattern ^[0-9]{4}-[0-9]{2}$ */
				month?: string;
				/** @min 1 */
				page: number;
				/** @min 1 */
				size: number;
				sort?: ListReportsParamsSortEnum;
				/**
				 * Reports made from this template
				 * @format uuid
				 */
				templateId?: string;
			},
			params: RequestParams = {},
		) =>
			this.request<ListReportsData, any>({
				path: `/admin/reports`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * @description Builds (or rebuilds) a brand's reports on its branches in a city, or (no `cityId`) in all its cities, for a month: one per active configuration (or the default), or only `configId`'s. Returns the first. Takes a few seconds: LLM calls.
		 *
		 * @name BuildReport
		 * @request POST:/admin/reports
		 * @response `201` `BuildReportData`
		 */
		buildReport: (data: AdminBuildReportInputDto, params: RequestParams = {}) =>
			this.request<BuildReportData, any>({
				path: `/admin/reports`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name GetReport
		 * @request GET:/admin/reports/{id}
		 * @response `200` `GetReportData`
		 */
		getReport: (id: string, params: RequestParams = {}) =>
			this.request<GetReportData, any>({
				path: `/admin/reports/${id}`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * @description The report as an A4 PDF, for downloading. Takes a few seconds: headless Chrome prints it.
		 *
		 * @name GetReportPdf
		 * @summary The report as an A4 PDF, for downloading. Takes a few seconds: headless Chrome prints it
		 * @request GET:/admin/reports/{id}/pdf
		 * @response `200` `GetReportPdfData`
		 */
		getReportPdf: (id: string, params: RequestParams = {}) =>
			this.request<GetReportPdfData, any>({
				path: `/admin/reports/${id}/pdf`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * @description The A5 leave-behind for a visit: the cover title, headline and three findings with a QR code to the report's live share link (made if there is none), so a scan counts as an open, and the printing admin's name and e-mail. Takes a few seconds: headless Chrome prints it.
		 *
		 * @name GetReportLeaveBehindPdf
		 * @request GET:/admin/reports/{id}/leave-behind.pdf
		 * @response `200` `GetReportLeaveBehindPdfData`
		 */
		getReportLeaveBehindPdf: (id: string, params: RequestParams = {}) =>
			this.request<GetReportLeaveBehindPdfData, any>({
				path: `/admin/reports/${id}/leave-behind.pdf`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * @description A brand's report data as a rebuild would compute it now, without the LLM calls (no highlights, no reply drafts) and without saving anything: to check what a change to the data would move before rebuilding.
		 *
		 * @name PreviewReportData
		 * @request POST:/admin/reports/preview
		 * @response `201` `PreviewReportDataData`
		 */
		previewReportData: (data: AdminBuildReportInputDto, params: RequestParams = {}) =>
			this.request<PreviewReportDataData, any>({
				path: `/admin/reports/preview`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * @description Runs the analysis ("what moved, and why it might have") again on the report's stored data: the observations, their checks, the agent and the line check. Written on every report of that build (they share one data). The highlights are not rewritten: Rebuild does that. Takes up to a few minutes: an agent call with tools.
		 *
		 * @name AnalyseReport
		 * @request POST:/admin/reports/{id}/analyse
		 * @response `201` `AnalyseReportData`
		 */
		analyseReport: (id: string, params: RequestParams = {}) =>
			this.request<AnalyseReportData, any>({
				path: `/admin/reports/${id}/analyse`,
				method: 'POST',
				format: 'json',
				...params,
			}),

		/**
		 * @description Newest first, revoked ones included.
		 *
		 * @name ListReportShares
		 * @summary Newest first, revoked ones included
		 * @request GET:/admin/reports/{id}/shares
		 * @response `200` `ListReportSharesData`
		 */
		listReportShares: (id: string, params: RequestParams = {}) =>
			this.request<ListReportSharesData, any>({
				path: `/admin/reports/${id}/shares`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * @description A new link; each recipient can get their own, so their opens count apart.
		 *
		 * @name CreateReportShare
		 * @summary A new link; each recipient can get their own, so their opens count apart
		 * @request POST:/admin/reports/{id}/shares
		 * @response `201` `CreateReportShareData`
		 */
		createReportShare: (id: string, params: RequestParams = {}) =>
			this.request<CreateReportShareData, any>({
				path: `/admin/reports/${id}/shares`,
				method: 'POST',
				format: 'json',
				...params,
			}),

		/**
		 * @description Turns a link off: it answers 404 from then on.
		 *
		 * @name RevokeReportShare
		 * @summary Turns a link off: it answers 404 from then on
		 * @request DELETE:/admin/reports/{id}/shares/{shareId}
		 * @response `200` `RevokeReportShareData`
		 */
		revokeReportShare: (id: string, shareId: string, params: RequestParams = {}) =>
			this.request<RevokeReportShareData, any>({
				path: `/admin/reports/${id}/shares/${shareId}`,
				method: 'DELETE',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name ListReportTemplates
		 * @request GET:/admin/report-templates
		 * @response `200` `ListReportTemplatesData`
		 */
		listReportTemplates: (params: RequestParams = {}) =>
			this.request<ListReportTemplatesData, any>({
				path: `/admin/report-templates`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name CreateReportTemplate
		 * @request POST:/admin/report-templates
		 * @response `201` `CreateReportTemplateData`
		 */
		createReportTemplate: (
			data: AdminCreateReportTemplateInputDto,
			params: RequestParams = {},
		) =>
			this.request<CreateReportTemplateData, any>({
				path: `/admin/report-templates`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name GetReportTemplate
		 * @request GET:/admin/report-templates/{id}
		 * @response `200` `GetReportTemplateData`
		 */
		getReportTemplate: (id: string, params: RequestParams = {}) =>
			this.request<GetReportTemplateData, any>({
				path: `/admin/report-templates/${id}`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * @description Changes the template; configurations already copied from it keep their sections.
		 *
		 * @name UpdateReportTemplate
		 * @summary Changes the template; configurations already copied from it keep their sections
		 * @request PATCH:/admin/report-templates/{id}
		 * @response `200` `UpdateReportTemplateData`
		 */
		updateReportTemplate: (
			id: string,
			data: AdminUpdateReportTemplateInputDto,
			params: RequestParams = {},
		) =>
			this.request<UpdateReportTemplateData, any>({
				path: `/admin/report-templates/${id}`,
				method: 'PATCH',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * @description Deletes a template that is not the default; its configurations and reports keep theirs, the link null.
		 *
		 * @name DeleteReportTemplate
		 * @summary Deletes a template that is not the default; its configurations and reports keep theirs, the link null
		 * @request DELETE:/admin/report-templates/{id}
		 * @response `200` `DeleteReportTemplateData`
		 */
		deleteReportTemplate: (id: string, params: RequestParams = {}) =>
			this.request<DeleteReportTemplateData, any>({
				path: `/admin/report-templates/${id}`,
				method: 'DELETE',
				format: 'json',
				...params,
			}),

		/**
		 * @description Makes it what brands without an active configuration get.
		 *
		 * @name SetDefaultReportTemplate
		 * @summary Makes it what brands without an active configuration get
		 * @request POST:/admin/report-templates/{id}/default
		 * @response `201` `SetDefaultReportTemplateData`
		 */
		setDefaultReportTemplate: (id: string, params: RequestParams = {}) =>
			this.request<SetDefaultReportTemplateData, any>({
				path: `/admin/report-templates/${id}/default`,
				method: 'POST',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name ListBrandReportConfigs
		 * @request GET:/admin/brands/{brandId}/report-configs
		 * @response `200` `ListBrandReportConfigsData`
		 */
		listBrandReportConfigs: (brandId: string, params: RequestParams = {}) =>
			this.request<ListBrandReportConfigsData, any>({
				path: `/admin/brands/${brandId}/report-configs`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * @description A copy of a template (or a custom one, from the full layout) for the brand.
		 *
		 * @name CreateBrandReportConfig
		 * @summary A copy of a template (or a custom one, from the full layout) for the brand
		 * @request POST:/admin/brands/{brandId}/report-configs
		 * @response `201` `CreateBrandReportConfigData`
		 */
		createBrandReportConfig: (
			brandId: string,
			data: AdminCreateReportConfigInputDto,
			params: RequestParams = {},
		) =>
			this.request<CreateBrandReportConfigData, any>({
				path: `/admin/brands/${brandId}/report-configs`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name GetReportConfig
		 * @request GET:/admin/report-configs/{id}
		 * @response `200` `GetReportConfigData`
		 */
		getReportConfig: (id: string, params: RequestParams = {}) =>
			this.request<GetReportConfigData, any>({
				path: `/admin/report-configs/${id}`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * @description Renames it, changes its sections or switches it on or off; built reports keep theirs.
		 *
		 * @name UpdateReportConfig
		 * @summary Renames it, changes its sections or switches it on or off; built reports keep theirs
		 * @request PATCH:/admin/report-configs/{id}
		 * @response `200` `UpdateReportConfigData`
		 */
		updateReportConfig: (
			id: string,
			data: AdminUpdateReportConfigInputDto,
			params: RequestParams = {},
		) =>
			this.request<UpdateReportConfigData, any>({
				path: `/admin/report-configs/${id}`,
				method: 'PATCH',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * @description Deletes it; its reports stay, the link null.
		 *
		 * @name DeleteReportConfig
		 * @summary Deletes it; its reports stay, the link null
		 * @request DELETE:/admin/report-configs/{id}
		 * @response `200` `DeleteReportConfigData`
		 */
		deleteReportConfig: (id: string, params: RequestParams = {}) =>
			this.request<DeleteReportConfigData, any>({
				path: `/admin/report-configs/${id}`,
				method: 'DELETE',
				format: 'json',
				...params,
			}),

		/**
		 * @description The city's cuisines, dishes, districts, creators and rising venues for a month, as shares.
		 *
		 * @name GetTrends
		 * @summary The city's cuisines, dishes, districts, creators and rising venues for a month, as shares
		 * @request GET:/admin/trends
		 * @response `200` `GetTrendsData`
		 */
		getTrends: (
			query: {
				/** @format uuid */
				cityId: string;
				/** @pattern ^[0-9]{4}-[0-9]{2}$ */
				month: string;
			},
			params: RequestParams = {},
		) =>
			this.request<GetTrendsData, any>({
				path: `/admin/trends`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * @description Google search interest per food topic over the twelve months up to `month`, next to its share of mentions, and per won venue: what the last `SEARCH_INTEREST` pull stored.
		 *
		 * @name GetSearchInterest
		 * @request GET:/admin/trends/search-interest
		 * @response `200` `GetSearchInterestData`
		 */
		getSearchInterest: (
			query: {
				/** @format uuid */
				cityId: string;
				/** @pattern ^[0-9]{4}-[0-9]{2}$ */
				month: string;
			},
			params: RequestParams = {},
		) =>
			this.request<GetSearchInterestData, any>({
				path: `/admin/trends/search-interest`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * @description The city's food topics with venues, the month's posts and Google searches, most posted about first.
		 *
		 * @name GetTopicInsights
		 * @summary The city's food topics with venues, the month's posts and Google searches, most posted about first
		 * @request GET:/admin/topic-insights
		 * @response `200` `GetTopicInsightsData`
		 */
		getTopicInsights: (
			query: {
				/** @format uuid */
				cityId: string;
				/** @pattern ^[0-9]{4}-[0-9]{2}$ */
				month: string;
			},
			params: RequestParams = {},
		) =>
			this.request<GetTopicInsightsData, any>({
				path: `/admin/topic-insights`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * @description One topic in the city: its figures, children, posts by month, related searches and venues.
		 *
		 * @name GetTopicInsight
		 * @summary One topic in the city: its figures, children, posts by month, related searches and venues
		 * @request GET:/admin/topic-insights/{key}
		 * @response `200` `GetTopicInsightData`
		 */
		getTopicInsight: (
			key: string,
			query: {
				/** @format uuid */
				cityId: string;
				/** @pattern ^[0-9]{4}-[0-9]{2}$ */
				month: string;
			},
			params: RequestParams = {},
		) =>
			this.request<GetTopicInsightData, any>({
				path: `/admin/topic-insights/${key}`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * @description What the city's reviews and posts praise and criticise this month, per feedback theme, across every venue, by kind of food; `food` narrows it to the brands of one.
		 *
		 * @name GetThemeInsights
		 * @request GET:/admin/theme-insights
		 * @response `200` `GetThemeInsightsData`
		 */
		getThemeInsights: (
			query: {
				/** @format uuid */
				cityId: string;
				/**
				 * A food topic's key: only the brands whose food it is (most of their places' main food)
				 * @maxLength 64
				 */
				food?: string;
				/** @pattern ^[0-9]{4}-[0-9]{2}$ */
				month: string;
			},
			params: RequestParams = {},
		) =>
			this.request<GetThemeInsightsData, any>({
				path: `/admin/theme-insights`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * @description One feedback theme in the city's month: its complaints, praise and noticed changes, the picked side over six months, where it came up, by dish and by kind of food, the numbers its points state, and the sentences filed under it with their review or post, narrowed by the filters.
		 *
		 * @name GetThemeInsight
		 * @request GET:/admin/theme-insights/{theme}
		 * @response `200` `GetThemeInsightData`
		 */
		getThemeInsight: (
			theme: string,
			query: {
				/**
				 * Only this brand's sentences
				 * @format uuid
				 */
				brandId?: string;
				/** @format uuid */
				cityId: string;
				/**
				 * Only the sentences about one dish: a `dishes` row's key (`topic:<key>` or `dish:<key>`)
				 * @maxLength 200
				 */
				dish?: string;
				/**
				 * Only the brands of one kind of food: a food topic's key
				 * @maxLength 64
				 */
				food?: string;
				/** Only reviews, or only posts */
				kind?: GetThemeInsightParamsKindEnum;
				/**
				 * 50 when absent
				 * @min 1
				 * @max 200
				 */
				limit?: number;
				/** @pattern ^[0-9]{4}-[0-9]{2}$ */
				month: string;
				/** @min 0 */
				offset?: number;
				/** Complaints when absent */
				side?: GetThemeInsightParamsSideEnum;
			},
			params: RequestParams = {},
		) =>
			this.request<GetThemeInsightData, any>({
				path: `/admin/theme-insights/${theme}`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name ListPipelineRuns
		 * @request GET:/admin/pipeline-runs
		 * @response `200` `ListPipelineRunsData`
		 */
		listPipelineRuns: (
			query: {
				/** @format uuid */
				cityId?: string;
				/** @min 1 */
				page: number;
				/** @min 1 */
				size: number;
			},
			params: RequestParams = {},
		) =>
			this.request<ListPipelineRunsData, any>({
				path: `/admin/pipeline-runs`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * @description Queues a step (or the whole monthly run). It runs in the background, one run at a time.
		 *
		 * @name StartPipelineRun
		 * @summary Queues a step (or the whole monthly run). It runs in the background, one run at a time
		 * @request POST:/admin/pipeline-runs
		 * @response `201` `StartPipelineRunData`
		 */
		startPipelineRun: (data: AdminStartPipelineRunInputDto, params: RequestParams = {}) =>
			this.request<StartPipelineRunData, any>({
				path: `/admin/pipeline-runs`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * @description Fills competitors for the month's report venues that have none. Free: SQL only.
		 *
		 * @name FillCompetitors
		 * @summary Fills competitors for the month's report venues that have none. Free: SQL only
		 * @request POST:/admin/pipeline/fill-competitors
		 * @response `201` `FillCompetitorsData`
		 */
		fillCompetitors: (data: AdminFillCompetitorsInputDto, params: RequestParams = {}) =>
			this.request<FillCompetitorsData, any>({
				path: `/admin/pipeline/fill-competitors`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name ListApifyRuns
		 * @request GET:/admin/apify-runs
		 * @response `200` `ListApifyRunsData`
		 */
		listApifyRuns: (
			query: {
				/** @min 1 */
				page: number;
				/** @min 1 */
				size: number;
			},
			params: RequestParams = {},
		) =>
			this.request<ListApifyRunsData, any>({
				path: `/admin/apify-runs`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name GetCreatorWatch
		 * @request GET:/admin/creators/{id}/watch
		 * @response `200` `GetCreatorWatchData`
		 */
		getCreatorWatch: (
			id: string,
			query?: {
				/**
				 * The report month whose brands decide (customers, top brands, rivals); the last finished month without
				 * @pattern ^[0-9]{4}-[0-9]{2}$
				 */
				month?: string;
			},
			params: RequestParams = {},
		) =>
			this.request<GetCreatorWatchData, any>({
				path: `/admin/creators/${id}/watch`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name GetOutreachSummary
		 * @request GET:/admin/outreach/summary
		 * @response `200` `GetOutreachSummaryData`
		 */
		getOutreachSummary: (params: RequestParams = {}) =>
			this.request<GetOutreachSummaryData, any>({
				path: `/admin/outreach/summary`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name ListProspects
		 * @request GET:/admin/outreach/prospects
		 * @response `200` `ListProspectsData`
		 */
		listProspects: (
			query: {
				/** @format uuid */
				brandId?: string;
				/**
				 * Prospects with a branch in this city
				 * @format uuid
				 */
				cityId?: string;
				/** Only those whose follow-up is due by the end of today */
				due?: boolean;
				/** @min 1 */
				page: number;
				/** Part of the brand's name */
				q?: string;
				/** @min 1 */
				size: number;
				sort?: ListProspectsParamsSortEnum;
				stage?: ListProspectsParamsStageEnum;
			},
			params: RequestParams = {},
		) =>
			this.request<ListProspectsData, any>({
				path: `/admin/outreach/prospects`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * @description Adds a brand to the pipeline; one already on it is returned as it is.
		 *
		 * @name AddProspect
		 * @summary Adds a brand to the pipeline; one already on it is returned as it is
		 * @request POST:/admin/outreach/prospects
		 * @response `201` `AddProspectData`
		 */
		addProspect: (data: AdminAddProspectInputDto, params: RequestParams = {}) =>
			this.request<AddProspectData, any>({
				path: `/admin/outreach/prospects`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * @description The best-scoring brands not on the list yet, with the signals behind each score (`OutreachService.add` takes one on).
		 *
		 * @name ListSuggestedProspects
		 * @summary The best-scoring brands not on the list yet, with the signals behind each score (`OutreachService.add` takes one on)
		 * @request GET:/admin/outreach/suggested
		 * @response `200` `ListSuggestedProspectsData`
		 */
		listSuggestedProspects: (
			query?: {
				/**
				 * How many to list, best first
				 * @min 1
				 * @max 100
				 */
				size?: number;
			},
			params: RequestParams = {},
		) =>
			this.request<ListSuggestedProspectsData, any>({
				path: `/admin/outreach/suggested`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name GetProspect
		 * @request GET:/admin/outreach/prospects/{id}
		 * @response `200` `GetProspectData`
		 */
		getProspect: (id: string, params: RequestParams = {}) =>
			this.request<GetProspectData, any>({
				path: `/admin/outreach/prospects/${id}`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name UpdateProspect
		 * @request PATCH:/admin/outreach/prospects/{id}
		 * @response `200` `UpdateProspectData`
		 */
		updateProspect: (
			id: string,
			data: AdminUpdateProspectInputDto,
			params: RequestParams = {},
		) =>
			this.request<UpdateProspectData, any>({
				path: `/admin/outreach/prospects/${id}`,
				method: 'PATCH',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * @description Takes a brand off the pipeline with its log. Refused for one who opted out.
		 *
		 * @name RemoveProspect
		 * @summary Takes a brand off the pipeline with its log. Refused for one who opted out
		 * @request DELETE:/admin/outreach/prospects/{id}
		 * @response `200` `RemoveProspectData`
		 */
		removeProspect: (id: string, params: RequestParams = {}) =>
			this.request<RemoveProspectData, any>({
				path: `/admin/outreach/prospects/${id}`,
				method: 'DELETE',
				format: 'json',
				...params,
			}),

		/**
		 * @description Writes the hook anew from the brand's report and lead signals (one LLM call), over the old one.
		 *
		 * @name WriteProspectHook
		 * @summary Writes the hook anew from the brand's report and lead signals (one LLM call), over the old one
		 * @request POST:/admin/outreach/prospects/{id}/hook
		 * @response `201` `WriteProspectHookData`
		 */
		writeProspectHook: (id: string, params: RequestParams = {}) =>
			this.request<WriteProspectHookData, any>({
				path: `/admin/outreach/prospects/${id}/hook`,
				method: 'POST',
				format: 'json',
				...params,
			}),

		/**
		 * @description Logs an email, DM, call, visit (with its outcome, come-back time and consent), reply or note, and moves the prospect along.
		 *
		 * @name LogOutreachTouch
		 * @summary Logs an email, DM, call, visit (with its outcome, come-back time and consent), reply or note, and moves the prospect along
		 * @request POST:/admin/outreach/prospects/{id}/touches
		 * @response `201` `LogOutreachTouchData`
		 */
		logOutreachTouch: (
			id: string,
			data: AdminLogOutreachTouchInputDto,
			params: RequestParams = {},
		) =>
			this.request<LogOutreachTouchData, any>({
				path: `/admin/outreach/prospects/${id}/touches`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * @description Invites someone (the contact e-mail unless another is given) to the brand's portal and mails them the link, in the prospect's language. Inviting again sends the mail again.
		 *
		 * @name InviteToPortal
		 * @request POST:/admin/outreach/prospects/{id}/portal-members
		 * @response `201` `InviteToPortalData`
		 */
		inviteToPortal: (
			id: string,
			data: AdminInviteToPortalInputDto,
			params: RequestParams = {},
		) =>
			this.request<InviteToPortalData, any>({
				path: `/admin/outreach/prospects/${id}/portal-members`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * @description Takes someone off the brand's portal; they lose access at once.
		 *
		 * @name RemovePortalMember
		 * @summary Takes someone off the brand's portal; they lose access at once
		 * @request DELETE:/admin/outreach/prospects/{id}/portal-members/{memberId}
		 * @response `200` `RemovePortalMemberData`
		 */
		removePortalMember: (id: string, memberId: string, params: RequestParams = {}) =>
			this.request<RemovePortalMemberData, any>({
				path: `/admin/outreach/prospects/${id}/portal-members/${memberId}`,
				method: 'DELETE',
				format: 'json',
				...params,
			}),

		/**
		 * @description Deletes a log entry made by mistake. The stage stays as it is.
		 *
		 * @name RemoveOutreachTouch
		 * @summary Deletes a log entry made by mistake. The stage stays as it is
		 * @request DELETE:/admin/outreach/prospects/{id}/touches/{touchId}
		 * @response `200` `RemoveOutreachTouchData`
		 */
		removeOutreachTouch: (id: string, touchId: string, params: RequestParams = {}) =>
			this.request<RemoveOutreachTouchData, any>({
				path: `/admin/outreach/prospects/${id}/touches/${touchId}`,
				method: 'DELETE',
				format: 'json',
				...params,
			}),

		/**
		 * @description E-mails a report to its brand now, again if it went out before. Only a won prospect with an address gets one. Logged on its outreach record.
		 *
		 * @name SendReport
		 * @request POST:/admin/outreach/reports/{reportId}/send
		 * @response `201` `SendReportData`
		 */
		sendReport: (reportId: string, params: RequestParams = {}) =>
			this.request<SendReportData, any>({
				path: `/admin/outreach/reports/${reportId}/send`,
				method: 'POST',
				format: 'json',
				...params,
			}),

		/**
		 * @description The last run, the month's spend and reports, and who to write to today.
		 *
		 * @name GetAdminOverview
		 * @summary The last run, the month's spend and reports, and who to write to today
		 * @request GET:/admin/overview
		 * @response `200` `GetAdminOverviewData`
		 */
		getAdminOverview: (params: RequestParams = {}) =>
			this.request<GetAdminOverviewData, any>({
				path: `/admin/overview`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * @description What is waiting on an admin, counted, each with the page where it is done.
		 *
		 * @name GetAdminToday
		 * @summary What is waiting on an admin, counted, each with the page where it is done
		 * @request GET:/admin/overview/today
		 * @response `200` `GetAdminTodayData`
		 */
		getAdminToday: (params: RequestParams = {}) =>
			this.request<GetAdminTodayData, any>({
				path: `/admin/overview/today`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * @description One brand's month in numbers, six months of them, its best posts and what to do about it.
		 *
		 * @name GetBrandSummary
		 * @summary One brand's month in numbers, six months of them, its best posts and what to do about it
		 * @request GET:/admin/brands/{id}/summary
		 * @response `200` `GetBrandSummaryData`
		 */
		getBrandSummary: (
			id: string,
			query?: {
				/**
				 * Figures in this city only; every city without
				 * @format uuid
				 */
				cityId?: string;
				/**
				 * The last finished month without
				 * @pattern ^[0-9]{4}-[0-9]{2}$
				 */
				month?: string;
			},
			params: RequestParams = {},
		) =>
			this.request<GetBrandSummaryData, any>({
				path: `/admin/brands/${id}/summary`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * @description Each month of a city: what every monthly step did and what is stored, newest first.
		 *
		 * @name GetDataCoverage
		 * @summary Each month of a city: what every monthly step did and what is stored, newest first
		 * @request GET:/admin/data-coverage
		 * @response `200` `GetDataCoverageData`
		 */
		getDataCoverage: (
			query: {
				/** @format uuid */
				cityId: string;
				/**
				 * How many months back from the current one; 6 without
				 * @min 1
				 * @max 24
				 */
				months?: number;
			},
			params: RequestParams = {},
		) =>
			this.request<GetDataCoverageData, any>({
				path: `/admin/data-coverage`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * @description The month as built (absent when it never was) and every built month of the city.
		 *
		 * @name GetCityHighlights
		 * @summary The month as built (absent when it never was) and every built month of the city
		 * @request GET:/admin/highlights
		 * @response `200` `GetCityHighlightsData`
		 */
		getCityHighlights: (
			query: {
				/** @format uuid */
				cityId: string;
				/** @pattern ^[0-9]{4}-(0[1-9]|1[0-2])$ */
				month: string;
			},
			params: RequestParams = {},
		) =>
			this.request<GetCityHighlightsData, any>({
				path: `/admin/highlights`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * @description Computes the month from what is stored now (corrections included) and keeps it for preview.
		 *
		 * @name BuildCityHighlight
		 * @summary Computes the month from what is stored now (corrections included) and keeps it for preview
		 * @request POST:/admin/highlights/build
		 * @response `201` `BuildCityHighlightData`
		 */
		buildCityHighlight: (data: AdminBuildCityHighlightInputDto, params: RequestParams = {}) =>
			this.request<BuildCityHighlightData, any>({
				path: `/admin/highlights/build`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * @description Puts the month on the site and in the sitemap; 400 before the month is over.
		 *
		 * @name PublishCityHighlight
		 * @summary Puts the month on the site and in the sitemap; 400 before the month is over
		 * @request POST:/admin/highlights/{id}/publish
		 * @response `201` `PublishCityHighlightData`
		 */
		publishCityHighlight: (id: string, params: RequestParams = {}) =>
			this.request<PublishCityHighlightData, any>({
				path: `/admin/highlights/${id}/publish`,
				method: 'POST',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name UnpublishCityHighlight
		 * @request POST:/admin/highlights/{id}/unpublish
		 * @response `201` `UnpublishCityHighlightData`
		 */
		unpublishCityHighlight: (id: string, params: RequestParams = {}) =>
			this.request<UnpublishCityHighlightData, any>({
				path: `/admin/highlights/${id}/unpublish`,
				method: 'POST',
				format: 'json',
				...params,
			}),

		/**
		 * @description The quarter as stored (absent when nothing is), every stored quarter, and what a pull would cost.
		 *
		 * @name GetFoodTrends
		 * @summary The quarter as stored (absent when nothing is), every stored quarter, and what a pull would cost
		 * @request GET:/admin/food-trends
		 * @response `200` `GetFoodTrendsData`
		 */
		getFoodTrends: (
			query: {
				/** @format uuid */
				cityId: string;
				/** @pattern ^[0-9]{4}-q[1-4]$ */
				quarter: string;
			},
			params: RequestParams = {},
		) =>
			this.request<GetFoodTrendsData, any>({
				path: `/admin/food-trends`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * @description Queues the anchored Google Trends pull of the quarter (paid, about a cent a topic); 409 while one runs.
		 *
		 * @name PullFoodTrendsSearches
		 * @summary Queues the anchored Google Trends pull of the quarter (paid, about a cent a topic); 409 while one runs
		 * @request POST:/admin/food-trends/pull-searches
		 * @response `201` `PullFoodTrendsSearchesData`
		 */
		pullFoodTrendsSearches: (
			data: AdminFoodTrendsQuarterInputDto,
			params: RequestParams = {},
		) =>
			this.request<PullFoodTrendsSearchesData, any>({
				path: `/admin/food-trends/pull-searches`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * @description Computes the quarter from what is stored now and keeps it for preview. Free.
		 *
		 * @name BuildFoodTrends
		 * @summary Computes the quarter from what is stored now and keeps it for preview. Free
		 * @request POST:/admin/food-trends/build
		 * @response `201` `BuildFoodTrendsData`
		 */
		buildFoodTrends: (data: AdminFoodTrendsQuarterInputDto, params: RequestParams = {}) =>
			this.request<BuildFoodTrendsData, any>({
				path: `/admin/food-trends/build`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * @description Puts the quarter on the site and in the sitemap; 400 before it is built or over.
		 *
		 * @name PublishFoodTrends
		 * @summary Puts the quarter on the site and in the sitemap; 400 before it is built or over
		 * @request POST:/admin/food-trends/{id}/publish
		 * @response `201` `PublishFoodTrendsData`
		 */
		publishFoodTrends: (id: string, params: RequestParams = {}) =>
			this.request<PublishFoodTrendsData, any>({
				path: `/admin/food-trends/${id}/publish`,
				method: 'POST',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name UnpublishFoodTrends
		 * @request POST:/admin/food-trends/{id}/unpublish
		 * @response `201` `UnpublishFoodTrendsData`
		 */
		unpublishFoodTrends: (id: string, params: RequestParams = {}) =>
			this.request<UnpublishFoodTrendsData, any>({
				path: `/admin/food-trends/${id}/unpublish`,
				method: 'POST',
				format: 'json',
				...params,
			}),

		/**
		 * @description The city's editions, newest first, and which one the page shows.
		 *
		 * @name GetLandingEditions
		 * @summary The city's editions, newest first, and which one the page shows
		 * @request GET:/admin/landing-editions
		 * @response `200` `GetLandingEditionsData`
		 */
		getLandingEditions: (
			query: {
				/** @format uuid */
				cityId: string;
			},
			params: RequestParams = {},
		) =>
			this.request<GetLandingEditionsData, any>({
				path: `/admin/landing-editions`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name GetLandingEdition
		 * @request GET:/admin/landing-editions/{id}
		 * @response `200` `GetLandingEditionResult`
		 */
		getLandingEdition: (id: string, params: RequestParams = {}) =>
			this.request<GetLandingEditionResult, any>({
				path: `/admin/landing-editions/${id}`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * @description Queues a build of today's edition (it replaces one built earlier today and publishes itself).
		 *
		 * @name BuildLandingEdition
		 * @summary Queues a build of today's edition (it replaces one built earlier today and publishes itself)
		 * @request POST:/admin/landing-editions/build
		 * @response `201` `BuildLandingEditionData`
		 */
		buildLandingEdition: (data: AdminBuildLandingEditionInputDto, params: RequestParams = {}) =>
			this.request<BuildLandingEditionData, any>({
				path: `/admin/landing-editions/build`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name PublishLandingEdition
		 * @request POST:/admin/landing-editions/{id}/publish
		 * @response `201` `PublishLandingEditionData`
		 */
		publishLandingEdition: (id: string, params: RequestParams = {}) =>
			this.request<PublishLandingEditionData, any>({
				path: `/admin/landing-editions/${id}/publish`,
				method: 'POST',
				format: 'json',
				...params,
			}),

		/**
		 * @description Takes the edition off the page; the newest other published edition shows instead.
		 *
		 * @name UnpublishLandingEdition
		 * @summary Takes the edition off the page; the newest other published edition shows instead
		 * @request POST:/admin/landing-editions/{id}/unpublish
		 * @response `201` `UnpublishLandingEditionData`
		 */
		unpublishLandingEdition: (id: string, params: RequestParams = {}) =>
			this.request<UnpublishLandingEditionData, any>({
				path: `/admin/landing-editions/${id}/unpublish`,
				method: 'POST',
				format: 'json',
				...params,
			}),

		/**
		 * @description A city's newsletter addresses by state: confirmed, waiting for the link, unsubscribed.
		 *
		 * @name GetNewsletterCounts
		 * @summary A city's newsletter addresses by state: confirmed, waiting for the link, unsubscribed
		 * @request GET:/admin/newsletter/counts
		 * @response `200` `GetNewsletterCountsData`
		 */
		getNewsletterCounts: (
			query: {
				/** @format uuid */
				cityId: string;
			},
			params: RequestParams = {},
		) =>
			this.request<GetNewsletterCountsData, any>({
				path: `/admin/newsletter/counts`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name ListEntries
		 * @request GET:/admin/blog
		 * @response `200` `ListEntriesResult`
		 */
		listEntries: (
			query: {
				/** @min 1 */
				page: number;
				q?: string;
				/** @min 1 */
				size: number;
				sort?: ListEntriesParams1SortEnum;
				/** @minItems 1 */
				states?: ListEntriesParams1StatesEnum[];
				/** @format uuid */
				tagId?: string;
			},
			params: RequestParams = {},
		) =>
			this.request<ListEntriesResult, any>({
				path: `/admin/blog`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name CreateEntry
		 * @request POST:/admin/blog
		 * @response `201` `CreateEntryData`
		 */
		createEntry: (data: CreateBlogEntryInputDto, params: RequestParams = {}) =>
			this.request<CreateEntryData, any>({
				path: `/admin/blog`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name ListTags
		 * @request GET:/admin/blog/tags
		 * @response `200` `ListTagsResult`
		 */
		listTags: (params: RequestParams = {}) =>
			this.request<ListTagsResult, any>({
				path: `/admin/blog/tags`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name CreateTag
		 * @request POST:/admin/blog/tags
		 * @response `201` `CreateTagData`
		 */
		createTag: (data: UpsertBlogTagInputDto, params: RequestParams = {}) =>
			this.request<CreateTagData, any>({
				path: `/admin/blog/tags`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name UpdateTag
		 * @request PATCH:/admin/blog/tags/{id}
		 * @response `200` `UpdateTagData`
		 */
		updateTag: (id: string, data: UpsertBlogTagInputDto, params: RequestParams = {}) =>
			this.request<UpdateTagData, any>({
				path: `/admin/blog/tags/${id}`,
				method: 'PATCH',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name DeleteTag
		 * @request DELETE:/admin/blog/tags/{id}
		 * @response `200` `DeleteTagData`
		 */
		deleteTag: (id: string, params: RequestParams = {}) =>
			this.request<DeleteTagData, any>({
				path: `/admin/blog/tags/${id}`,
				method: 'DELETE',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name PreviewEntry
		 * @request GET:/admin/blog/{idOrSlug}/preview
		 * @response `200` `PreviewEntryData`
		 */
		previewEntry: (idOrSlug: string, params: RequestParams = {}) =>
			this.request<PreviewEntryData, any>({
				path: `/admin/blog/${idOrSlug}/preview`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name GetEntry
		 * @request GET:/admin/blog/{id}
		 * @response `200` `GetEntryResult`
		 */
		getEntry: (id: string, params: RequestParams = {}) =>
			this.request<GetEntryResult, any>({
				path: `/admin/blog/${id}`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name UpdateEntry
		 * @request PATCH:/admin/blog/{id}
		 * @response `200` `UpdateEntryData`
		 */
		updateEntry: (id: string, data: UpdateBlogEntryInputDto, params: RequestParams = {}) =>
			this.request<UpdateEntryData, any>({
				path: `/admin/blog/${id}`,
				method: 'PATCH',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name ChangeEntryState
		 * @request PUT:/admin/blog/{id}/state
		 * @response `200` `ChangeEntryStateData`
		 */
		changeEntryState: (
			id: string,
			data: ChangeBlogEntryStateInputDto,
			params: RequestParams = {},
		) =>
			this.request<ChangeEntryStateData, any>({
				path: `/admin/blog/${id}/state`,
				method: 'PUT',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),
	};
	notifications = {
		/**
		 * No description
		 *
		 * @name ListNotifications
		 * @request GET:/notifications
		 * @response `200` `ListNotificationsData`
		 */
		listNotifications: (
			query: {
				/** @format date */
				from?: string;
				/** @min 1 */
				page: number;
				/** @min 1 */
				size: number;
				unreadOnly?: boolean;
			},
			params: RequestParams = {},
		) =>
			this.request<ListNotificationsData, any>({
				path: `/notifications`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name ReadAllNotifications
		 * @request PUT:/notifications/read
		 * @response `200` `ReadAllNotificationsData`
		 */
		readAllNotifications: (params: RequestParams = {}) =>
			this.request<ReadAllNotificationsData, any>({
				path: `/notifications/read`,
				method: 'PUT',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name ReadNotification
		 * @request PUT:/notifications/{id}/read
		 * @response `200` `ReadNotificationData`
		 */
		readNotification: (id: string, params: RequestParams = {}) =>
			this.request<ReadNotificationData, any>({
				path: `/notifications/${id}/read`,
				method: 'PUT',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name UnreadNotification
		 * @request PUT:/notifications/{id}/unread
		 * @response `200` `UnreadNotificationData`
		 */
		unreadNotification: (id: string, params: RequestParams = {}) =>
			this.request<UnreadNotificationData, any>({
				path: `/notifications/${id}/unread`,
				method: 'PUT',
				format: 'json',
				...params,
			}),
	};
	sitemap = {
		/**
		 * No description
		 *
		 * @name GetSections
		 * @request GET:/sitemap/sections
		 * @response `200` `GetSectionsData`
		 */
		getSections: (params: RequestParams = {}) =>
			this.request<GetSectionsData, any>({
				path: `/sitemap/sections`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name GetEntries
		 * @request GET:/sitemap/sections/{name}
		 * @response `200` `GetEntriesData`
		 */
		getEntries: (
			name: string,
			query: {
				/** @min 1 */
				page: number;
				/**
				 * @min 1
				 * @max 10000
				 */
				size: number;
			},
			params: RequestParams = {},
		) =>
			this.request<GetEntriesData, any>({
				path: `/sitemap/sections/${name}`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),
	};
	reports = {
		/**
		 * @description The report. Reading it does not count as an open: link previews and the page's server render read it too.
		 *
		 * @name GetSharedReport
		 * @summary The report. Reading it does not count as an open: link previews and the page's server render read it too
		 * @request GET:/reports/shared/{token}
		 * @response `200` `GetSharedReportData`
		 */
		getSharedReport: (token: string, params: RequestParams = {}) =>
			this.request<GetSharedReportData, any>({
				path: `/reports/shared/${token}`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * @description Counts an open. The page calls it from the browser, so bots and admins checking the link don't count.
		 *
		 * @name RecordSharedReportOpen
		 * @summary Counts an open. The page calls it from the browser, so bots and admins checking the link don't count
		 * @request POST:/reports/shared/{token}/opens
		 * @response `201` `RecordSharedReportOpenData`
		 */
		recordSharedReportOpen: (token: string, params: RequestParams = {}) =>
			this.request<RecordSharedReportOpenData, any>({
				path: `/reports/shared/${token}/opens`,
				method: 'POST',
				format: 'json',
				...params,
			}),

		/**
		 * @description The report as an A4 PDF.
		 *
		 * @name GetSharedReportPdf
		 * @summary The report as an A4 PDF
		 * @request GET:/reports/shared/{token}/pdf
		 * @response `200` `GetSharedReportPdfData`
		 */
		getSharedReportPdf: (token: string, params: RequestParams = {}) =>
			this.request<GetSharedReportPdfData, any>({
				path: `/reports/shared/${token}/pdf`,
				method: 'GET',
				format: 'json',
				...params,
			}),
	};
	portal = {
		/**
		 * @description The brands the signed-in person is a member of.
		 *
		 * @name ListPortalBrands
		 * @summary The brands the signed-in person is a member of
		 * @request GET:/portal/brands
		 * @response `200` `ListPortalBrandsData`
		 */
		listPortalBrands: (params: RequestParams = {}) =>
			this.request<ListPortalBrandsData, any>({
				path: `/portal/brands`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name GetPortalBrand
		 * @request GET:/portal/brands/{brandId}
		 * @response `200` `GetPortalBrandData`
		 */
		getPortalBrand: (brandId: string, params: RequestParams = {}) =>
			this.request<GetPortalBrandData, any>({
				path: `/portal/brands/${brandId}`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * @description Every month with a report, newest first.
		 *
		 * @name ListPortalReports
		 * @summary Every month with a report, newest first
		 * @request GET:/portal/brands/{brandId}/reports
		 * @response `200` `ListPortalReportsData`
		 */
		listPortalReports: (brandId: string, params: RequestParams = {}) =>
			this.request<ListPortalReportsData, any>({
				path: `/portal/brands/${brandId}/reports`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name GetPortalReport
		 * @request GET:/portal/brands/{brandId}/reports/{reportId}
		 * @response `200` `GetPortalReportData`
		 */
		getPortalReport: (brandId: string, reportId: string, params: RequestParams = {}) =>
			this.request<GetPortalReportData, any>({
				path: `/portal/brands/${brandId}/reports/${reportId}`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * @description The report as an A4 PDF. Takes a few seconds: headless Chrome prints it.
		 *
		 * @name GetPortalReportPdf
		 * @summary The report as an A4 PDF. Takes a few seconds: headless Chrome prints it
		 * @request GET:/portal/brands/{brandId}/reports/{reportId}/pdf
		 * @response `200` `GetPortalReportPdfData`
		 */
		getPortalReportPdf: (brandId: string, reportId: string, params: RequestParams = {}) =>
			this.request<GetPortalReportPdfData, any>({
				path: `/portal/brands/${brandId}/reports/${reportId}/pdf`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * @description One row per month for the Trends tab, from the stored reports; months without one are null.
		 *
		 * @name GetPortalSeries
		 * @summary One row per month for the Trends tab, from the stored reports; months without one are null
		 * @request GET:/portal/brands/{brandId}/series
		 * @response `200` `GetPortalSeriesData`
		 */
		getPortalSeries: (
			brandId: string,
			query?: {
				/**
				 * The branch whose rating, busyness and open tables to show; the most reviewed when absent
				 * @format uuid
				 */
				branchId?: string;
				/**
				 * The city whose reports to read; the brand's first city when absent
				 * @format uuid
				 */
				cityId?: string;
				/**
				 * How many months, ending with the last finished one; 12 when absent
				 * @min 1
				 * @max 24
				 */
				months?: number;
			},
			params: RequestParams = {},
		) =>
			this.request<GetPortalSeriesData, any>({
				path: `/portal/brands/${brandId}/series`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * @description The relations each stored report holds, month by month, and the weeks across them.
		 *
		 * @name GetPortalPatterns
		 * @summary The relations each stored report holds, month by month, and the weeks across them
		 * @request GET:/portal/brands/{brandId}/patterns
		 * @response `200` `GetPortalPatternsData`
		 */
		getPortalPatterns: (
			brandId: string,
			query?: {
				/**
				 * The branch whose busyness and open tables to show; the most reviewed when absent
				 * @format uuid
				 */
				branchId?: string;
				/**
				 * The city whose reports to read; the brand's first city when absent
				 * @format uuid
				 */
				cityId?: string;
				/**
				 * How many months, ending with the last finished one; 6 when absent
				 * @min 1
				 * @max 24
				 */
				months?: number;
			},
			params: RequestParams = {},
		) =>
			this.request<GetPortalPatternsData, any>({
				path: `/portal/brands/${brandId}/patterns`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name GetPortalSettings
		 * @request GET:/portal/brands/{brandId}/settings
		 * @response `200` `GetPortalSettingsData`
		 */
		getPortalSettings: (brandId: string, params: RequestParams = {}) =>
			this.request<GetPortalSettingsData, any>({
				path: `/portal/brands/${brandId}/settings`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name UpdatePortalSettings
		 * @request PATCH:/portal/brands/{brandId}/settings
		 * @response `200` `UpdatePortalSettingsData`
		 */
		updatePortalSettings: (
			brandId: string,
			data: PortalUpdateSettingsInputDto,
			params: RequestParams = {},
		) =>
			this.request<UpdatePortalSettingsData, any>({
				path: `/portal/brands/${brandId}/settings`,
				method: 'PATCH',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * @description The Google and TripAdvisor reviews of every branch, filtered, newest first, each with what it says (`feedback`); reply drafts under unanswered ones. The topic filter is any point of the topic.
		 *
		 * @name ListPortalReviews
		 * @request GET:/portal/brands/{brandId}/reviews
		 * @response `200` `ListPortalReviewsData`
		 */
		listPortalReviews: (
			brandId: string,
			query: {
				/** Answered on Google or marked answered here */
				answered?: boolean;
				/**
				 * The review's original language, e.g. `de`
				 * @maxLength 12
				 */
				language?: string;
				/** @pattern ^[0-9]{4}-[0-9]{2}$ */
				month?: string;
				/** Written, three stars or fewer, unanswered: the lowest stars first */
				needsReply?: boolean;
				/** @min 1 */
				page: number;
				/** Google or TripAdvisor */
				platform?: ListPortalReviewsParamsPlatformEnum;
				/**
				 * @min 1
				 * @max 50
				 */
				size: number;
				/**
				 * @min 1
				 * @max 5
				 */
				stars?: number;
				/** A topic the review praised or criticised */
				topic?: ListPortalReviewsParamsTopicEnum;
			},
			params: RequestParams = {},
		) =>
			this.request<ListPortalReviewsData, any>({
				path: `/portal/brands/${brandId}/reviews`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * @description The months, languages and topics the reviews can be filtered by, and the to-do count.
		 *
		 * @name GetPortalReviewFilters
		 * @summary The months, languages and topics the reviews can be filtered by, and the to-do count
		 * @request GET:/portal/brands/{brandId}/review-filters
		 * @response `200` `GetPortalReviewFiltersData`
		 */
		getPortalReviewFilters: (brandId: string, params: RequestParams = {}) =>
			this.request<GetPortalReviewFiltersData, any>({
				path: `/portal/brands/${brandId}/review-filters`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * @description The owner says they answered a review on Google (or takes it back).
		 *
		 * @name MarkPortalReviewReplied
		 * @summary The owner says they answered a review on Google (or takes it back)
		 * @request PUT:/portal/brands/{brandId}/reviews/{reviewId}/replied
		 * @response `200` `MarkPortalReviewRepliedData`
		 */
		markPortalReviewReplied: (
			brandId: string,
			reviewId: string,
			data: PortalMarkReviewRepliedInputDto,
			params: RequestParams = {},
		) =>
			this.request<MarkPortalReviewRepliedData, any>({
				path: `/portal/brands/${brandId}/reviews/${reviewId}/replied`,
				method: 'PUT',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * @description Every post about the brand (any branch, or the brand alone), newest first, with what it says about the brand (`feedback`).
		 *
		 * @name ListPortalPosts
		 * @summary Every post about the brand (any branch, or the brand alone), newest first, with what it says about the brand (`feedback`)
		 * @request GET:/portal/brands/{brandId}/posts
		 * @response `200` `ListPortalPostsData`
		 */
		listPortalPosts: (
			brandId: string,
			query: {
				/** @pattern ^[0-9]{4}-[0-9]{2}$ */
				month?: string;
				/** @min 1 */
				page: number;
				platform?: ListPortalPostsParamsPlatformEnum;
				/**
				 * @min 1
				 * @max 50
				 */
				size: number;
			},
			params: RequestParams = {},
		) =>
			this.request<ListPortalPostsData, any>({
				path: `/portal/brands/${brandId}/posts`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * @description The posts grouped by author, most viewed first.
		 *
		 * @name ListPortalCreators
		 * @summary The posts grouped by author, most viewed first
		 * @request GET:/portal/brands/{brandId}/creators
		 * @response `200` `ListPortalCreatorsData`
		 */
		listPortalCreators: (
			brandId: string,
			query?: {
				/** @pattern ^[0-9]{4}-[0-9]{2}$ */
				month?: string;
				platform?: ListPortalCreatorsParamsPlatformEnum;
			},
			params: RequestParams = {},
		) =>
			this.request<ListPortalCreatorsData, any>({
				path: `/portal/brands/${brandId}/creators`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name GetPortalPostFilters
		 * @request GET:/portal/brands/{brandId}/post-filters
		 * @response `200` `GetPortalPostFiltersData`
		 */
		getPortalPostFilters: (brandId: string, params: RequestParams = {}) =>
			this.request<GetPortalPostFiltersData, any>({
				path: `/portal/brands/${brandId}/post-filters`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * @description The places and brands the reports compare it with, and suggestions while there is room.
		 *
		 * @name ListPortalCompetitors
		 * @summary The places and brands the reports compare it with, and suggestions while there is room
		 * @request GET:/portal/brands/{brandId}/competitors
		 * @response `200` `ListPortalCompetitorsData`
		 */
		listPortalCompetitors: (brandId: string, params: RequestParams = {}) =>
			this.request<ListPortalCompetitorsData, any>({
				path: `/portal/brands/${brandId}/competitors`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * @description Adds a competitor; a sixth is refused (`TOO_MANY_COMPETITORS`).
		 *
		 * @name AddPortalCompetitor
		 * @summary Adds a competitor; a sixth is refused (`TOO_MANY_COMPETITORS`)
		 * @request POST:/portal/brands/{brandId}/competitors
		 * @response `201` `AddPortalCompetitorData`
		 */
		addPortalCompetitor: (
			brandId: string,
			data: PortalAddCompetitorInputDto,
			params: RequestParams = {},
		) =>
			this.request<AddPortalCompetitorData, any>({
				path: `/portal/brands/${brandId}/competitors`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * @description Places in the brand's cities the owner can pick, by name, street or district.
		 *
		 * @name SearchPortalCompetitors
		 * @summary Places in the brand's cities the owner can pick, by name, street or district
		 * @request GET:/portal/brands/{brandId}/competitor-search
		 * @response `200` `SearchPortalCompetitorsData`
		 */
		searchPortalCompetitors: (
			brandId: string,
			query: {
				/**
				 * @minLength 2
				 * @maxLength 80
				 */
				q: string;
			},
			params: RequestParams = {},
		) =>
			this.request<SearchPortalCompetitorsData, any>({
				path: `/portal/brands/${brandId}/competitor-search`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name RemovePortalCompetitor
		 * @request DELETE:/portal/brands/{brandId}/competitors/{competitorId}
		 * @response `200` `RemovePortalCompetitorData`
		 */
		removePortalCompetitor: (
			brandId: string,
			competitorId: number,
			params: RequestParams = {},
		) =>
			this.request<RemovePortalCompetitorData, any>({
				path: `/portal/brands/${brandId}/competitors/${competitorId}`,
				method: 'DELETE',
				format: 'json',
				...params,
			}),
	};
	highlights = {
		/**
		 * @description A published month of a city; 404 for an unknown city, an unbuilt or an unpublished month.
		 *
		 * @name GetCityHighlight
		 * @summary A published month of a city; 404 for an unknown city, an unbuilt or an unpublished month
		 * @request GET:/highlights/{citySlug}/{month}
		 * @response `200` `GetCityHighlightData`
		 */
		getCityHighlight: (citySlug: string, month: string, params: RequestParams = {}) =>
			this.request<GetCityHighlightData, any>({
				path: `/highlights/${citySlug}/${month}`,
				method: 'GET',
				format: 'json',
				...params,
			}),
	};
	foodTrends = {
		/**
		 * @description A published quarter of a city; 404 for an unknown city, an unbuilt or an unpublished quarter.
		 *
		 * @name GetFoodTrendsReport
		 * @summary A published quarter of a city; 404 for an unknown city, an unbuilt or an unpublished quarter
		 * @request GET:/food-trends/{citySlug}/{quarter}
		 * @response `200` `GetFoodTrendsReportData`
		 */
		getFoodTrendsReport: (citySlug: string, quarter: string, params: RequestParams = {}) =>
			this.request<GetFoodTrendsReportData, any>({
				path: `/food-trends/${citySlug}/${quarter}`,
				method: 'GET',
				format: 'json',
				...params,
			}),
	};
	landing = {
		/**
		 * @description The newest published edition of the city; 404 for an unknown city or one without any.
		 *
		 * @name GetLandingEdition
		 * @summary The newest published edition of the city; 404 for an unknown city or one without any
		 * @request GET:/landing/{citySlug}
		 * @response `200` `GetLandingEditionData`
		 */
		getLandingEdition: (citySlug: string, params: RequestParams = {}) =>
			this.request<GetLandingEditionData, any>({
				path: `/landing/${citySlug}`,
				method: 'GET',
				format: 'json',
				...params,
			}),
	};
	newsletter = {
		/**
		 * @description Answers the same whether the address was new, pending or already confirmed.
		 *
		 * @name SubscribeToNewsletter
		 * @summary Answers the same whether the address was new, pending or already confirmed
		 * @request POST:/newsletter/subscriptions
		 * @response `201` `SubscribeToNewsletterData`
		 */
		subscribeToNewsletter: (data: NewsletterSubscribeInputDto, params: RequestParams = {}) =>
			this.request<SubscribeToNewsletterData, any>({
				path: `/newsletter/subscriptions`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name ConfirmNewsletter
		 * @request POST:/newsletter/subscriptions/confirm
		 * @response `201` `ConfirmNewsletterData`
		 */
		confirmNewsletter: (data: NewsletterTokenInputDto, params: RequestParams = {}) =>
			this.request<ConfirmNewsletterData, any>({
				path: `/newsletter/subscriptions/confirm`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name UnsubscribeFromNewsletter
		 * @request POST:/newsletter/subscriptions/unsubscribe
		 * @response `201` `UnsubscribeFromNewsletterData`
		 */
		unsubscribeFromNewsletter: (data: NewsletterTokenInputDto, params: RequestParams = {}) =>
			this.request<UnsubscribeFromNewsletterData, any>({
				path: `/newsletter/subscriptions/unsubscribe`,
				method: 'POST',
				body: data,
				type: ContentType.Json,
				format: 'json',
				...params,
			}),
	};
	blog = {
		/**
		 * No description
		 *
		 * @name ListEntries
		 * @request GET:/blog
		 * @response `200` `ListEntriesData`
		 */
		listEntries: (
			query: {
				/** @min 1 */
				page: number;
				q?: string;
				/** @min 1 */
				size: number;
				sort?: ListEntriesParamsSortEnum;
				tag?: string;
			},
			params: RequestParams = {},
		) =>
			this.request<ListEntriesData, any>({
				path: `/blog`,
				method: 'GET',
				query: query,
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name ListTags
		 * @request GET:/blog/tags
		 * @response `200` `ListTagsData`
		 */
		listTags: (params: RequestParams = {}) =>
			this.request<ListTagsData, any>({
				path: `/blog/tags`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name GetTag
		 * @request GET:/blog/tags/{idOrSlug}
		 * @response `200` `GetTagData`
		 */
		getTag: (idOrSlug: string, params: RequestParams = {}) =>
			this.request<GetTagData, any>({
				path: `/blog/tags/${idOrSlug}`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name GetEntry
		 * @request GET:/blog/{idOrSlug}
		 * @response `200` `GetEntryData`
		 */
		getEntry: (idOrSlug: string, params: RequestParams = {}) =>
			this.request<GetEntryData, any>({
				path: `/blog/${idOrSlug}`,
				method: 'GET',
				format: 'json',
				...params,
			}),

		/**
		 * No description
		 *
		 * @name RegisterView
		 * @request POST:/blog/{idOrSlug}/view
		 * @response `201` `RegisterViewData`
		 */
		registerView: (idOrSlug: string, params: RequestParams = {}) =>
			this.request<RegisterViewData, any>({
				path: `/blog/${idOrSlug}/view`,
				method: 'POST',
				format: 'json',
				...params,
			}),
	};
}
