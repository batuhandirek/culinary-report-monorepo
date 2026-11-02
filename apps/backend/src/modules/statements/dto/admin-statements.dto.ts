import { tags } from 'typia';

import type { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';
import type { ReviewPlatformEnum } from 'src/modules/venues/entities/review.entity.js';
import type { PaginationRequest } from 'src/shared/interfaces/pagination-request.interface.js';

import type { StatementKind } from '../constants/kind.constant.js';
import type { Sentiment } from '../constants/sentiment.constant.js';
import type { StatementSourceKind, StatementSubject } from '../entities/statement.entity.js';

import type { StatementOutputDto } from './statement.output.dto.js';

export interface AdminWaitComplaintsInputDto {
	cityId: string & tags.Format<'uuid'>;
	month: string & tags.Pattern<'^[0-9]{4}-[0-9]{2}$'>;
}

export interface AdminWaitComplaintsOutputDto {
	month: string;
	venues: number;
	brands: number;
	sources: number;
	reviews: number;
	posts: number;
	byTheme: { theme: string; venues: number; brands: number; sources: number }[];
	stated: {
		complaints: number;
		of: number;
		median?: number;
		upperQuartile?: number;
		max?: number;
	};
}

/** A kind, or `unread`: agent B has not read it yet */
export type AdminStatementKindFilter = StatementKind | 'unread';

/** `unread`: agent B has not read it yet (no sentiment) */
export type AdminStatementSentimentFilter = Sentiment | 'unread';
/** `none`: no part at all; `no_aspect`: under no aspect; `food`: names a food wording */
export type AdminStatementPartsFilter = 'none' | 'no_aspect' | 'food';

/**
 * Whose claims: a city's, a brand's (its branches' reviews and the posts' claims about it) or a
 * branch's (its reviews and the posts' claims about it), at least one of the three; all months
 * unless `month` is given
 */
export interface AdminStatementsScopeInputDto {
	cityId?: string & tags.Format<'uuid'>;
	brandId?: string & tags.Format<'uuid'>;
	venueId?: string & tags.Format<'uuid'>;
	month?: string & tags.Pattern<'^[0-9]{4}-[0-9]{2}$'>;
}

/** The Claims tables (Trends, a brand, a branch): the scope, narrowed by any of the rest, a page at a time */
export interface AdminStatementsInputDto extends AdminStatementsScopeInputDto, PaginationRequest {
	sourceKind?: 'review' | 'post';
	subject?: StatementSubject;
	sentiment?: AdminStatementSentimentFilter;
	/** An aspect's key: the claims under it or any aspect below it */
	aspect?: string & tags.MaxLength<80>;
	parts?: AdminStatementPartsFilter;
	/** One kind (`STATEMENT_KINDS`), or `unread`: not read by agent B yet */
	kind?: AdminStatementKindFilter;
	/** Words in the claim's text */
	q?: string & tags.MaxLength<200>;
	/** A phrase: the page ordered by meaning, closest first; claims without a vector yet are left out */
	like?: string & tags.MaxLength<200>;
}

/** One claim with where it was said: the review and its venue, or the post and the mention it is about */
export interface AdminStatementRowOutputDto extends StatementOutputDto {
	sourceKind: StatementSourceKind;
	saidAt: Date;
	review?: {
		id: string;
		platform: ReviewPlatformEnum;
		stars?: number;
		venue: { id: string; name: string };
	};
	/** The post and its author's own brand, when the author is a brand's own account (a claim about that brand is its own post) */
	post?: {
		id: string;
		platform: SocialPlatformEnum;
		author?: string;
		url: string;
		account?: { brand?: { id: string } };
	};
	/** The place a post's claim is about; absent for a claim about the city or nothing */
	mention?: {
		id: number;
		venueName: string;
		brand?: { id: string; name: string };
		venue?: { id: string; name: string };
	};
	/** A Google tag's place (served by Explore's claims only) */
	venue?: { id: string; name: string };
	/** Google's count for a tag; 1 otherwise */
	count: number;
}

/** The scope as a whole, whatever a table filters: how its claims were split and read */
export interface AdminStatementsSummaryOutputDto {
	statements: number;
	reviews: number;
	posts: number;
	place: number;
	city: number;
	none: number;
	positive: number;
	negative: number;
	neutral: number;
	mixed: number;
	unread: number;
	/** Claims per kind; those not read by agent B yet are in none */
	kinds: Record<StatementKind, number>;
	/** No part at all: neither an aspect nor a food wording */
	noParts: number;
	noAspect: number;
	withFood: number;
}

/** A page of the claims the filters match, newest first (closest in meaning first with `like`) */
export interface AdminStatementsOutputDto {
	items: AdminStatementRowOutputDto[];
	totalItems: number;
	page: number;
	pageSize: number;
	/** With `like`: the claims the filters match that have no vector yet, so the search can't see them */
	notEmbedded?: number;
}

/** A city's month or quarter of claims no aspect fits, grouped by meaning ("Missing aspects") */
export interface AdminStatementClustersInputDto {
	cityId: string & tags.Format<'uuid'>;
	/** One of `month` and `quarter` */
	month?: string & tags.Pattern<'^[0-9]{4}-[0-9]{2}$'>;
	quarter?: string & tags.Pattern<'^[0-9]{4}-q[1-4]$'>;
	/** A root aspect's key: only the claims filed at it; `none`: only those under no aspect */
	root?: string & tags.MaxLength<80>;
}

export interface AdminClusterClaimOutputDto {
	id: number;
	text: string;
	sentiment?: Sentiment;
	sourceKind: StatementSourceKind;
	brandName?: string;
}

/** One group of claims and the suggested aspect for it; nothing of it is stored */
export interface AdminMissingAspectOutputDto {
	/** At most four words; absent when naming it failed */
	label?: string;
	hint?: string;
	/** The root aspect it belongs under */
	root?: string;
	/** An existing aspect that already covers it (its claims should have been filed there) */
	fits?: { key: string; label: string };
	claims: number;
	sources: number;
	/** Most claims first; the city has no id */
	brands: { id?: string; name: string; claims: number }[];
	/** Where its claims are filed now; no `aspect` = under none */
	filedAt: { aspect?: string; label: string; claims: number }[];
	samples: AdminClusterClaimOutputDto[];
	/** The phrase "See claims" searches by */
	like: string;
}

export interface AdminStatementClustersOutputDto {
	months: string[];
	root?: string;
	/** Claims with no aspect or only a root, with a vector */
	claims: number;
	/** Of them, the ones clustered */
	considered: number;
	/** Claims with no aspect or only a root that have no vector yet */
	notEmbedded: number;
	clusters: AdminMissingAspectOutputDto[];
	/** Clusters past the floors beyond the ones listed */
	more: number;
	computedAt: Date;
}
