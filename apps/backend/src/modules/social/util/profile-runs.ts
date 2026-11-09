import _ from 'lodash';

import { INSTAGRAM_PROFILE_USD } from 'src/modules/apify/actors/instagram-profile.actor.js';
import { TIKTOK_PROFILE_USD } from 'src/modules/apify/actors/tiktok-profile.actor.js';
import type { InstagramProfilesCall } from 'src/modules/pipeline/atoms/instagram-profiles/util/instagram-profiles-input.js';
import type { TiktokProfilesCall } from 'src/modules/pipeline/atoms/tiktok-profiles/util/tiktok-profiles-input.js';

import { SocialPlatformEnum } from '../entities/social-post.entity.js';

import { ACCOUNT_RECENT_POSTS, type ProfilePlatform } from './accounts.js';

/** A profile to scrape: an account we know, or a handle a city watches that never posted for us yet. */
export interface AccountToScrape {
	platform: ProfilePlatform;
	handle: string;
}

/**
 * What one profile alone costs at most (the follower fill, the handle lookup, the tracking): an
 * Instagram profile ~$0.0026, a TikTok profile its one latest video at ~$0.003 and the run's start
 */
export const PROFILE_ONLY_USD: Record<ProfilePlatform, number> = {
	[SocialPlatformEnum.INSTAGRAM]: INSTAGRAM_PROFILE_USD,
	[SocialPlatformEnum.TIKTOK]: TIKTOK_PROFILE_USD,
};

/**
 * How a profile run's accounts are saved: `all`, every profile that came back is an account (made
 * or updated); `known`, only accounts we have, a stranger with the same handle gets none (the
 * twin lookup decides on the stored items whether a profile is the brand's)
 */
export type ProfileAccountsRule = 'all' | 'known';

/** What a profile run's save came to; the sum over several runs through `profilesTotal` */
export interface ProfilesSaved {
	/** Handles asked for */
	asked: number;
	/** Profiles that came back and were kept */
	profiles: number;
	/** Snapshots written */
	snapshots: number;
	/** Posts the profiles showed since the day (none for the profile alone) */
	posts: number;
	/** Posts written */
	saved: number;
}

export const profilesTotal = (results: (ProfilesSaved | null | undefined)[]): ProfilesSaved =>
	results.reduce<ProfilesSaved>(
		(sum, r) =>
			r ?
				{
					asked: sum.asked + r.asked,
					profiles: sum.profiles + r.profiles,
					snapshots: sum.snapshots + r.snapshots,
					posts: sum.posts + r.posts,
					saved: sum.saved + r.saved,
				}
			:	sum,
		{ asked: 0, profiles: 0, snapshots: 0, posts: 0, saved: 0 },
	);

/** A profile scrape's runs, one a platform where it has handles: what the operation calls, Instagram first, then TikTok */
export interface ProfileRuns {
	instagram: InstagramProfilesCall | null;
	tiktok: TiktokProfilesCall | null;
}

export interface ProfileRunsOptions {
	/** For both platforms together */
	budgetUsd: number;
	/** Posts older than this (ISO) are left out */
	since: string;
	/**
	 * TikTok: the latest ten videos whatever their date (the monthly run: the snapshot's averages are
	 * over ten); without, only the videos since `since` are paid for and a TikTok snapshot carries no
	 * averages (Instagram's item always has its latest posts)
	 */
	latestTen?: boolean;
	/** For the runs' purposes: "creators", "own, last two weeks", "2026-10" */
	label: string;
	/**
	 * The paid TikTok items a profile is planned at, to split the budget between the two runs:
	 * the latest ten without; a date-filtered run of many quiet accounts pays for few, so a week's
	 * run plans fewer
	 */
	tiktokItemsPerProfile?: number;
}

/** A run's purpose, as its `ApifyRun` row shows it: "tiktok profiles creators: 120" */
export const profilesPurpose = (platform: ProfilePlatform, label: string, count: number) =>
	`${platform} profiles ${label}: ${count}`;

const handlesOn = (targets: AccountToScrape[], platform: ProfilePlatform): string[] =>
	_.uniq(targets.filter(t => t.platform === platform).map(t => t.handle));

/**
 * The runs a profile scrape is: Instagram's and TikTok's (none for a platform without handles),
 * the budget split by paid items (an Instagram profile is one item, a TikTok profile
 * `tiktokItemsPerProfile` videos), each handle once.
 */
export const profileRuns = (targets: AccountToScrape[], opts: ProfileRunsOptions): ProfileRuns => {
	const instagram = handlesOn(targets, SocialPlatformEnum.INSTAGRAM);
	const tiktok = handlesOn(targets, SocialPlatformEnum.TIKTOK);
	const perTiktok = opts.tiktokItemsPerProfile ?? ACCOUNT_RECENT_POSTS;
	const weight = instagram.length + tiktok.length * perTiktok;
	const share = (items: number) => (opts.budgetUsd * items) / weight;
	return {
		instagram:
			instagram.length ?
				{
					handles: instagram,
					read: { mode: 'posts', since: opts.since },
					maxCostUsd: share(instagram.length),
					purpose: profilesPurpose(
						SocialPlatformEnum.INSTAGRAM,
						opts.label,
						instagram.length,
					),
				}
			:	null,
		tiktok:
			tiktok.length ?
				{
					handles: tiktok,
					read:
						opts.latestTen ?
							{ mode: 'latest', since: opts.since }
						:	{ mode: 'since', since: opts.since },
					maxCostUsd: share(tiktok.length * perTiktok),
					purpose: profilesPurpose(SocialPlatformEnum.TIKTOK, opts.label, tiktok.length),
				}
			:	null,
	};
};

/**
 * The profiles alone of `rows`, in their order, as many as the budget covers at `PROFILE_ONLY_USD`
 * each: the runs (one a platform, each capped at what it is planned to spend) and the rows picked.
 */
export const profileOnlyRuns = <Row extends AccountToScrape>(
	rows: Row[],
	budgetUsd: number,
	label: string,
): ProfileRuns & { picked: Row[] } => {
	let left = budgetUsd;
	const picked = rows.filter(row => {
		if (PROFILE_ONLY_USD[row.platform] > left) return false;
		left -= PROFILE_ONLY_USD[row.platform];
		return true;
	});
	const instagram = handlesOn(picked, SocialPlatformEnum.INSTAGRAM);
	const tiktok = handlesOn(picked, SocialPlatformEnum.TIKTOK);
	return {
		picked,
		instagram:
			instagram.length ?
				{
					handles: instagram,
					read: { mode: 'profile' },
					maxCostUsd: instagram.length * PROFILE_ONLY_USD[SocialPlatformEnum.INSTAGRAM],
					purpose: profilesPurpose(SocialPlatformEnum.INSTAGRAM, label, instagram.length),
				}
			:	null,
		tiktok:
			tiktok.length ?
				{
					handles: tiktok,
					read: { mode: 'profile' },
					maxCostUsd: tiktok.length * PROFILE_ONLY_USD[SocialPlatformEnum.TIKTOK],
					purpose: profilesPurpose(SocialPlatformEnum.TIKTOK, label, tiktok.length),
				}
			:	null,
	};
};
