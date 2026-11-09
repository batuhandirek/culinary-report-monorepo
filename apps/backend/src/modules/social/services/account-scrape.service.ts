import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import type { InstagramProfileItem } from 'src/modules/apify/actors/instagram-profile.actor.js';
import type { TiktokProfileItem } from 'src/modules/apify/actors/tiktok-profile.actor.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import type { InstagramProfilesCall } from 'src/modules/pipeline/atoms/instagram-profiles/util/instagram-profiles-input.js';
import type { TiktokProfilesCall } from 'src/modules/pipeline/atoms/tiktok-profiles/util/tiktok-profiles-input.js';

import { SocialAccount } from '../entities/social-account.entity.js';
import { AccountSnapshotSourceEnum } from '../entities/social-account-snapshot.entity.js';
import { SocialPlatformEnum } from '../entities/social-post.entity.js';
import {
	type AccountFigures,
	instagramProfileFigures,
	normalizeHandle,
	type ProfilePlatform,
	tiktokProfileFigures,
} from '../util/accounts.js';
import { accountFind } from '../util/post-sources.js';
import { instagramProfileFacts, tiktokProfileFacts } from '../util/profile-proof.js';
import {
	type AccountToScrape,
	PROFILE_ONLY_USD,
	type ProfileAccountsRule,
	profileOnlyRuns,
	type ProfileRuns,
	type ProfilesSaved,
	profilesPurpose,
} from '../util/profile-runs.js';

import { SocialAccountService } from './social-account.service.js';
import { mergeFinds, type PostFields, SocialPostService } from './social-post.service.js';

export { type AccountToScrape, PROFILE_ONLY_USD } from '../util/profile-runs.js';

// How long the follower fill waits before asking again for a profile that didn't come back
// (private, renamed or gone)
export const FOLLOWERS_RETRY_DAYS = 30;

// The profile tracking (`TRACK_PROFILES`): every account is read again this many days after its
// last profile, so a weekly run reads it every other week
export const TRACK_PROFILE_EVERY_DAYS = 13;
// A creator account (not a brand's) is tracked from this many followers, or this average of views
// over its stored posts (an Instagram creator's followers are unknown until its profile is read)
export const TRACK_CREATOR_MIN_FOLLOWERS = 5_000;
export const TRACK_CREATOR_MIN_VIEWS = 10_000;

/** How a profile run's items are saved (`saveInstagramProfiles`, `saveTiktokProfiles`) */
export interface SaveProfilesOptions {
	/** The run's time as the operation's clock has it: the stamp on every snapshot and post */
	now: Date;
	accounts: ProfileAccountsRule;
}

/** What `planFollowers` hands the `account-followers` workflow: the profile-only runs of as many as the budget covers, highest lead score first */
export interface FollowerFillPlan extends ProfileRuns {
	/** Brand accounts of the city with no follower count, not asked for in the last `FOLLOWERS_RETRY_DAYS` */
	missing: number;
}

/** What `planTracked` hands the `profile-track` workflow: the profile-only runs of as many as the budget covers, brand accounts first */
export interface ProfileTrackPlan extends ProfileRuns {
	/** Brand accounts and creator accounts over the thresholds whose last profile is due */
	due: number;
	/** Of them, brand accounts */
	brandAccounts: number;
}

/** What `planMentionedProfiles` hands the `read-mentioned-profiles` workflow */
export interface MentionedProfilesPlan {
	/** Mentioned Instagram accounts of the city whose profile was never read */
	unread: number;
	/** The profile-only run of as many as the budget covers, most mentioned first; none when nothing is due */
	call: InstagramProfilesCall | null;
}

/** What a profile read alone says beyond the counts: how many of the profiles are business accounts */
export interface InstagramProfilesSaved extends ProfilesSaved {
	businesses: number;
}

