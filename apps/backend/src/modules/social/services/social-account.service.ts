import { FilterQuery, QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import _ from 'lodash';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { monthRange } from 'src/modules/venues/util/month.js';

import { AccountRejectedBrand } from '../entities/account-rejected-brand.entity.js';
import { Creator } from '../entities/creator.entity.js';
import { AccountBrandSourceEnum, SocialAccount } from '../entities/social-account.entity.js';
import { SocialAccountHandleChange } from '../entities/social-account-handle-change.entity.js';
import {
	AccountSnapshotSourceEnum,
	SocialAccountSnapshot,
} from '../entities/social-account-snapshot.entity.js';
import { SocialPlatformEnum, SocialPost } from '../entities/social-post.entity.js';
import { ACCOUNT_POPULATE } from '../util/account-output.js';
import {
	followersChange,
	latestFigures,
	SNAPSHOT_FIGURES,
	snapshotDateParts,
	type SnapshotFigures,
} from '../util/account-snapshots.js';
import { normalizeHandle } from '../util/accounts.js';
import { CREATOR_KEY_SQL, creatorKeyOf } from '../util/creators.js';
import type { ProfileFacts } from '../util/profile-proof.js';

/**
 * Figures seen again this soon after the account's last snapshot (in the same unit of work)
 * update it rather than add one: one scrape returns many posts of one author, and a profile
 * scrape saves its posts after the profile.
 */
const SNAPSHOT_MERGE_MS = 3600 * 1000;

// A richer scrape's source wins when two land in one snapshot
const SOURCE_RANK = {
	[AccountSnapshotSourceEnum.POST]: 0,
	[AccountSnapshotSourceEnum.LOOKUP]: 1,
	[AccountSnapshotSourceEnum.PROFILE]: 2,
};

/** What our own scrapes saw an account post: a month's, and all of it. */
export interface AccountPostStats {
	monthPosts: number;
	monthViews: number;
	posts: number;
	lastPostedAt?: Date;
}

/** The newest figures of an account's snapshots: each field from the newest snapshot that has it. */
export interface LatestAccountFigures extends SnapshotFigures {
	scrapedAt: Date;
	source: AccountSnapshotSourceEnum;
}

/** An account on the admin pages: its latest figures, the followers change and what we saw it post. */
export interface AccountWithFigures {
	account: SocialAccount;
	latest: LatestAccountFigures | null;
	/** Followers against the newest count `FOLLOWERS_CHANGE_DAYS` or more older; absent without one */
	followersChange?: number;
	stats: AccountPostStats;
}

/** What an item says about its author, beyond the handle. */
export interface AccountSeen {
	/** The platform's id of the user (Instagram's `ownerId` / profile `id`, TikTok's `authorMeta.id` / `uid`) */
	platformUserId?: string | number | null;
	displayName?: string | null;
	followers?: number | null;
	following?: number | null;
	/** Everything the profile shows */
	posts?: number | null;
	/** What kind of scrape saw it; a post's item by default */
	source?: AccountSnapshotSourceEnum;
	/**
	 * What a profile read gave (a profile scrape, the follower fill, the twin lookup): kept on the
	 * account with `profileReadAt`, the bio and links as given (an empty bio is stored as none)
	 */
	profile?: Pick<ProfileFacts, 'bio' | 'links' | 'category' | 'isBusiness'>;
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
	}): Promise<{
		items: AccountWithFigures[];
		totalItems: number;
		counts: { linked: number; suggested: number };
	}> {
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
		const suggested = {
			...where,
			brand: null,
			suggestedBrand: { $ne: null },
		} as FilterQuery<SocialAccount>;
		const counts = {
			linked: await this.em.count(SocialAccount, linked),
			suggested: await this.em.count(SocialAccount, suggested),
		};
		const accounts = await this.em.find(
			SocialAccount,
			query.status === 'linked' ? linked
			: query.status === 'suggested' ? suggested
			: where,
			{ populate: [...ACCOUNT_POPULATE] },
		);
		const rows = await this.withFigures(accounts, query.month);
		const [field, order] = (
			query.sort ?? (query.status === 'suggested' ? 'score:desc' : 'followers:desc')
		).split(':');
		const value = (r: AccountWithFigures): number | string =>
			field === 'handle' ? r.account.handle
			: field === 'score' ? (r.account.suggestedScore ?? -1)
			: field === 'monthPosts' ? r.stats.monthPosts
			: field === 'monthViews' ? r.stats.monthViews
			: (r.latest?.followers ?? r.account.followers ?? -1);
		const sorted = _.orderBy(
			rows,
			[value, r => r.account.handle],
			[order === 'asc' ? 'asc' : 'desc', 'asc'],
		);
		return {
			items: sorted.slice((query.page - 1) * query.size, query.page * query.size),
			totalItems: sorted.length,
			counts,
		};
	}

	/** The latest figures, the followers change and the posts we saw, for each account. */
	async withFigures(accounts: SocialAccount[], month: string): Promise<AccountWithFigures[]> {
		if (!accounts.length) return [];
		const ids = accounts.map(a => a.id);
		const snapshots = (
			await this.em.find(
				SocialAccountSnapshot,
				{ account: { $in: ids } },
				{ orderBy: { scrapedAt: QueryOrder.DESC } },
			)
		).map(s => ({ ...s, accountId: s.account.id }));
		const { start, end } = monthRange(month);
		const rows: {
			account_id: string;
			month_posts: string;
			month_views: string;
			posts: string;
			last_posted_at: Date | null;
		}[] = await this.em.getConnection().execute(
			`select p.account_id,
					count(*) filter (where p.posted_at >= ? and p.posted_at < ?) as month_posts,
					coalesce(sum(p.views) filter (where p.posted_at >= ? and p.posted_at < ?), 0) as month_views,
					count(*) as posts, max(p.posted_at) as last_posted_at
				from social_posts p where p.account_id in (${marks(ids)}) group by p.account_id`,
			[start, end, start, end, ...ids],
		);
		const stats = new Map(rows.map(r => [r.account_id, r]));
		return accounts.map(account => {
			const own = snapshots.filter(s => s.accountId === account.id);
			const row = stats.get(account.id);
			const change = followersChange(own);
			return {
				account,
				// Newest first
				latest:
					own.length ?
						{
							...latestFigures(own),
							scrapedAt: own[0].scrapedAt,
							source: own[0].source,
						}
					:	null,
				...(change !== undefined && { followersChange: change }),
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
	 *
	 * With the platform's user id (`seen.platformUserId`) the id decides who it is, the handle
	 * only where no account has the id yet:
	 * - the account with the id under another handle was renamed: it takes this handle and the
	 *   change is kept (`SocialAccountHandleChange`); an account holding this handle without an id
	 *   was the same person seen by handle alone and is merged into it (`absorb`), one holding it
	 *   with another id renamed away and loses it (`loseHandle`);
	 * - the account with this handle and no id takes the id;
	 * - the account with this handle and another id lost it to someone new, who gets an account.
	 * Rows a rename or merge moves away are written at once, so the unit of work's flush never
	 * meets two rows of one handle.
	 */
	// Keyed by the managed entity, so one unit of work's scrape shares its snapshots and a new
	// request (a new entity) starts afresh
	private readonly lastSnapshots = new WeakMap<SocialAccount, SocialAccountSnapshot>();

	async ensure(
		platform: SocialPlatformEnum,
		input: string | null | undefined,
		city: City,
		seen: AccountSeen = {},
		now = new Date(),
	): Promise<SocialAccount | null> {
		const handle = normalizeHandle(platform, input);
		if (!handle) return null;
		const userId =
			seen.platformUserId != null && `${seen.platformUserId}`.trim() ?
				`${seen.platformUserId}`.trim()
			:	null;
		const source = seen.source ?? AccountSnapshotSourceEnum.POST;
		let account = await this.find(platform, 'handle', handle);
		let lost: SocialAccountHandleChange | null = null;
		if (userId) {
			const owner = await this.find(platform, 'platformUserId', userId);
			if (owner && owner !== account) {
				if (account && !account.platformUserId)
					account = await this.absorb(account, owner, handle, source, now);
				else {
					if (account) await this.loseHandle(account, source, now, owner);
					this.renameTo(owner, handle, source, now);
					account = owner;
				}
			} else if (account && !account.platformUserId) account.platformUserId = userId;
			else if (account && account.platformUserId !== userId) {
				lost = await this.loseHandle(account, source, now);
				account = null;
			}
		}
		if (!account) {
			const twin = await this.twinCreator(platform, handle);
			account = this.em.create(SocialAccount, {
				platform,
				handle,
				city,
				platformUserId: userId,
				...(twin && { creator: twin }),
			});
			if (lost) lost.takenBy = account;
		}
		if (seen.displayName?.trim()) account.displayName = seen.displayName.trim();
		if (seen.profile) {
			account.bio = seen.profile.bio?.trim() || null;
			account.bioLinks = seen.profile.links.length ? seen.profile.links : null;
			account.businessCategory = seen.profile.category ?? null;
			account.isBusiness = seen.profile.isBusiness ?? null;
			account.profileReadAt = now;
		}
		if (typeof seen.followers === 'number' && seen.followers >= 0) {
			account.followers = seen.followers;
			account.followersAt = now;
			this.recordSnapshot(
				account,
				{ followers: seen.followers, following: seen.following, posts: seen.posts },
				source,
				now,
			);
		}
		return account;
	}

	/** The account takes `handle` (its user id came back under it), the change kept. */
	private renameTo(
		account: SocialAccount,
		handle: string,
		source: AccountSnapshotSourceEnum,
		now: Date,
	): void {
		this.em.create(SocialAccountHandleChange, {
			account,
			fromHandle: account.handleLostAt ? null : account.handle,
			toHandle: handle,
			seenAt: now,
			source,
		});
		account.handle = handle;
		account.handleLostAt = null;
	}

	/**
	 * Another user id showed up under the account's handle: it moves to a placeholder no scrape
	 * names until its own id is seen again. Written at once, so the handle is free for the flush.
	 */
	private async loseHandle(
		account: SocialAccount,
		source: AccountSnapshotSourceEnum,
		now: Date,
		takenBy: SocialAccount | null = null,
	): Promise<SocialAccountHandleChange> {
		const change = this.em.create(SocialAccountHandleChange, {
			account,
			fromHandle: account.handle,
			toHandle: null,
			takenBy,
			seenAt: now,
			source,
		});
		const placeholder = `${account.handle}~${account.platformUserId}`;
		if (account.id)
			await this.em.nativeUpdate(
				SocialAccount,
				{ id: account.id },
				{ handle: placeholder, handleLostAt: now },
			);
		account.handle = placeholder;
		account.handleLostAt = now;
		return change;
	}

	/**
	 * An account known by its handle alone (`byHandle`) is the user id's (`owner`, under another
	 * handle): the two become one row under `handle`, the change kept. The row the database
	 * already holds stays (both stored: the owner's), and takes the other's posts, snapshots,
	 * handle changes and rejections, and a brand link, a suggestion and figures it lacks; the
	 * other goes, with its creator when that is left without an account. Moves and the delete are
	 * written at once, so the handle is free for the flush. Returns the row that stays.
	 */
	private async absorb(
		byHandle: SocialAccount,
		owner: SocialAccount,
		handle: string,
		source: AccountSnapshotSourceEnum,
		now: Date,
	): Promise<SocialAccount> {
		const [keep, gone] = owner.id || !byHandle.id ? [owner, byHandle] : [byHandle, owner];
		// The owner's identity and newest figures win, whichever row stays
		keep.platformUserId = owner.platformUserId;
		keep.displayName = owner.displayName ?? byHandle.displayName;
		const figures = owner.followers != null ? owner : byHandle;
		keep.followers = figures.followers;
		keep.followersAt = figures.followersAt;
		// The newest profile read's bio, links and category
		const read =
			(owner.profileReadAt?.getTime() ?? 0) >= (byHandle.profileReadAt?.getTime() ?? 0) ?
				owner
			:	byHandle;
		Object.assign(keep, {
			bio: read.bio,
			bioLinks: read.bioLinks,
			businessCategory: read.businessCategory,
			isBusiness: read.isBusiness,
			profileReadAt: read.profileReadAt,
		});
		if (!keep.brand && gone.brand) {
			keep.brand = gone.brand;
			keep.branch = gone.branch;
			keep.brandSource = gone.brandSource;
		}
		if (!keep.brand && !keep.suggestedBrand && gone.suggestedBrand) {
			keep.suggestedBrand = gone.suggestedBrand;
			keep.suggestedScore = gone.suggestedScore;
		}
		keep.twinCheckedAt ??= gone.twinCheckedAt;
		keep.followersAskedAt ??= gone.followersAskedAt;
		const snapshot = this.lastSnapshots.get(gone);
		if (snapshot && !this.lastSnapshots.has(keep)) this.lastSnapshots.set(keep, snapshot);

		// What this unit of work holds, loaded or new
		const uow = this.em.getUnitOfWork();
		for (const entity of [...uow.getIdentityMap().values(), ...uow.getPersistStack()]) {
			if (
				(entity instanceof SocialPost ||
					entity instanceof SocialAccountSnapshot ||
					entity instanceof SocialAccountHandleChange ||
					entity instanceof AccountRejectedBrand) &&
				entity.account === gone
			)
				entity.account = keep;
		}
		if (gone.id) {
			// What the database holds (both rows are stored here)
			const conn = this.em.getConnection();
			for (const table of [
				'social_posts',
				'social_account_snapshots',
				'social_account_handle_changes',
			])
				await conn.execute(`update ${table} set account_id = ? where account_id = ?`, [
					keep.id,
					gone.id,
				]);
			await conn.execute(
				`update account_rejected_brands r set account_id = ? where r.account_id = ?
				and not exists (select 1 from account_rejected_brands o where o.account_id = ? and o.brand_id = r.brand_id)`,
				[keep.id, gone.id, keep.id],
			);
			const creatorId = gone.creator?.id;
			await conn.execute(`delete from social_accounts where id = ?`, [gone.id]);
			uow.unsetIdentity(gone);
			if (creatorId && creatorId !== keep.creator?.id) await this.dropEmpty([creatorId]);
		} else this.em.remove(gone);

		const from = owner.handleLostAt ? null : owner.handle;
		keep.handle = handle;
		keep.handleLostAt = null;
		if (from !== handle)
			this.em.create(SocialAccountHandleChange, {
				account: keep,
				fromHandle: from,
				toHandle: handle,
				seenAt: now,
				source,
			});
		return keep;
	}

	/**
	 * The one writer of `SocialAccountSnapshot`: the figures a scrape saw for an account at `at`.
	 * The account's last snapshot in this unit of work takes them instead when it is under
	 * `SNAPSHOT_MERGE_MS` old (one scrape's profile and posts are one snapshot), each given field
	 * over its own and the richer source kept. Negative or missing figures stay unknown. Does
	 * not flush.
	 */
	recordSnapshot(
		account: SocialAccount,
		figures: SnapshotFigures,
		source: AccountSnapshotSourceEnum,
		at = new Date(),
	): SocialAccountSnapshot {
		const known = Object.fromEntries(
			SNAPSHOT_FIGURES.flatMap(field => {
				const value = figures[field];
				return typeof value === 'number' && value >= 0 ? [[field, value]] : [];
			}),
		) as SnapshotFigures;
		const last = this.lastSnapshots.get(account);
		if (last && Math.abs(at.getTime() - last.scrapedAt.getTime()) < SNAPSHOT_MERGE_MS) {
			Object.assign(last, known);
			if (SOURCE_RANK[source] > SOURCE_RANK[last.source]) last.source = source;
			return last;
		}
		const snapshot = this.em.create(SocialAccountSnapshot, {
			account,
			scrapedAt: at,
			...snapshotDateParts(at),
			source,
			...known,
		});
		this.lastSnapshots.set(account, snapshot);
		return snapshot;
	}

	/**
	 * The account with this handle or user id as this unit of work has it: a rename or a new id
	 * earlier in the same scrape counts before the flush, and a row the database still holds under
	 * a value it has since lost is not it. New accounts (not flushed yet) included.
	 */
	private async find(
		platform: SocialPlatformEnum,
		field: 'handle' | 'platformUserId',
		value: string,
	): Promise<SocialAccount | null> {
		const uow = this.em.getUnitOfWork();
		const loaded = uow
			.getIdentityMap()
			.getStore(this.em.getMetadata().get(SocialAccount))
			.values();
		for (const entity of [...uow.getPersistStack(), ...loaded])
			if (
				entity instanceof SocialAccount &&
				entity.platform === platform &&
				entity[field] === value
			)
				return entity;
		const found = await this.em.findOne(SocialAccount, { platform, [field]: value });
		return found && found[field] === value ? found : null;
	}

	/** The creator of the one account on another platform with the same letters, if one. */
	private async twinCreator(
		platform: SocialPlatformEnum,
		handle: string,
	): Promise<Creator | null> {
		const key = creatorKeyOf(platform, handle);
		if (!key) return null;
		// One creator, even when it already has accounts on both other platforms
		const rows: { creator_id: string }[] = await this.em.getConnection().execute(
			`select distinct a.creator_id from social_accounts a
			where a.platform <> ? and ${CREATOR_KEY_SQL('a')} = ?`,
			[platform, key],
		);
		return rows.length === 1 ? this.em.getReference(Creator, rows[0].creator_id) : null;
	}

	/** The brands each of these accounts was said not to be (`AccountRejectedBrand`), by account id. */
	async rejectedBrands(accountIds: string[]): Promise<Map<string, Set<string>>> {
		const out = new Map<string, Set<string>>();
		for (const ids of _.chunk(_.uniq(accountIds.filter(Boolean)), 1000)) {
			const rows: { account_id: string; brand_id: string }[] = await this.em
				.getConnection()
				.execute(
					`select account_id, brand_id from account_rejected_brands where account_id in (${ids.map(() => '?').join(', ')})`,
					ids,
				);
			for (const r of rows) {
				const set = out.get(r.account_id) ?? new Set<string>();
				set.add(r.brand_id);
				out.set(r.account_id, set);
			}
		}
		return out;
	}

	/** Whether an admin said the account is not this brand's. */
	async isRejected(account: SocialAccount, brandId: string): Promise<boolean> {
		return (
			!!account.id &&
			!!(await this.em.count(AccountRejectedBrand, { account: account.id, brand: brandId }))
		);
	}

	/** Records that the account is not the brand's, once. Does not flush. */
	private async reject(account: SocialAccount, brand: Brand): Promise<void> {
		if (!(await this.isRejected(account, brand.id)))
			this.em.create(AccountRejectedBrand, { account, brand });
	}

	/** Takes back that the account is not the brand's. Does not flush. */
	private async unreject(account: SocialAccount, brandId: string): Promise<void> {
		if (!account.id) return;
		const row = await this.em.findOne(AccountRejectedBrand, {
			account: account.id,
			brand: brandId,
		});
		if (row) this.em.remove(row);
	}

	/**
	 * Links an account to a brand as its own (a branch's own when `branchId`), or (`brand` null)
	 * unlinks it. Clears the open suggestion. An admin's unlink records the brand as rejected
	 * (`AccountRejectedBrand`), so the matcher never links it back; a link takes back a rejection
	 * of that brand. Does not flush.
	 */
	async setBrand(
		account: SocialAccount,
		brand: Brand | null,
		source: AccountBrandSourceEnum,
		branch?: Venue | null,
	): Promise<void> {
		if (!brand && account.brand && source === AccountBrandSourceEnum.ADMIN)
			await this.reject(account, account.brand);
		if (brand) await this.unreject(account, brand.id);
		account.brand = brand;
		account.branch = brand ? (branch ?? null) : null;
		account.brandSource =
			brand ? source
			: source === AccountBrandSourceEnum.ADMIN ? AccountBrandSourceEnum.ADMIN
			: null;
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
		const account = await this.em.findOne(
			SocialAccount,
			{ id: accountId },
			{ populate: ['brand', 'suggestedBrand'] },
		);
		if (!account) throw new NotFoundException();
		switch (decision.action) {
			case 'link': {
				const brand = await this.em.findOne(Brand, { id: decision.brandId });
				if (!brand) throw new BadRequestException('Unknown brand');
				await this.setBrand(
					account,
					brand,
					AccountBrandSourceEnum.ADMIN,
					await this.branchOf(brand.id, decision.branchId),
				);
				break;
			}
			case 'confirm':
				if (!account.suggestedBrand) throw new BadRequestException('Nothing suggested');
				await this.setBrand(account, account.suggestedBrand, AccountBrandSourceEnum.ADMIN);
				break;
			case 'reject':
				if (account.brand) await this.setBrand(account, null, AccountBrandSourceEnum.ADMIN);
				else if (account.suggestedBrand) {
					await this.reject(account, account.suggestedBrand);
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
		const accounts = await this.em.find(
			SocialAccount,
			{ id: { $in: accountIds } },
			{ populate: ['creator'] },
		);
		if (accounts.length !== new Set(accountIds).size)
			throw new BadRequestException('Unknown account');
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
