import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';

import { SocialAccount } from '../entities/social-account.entity.js';
import { AccountSnapshotSourceEnum } from '../entities/social-account-snapshot.entity.js';
import { SocialPlatformEnum } from '../entities/social-post.entity.js';
import {
	ACCOUNT_RECENT_POSTS,
	type AccountFigures,
	instagramProfileFigures,
	type ProfilePlatform,
	tiktokProfileFigures,
} from '../util/accounts.js';
import { accountFind } from '../util/post-sources.js';

import { SocialAccountService } from './social-account.service.js';
import { mergeFinds, type PostFields, SocialPostService } from './social-post.service.js';

// One item per profile with its twelve latest posts, ~$2.60 / 1k profiles. Instagram sometimes
// refuses a profile's timeline: the item then comes without posts (logged "emitting the profile
// without posts"), its followers still there
export const INSTAGRAM_PROFILE_ACTOR = 'apify/instagram-profile-scraper';
// One item per video, ~$0.003 a video on Free (40 for $0.12 on 2026-10-19); the same item shape as
// the hashtag actor's, subtitles included; `oldestPostDateUnified` stops paying at that day
export const TIKTOK_PROFILE_ACTOR = 'clockworks/tiktok-profile-scraper';

// What one profile alone costs at most (the follower fill, the handle lookup): an Instagram
// profile ~$0.0026, a TikTok profile its one latest video at ~$0.003; a missing profile costs less
export const PROFILE_ONLY_USD: Record<ProfilePlatform, number> = {
	[SocialPlatformEnum.INSTAGRAM]: 0.003,
	[SocialPlatformEnum.TIKTOK]: 0.004,
};

// The smallest cap a profile run gets: a run of one or two profiles is refused under it
const PROFILE_MIN_CAP_USD = 0.05;

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

/** A profile to scrape: an account we know, or a handle a city watches that never posted for us yet. */
export interface AccountToScrape {
	platform: ProfilePlatform;
	handle: string;
}

export interface AccountScrapeResult {
	/** Profiles asked for */
	accounts: number;
	/** Profiles that came back */
	profiles: number;
	/** Profiles that got a snapshot */
	snapshots: number;
	/** Posts the profiles showed since `since` */
	found: number;
	saved: number;
}

export interface ProfileTrackResult {
	/** Brand accounts and creator accounts over the thresholds whose last profile is due */
	due: number;
	/** Of them, brand accounts */
	brandAccounts: number;
	/** Asked for in this run: as many as the budget covers, brand accounts first */
	asked: number;
	/** Profiles that came back (each a snapshot with followers, following and post count) */
	profiles: number;
}

export interface FollowerFillResult {
	/** Brand accounts of the city with no follower count, not asked for in the last `FOLLOWERS_RETRY_DAYS` */
	missing: number;
	/** Asked for in this run: as many as the budget covers, highest lead score first */
	asked: number;
	/** That came back with a follower count */
	filled: number;
	/** Profiles that came back */
	profiles: number;
}

/**
 * Scrapes watched profiles (`AccountWatchService` in the pipeline decides which): each profile's
 * latest posts are stored as posts found on that profile (`PostSource` kind `*_account`, linked to
 * the city's account source when it has one), the account takes the profile's display name and
 * followers, and every profile that came back gets a `SocialAccountSnapshot`. Instagram
 * profiles go in one run, TikTok profiles in another, the budget split by paid items.
 */
@Injectable()
export class AccountScrapeService {
	private readonly logger = new Logger(AccountScrapeService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly apifyService: ApifyService,
		private readonly socialAccountService: SocialAccountService,
		private readonly socialPostService: SocialPostService,
	) {}