/**
 * The profile scrapes' plans and their saves (`saveInstagramProfiles`, `saveTiktokProfiles`): the
 * `instagram-profiles` and `tiktok-profiles` atoms (`pipeline/atoms/`) run the profile actors and
 * save their items here, so each profile's latest posts are stored as posts found on that profile
 * (`PostSource` kind `*_account`, linked to the city's account source when it has one), the
 * account takes the profile's display name, figures and what its profile says, and every profile
 * that came back gets a `SocialAccountSnapshot`. The plans (`planFollowers`, `planTracked`,
 * `planMentionedProfiles`; the watch list's through `profileRuns`) return the runs as plain data,
 * one a platform.
 */
@Injectable()
export class AccountScrapeService {
	private readonly logger = new Logger(AccountScrapeService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly socialAccountService: SocialAccountService,
		private readonly socialPostService: SocialPostService,
	) {}

	/**
	 * Stores an Instagram profile run's items: the accounts with their figures and what their bio
	 * says (made or updated by `SocialAccountService.ensure`; with `accounts: 'known'` only the ones
	 * we have), a snapshot each, and with `read.mode === 'posts'` the profile's latest posts since
	 * the day as finds of their profile. A profile read alone stamps `followersAskedAt` on every
	 * asked account that still has no count (private, renamed, gone), so the follower fill waits
	 * `FOLLOWERS_RETRY_DAYS`. Flushes.
	 */
	async saveInstagramProfiles(
		city: City,
		call: InstagramProfilesCall,
		items: InstagramProfileItem[],
		opts: SaveProfilesOptions,
	): Promise<InstagramProfilesSaved> {
		const since = call.read.mode === 'posts' ? call.read.since : null;
		const figures = new Map<SocialAccount, AccountFigures>();
		const rows: PostFields[] = [];
		let businesses = 0;
		for (const item of items) {
			const read = await this.ensureInstagramProfile(item, city, opts);
			if (!read) continue;
			if (read.account.isBusiness) businesses++;
			figures.set(read.account, read.profile);
			if (!since) continue;
			for (const post of item.latestPosts ?? []) {
				const row = this.socialPostService.fromInstagramProfilePost(post, item);
				if (row && row.postedAt.toISOString() >= since)
					rows.push({
						...row,
						finds: [accountFind(SocialPlatformEnum.INSTAGRAM, read.account.handle)],
					});
			}
		}
		const saved = await this.storeProfiles(
			city,
			SocialPlatformEnum.INSTAGRAM,
			call,
			!since,
			figures,
			rows,
			opts.now,
		);
		return { ...saved, businesses };
	}

	/**
	 * Stores a TikTok profile run's items (one a video, the profile repeated on each): the accounts
	 * with their figures (with `accounts: 'known'` only the ones we have), a snapshot each (its
	 * averages only over the latest ten, `read.mode === 'latest'`), and the videos since the day as
	 * finds of their profile (none for the profile alone, which stamps the asked accounts that came
	 * back without a count, as the Instagram save does). Flushes.
	 */
	async saveTiktokProfiles(
		city: City,
		call: TiktokProfilesCall,
		items: TiktokProfileItem[],
		opts: SaveProfilesOptions,
	): Promise<ProfilesSaved> {
		const since = call.read.mode === 'profile' ? null : call.read.since;
		const figures = new Map<SocialAccount, AccountFigures>();
		const rows: PostFields[] = [];
		const byAuthor = _.groupBy(
			items.filter(i => i?.authorMeta?.name && !i.error),
			i => `${i.authorMeta.name}`.toLowerCase(),
		);
		for (const [handle, videos] of Object.entries(byAuthor)) {
			const author = videos[0].authorMeta;
			if (
				opts.accounts === 'known' &&
				!(await this.isKnown(SocialPlatformEnum.TIKTOK, handle, author.id))
			)
				continue;
			const facts = tiktokProfileFacts(videos[0]);
			const account = await this.socialAccountService.ensure(
				SocialPlatformEnum.TIKTOK,
				handle,
				city,
				{
					platformUserId: author.id,
					displayName: author.nickName,
					followers: typeof author.fans === 'number' ? author.fans : undefined,
					...(facts?.exists && { profile: facts }),
					source: AccountSnapshotSourceEnum.PROFILE,
				},
				opts.now,
			);
			if (!account) continue;
			const profile = tiktokProfileFigures(videos, opts.now);
			// Only the latest ten give averages: a day's videos, or one, don't
			if (profile)
				figures.set(
					account,
					call.read.mode === 'latest' ?
						profile
					:	{ ...profile, avgViews: null, avgLikes: null, postsLast30Days: null },
				);
			if (!since) continue;
			for (const video of videos) {
				// Subtitle links expire within days: downloaded now, while mapping
				const row = await this.socialPostService.fromClockworks(video);
				if (row && row.postedAt.toISOString() >= since)
					rows.push({
						...row,
						finds: [accountFind(SocialPlatformEnum.TIKTOK, account.handle)],
					});
			}
		}
		return this.storeProfiles(
			city,
			SocialPlatformEnum.TIKTOK,
			call,
			!since,
			figures,
			rows,
			opts.now,
		);
	}

