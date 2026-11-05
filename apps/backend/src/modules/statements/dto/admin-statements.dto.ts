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
