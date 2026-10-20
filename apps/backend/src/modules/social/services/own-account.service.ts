import { QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import _ from 'lodash';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { previousMonth } from 'src/modules/venues/util/month.js';

import { AccountBrandSourceEnum, SocialAccount } from '../entities/social-account.entity.js';
import { SocialAccountSnapshot } from '../entities/social-account-snapshot.entity.js';
import { SocialPlatformEnum } from '../entities/social-post.entity.js';
import { ACCOUNT_POPULATE } from '../util/account-output.js';
import {
	ACCOUNT_RECENT_POSTS,
	type AccountFigures,
	accountUrl,
	instagramProfileFigures,
	normalizeAccountHandle,
	tiktokProfileFigures,
} from '../util/accounts.js';

import { type AccountWithFigures, SocialAccountService } from './social-account.service.js';

// One item per profile, ~$2.60 / 1k profiles
const INSTAGRAM_PROFILE_ACTOR = 'apify/instagram-profile-scraper';
// One item per video, ~$1–5 / 1k videos: ten per profile
const TIKTOK_PROFILE_ACTOR = 'clockworks/tiktok-profile-scraper';

/** One own account in a month's report: its snapshot, and the change since the month before's. */
export interface OwnAccountMonth {
	platform: SocialPlatformEnum;
	handle: string;
	url: string;
	/** A branch's own account: the branch's name (and street) */
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
}

/** The brand's accounts a city reads: brand-wide ones, and its branches' there; all of them without a city. */
const inCity = (brandId: string, cityId: string | null) =>
	cityId ? { brand: brandId, $or: [{ branch: null }, { branch: { city: cityId } }] } : { brand: brandId };

/**
 * A brand's own accounts (`SocialAccount.brand`): the brand page's panel, the Own accounts page,
 * outreach's handles, the monthly profile scrape into `SocialAccountSnapshot`s and what a report
 * and the portal read. A branch's own account counts only in the branch's city.
 */
@Injectable()
export class OwnAccountService {
	private readonly logger = new Logger(OwnAccountService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly apifyService: ApifyService,
		private readonly socialAccountService: SocialAccountService,
	) {}

	/** The city a brand's new account is filed under: its most reviewed open branch's. */
	private async brandCity(brandId: string, branchId?: string | null) {
		const branch = await this.em.findOne(
			Venue,
			branchId ? { id: branchId, brand: brandId } : { brand: brandId },
			{ orderBy: { closed: QueryOrder.ASC, reviewsCount: QueryOrder.DESC_NULLS_LAST, id: QueryOrder.ASC } },
		);
		if (!branch) throw new BadRequestException(branchId ? 'That place is not a branch of the brand' : 'The brand has no branch');
		return branch;
	}

	/**
	 * Outreach's handles (`Prospect.instagram`) as the brands' Instagram accounts: linked unless
	 * an admin linked the account elsewhere or said it is not the brand's. Flushes.
	 */
	async addProspectHandles(rows: { brandId: string; instagram: string }[]): Promise<{ created: number }> {
		let created = 0;
		for (const row of rows) {
			if (!normalizeAccountHandle(row.instagram)) continue;
			const branch = await this.brandCity(row.brandId).catch(() => null);
			if (!branch) continue;
			const account = await this.socialAccountService.ensure(SocialPlatformEnum.INSTAGRAM, row.instagram, branch.city);
			if (!account || account.brand?.id === row.brandId || account.rejectedBrandIds.includes(row.brandId)) continue;
			if (account.brand && account.brandSource === AccountBrandSourceEnum.ADMIN) continue;
			this.socialAccountService.setBrand(account, this.em.getReference(Brand, row.brandId), AccountBrandSourceEnum.PROSPECT);
			created++;
		}
		await this.em.flush();
		return { created };
	}

	/**
	 * A brand's accounts for its page: its own ones, the matcher's suggestions for it and the
	 * ones an admin said are not its (to undo), each with its figures.
	 */
	async forBrand(brandId: string, month: string): Promise<AccountWithFigures[]> {
		const accounts = await this.em.find(
			SocialAccount,
			{ id: { $in: await this.idsOfBrand(brandId) } },
			{ populate: [...ACCOUNT_POPULATE], orderBy: { platform: QueryOrder.ASC, handle: QueryOrder.ASC } },
		);
		return this.socialAccountService.withFigures(accounts, month);
	}

	/** The accounts linked to the brand, suggested for it or said not to be its. */
	private async idsOfBrand(brandId: string): Promise<string[]> {
		const rows: { id: string }[] = await this.em.getConnection().execute(
			`select id from social_accounts
			where brand_id = ? or suggested_brand_id = ? or rejected_brand_ids @> ?::jsonb`,
			[brandId, brandId, JSON.stringify([brandId])],
		);
		return rows.map(r => r.id);
	}

	/**
	 * An admin adds a handle as the brand's own or (`branchId`) one branch's: linked whoever it
	 * was linked to, and no longer rejected. Flushes; a bad handle, or a branch of another brand, is a 400.
	 */
	async add(brandId: string, platform: SocialPlatformEnum, input: string, branchId?: string | null): Promise<SocialAccount> {
		if (!normalizeAccountHandle(input)) throw new BadRequestException('Not a handle');
		const brand = await this.em.findOne(Brand, { id: brandId });
		if (!brand) throw new NotFoundException();
		const place = await this.brandCity(brandId, branchId);
		const account = await this.socialAccountService.ensure(platform, input, place.city);
		if (!account) throw new BadRequestException('Not a handle');
		this.socialAccountService.setBrand(account, brand, AccountBrandSourceEnum.ADMIN, branchId ? place : null);
		await this.em.flush();
		return account;
	}

	/** Checks the account is the brand's (linked, suggested or rejected), so brand routes touch only theirs. */
	async ensureOfBrand(brandId: string, accountId: string): Promise<void> {
		if (!(await this.idsOfBrand(brandId)).includes(accountId)) throw new NotFoundException();
	}

	/**
	 * Scrapes the brands' accounts into the month's snapshots: Instagram profiles in one run,
	 * TikTok profiles' latest ten videos in another, the budget split by paid items. A profile
	 * that returns nothing (private, renamed) gets no snapshot. The accounts take the profile's
	 * display name and followers. Flushes.
	 */
	async scrapeMonth(
		brandIds: string[],
		month: string,
		budgetUsd: number,
		now = new Date(),
	): Promise<{ accounts: number; snapshots: number }> {
		if (!brandIds.length) return { accounts: 0, snapshots: 0 };
		const accounts = await this.em.find(SocialAccount, { brand: { $in: brandIds } });
		const [instagram, tiktok] = _.partition(accounts, a => a.platform === SocialPlatformEnum.INSTAGRAM);
		// A TikTok profile is ten paid items, an Instagram one is one
		const weight = instagram.length + tiktok.length * ACCOUNT_RECENT_POSTS;
		const figures = new Map<SocialAccount, AccountFigures>();
		const names = new Map<SocialAccount, string>();

		if (instagram.length) {
			const handles = _.uniq(instagram.map(a => a.handle));
			const items = await this.apifyService.runActor<any>(
				INSTAGRAM_PROFILE_ACTOR,
				{ usernames: handles },
				{
					maxCostUsd: (budgetUsd * instagram.length) / weight,
					purpose: `instagram profiles ${month}: ${handles.length} own accounts`,
				},
			);
			for (const item of items) {
				const result = instagramProfileFigures(item, now);
				if (!result) continue;
				const handle = `${item.username}`.toLowerCase();
				for (const account of instagram.filter(a => a.handle === handle)) {
					figures.set(account, result);
					if (typeof item.fullName === 'string' && item.fullName.trim()) names.set(account, item.fullName);
				}
			}
		}

		if (tiktok.length) {
			const handles = _.uniq(tiktok.map(a => a.handle));
			const items = await this.apifyService.runActor<any>(
				TIKTOK_PROFILE_ACTOR,
				{
					profiles: handles,
					resultsPerPage: ACCOUNT_RECENT_POSTS,
					profileSorting: 'latest',
					excludePinnedPosts: true,
					shouldDownloadVideos: false,
					shouldDownloadCovers: false,
					shouldDownloadSlideshowImages: false,
					shouldDownloadAvatars: false,
				},
				{
					maxCostUsd: (budgetUsd * tiktok.length * ACCOUNT_RECENT_POSTS) / weight,
					purpose: `tiktok profiles ${month}: ${handles.length} own accounts`,
				},
			);
			const byAuthor = _.groupBy(
				items.filter(i => i?.authorMeta?.name),
				i => `${i.authorMeta.name}`.toLowerCase(),
			);
			for (const account of tiktok) {
				const result = tiktokProfileFigures(byAuthor[account.handle] ?? [], now);
				if (!result) continue;
				figures.set(account, result);
				const nickName = byAuthor[account.handle]?.[0]?.authorMeta?.nickName;
				if (typeof nickName === 'string' && nickName.trim()) names.set(account, nickName);
			}
		}

		for (const [account, result] of figures) {
			const snapshot =
				(await this.em.findOne(SocialAccountSnapshot, { account, month })) ??
				this.em.create(SocialAccountSnapshot, { account, month, scrapedAt: now });
			Object.assign(snapshot, result, { scrapedAt: now });
			if (result.followers !== null) {
				account.followers = result.followers;
				account.followersAt = now;
			}
			const name = names.get(account);
			if (name) account.displayName = name.trim();
		}
		await this.em.flush();
		this.logger.log(`Own accounts ${month}: ${figures.size} of ${accounts.length} scraped`);
		return { accounts: accounts.length, snapshots: figures.size };
	}

	/** The brand's snapshots of these months in a city (brand-wide accounts and the city's branches' own): the portal's series. */
	async snapshots(
		brandId: string,
		cityId: string | null,
		months: string[],
	): Promise<
		{ month: string; platform: SocialPlatformEnum; handle: string; followers?: number | null; posts?: number | null; avgViews?: number | null }[]
	> {
		if (!months.length) return [];
		const rows = await this.em.find(
			SocialAccountSnapshot,
			{ account: inCity(brandId, cityId), month: { $in: months } },
			{ populate: ['account'] },
		);
		return rows.map(s => ({
			month: s.month,
			platform: s.account.platform,
			handle: s.account.handle,
			followers: s.followers,
			posts: s.posts,
			avgViews: s.avgViews,
		}));
	}

	/**
	 * The brand's accounts in a city (brand-wide, and the city's branches' own) with a snapshot
	 * for the month, and the change since the month before's: the report's "From your own
	 * account" box.
	 */
	async forReport(brandId: string, cityId: string | null, month: string): Promise<OwnAccountMonth[]> {
		const before = previousMonth(new Date(`${month}-01T00:00:00Z`));
		const snapshots = await this.em.find(
			SocialAccountSnapshot,
			{ account: inCity(brandId, cityId), month: { $in: [month, before] } },
			{ populate: ['account', 'account.branch'] },
		);
		const current = snapshots.filter(s => s.month === month);
		return _.sortBy(current, s => [s.account.platform, s.account.handle].join(':')).map(s => {
			const prev = snapshots.find(p => p.month === before && p.account.id === s.account.id);
			const change = (now?: number | null, then?: number | null) =>
				now != null && then != null ? now - then : undefined;
			return _.omitBy(
				{
					platform: s.account.platform,
					handle: s.account.handle,
					url: accountUrl(s.account.platform, s.account.handle),
					branch:
						s.account.branch ?
							s.account.branch.street ?
								`${s.account.branch.name}, ${s.account.branch.street}`
							:	s.account.branch.name
						:	undefined,
					followers: s.followers ?? undefined,
					followersChange: change(s.followers, prev?.followers),
					posts: s.posts ?? undefined,
					postsAdded: change(s.posts, prev?.posts),
					avgViews: s.avgViews ?? undefined,
					avgLikes: s.avgLikes ?? undefined,
					postsLast30Days: s.postsLast30Days ?? undefined,
				},
				v => v === undefined,
			) as unknown as OwnAccountMonth;
		});
	}
}
