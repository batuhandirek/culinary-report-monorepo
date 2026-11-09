import type { PostClaimsSource } from 'src/modules/pipeline/read-posts/util/post-claims-input.js';
import type { ReviewClaimsSource } from 'src/modules/pipeline/read-reviews/util/review-claims-input.js';
import type { MentionMatchMethodEnum } from 'src/modules/social/entities/mention.entity.js';
import type { StatementKind } from 'src/modules/statements/constants/kind.constant.js';
import type { Sentiment } from 'src/modules/statements/constants/sentiment.constant.js';
import type { StatementUnit } from 'src/modules/statements/entities/statement.entity.js';
import type { ClaimLabel } from 'src/modules/statements/util/claim-labels.js';
import type { TermRelation } from 'src/modules/topics/constants/term-relation.constant.js';

/** A claim with its parts, as stored, as an agent gave it, or as the reference says */
export interface EvalClaim {
	text: string;
	quote: string | null;
	/** null: agent B has not read it */
	sentiment: Sentiment | null;
	/** An aspect key; null: about no aspect */
	aspect: string | null;
	/** Food wordings as spelled; null: not read (a classifier names no foods), never scored */
	foods: string[] | null;
	amount: number | null;
	unit: StatementUnit | null;
	kind: StatementKind | null;
	/** A classifier's labels: the chosen option's probability, per label it answered */
	probability?: Partial<Record<ClaimLabel, number>>;
	/** The aspects the classifier was offered, when a shortlist cut them (`--aspect-shortlist`) */
	offered?: string[];
}

/** A post's claim: about one of its places (by index), the city, or nothing */
export interface EvalPostClaim extends EvalClaim {
	subject: 'place' | 'city' | 'none';
	place: number | null;
}

/** What a place was matched to */
export interface EvalMatch {
	method: MentionMatchMethodEnum | null;
	brandId: string | null;
	brandName: string | null;
	/** The branch, only when the post says which (always for a one-branch brand) */
	venueId: string | null;
	venueName: string | null;
}

/** A place a post names (a mention) */
export interface EvalPlace {
	venueName: string;
	locationHint: string | null;
	city: string | null;
	visited: boolean;
	isNewOpening: boolean;
	match: EvalMatch | null;
}

/** What a reference allows besides its own answer, so taste is not scored as error */
export interface ReferenceClaimExtras {
	/** A detail it is fine to keep apart or leave in another claim: never counted missed */
	optional: boolean;
	alsoAcceptable: { sentiments: Sentiment[]; aspects: string[]; kinds: StatementKind[] };
}

/** A reference always names its foods (none is an empty list) and has no probabilities or shortlist */
type ReferenceParts = { foods: string[] };
export type ReferenceClaim = Omit<EvalClaim, 'foods' | 'probability' | 'offered'> &
	ReferenceParts &
	ReferenceClaimExtras;
export type ReferencePostClaim = Omit<EvalPostClaim, 'foods' | 'probability' | 'offered'> &
	ReferenceParts &
	ReferenceClaimExtras;

/** Who wrote a reference, against which spec, at what cost */
export interface ReferenceMeta {
	/** The model that answered (`res.model`); only Opus answers are kept */
	model: string;
	/** sha1 of the instructions the reference was told to follow: a later prompt change shows in the report */
	specHash: string;
	at: string;
	usage: EvalUsage;
	/** The reference model's remarks on hard calls */
	notes: string | null;
	/** Hand or adjudication fixes, newest last */
	revisions?: { at: string; by: string; note: string }[];
}

export interface EvalUsage {
	inputTokens: number;
	outputTokens: number;
	cachedInputTokens: number;
	cacheWriteTokens: number;
}

interface CaseBase {
	id: string;
	tags: string[];
	collectedAt: string;
}

export interface ReviewCase extends CaseBase {
	kind: 'review';
	source: ReviewClaimsSource & {
		id: string;
		platform: string;
		language: string | null;
		venue: string;
		venueId: string;
		brand: string;
		cityId: string;
		publishedAt: string;
	};
	stored: { analysedAt: string | null; claims: EvalClaim[] };
	reference?: ReferenceMeta & { claims: ReferenceClaim[] };
}

export interface PostCase extends CaseBase {
	kind: 'post';
	source: PostClaimsSource & {
		id: string;
		externalId: string;
		url: string | null;
		cityId: string;
		cityName: string;
		/** The brand whose own account posted it */
		ownBrand: string | null;
		postedAt: string | null;
	};
	stored: {
		analysedAt: string | null;
		isPromotional: boolean | null;
		places: EvalPlace[];
		claims: EvalPostClaim[];
	};
	reference?: ReferenceMeta & {
		isPromotional: boolean;
		places: (Omit<EvalPlace, 'match'> & { match: EvalMatch & { note: string | null } })[];
		claims: ReferencePostClaim[];
		/** Venues in the city when the match reference was made: a later count shows how far the DB moved */
		venuesAtMatch: number;
	};
}

export interface EvalTermTopic {
	key: string;
	relation: TermRelation;
}

export interface TermCase extends CaseBase {
	kind: 'term';
	source: { termId: number; key: string; name: string; uses: number };
	/** null topics: never decided (pending), nothing to score */
	stored: { decidedBy: string | null; topics: EvalTermTopic[] | null; suggestion: string | null };
	reference?: ReferenceMeta & {
		topics: EvalTermTopic[];
		/** Other topic keys a careful reader could link without being wrong */
		alsoAcceptable: string[];
		suggestion: string | null;
	};
}

export type EvalCase = ReviewCase | PostCase | TermCase;
export type EvalCaseKind = EvalCase['kind'];

/** What a run produced for one case: the same shapes as `stored` */
export interface ReviewOutput {
	claims: EvalClaim[];
}
export interface PostOutput {
	isPromotional: boolean;
	places: EvalPlace[];
	claims: EvalPostClaim[];
	/** Matching run on the reference's places alone (when the case has a reference): matching apart from extraction */
	referencePlaceMatches?: EvalMatch[];
}
export interface TermOutput {
	topics: EvalTermTopic[];
	suggestion: string | null;
}

export interface CaseResult {
	caseId: string;
	kind: EvalCaseKind;
	output: ReviewOutput | PostOutput | TermOutput | null;
	/** Models that answered, per agent */
	models: Record<string, string>;
	tokens: number;
	/** Of `tokens`, the input tokens the provider served from its prompt cache */
	cachedTokens?: number;
	/** `tokens` per agent (the reader's apart from matching's) */
	tokensByAgent?: Record<string, number>;
	/** Dollars the case's paid calls cost (a classifier's), when any */
	usd?: number;
	/**
	 * `reference`: the claims (and a post's places) are the reference's own, only their labels were
	 * read (`--claims reference`): paired one to one, scored on the parts alone
	 */
	claimsFrom?: 'reference';
	error?: string;
}