	/**
	 * Posts older than `since` are left out (pinned ones too). With `latestTen` (the monthly
	 * run) TikTok profiles return their latest ten videos, whatever their date, since the
	 * snapshot's averages are over the latest ten; without it (the weekly run) only videos since
	 * `since` are paid for, so a quiet account costs nothing and a TikTok snapshot holds no
	 * averages (Instagram's item always has its latest posts). A profile that returns nothing
	 * gets no snapshot (unknown, not zero). Both runs go side by side; one failing keeps the
	 * other's posts, then the step fails with its error. With `profileOnly` (the follower fill)
	 * a TikTok profile is its one latest video, whatever its date, and no post is stored, so the
	 * profiles' figures are all a run gives (and no post waits for a paid count read). Flushes.
	 */
	async scrape(
		city: City,
		targets: AccountToScrape[],
		opts: {
			since: string;
			budgetUsd: number;
			latestTen?: boolean;
			profileOnly?: boolean;
			/**
			 * The paid TikTok items a profile is planned at, to split the budget between the two
			 * runs (the latest ten without): a date-filtered run of many quiet accounts pays for few
			 */
			tiktokItemsPerProfile?: number;
			label: string;
			now?: Date;
		},
	): Promise<AccountScrapeResult> {
		const now = opts.now ?? new Date();
		const unique = _.uniqBy(targets, t => `${t.platform}:${t.handle}`);
		const instagram = unique.filter(t => t.platform === SocialPlatformEnum.INSTAGRAM).map(t => t.handle);
		const tiktok = unique.filter(t => t.platform === SocialPlatformEnum.TIKTOK).map(t => t.handle);
		const result: AccountScrapeResult = { accounts: unique.length, profiles: 0, snapshots: 0, found: 0, saved: 0 };
		if (!unique.length) return result;
		// A TikTok profile is up to ten paid items (one alone), an Instagram one is one
		const perTiktok = opts.profileOnly ? 1 : ACCOUNT_RECENT_POSTS;
		const weight = instagram.length + tiktok.length * (opts.tiktokItemsPerProfile ?? perTiktok);
		const budget = (units: number) => {
			const share = (opts.budgetUsd * units) / weight;
			return opts.profileOnly ? Math.max(share, PROFILE_MIN_CAP_USD) : share;
		};

		const [instagramItems, tiktokItems] = await Promise.allSettled([
			instagram.length ?
				this.apifyService.runActor<any>(
					INSTAGRAM_PROFILE_ACTOR,
					{ usernames: instagram },
					{ maxCostUsd: budget(instagram.length), purpose: `instagram profiles ${opts.label}: ${instagram.length}` },
				)
			:	Promise.resolve([]),
			tiktok.length ?
				this.apifyService.runActor<any>(
					TIKTOK_PROFILE_ACTOR,
					{
						profiles: tiktok,
						resultsPerPage: perTiktok,
						profileSorting: 'latest',
						excludePinnedPosts: true,
						...(!opts.latestTen && !opts.profileOnly && { oldestPostDateUnified: opts.since.slice(0, 10) }),
						...(!opts.profileOnly && { downloadSubtitlesOptions: 'DOWNLOAD_SUBTITLES' }),
						shouldDownloadVideos: false,
						shouldDownloadCovers: false,
						shouldDownloadSlideshowImages: false,
						shouldDownloadAvatars: false,
					},
					{
						maxCostUsd: budget(tiktok.length * (opts.tiktokItemsPerProfile ?? perTiktok)),
						purpose: `tiktok profiles ${opts.label}: ${tiktok.length}`,
					},
				)
			:	Promise.resolve([]),
		]);

		const figures = new Map<SocialAccount, AccountFigures>();
		const rows: PostFields[] = [];
		const keep = (row: PostFields | null): row is PostFields =>
			!opts.profileOnly && !!row && row.postedAt.toISOString() >= opts.since;

		if (instagramItems.status === 'fulfilled') {
			for (const item of instagramItems.value) {
				const profile = instagramProfileFigures(item, now);
				if (!profile) continue;
				const account = await this.socialAccountService.ensure(
					SocialPlatformEnum.INSTAGRAM,
					`${item.username}`,
					city,
					{
						platformUserId: item.id,
						displayName: item.fullName,
						followers: profile.followers,
						source: AccountSnapshotSourceEnum.PROFILE,
					},
					now,
				);
				if (!account) continue;
				result.profiles++;
				figures.set(account, profile);
				for (const post of item.latestPosts ?? []) {
					const row = this.socialPostService.fromInstagramProfilePost(post, item);
					if (keep(row)) rows.push({ ...row, finds: [accountFind(SocialPlatformEnum.INSTAGRAM, account.handle)] });
				}
			}
		}

		if (tiktokItems.status === 'fulfilled') {
			const byAuthor = _.groupBy(
				tiktokItems.value.filter(i => i?.authorMeta?.name && !i.error),
				i => `${i.authorMeta.name}`.toLowerCase(),
			);
			for (const [handle, videos] of Object.entries(byAuthor)) {
				const author = videos[0].authorMeta;
				const account = await this.socialAccountService.ensure(
					SocialPlatformEnum.TIKTOK,
					handle,
					city,
					{
						platformUserId: author.id,
						displayName: author.nickName,
						followers: typeof author.fans === 'number' ? author.fans : undefined,
						source: AccountSnapshotSourceEnum.PROFILE,
					},
					now,
				);
				if (!account) continue;
				result.profiles++;
				const profile = tiktokProfileFigures(videos, now);
				// The week's videos only, or one: no averages over the latest ten
				if (profile)
					figures.set(
						account,
						opts.latestTen ? profile : { ...profile, avgViews: null, avgLikes: null, postsLast30Days: null },
					);
				if (opts.profileOnly) continue;
				for (const video of videos) {
					// Subtitle links expire within days: downloaded now, while mapping
					const row = await this.socialPostService.fromClockworks(video);
					if (keep(row)) rows.push({ ...row, finds: [accountFind(SocialPlatformEnum.TIKTOK, account.handle)] });
				}
			}
		}

		for (const [account, profile] of figures) {
			this.socialAccountService.recordSnapshot(account, profile, AccountSnapshotSourceEnum.PROFILE, now);
			result.snapshots++;
		}

		result.found = rows.length;
		for (const row of mergeFinds(rows)) {
			if (await this.socialPostService.upsert(row, city, now)) result.saved++;
			if (result.saved % 200 === 0) await this.em.flush();
		}
		await this.em.flush();
		if (rows.length) await this.socialPostService.finishSave(city.id);
		this.logger.log(
			`Accounts ${opts.label} in ${city.name}: ${result.profiles} of ${result.accounts} profiles, ${result.saved} posts`,
		);

		const failed = [instagramItems, tiktokItems].find(r => r.status === 'rejected');
		if (failed) throw (failed as PromiseRejectedResult).reason;
		return result;
	}

