import { QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import _ from 'lodash';

import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { monthRange, previousMonth } from 'src/modules/venues/util/month.js';

import { AccountBrandSourceEnum, SocialAccount } from '../entities/social-account.entity.js';
import { SocialAccountSnapshot } from '../entities/social-account-snapshot.entity.js';
import { SocialPlatformEnum } from '../entities/social-post.entity.js';
import { ACCOUNT_POPULATE } from '../util/account-output.js';
import { closingRange, monthFigures } from '../util/account-snapshots.js';
import { accountUrl, normalizeAccountHandle, type ProfilePlatform } from '../util/accounts.js';

import { type AccountWithFigures, SocialAccountService } from './social-account.service.js';

/** One own account in a month's report: its figures at the month's close, and the change since the month before's. */
export interface OwnAccountMonth {
	platform: ProfilePlatform;
	handle: string;
	url: string;
	/** A branch's own account: the branch's name (and street) */
	branch?: string;
	followers?: number;
	/** Since the month before's close; absent without it */
	followersChange?: number;
	/** The follower count each day a scrape saw the profile in the month, oldest first; absent without any */
	followerPoints?: { date: string; followers: number }[];
	/** Everything the profile shows */
	posts?: number;
	/** Posts added since the month before's close; absent without it */
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
 * outreach's handles, and what a report and the portal read from the `SocialAccountSnapshot`s
 * that close each month (`monthFigures`). A branch's own account counts only in the branch's city.
 */
@Injectable()
export class OwnAccountService {
	private readonly logger = new Logger(OwnAccountService.name);

	constructor(
		private readonly em: EntityManager,
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
			if (!account || account.brand?.id === row.brandId || (await this.socialAccountService.isRejected(account, row.brandId)))
				continue;
			if (account.brand && account.brandSource === AccountBrandSourceEnum.ADMIN) continue;
			await this.socialAccountService.setBrand(account, this.em.getReference(Brand, row.brandId), AccountBrandSourceEnum.PROSPECT);
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
			where brand_id = ? or suggested_brand_id = ?
			or exists (select 1 from account_rejected_brands r where r.account_id = social_accounts.id and r.brand_id = ?)`,
			[brandId, brandId, brandId],
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
		await this.socialAccountService.setBrand(account, brand, AccountBrandSourceEnum.ADMIN, branchId ? place : null);
		await this.em.flush();
		return account;
	}

	/** Checks the account is the brand's (linked, suggested or rejected), so brand routes touch only theirs. */
	async ensureOfBrand(brandId: string, accountId: string): Promise<void> {
		if (!(await this.idsOfBrand(brandId)).includes(accountId)) throw new NotFoundException();
	}

	/**
	 * The snapshots closing these months (`closingRange`) of the brand's accounts in a city
	 * (brand-wide and the city's branches' own), with their accounts.
	 */
	private async closingSnapshots(brandId: string, cityId: string | null, months: string[]) {
		const { from, to } = closingRange(months);
		const rows = await this.em.find(
			SocialAccountSnapshot,
			{ account: inCity(brandId, cityId), scrapedAt: { $gte: from, $lt: to } },
			{ populate: ['account', 'account.branch'] },
		);
		const accounts = new Map(rows.map(s => [s.account.id, s.account]));
		const figures = monthFigures(
			rows.map(s => ({ ...s, accountId: s.account.id })),
			months,
		);
		return figures.map(f => ({ ...f, account: accounts.get(f.accountId)! }));
	}

	/** The brand's accounts' figures at each month's close in a city: the portal's series. */
	async snapshots(
		brandId: string,
		cityId: string | null,
		months: string[],
	): Promise<
		{ month: string; platform: ProfilePlatform; handle: string; followers?: number | null; posts?: number | null; avgViews?: number | null }[]
	> {
		if (!months.length) return [];
		return (await this.closingSnapshots(brandId, cityId, months)).map(s => ({
			month: s.month,
			// Own accounts are profiles (`AccountMatchingService` skips blogs)
			platform: s.account.platform as ProfilePlatform,
			handle: s.account.handle,
			followers: s.followers,
			posts: s.posts,
			avgViews: s.avgViews,
		}));
	}

	/**
	 * Per account of the brand in a city, the follower count on each UTC day a scrape saw the
	 * profile in the month (the latest snapshot of the day with one), oldest first: week-level
	 * points for the report's analysis. Every scrape that gives a count writes a snapshot, so the
	 * weekly profile run of a report brand gives a point a week; an account nothing saw has none.
	 */
	async followerPoints(brandId: string, cityId: string | null, month: string): Promise<Map<string, { date: string; followers: number }[]>> {
		const { start, end } = monthRange(month);
		const rows = await this.em.find(
			SocialAccountSnapshot,
			{ account: inCity(brandId, cityId), scrapedAt: { $gte: start, $lt: end }, followers: { $ne: null } },
			{ orderBy: { scrapedAt: QueryOrder.ASC } },
		);
		const out = new Map<string, { date: string; followers: number }[]>();
		for (const [accountId, snapshots] of Object.entries(_.groupBy(rows, r => r.account.id))) {
			const byDay = new Map<string, number>();
			for (const s of snapshots) byDay.set(s.scrapedAt.toISOString().slice(0, 10), s.followers!);
			out.set(accountId, [...byDay].map(([date, followers]) => ({ date, followers })));
		}
		return out;
	}

	/**
	 * The brand's accounts in a city (brand-wide, and the city's branches' own) with figures at
	 * the month's close, and the change since the month before's, and the month's daily follower
	 * points: the report's "From your own account" box.
	 */
	async forReport(brandId: string, cityId: string | null, month: string): Promise<OwnAccountMonth[]> {
		const before = previousMonth(new Date(`${month}-01T00:00:00Z`));
		const snapshots = await this.closingSnapshots(brandId, cityId, [before, month]);
		const current = snapshots.filter(s => s.month === month);
		const points = await this.followerPoints(brandId, cityId, month);
		return _.sortBy(current, s => [s.account.platform, s.account.handle].join(':')).map(s => {
			const prev = snapshots.find(p => p.month === before && p.account.id === s.account.id);
			const followerPoints = points.get(s.account.id);
			const change = (now?: number | null, then?: number | null) =>
				now != null && then != null ? now - then : undefined;
			return _.omitBy(
				{
					platform: s.account.platform as ProfilePlatform,
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
					followerPoints: followerPoints?.length ? followerPoints : undefined,
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