	/**
	 * Both saves' tail: a snapshot per profile that came back, the posts written (a post two
	 * finds share once), the asked accounts still without a count stamped when the profile alone
	 * was read, the city's finds linked. Flushes.
	 */
	private async storeProfiles(
		city: City,
		platform: ProfilePlatform,
		call: { handles: string[]; purpose: string },
		profileOnly: boolean,
		figures: Map<SocialAccount, AccountFigures>,
		rows: PostFields[],
		now: Date,
	): Promise<ProfilesSaved> {
		for (const [account, profile] of figures)
			this.socialAccountService.recordSnapshot(
				account,
				profile,
				AccountSnapshotSourceEnum.PROFILE,
				now,
			);
		let saved = 0;
		for (const row of mergeFinds(rows)) {
			if (await this.socialPostService.upsert(row, city, now)) saved++;
			if (saved % 200 === 0) await this.em.flush();
		}
		await this.em.flush();
		if (profileOnly) {
			await this.stampAsked(platform, call.handles, now);
			await this.em.flush();
		}
		if (rows.length) await this.socialPostService.finishSave(city.id);
		const asked = _.uniq(call.handles).length;
		this.logger.log(
			`${call.purpose} in ${city.name}: ${figures.size} of ${asked} profiles, ${saved} posts`,
		);
		return {
			asked,
			profiles: figures.size,
			snapshots: figures.size,
			posts: rows.length,
			saved,
		};
	}

	/**
	 * The `account-followers` plan: the brand accounts with a branch open in the city and no
	 * follower count yet, highest lead score first, as many as the budget covers, their profiles
	 * only. An account the run asks for that still has no count afterwards is stamped
	 * `followersAskedAt` by the save and waits `FOLLOWERS_RETRY_DAYS`; a run that failed stamps none.
	 */
	async planFollowers(city: City, budgetUsd: number, now: Date): Promise<FollowerFillPlan> {
		const retryBefore = new Date(now.getTime() - FOLLOWERS_RETRY_DAYS * 24 * 3600 * 1000);
		const rows: AccountToScrape[] = await this.em.getConnection().execute(
			`select a.platform, a.handle from social_accounts a
			join brands b on b.id = a.brand_id
			where a.platform in (?, ?) and a.followers is null and a.handle_lost_at is null
			and (a.followers_asked_at is null or a.followers_asked_at < ?)
			and exists (select 1 from venues v where v.brand_id = a.brand_id and v.city_id = ? and not v.closed)
			order by b.lead_score desc nulls last, a.handle`,
			[SocialPlatformEnum.INSTAGRAM, SocialPlatformEnum.TIKTOK, retryBefore, city.id],
		);
		const { instagram, tiktok } = profileOnlyRuns(rows, budgetUsd, 'followers');
		return { missing: rows.length, instagram, tiktok };
	}

	/** Of the accounts these runs asked for, how many have a follower count now (the fill's `filled`) */
	async followersFilled(runs: ProfileRuns): Promise<number> {
		let filled = 0;
		for (const [platform, call] of [
			[SocialPlatformEnum.INSTAGRAM, runs.instagram],
			[SocialPlatformEnum.TIKTOK, runs.tiktok],
		] as const)
			for (const chunk of _.chunk(_.uniq(call?.handles ?? []), 500))
				filled += await this.em.count(SocialAccount, {
					platform,
					handle: { $in: chunk },
					followers: { $ne: null },
				});
		return filled;
	}

