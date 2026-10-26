// "What moved, and why it might have": the report's reasoned layer. Code finds the month's
// notable moves (observations) and answers each one's standard questions (checks, the
// playbooks); one capped tool-calling agent then writes, per move, what might explain it as
// hypotheses with a confidence word. Stored on `Report.analysis`, the same object on every
// configuration's report of a build; `trace` is for admins only (`toPublicOutput` strips it).

export type ObservationKind = 'dip' | 'spike' | 'shift' | 'rank_move';

/** How finely the data behind an observation or a check places it in time. */
export type ObservationResolution = 'month' | 'week' | 'day';

export type ObservationMetric =
	| 'posts'
	| 'views'
	| 'creators'
	| 'reviews'
	| 'written_reviews'
	| 'review_week'
	| 'avg_stars'
	| 'reply_rate'
	| 'five_star_share'
	| 'rating'
	| 'followers'
	| 'booked'
	| 'busyness'
	| 'search_rank'
	| 'complaint_theme'
	| 'dish_share'
	| 'competitor_reach';

export type ObservationUnit = 'count' | 'views' | 'stars' | 'share' | 'points' | 'rank' | 'followers' | 'index';

export interface ObservationPoint {
	/** A month `YYYY-MM`, or a week's Monday `YYYY-MM-DD` */
	at: string;
	value: number;
}

/** A standard question about a move, answered in code before the model sees it. */
export interface ReportCheck {
	question: string;
	/** One quotable sentence with its numbers */
	answer: string;
	/** What the answer does to "something at your place changed"; `unknown` when the data is missing */
	verdict: 'supports' | 'weakens' | 'neutral' | 'unknown';
	resolution: ObservationResolution;
}

/** One notable move of the month, found by `observe`. */
export interface ReportObservation {
	/** Stable: `views`, `rating:<venueId>`, `search_rank:<venueId>:<query>`, `complaint_theme:wait` */
	key: string;
	metric: ObservationMetric;
	kind: ObservationKind;
	/** The report month, `YYYY-MM` */
	month: string;
	/** "Views", "Google rating · Oranienstraße" */
	label: string;
	/** "TikTok and Instagram", "Google reviews", "Google Maps", "Instagram @handle", "booking page", "Google popular times" */
	source: string;
	unit: ObservationUnit;
	from: number;
	to: number;
	/** In the unit; shares and points as percentage points */
	change: number;
	/** For counts */
	changePercent?: number;
	/** "August 2026", "your usual pace (6 months)", "the city median" */
	comparedWith: string;
	resolution: ObservationResolution;
	/** A place figure's branch; never summed across branches */
	branchId?: string;
	branchName?: string;
	theme?: string;
	query?: string;
	competitor?: string;
	/** For the sparkline, oldest first */
	series: ObservationPoint[];
	/** The deterministic sentence: the fallback when the model's fails the check */
	sentence: string;
	/** Keys of sibling observations (posts and views moving together) */
	related?: string[];
	/** Ranking score; admin only */
	score: number;
	/** The playbook's answers */
	checks: ReportCheck[];
}

export type HypothesisConfidence = 'likely' | 'possible' | 'unclear';

export interface ReportHypothesis {
	/** Worded as a possibility ("could", "may have"), never a fact */
	reason: string;
	confidence: HypothesisConfidence;
	evidenceFor: string[];
	evidenceAgainst: string[];
}

/** What the model made of one observation, after the check. */
export interface ReportInvestigation {
	/** The observation's key */
	key: string;
	whatHappened: string;
	hypotheses: ReportHypothesis[];
	/** What the data cannot settle */
	cannotTell?: string;
	/** Things only the owner can check, each starting with a verb */
	worthChecking: string[];
	/** `whatHappened` is the observation's own sentence: the model's line failed the check or was missing */
	fallback?: boolean;
}

export interface ReportAnalysisTraceStep {
	step: number;
	tool: string;
	input: unknown;
	/** The result cut short */
	resultSummary: string;
	durationMs?: number;
}

/** How the analysis went: for the admin report page. */
export interface ReportAnalysisTrace {
	model: string;
	steps: ReportAnalysisTraceStep[];
	/** Tool calls that ran (a refused one is in `steps` only) */
	toolCalls: number;
	/** The model's own steps (each tool round is one) */
	modelSteps?: number;
	/** The model's own notes on what it looked up and why each label is what it is */
	notes?: string;
	/** The model's reasoning text, cut */
	reasoning?: string;
	usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
	/** Lines the check dropped or replaced */
	problems: { where: string; problem: string }[];
	/** The agent failed: the investigations are fallbacks */
	error?: string;
	/** The agent was not called: `no notable move`, `no previous month` */
	skipped?: string;
	durationMs: number;
}

export interface ReportAnalysis {
	builtAt: string;
	/** Ranked, the most important first, every one found (capped), each with its checks */
	observations: ReportObservation[];
	/** For the top observations, in their order */
	investigations: ReportInvestigation[];
	trace: ReportAnalysisTrace;
}

/** What a shared link or the portal gets: the trace is the admin's. */
export type ReportAnalysisPublic = Omit<ReportAnalysis, 'trace'>;

/** The model's answer before the check (`ReportAnalysisAgent`'s schema). */
export interface ReportAnalysisAnswer {
	investigations: {
		key: string;
		whatHappened: string;
		hypotheses: {
			reason: string;
			confidence: HypothesisConfidence;
			evidenceFor: string[];
			evidenceAgainst: string[];
		}[];
		cannotTell: string | null;
		worthChecking: string[];
	}[];
	notes: string;
}
