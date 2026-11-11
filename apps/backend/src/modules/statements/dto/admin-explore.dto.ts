import { tags } from 'typia';

import type { PaginationRequest } from 'src/shared/interfaces/pagination-request.interface.js';

import type { StatementKind } from '../constants/kind.constant.js';
import type { Sentiment } from '../constants/sentiment.constant.js';
import type { StatementSubject, StatementUnit } from '../entities/statement.entity.js';
import type { InsightDimension } from '../services/statement-insight.service.js';
import type { InsightSide, InsightSource } from '../util/insight-sql.js';

import type { AdminStatementPartsFilter, AdminStatementSentimentFilter } from './admin-statements.dto.js';

type Month = string & tags.Pattern<'^[0-9]{4}-[0-9]{2}$'>;

/**
 * One Explore view, all of it in the URL: a city's claims, narrowed to a brand, a branch or a
 * district or the brands of one kind of place, in the months `from`..`to` (default the six up to the last whole month); about `node`
 * (a topic's key, its descendants included, or `term:<key>` for a wording) and every node of
 * `with` (comma-separated, the same forms); and by side, kind, source and subject
 */
export interface AdminExploreInputDto {
	cityId: string & tags.Format<'uuid'>;
	brandId?: string & tags.Format<'uuid'>;
	venueId?: string & tags.Format<'uuid'>;
	district?: string & tags.MaxLength<120>;
	/** The brands of one kind of place (their main food in the city), a topic's key */
	place?: string & tags.MaxLength<80>;
	from?: Month;
	to?: Month;
	node?: string & tags.MaxLength<200>;
	with?: string & tags.MaxLength<1000>;
	side?: InsightSide;
	/** One kind, or `unread`: agent B gave none yet */
	kind?: StatementKind | 'unread';
	/** A source kind (review, post) or a channel (google_review, tiktok, blog, …) */
	source?: InsightSource;
	subject?: StatementSubject;
	/** Only claims filed under no aspect or at a root (nothing finer fitted) */
	loose?: boolean;
}

export interface AdminExploreBreakdownInputDto extends AdminExploreInputDto {
	by: InsightDimension;
}

/**
 * The Claims table's own filters on top of the view: the ones the page's pickers don't hold
 * (sentiment, parts), as the Claims tabs filter them
 */
export interface AdminExploreClaimsInputDto extends AdminExploreInputDto, PaginationRequest {
	/** Words in the claim */
	q?: string & tags.MaxLength<200>;
	/** One sentiment, or `unread`: agent B gave none yet */
	sentiment?: AdminStatementSentimentFilter;
	/** Under no aspect, no part at all, or naming a food */
	parts?: AdminStatementPartsFilter;
	/** A phrase: closest in meaning first; claims without a vector are left out */
	like?: string & tags.MaxLength<200>;
}

/** The grouping's bar, each defaulting to `INSIGHT_GROUP_FLOORS` */
export interface AdminExploreGroupsInputDto extends AdminExploreInputDto {
	/** Cosine a claim needs with a group's centroid to join it: lower groups looser paraphrases */
	similarity?: number & tags.Minimum<0.5> & tags.Maximum<0.98>;
	/** Claims a group needs to be listed (from two sources at least, whatever this is) */
	minClaims?: number & tags.Type<'uint32'> & tags.Minimum<2> & tags.Maximum<100>;
}

export interface AdminExploreTermsInputDto {
	q: string & tags.MinLength<1> & tags.MaxLength<100>;
}

/** The figures a tree node and a breakdown row carry */
export interface AdminExploreCountsOutputDto {
	/** Reviews, posts and other sources raising it, each once */
	sources: number;
	praise: number;
	complaints: number;
}

export interface AdminExploreTreeNodeOutputDto extends AdminExploreCountsOutputDto {
	key: string;
	label: string;
	kind: string;
	/** Its display parent: the first topic it is a kind of */
	parentKey?: string;
	/** Every topic it is a kind of, by rank: the tree draws it under each */
	isA: string[];
}

export interface AdminExploreTreeOutputDto {
	nodes: AdminExploreTreeNodeOutputDto[];
}

export interface AdminExploreRefOutputDto {
	/** A topic's key or `term:<key>` */
	ref: string;
	label: string;
}

export interface AdminExploreNodeOutputDto extends AdminExploreRefOutputDto {
	/** A topic's kind (aspect, dish, cuisine, …), or `term` */
	kind: string;
	path: AdminExploreRefOutputDto[];
	hint?: string;
	children: AdminExploreRefOutputDto[];
	/** A wording's topics */
	topics: AdminExploreRefOutputDto[];
}

export interface AdminExploreMonthOutputDto {
	month: string;
	sources: number;
	reviews: number;
	posts: number;
	share: number | null;
	reviewShare: number | null;
	postShare: number | null;
}

export interface AdminExploreHeadOutputDto {
	/** The brand and branch the scope is narrowed to, by name */
	brand?: { id: string; name: string };
	venue?: { id: string; name: string };
	place?: { key: string; label: string };
	node?: AdminExploreNodeOutputDto;
	with: AdminExploreNodeOutputDto[];
	from: string;
	to: string;
	sources: number;
	reviews: number;
	posts: number;
	others: number;
	brands: number;
	claims: number;
	base: { sources: number; reviews: number; posts: number };
	share: number | null;
	reviewShare: number | null;
	postShare: number | null;
	sides: { side: InsightSide; sources: number }[];
	months: AdminExploreMonthOutputDto[];
	change: { share: number | null; reviewShare: number | null; postShare: number | null };
	amounts: { unit: StatementUnit; sources: number; median: number; min: number; max: number }[];
}

export interface AdminExploreBreakdownRowOutputDto extends AdminExploreCountsOutputDto {
	key?: string;
	label: string;
	detail?: string;
}

export interface AdminExploreBreakdownOutputDto {
	by: InsightDimension;
	under?: AdminExploreRefOutputDto;
	rows: AdminExploreBreakdownRowOutputDto[];
	more: number;
}

export interface AdminExploreGroupOutputDto {
	claims: number;
	sources: number;
	praise: number;
	complaints: number;
	samples: { id: number; text: string; sentiment?: Sentiment; brandName?: string }[];
	like: string;
}

export interface AdminExploreGroupsOutputDto {
	embedded: number;
	considered: number;
	notEmbedded: number;
	groups: AdminExploreGroupOutputDto[];
	more: number;
	/** The bar the groups were made at */
	similarity: number;
	minClaims: number;
}

export interface AdminExploreTermOutputDto extends AdminExploreRefOutputDto {
	uses: number;
	topics: string[];
}

export interface AdminExploreTermsOutputDto {
	terms: AdminExploreTermOutputDto[];
}