	/**
	 * The `profile-track` plan: every two weeks, the figures of every account whose numbers move a
	 * report or a page: the profile only (followers, following, post count; a snapshot each) of
	 * every brand account with an open branch in the city, highest lead score first, then every
	 * creator account first seen in the city with `TRACK_CREATOR_MIN_FOLLOWERS` followers or
	 * `TRACK_CREATOR_MIN_VIEWS` average views over its stored posts, most followed first, and once
	 * each creator account whose followers are unknown (Instagram's posts carry none). An account
	 * is due `TRACK_PROFILE_EVERY_DAYS` after its last profile snapshot; one asked for that came
	 * back without a count waits `FOLLOWERS_RETRY_DAYS`, as in the follower fill.
	 */
	async planTracked(city: City, budgetUsd: number, now: Date): Promise<ProfileTrackPlan> {
		const dueBefore = new Date(now.getTime() - TRACK_PROFILE_EVERY_DAYS * 24 * 3600 * 1000);
		const retryBefore = new Date(now.getTime() - FOLLOWERS_RETRY_DAYS * 24 * 3600 * 1000);
		const rows: (AccountToScrape & { brand: boolean })[] = await this.em
			.getConnection()
			.execute(
				`with views as (
					select p.account_id, avg(p.views) views from social_posts p
					where p.views > 0 and p.account_id is not null group by p.account_id
				)
				select a.platform, a.handle, a.brand_id is not null brand from social_accounts a
				left join brands b on b.id = a.brand_id
				left join views v on v.account_id = a.id
				where a.platform in (?, ?) and a.handle_lost_at is null
				and (a.followers_asked_at is null or a.followers_asked_at < ? or a.followers is not null)
				and not exists (
					select 1 from social_account_snapshots s
					where s.account_id = a.id and s.source = ? and s.scraped_at >= ?
				)
				and (
					(a.brand_id is not null and exists (
						select 1 from venues ve where ve.brand_id = a.brand_id and ve.city_id = ? and not ve.closed
					))
					or (a.brand_id is null and a.city_id = ? and (
						a.followers >= ? or v.views >= ? or (a.followers is null and a.followers_asked_at is null)
					))
				)
				order by (a.brand_id is null), b.lead_score desc nulls last, a.followers desc nulls last, a.handle`,
				[
					SocialPlatformEnum.INSTAGRAM,
					SocialPlatformEnum.TIKTOK,
					retryBefore,
					AccountSnapshotSourceEnum.PROFILE,
					dueBefore,
					city.id,
					city.id,
					TRACK_CREATOR_MIN_FOLLOWERS,
					TRACK_CREATOR_MIN_VIEWS,
				],
			);
		const { instagram, tiktok } = profileOnlyRuns(rows, budgetUsd, 'tracking');
		return {
			due: rows.length,
			brandAccounts: rows.filter(r => r.brand).length,
			instagram,
			tiktok,
		};
	}

