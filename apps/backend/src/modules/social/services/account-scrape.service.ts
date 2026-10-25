import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';

import type { SocialAccount } from '../entities/social-account.entity.js';
import { SocialAccountSnapshot } from '../entities/social-account-snapshot.entity.js';
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
	/** Month snapshots written (a snapshot run only) */
	snapshots: number;
	/** Posts the profiles showed since `since` */
	found: number;
	saved: number;
}

/**
 * Scrapes watched profiles (`AccountWatchService` in the pipeline decides which): each profile's
 * latest posts are stored as posts found on that profile (`PostSource` kind `*_account`, linked to
 * the city's account source when it has one), the account takes the profile's display name and
 * followers, and a snapshot run also writes the month's `SocialAccountSnapshot`. Instagram
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
	 * Posts older than `since` are left out (pinned ones too). With `snapshotMonth` (the monthly
	 * run) TikTok profiles return their latest ten videos, whatever their date, since the
	 * snapshot's averages are over the latest ten; without it (the weekly run) only videos since
	 * `since` are paid for, so a quiet account costs nothing. A profile that returns nothing gets
	 * no snapshot (unknown, not zero). Both runs go side by side; one failing keeps the other's
	 * posts, then the step fails with its error. Flushes.
	 */
	async scrape(
		city: City,
		targets: AccountToScrape[],
		opts: { since: string; budgetUsd: number; snapshotMonth?: string; label: string; now?: Date },
	): Promise<AccountScrapeResult> {
		const now = opts.now ?? new Date();
		const unique = _.uniqBy(targets, t => `${t.platform}:${t.handle}`);
		const instagram = unique.filter(t => t.platform === SocialPlatformEnum.INSTAGRAM).map(t => t.handle);
		const tiktok = unique.filter(t => t.platform === SocialPlatformEnum.TIKTOK).map(t => t.handle);
		const result: AccountScrapeResult = { accounts: unique.length, profiles: 0, snapshots: 0, found: 0, saved: 0 };
		if (!unique.length) return result;
		// A TikTok profile is up to ten paid items, an Instagram one is one
		const weight = instagram.length + tiktok.length * ACCOUNT_RECENT_POSTS;
		const budget = (units: number) => (opts.budgetUsd * units) / weight;

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
						resultsPerPage: ACCOUNT_RECENT_POSTS,
						profileSorting: 'latest',
						excludePinnedPosts: true,
						...(!opts.snapshotMonth && { oldestPostDateUnified: opts.since.slice(0, 10) }),
						downloadSubtitlesOptions: 'DOWNLOAD_SUBTITLES',
						shouldDownloadVideos: false,
						shouldDownloadCovers: false,
						shouldDownloadSlideshowImages: false,
						shouldDownloadAvatars: false,
					},
					{
						maxCostUsd: budget(tiktok.length * ACCOUNT_RECENT_POSTS),
						purpose: `tiktok profiles ${opts.label}: ${tiktok.length}`,
					},
				)
			:	Promise.resolve([]),
		]);

		const figures = new Map<SocialAccount, AccountFigures>();
		const rows: PostFields[] = [];
		const keep = (row: PostFields | null): row is PostFields => !!row && row.postedAt.toISOString() >= opts.since;

		if (instagramItems.status === 'fulfilled') {
			for (const item of instagramItems.value) {
				const profile = instagramProfileFigures(item, now);
				if (!profile) continue;
				const account = await this.socialAccountService.ensure(
					SocialPlatformEnum.INSTAGRAM,
					`${item.username}`,
					city,
					{ displayName: item.fullName, followers: profile.followers ?? undefined },
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
					{ displayName: author.nickName, followers: typeof author.fans === 'number' ? author.fans : undefined },
					now,
				);
				if (!account) continue;
				result.profiles++;
				const profile = tiktokProfileFigures(videos, now);
				if (profile) figures.set(account, profile);
				for (const video of videos) {
					// Subtitle links expire within days: downloaded now, while mapping
					const row = await this.socialPostService.fromClockworks(video);
					if (keep(row)) rows.push({ ...row, finds: [accountFind(SocialPlatformEnum.TIKTOK, account.handle)] });
				}
			}
		}

		if (opts.snapshotMonth) {
			for (const [account, profile] of figures) {
				const snapshot =
					(account.id && (await this.em.findOne(SocialAccountSnapshot, { account, month: opts.snapshotMonth }))) ||
					this.em.create(SocialAccountSnapshot, { account, month: opts.snapshotMonth, scrapedAt: now });
				Object.assign(snapshot, profile, { scrapedAt: now });
				result.snapshots++;
			}
		}

		result.found = rows.length;
		for (const row of mergeFinds(rows)) {
			if (await this.socialPostService.upsert(row, city)) result.saved++;
			if (result.saved % 200 === 0) await this.em.flush();
		}
		await this.em.flush();
		await this.socialPostService.finishSave(city.id);
		this.logger.log(
			`Accounts ${opts.label} in ${city.name}: ${result.profiles} of ${result.accounts} profiles, ${result.saved} posts`,
		);

		const failed = [instagramItems, tiktokItems].find(r => r.status === 'rejected');
		if (failed) throw (failed as PromiseRejectedResult).reason;
		return result;
	}
}
