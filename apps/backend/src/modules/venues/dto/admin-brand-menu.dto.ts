import type { tags } from 'typia';

import type { MenuTermMethod } from 'src/modules/topics/util/menu-terms.js';

import type { DeliveryPlatformEnum } from '../entities/venue-delivery-listing.entity.js';

export interface AdminGetBrandMenuInputDto {
	cityId: string & tags.Format<'uuid'>;
}

/** A listing's figures in one month */
export interface AdminBrandMenuSnapshotOutputDto {
	month: string;
	rating?: number;
	reviewsCount?: number;
	deliveryFee?: number;
	minOrder?: number;
	etaMin?: number;
	etaMax?: number;
	menuItems?: number;
}

/** A branch's page on a delivery platform, as its last read had it */
export interface AdminBrandMenuListingOutputDto {
	id: string;
	platform: DeliveryPlatformEnum;
	url: string;
	name?: string;
	address?: string;
	cuisines?: string[];
	rating?: number;
	reviewsCount?: number;
	deliveryFee?: number;
	minOrder?: number;
	etaMin?: number;
	etaMax?: number;
	currency?: string;
	fetchedAt: string;
	menuFetchedAt?: string;
	/** Its page stopped answering then */
	removedAt?: string;
	/** Items on its menu now, and the ones it stopped listing */
	items: number;
	removedItems: number;
	/** Its figures by month, oldest first */
	snapshots: AdminBrandMenuSnapshotOutputDto[];
}

/** A menu item on one platform */
export interface AdminBrandMenuOfferOutputDto {
	platform: DeliveryPlatformEnum;
	price: number;
	/** The share of raters who liked it (0–1), where the platform says */
	likedShare?: number;
	ratingsCount?: number;
	firstSeenAt: string;
	lastSeenAt: string;
	/** A read of the menu came back without it then */
	removedAt?: string;
	/** Its price by month, oldest first, with how raters liked it that month where the platform says */
	prices: { month: string; price: number; likedShare?: number; ratingsCount?: number }[];
}

/** A wording the brand's reviews and posts use for an item */
export interface AdminBrandMenuWordingOutputDto {
	key: string;
	name: string;
	method: MenuTermMethod;
	/** Reviews and posts by others naming it */
	sources: number;
}

/** One thing on a branch's menu, across the platforms listing it */
export interface AdminBrandMenuItemOutputDto {
	key: string;
	name: string;
	category?: string;
	description?: string;
	/** Off every platform that listed it */
	removed: boolean;
	topics: { key: string; label: string; kind: string }[];
	offers: AdminBrandMenuOfferOutputDto[];
	/** Reviews and posts by others about the brand whose claims name it, and how they judged it */
	sources: number;
	reviews: number;
	posts: number;
	praise: number;
	complaints: number;
	wordings: AdminBrandMenuWordingOutputDto[];
}

export interface AdminBrandMenuBranchOutputDto {
	venueId: string;
	name: string;
	street?: string;
	/** When its delivery pages were last searched for */
	searchedAt?: string;
	listings: AdminBrandMenuListingOutputDto[];
	/** On the menu first, most named first; then the removed ones */
	items: AdminBrandMenuItemOutputDto[];
}

/** A brand's delivery pages and menus in a city, branch by branch (the most reviewed first) */
export interface AdminBrandMenuOutputDto {
	branches: AdminBrandMenuBranchOutputDto[];
}