	/**
	 * The `read-mentioned-profiles` plan: the profile only of every Instagram account of the city
	 * that posts tag (caption @-mentions, co-authors, photo tags) or a stored bio names, whose
	 * profile was never read, the most mentioned first (tags on posts the gate skipped count last),
	 * as many as the budget covers at `PROFILE_ONLY_USD`. Each that comes back keeps its bio, links,
	 * business category and followers (`ensure`), which the account matcher reads (`profilePlaces`)
	 * and the address search starts from; one that didn't (gone, private, renamed) is stamped
	 * `followersAskedAt` and waits `FOLLOWERS_RETRY_DAYS`. The accounts exist first
	 * (`AccountMatchingService.addMentionedAccounts`).
	 */
	async planMentionedProfiles(
		city: City,
		budgetUsd: number,
		now: Date,
	): Promise<MentionedProfilesPlan> {
		const retryBefore = new Date(now.getTime() - FOLLOWERS_RETRY_DAYS * 24 * 3600 * 1000);
		const rows: { handle: string }[] = await this.em.getConnection().execute(
			`with mentioned as (
				select rtrim(ltrim(lower(h.handle), '@'), '.') handle,
					count(distinct p.id) filter (where p.skip_reason is null) food, count(distinct p.id) posts
				from social_posts p
				cross join lateral jsonb_array_elements_text(coalesce(p.tagged_handles, '[]'::jsonb)) as h(handle)
				where p.city_id = ? and p.platform = ?
				group by 1
				union all
				select rtrim(lower(m[1]), '.'), count(*), count(*)
				from social_accounts b
				cross join lateral regexp_matches(coalesce(b.bio, ''), ?, 'g') as m
				where b.city_id = ? and b.platform = ?
				group by 1
			)
			select a.handle from mentioned t
			join social_accounts a on a.platform = ? and a.handle = t.handle
			where a.profile_read_at is null and a.handle_lost_at is null
			and (a.followers_asked_at is null or a.followers_asked_at < ?)
			group by a.id, a.handle
			order by sum(t.food) desc, sum(t.posts) desc, a.handle`,
			[
				city.id,
				SocialPlatformEnum.INSTAGRAM,
				// A bio's @handles, as `captionHandles` reads them (a placeholder: the pattern holds a "?")
				'(?:^|[^\\w.@])@([A-Za-z0-9_.]{1,40})',
				city.id,
				SocialPlatformEnum.INSTAGRAM,
				SocialPlatformEnum.INSTAGRAM,
				retryBefore,
			],
		);
		const price = PROFILE_ONLY_USD[SocialPlatformEnum.INSTAGRAM];
		const handles = rows.slice(0, Math.floor(budgetUsd / price)).map(r => r.handle);
		return {
			unread: rows.length,
			call:
				handles.length ?
					{
						handles,
						read: { mode: 'profile' },
						maxCostUsd: handles.length * price,
						purpose: profilesPurpose(
							SocialPlatformEnum.INSTAGRAM,
							'mentioned',
							handles.length,
						),
					}
				:	null,
		};
	}

	/** One profile item as the account it is (made or updated, `SocialAccountService.ensure`) and its figures; null for an item with none, or a stranger's under `accounts: 'known'` */
	private async ensureInstagramProfile(
		item: InstagramProfileItem,
		city: City,
		opts: SaveProfilesOptions,
	): Promise<{ account: SocialAccount; profile: AccountFigures } | null> {
		const profile = instagramProfileFigures(item, opts.now);
		if (!profile) return null;
		if (
			opts.accounts === 'known' &&
			!(await this.isKnown(SocialPlatformEnum.INSTAGRAM, `${item.username}`, item.id))
		)
			return null;
		const facts = instagramProfileFacts(item);
		const account = await this.socialAccountService.ensure(
			SocialPlatformEnum.INSTAGRAM,
			`${item.username}`,
			city,
			{
				platformUserId: item.id,
				displayName: item.fullName,
				followers: profile.followers,
				...(facts?.exists && { profile: facts }),
				source: AccountSnapshotSourceEnum.PROFILE,
			},
			opts.now,
		);
		return account ? { account, profile } : null;
	}

	/** Whether we have the account a profile is: by its handle, or by the user id it carries */
	private async isKnown(
		platform: ProfilePlatform,
		handle: string,
		platformUserId: string | undefined,
	): Promise<boolean> {
		const normalized = normalizeHandle(platform, handle);
		const id = platformUserId != null ? `${platformUserId}`.trim() : '';
		const by = [
			...(normalized ? [{ handle: normalized }] : []),
			...(id ? [{ platformUserId: id }] : []),
		];
		if (!by.length) return false;
		return !!(await this.em.findOne(SocialAccount, { platform, $or: by }));
	}

	/** A profile read alone: every asked account still without a count is stamped `followersAskedAt` */
	private async stampAsked(
		platform: ProfilePlatform,
		handles: string[],
		now: Date,
	): Promise<void> {
		for (const chunk of _.chunk(_.uniq(handles), 500)) {
			const accounts = await this.em.find(SocialAccount, {
				platform,
				handle: { $in: chunk },
			});
			for (const account of accounts)
				if (account.followers == null) account.followersAskedAt = now;
		}
	}
}
