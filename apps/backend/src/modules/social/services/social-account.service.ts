import { FilterQuery, QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import _ from 'lodash';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { monthRange } from 'src/modules/venues/util/month.js';

import { Creator } from '../entities/creator.entity.js';
import { AccountBrandSourceEnum, SocialAccount } from '../entities/social-account.entity.js';
import { SocialAccountSnapshot } from '../entities/social-account-snapshot.entity.js';
import { SocialPlatformEnum } from '../entities/social-post.entity.js';
import { normalizeAccountHandle } from '../util/accounts.js';
import { creatorKey } from '../util/creators.js';

/** What our own scrapes saw an account post: a month's, and all of it. */
export interface AccountPostStats {
	monthPosts: number;
	monthViews: number;
	posts: number;
	lastPostedAt?: Date;
}

/** An account on the admin pages: its latest profile snapshot, the one before it and what we saw it post. */
export interface AccountWithFigures {
	account: SocialAccount;
	latest: SocialAccountSnapshot | null;
	/** The snapshot before `latest`: the change in followers */
	previous: SocialAccountSnapshot | null;
	stats: AccountPostStats;
}

/** What an item says about its author, beyond the handle. */
export interface AccountSeen {
	displayName?: string | null;
	followers?: number | null;
}

/**
 * The one entry point for accounts and creators: an account for every post author (and every
 * brand handle we learn of), the creator it belongs to, and an admin's edits of both — which
 * brand an account is the own account of, and which accounts are one person. The matcher's links
 * go through `AccountMatchingService`, which calls `setBrand` here.
 */
@Injectable()
export class SocialAccountService {
	constructor(private readonly em: EntityManager) {}

	/**
	 * The admin's account list: a city's accounts (every city's without), venues' own ones
	 * (`linked`), the matcher's open suggestions (`suggested`) or all, searched on the handle,
	 * the display name and the brand's name, with their figures for the month, sorted and paged
	 * in memory; `counts` per status under the same search.
	 */
	async list(query: {
		cityId?: string;
		month: string;
		platform?: SocialPlatformEnum;
		status?: 'linked' | 'suggested';
		q?: string;
		sort?: string;
		page: number;
		size: number;
	}): Promise<{ items: AccountWithFigures[]; totalItems: number; counts: { linked: number; suggested: number } }> {
		const where: FilterQuery<SocialAccount> = {};
		if (query.cityId) where.city = query.cityId;
		if (query.platform) where.platform = query.platform;
		if (query.q?.trim()) {
			const like = `%${query.q.trim()}%`;
			where.$or = [
				{ handle: { $ilike: like } },
				{ displayName: { $ilike: like } },
				{ brand: { name: { $ilike: like } } },
				{ suggestedBrand: { name: { $ilike: like } } },
			];
		}
		const linked = { ...where, brand: { $ne: null } } as FilterQuery<SocialAccount>;
		const suggested = { ...where, brand: null, suggestedBrand: { $ne: null } } as FilterQuery<SocialAccount>;
		const counts = { linked: await this.em.count(SocialAccount, linked), suggested: await this.em.count(SocialAccount, suggested) };
		const accounts = await this.em.find(
			SocialAccount,
			query.status === 'linked' ? linked : query.status === 'suggested' ? suggested : where,
			{ populate: ['creator', 'brand', 'branch', 'suggestedBrand'] },
		);
		const rows = await this.withFigures(accounts, query.month);
		const [field, order] = (query.sort ?? (query.status === 'suggested' ? 'score:desc' : 'followers:desc')).split(':');
		const value = (r: AccountWithFigures): number | string =>
			field === 'handle' ? r.account.handle
			: field === 'score' ? (r.account.suggestedScore ?? -1)
			: field === 'monthPosts' ? r.stats.monthPosts
			: field === 'monthViews' ? r.stats.monthViews
			: (r.latest?.followers ?? r.account.followers ?? -1);
		const sorted = _.orderBy(rows, [value, r => r.account.handle], [order === 'asc' ? 'asc' : 'desc', 'asc']);
		return {
			items: sorted.slice((query.page - 1) * query.size, query.page * query.size),
			totalItems: sorted.length,
			counts,
		};
	}

	/** The latest two snapshots and the posts we saw, for each account. */
	async withFigures(accounts: SocialAccount[], month: string): Promise<AccountWithFigures[]> {
		if (!accounts.length) return [];
		const ids = accounts.map(a => a.id);
		const snapshots = await this.em.find(
			SocialAccountSnapshot,
			{ account: { $in: ids } },
			{ orderBy: { month: QueryOrder.DESC } },
		);
		const { start, end } = monthRange(month);
		const rows: { account_id: string; month_posts: string; month_views: string; posts: string; last_posted_at: Date | null }[] =
			await this.em.getConnection().execute(
				`select p.account_id,
					count(*) filter (where p.posted_at >= ? and p.posted_at < ?) as month_posts,
					coalesce(sum(p.views) filter (where p.posted_at >= ? and p.posted_at < ?), 0) as month_views,
					count(*) as posts, max(p.posted_at) as last_posted_at
				from social_posts p where p.account_id in (${marks(ids)}) group by p.account_id`,
				[start, end, start, end, ...ids],
			);
		const stats = new Map(rows.map(r => [r.account_id, r]));
		return accounts.map(account => {
			const own = snapshots.filter(s => s.account.id === account.id);
			const row = stats.get(account.id);
			return {
				account,
				latest: own[0] ?? null,
				previous: own[1] ?? null,
				stats: {
					monthPosts: Number(row?.month_posts ?? 0),
					monthViews: Number(row?.month_views ?? 0),
					posts: Number(row?.posts ?? 0),
					...(row?.last_posted_at && { lastPostedAt: new Date(row.last_posted_at) }),
				},
			};
		});
	}

	/**
	 * The account for a handle, created when new: in `city`, joining the creator that holds the
	 * same letters on the other platform (`creatorKey`, e.g. `polina_iz_berlina` and
	 * `polina.iz.berlina`), else with one of its own (`SocialAccountSubscriber`). A known account
	 * takes the newer display name and follower count. Does not flush; finds accounts created
	 * earlier in the same flush. Null for a handle it cannot use.
	 */
	async ensure(
		platform: SocialPlatformEnum,
		input: string | null | undefined,
		city: City,
		seen: AccountSeen = {},
		now = new Date(),
	): Promise<SocialAccount | null> {
		const handle = normalizeAccountHandle(input);
		if (!handle) return null;
		let account = this.pending(platform, handle) ?? (await this.em.findOne(SocialAccount, { platform, handle }));
		if (!account) {
			const twin = await this.twinCreator(platform, handle);
			account = this.em.create(SocialAccount, { platform, handle, city, ...(twin && { creator: twin }) });
		}
		if (seen.displayName?.trim()) account.displayName = seen.displayName.trim();
		if (typeof seen.followers === 'number' && seen.followers >= 0) {
			account.followers = seen.followers;
			account.followersAt = now;
		}
		return account;
	}

	/** An account created in this unit of work but not flushed yet. */
	private pending(platform: SocialPlatformEnum, handle: string): SocialAccount | undefined {
		for (const entity of this.em.getUnitOfWork().getPersistStack())
			if (entity instanceof SocialAccount && entity.platform === platform && entity.handle === handle) return entity;
		return undefined;
	}

	/** The creator of the one account on another platform with the same letters, if one. */
	private async twinCreator(platform: SocialPlatformEnum, handle: string): Promise<Creator | null> {
		const key = creatorKey(handle);
		if (!key) return null;
		const rows: { creator_id: string }[] = await this.em.getConnection().execute(
			`select creator_id from social_accounts
			where platform <> ? and regexp_replace(handle, '[^a-z0-9]', '', 'g') = ?`,
			[platform, key],
		);
		return rows.length === 1 ? this.em.getReference(Creator, rows[0].creator_id) : null;
	}

	/**
	 * Links an account to a brand as its own (a branch's own when `branchId`), or (`brand` null)
	 * unlinks it. Clears the open suggestion. An admin's unlink records the brand as rejected,
	 * so the matcher never links it back. Does not flush.
	 */
	setBrand(
		account: SocialAccount,
		brand: Brand | null,
		source: AccountBrandSourceEnum,
		branch?: Venue | null,
	): void {
		if (!brand && account.brand && source === AccountBrandSourceEnum.ADMIN)
			account.rejectedBrandIds = [...new Set([...account.rejectedBrandIds, account.brand.id])];
		if (brand) account.rejectedBrandIds = account.rejectedBrandIds.filter(id => id !== brand.id);
		account.brand = brand;
		account.branch = brand ? (branch ?? null) : null;
		account.brandSource = brand ? source : source === AccountBrandSourceEnum.ADMIN ? AccountBrandSourceEnum.ADMIN : null;
		account.suggestedBrand = null;
		account.suggestedScore = null;
	}

	/**
	 * An admin's word on an account (`/admin/accounts`): link it to a brand (or one of its
	 * branches), confirm the matcher's suggestion, or say it is not that brand's — final for the
	 * matcher. Flushes.
	 */
	async decide(
		accountId: string,
		decision:
			| { action: 'link'; brandId: string; branchId?: string | null }
			| { action: 'confirm' }
			| { action: 'reject' }
			| { action: 'branch'; branchId: string | null },
	): Promise<SocialAccount> {
		const account = await this.em.findOne(SocialAccount, { id: accountId }, { populate: ['brand', 'suggestedBrand'] });
		if (!account) throw new NotFoundException();
		switch (decision.action) {
			case 'link': {
				const brand = await this.em.findOne(Brand, { id: decision.brandId });
				if (!brand) throw new BadRequestException('Unknown brand');
				this.setBrand(account, brand, AccountBrandSourceEnum.ADMIN, await this.branchOf(brand.id, decision.branchId));
				break;
			}
			case 'confirm':
				if (!account.suggestedBrand) throw new BadRequestException('Nothing suggested');
				this.setBrand(account, account.suggestedBrand, AccountBrandSourceEnum.ADMIN);
				break;
			case 'reject':
				if (account.brand) this.setBrand(account, null, AccountBrandSourceEnum.ADMIN);
				else if (account.suggestedBrand) {
					account.rejectedBrandIds = [...new Set([...account.rejectedBrandIds, account.suggestedBrand.id])];
					account.suggestedBrand = null;
					account.suggestedScore = null;
				}
				break;
			case 'branch':
				if (!account.brand) throw new BadRequestException('Not a brand account');
				account.branch = await this.branchOf(account.brand.id, decision.branchId);
				account.brandSource = AccountBrandSourceEnum.ADMIN;
				break;
		}
		await this.em.flush();
		return account;
	}

	private async branchOf(brandId: string, branchId?: string | null): Promise<Venue | null> {
		if (!branchId) return null;
		const branch = await this.em.findOne(Venue, { id: branchId, brand: brandId });
		if (!branch) throw new BadRequestException('That place is not a branch of the brand');
		return branch;
	}

	/**
	 * Puts accounts under one creator (an admin: "these are one person"); creators left without
	 * an account go. Flushes. Returns the creator.
	 */
	async merge(creatorId: string, accountIds: string[]): Promise<Creator> {
		const creator = await this.em.findOne(Creator, { id: creatorId });
		if (!creator) throw new NotFoundException();
		const accounts = await this.em.find(SocialAccount, { id: { $in: accountIds } }, { populate: ['creator'] });
		if (accounts.length !== new Set(accountIds).size) throw new BadRequestException('Unknown account');
		const left = new Set(accounts.map(a => a.creator.id).filter(id => id !== creator.id));
		for (const account of accounts) account.creator = creator;
		await this.em.flush();
		await this.dropEmpty([...left]);
		return creator;
	}

	/** Takes an account out of its creator into one of its own (an admin: "not the same person"). Flushes. */
	async split(accountId: string): Promise<Creator> {
		const account = await this.em.findOne(SocialAccount, { id: accountId });
		if (!account) throw new NotFoundException();
		if ((await this.em.count(SocialAccount, { creator: account.creator })) < 2)
			throw new BadRequestException('The account is its creator’s only one');
		const creator = this.em.create(Creator, { name: account.displayName || account.handle });
		account.creator = creator;
		await this.em.flush();
		return creator;
	}

	/** An admin renames a creator. Flushes. */
	async rename(creatorId: string, name: string): Promise<Creator> {
		const creator = await this.em.findOne(Creator, { id: creatorId });
		if (!creator) throw new NotFoundException();
		if (!name.trim()) throw new BadRequestException('A name is needed');
		creator.name = name.trim();
		await this.em.flush();
		return creator;
	}

	private async dropEmpty(creatorIds: string[]): Promise<void> {
		if (!creatorIds.length) return;
		await this.em.getConnection().execute(
			`delete from creators c where c.id in (${creatorIds.map(() => '?').join(', ')})
			and not exists (select 1 from social_accounts a where a.creator_id = c.id)`,
			creatorIds,
		);
	}
}

const marks = (n: unknown[]) => n.map(() => '?').join(', ');