	/**
	 * The `FILL_ACCOUNT_FOLLOWERS` step: the brand accounts with a branch open in the city and no
	 * follower count yet, their profiles only (`profileOnly`), highest lead score first, as many
	 * as the budget covers. An account the run asked for that still has no count (private,
	 * renamed, gone) is stamped `followersAskedAt` and waits `FOLLOWERS_RETRY_DAYS`; a run that
	 * failed stamps none. Flushes.
	 */
	async fillFollowers(city: City, budgetUsd: number, now = new Date()): Promise<FollowerFillResult> {
		const retryBefore = new Date(now.getTime() - FOLLOWERS_RETRY_DAYS * 24 * 3600 * 1000);
		const rows: { id: string; platform: ProfilePlatform; handle: string }[] = await this.em.getConnection().execute(
			`select a.id, a.platform, a.handle from social_accounts a
			join brands b on b.id = a.brand_id
			where a.platform in (?, ?) and a.followers is null and a.handle_lost_at is null
			and (a.followers_asked_at is null or a.followers_asked_at < ?)
			and exists (select 1 from venues v where v.brand_id = a.brand_id and v.city_id = ? and not v.closed)
			order by b.lead_score desc nulls last, a.handle`,
			[SocialPlatformEnum.INSTAGRAM, SocialPlatformEnum.TIKTOK, retryBefore, city.id],
		);
		const { asked, profiles, accounts } = await this.profilesOnly(city, rows, budgetUsd, 'followers', now);
		return {
			missing: rows.length,
			asked,
			filled: accounts.filter(a => a.followers != null).length,
			profiles,
		};
	}

	/**
	 * Every two weeks, the figures of every account whose numbers move a report or a page: the
	 * profile only (followers, following, post count; a snapshot each) of every brand account with
	 * an open branch in the city, highest lead score first, then every creator account first seen
	 * in the city with `TRACK_CREATOR_MIN_FOLLOWERS` followers or `TRACK_CREATOR_MIN_VIEWS` average
	 * views over its stored posts, most followed first, and once each creator account whose
	 * followers are unknown (Instagram's posts carry none). An account is due
	 * `TRACK_PROFILE_EVERY_DAYS` after its last profile snapshot; one asked for that came back
	 * without a count waits `FOLLOWERS_RETRY_DAYS`, as in the follower fill.
	 */
	async trackProfiles(city: City, budgetUsd: number, now = new Date()): Promise<ProfileTrackResult> {
		const dueBefore = new Date(now.getTime() - TRACK_PROFILE_EVERY_DAYS * 24 * 3600 * 1000);
		const retryBefore = new Date(now.getTime() - FOLLOWERS_RETRY_DAYS * 24 * 3600 * 1000);
		const rows: { id: string; platform: ProfilePlatform; handle: string; brand: boolean }[] = await this.em
			.getConnection()
			.execute(
				`with views as (
					select p.account_id, avg(p.views) views from social_posts p
					where p.views > 0 and p.account_id is not null group by p.account_id
				)
				select a.id, a.platform, a.handle, a.brand_id is not null brand from social_accounts a
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
		const { asked, profiles } = await this.profilesOnly(city, rows, budgetUsd, 'tracking', now);
		return { due: rows.length, brandAccounts: rows.filter(r => r.brand).length, asked, profiles };
	}

	/**
	 * The profiles of `rows`, in their order, as many as the budget covers: profile only, no post
	 * stored. An account asked for that came back without a follower count is stamped
	 * `followersAskedAt`.
	 */
	private async profilesOnly(
		city: City,
		rows: { id: string; platform: ProfilePlatform; handle: string }[],
		budgetUsd: number,
		label: string,
		now: Date,
	): Promise<{ asked: number; profiles: number; accounts: SocialAccount[] }> {
		let left = budgetUsd;
		const picked = rows.filter(row => {
			if (PROFILE_ONLY_USD[row.platform] > left) return false;
			left -= PROFILE_ONLY_USD[row.platform];
			return true;
		});
		if (!picked.length) return { asked: 0, profiles: 0, accounts: [] };

		const scraped = await this.scrape(city, picked, {
			since: now.toISOString(),
			budgetUsd: budgetUsd - left,
			profileOnly: true,
			label,
			now,
		});
		const accounts = await this.em.find(SocialAccount, { id: { $in: picked.map(r => r.id) } });
		for (const account of accounts) if (account.followers == null) account.followersAskedAt = now;
		await this.em.flush();
		return { asked: picked.length, profiles: scraped.profiles, accounts };
	}
}
