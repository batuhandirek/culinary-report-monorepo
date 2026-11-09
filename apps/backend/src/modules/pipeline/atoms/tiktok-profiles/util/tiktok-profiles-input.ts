import _ from 'lodash';

import type { TiktokProfileInput } from 'src/modules/apify/actors/tiktok-profile.actor.js';
import { ACCOUNT_RECENT_POSTS } from 'src/modules/social/util/accounts.js';

/**
 * What a caller asks the TikTok profile actor for, in one of three modes. The actor returns one
 * item a video, the profile repeated on each, and pays per video, so the mode decides what is
 * paid for and what the snapshot can say.
 */
export type TiktokProfilesRead =
	/** The figures alone: the one latest video, no subtitles, no post stored; an asked account that came back without a count is stamped */
	| { mode: 'profile' }
	/** The latest ten whatever their date, since the snapshot's averages are over ten; the videos since `since` (ISO) kept */
	| { mode: 'latest'; since: string }
	/** Only the videos since `since` (ISO) are paid for, so a quiet account costs nothing; the snapshot holds no averages */
	| { mode: 'since'; since: string };

/** One TikTok profile run as a plan hands it to the atom */
export interface TiktokProfilesCall {
	handles: string[];
	read: TiktokProfilesRead;
	/** The run's cap, floored by the atom at the actor's lowest */
	maxCostUsd: number;
	/** The `ApifyRun`'s purpose: "tiktok profiles creators: 120" */
	purpose: string;
}

/** The handles a call asks for, each once, in the order given */
export const handlesOf = (call: Pick<TiktokProfilesCall, 'handles'>): string[] =>
	_.uniq(call.handles);

/** The actor's input for a call: how many videos, from when, with or without subtitles */
export const tiktokProfilesInput = (call: TiktokProfilesCall): TiktokProfileInput => {
	const profileOnly = call.read.mode === 'profile';
	return {
		profiles: handlesOf(call),
		resultsPerPage: profileOnly ? 1 : ACCOUNT_RECENT_POSTS,
		profileSorting: 'latest',
		excludePinnedPosts: true,
		// Only the videos from that day on are paid for
		...(call.read.mode === 'since' && { oldestPostDateUnified: call.read.since.slice(0, 10) }),
		// Subtitle links expire within days: the save downloads them while mapping
		...(!profileOnly && { downloadSubtitlesOptions: 'DOWNLOAD_SUBTITLES' as const }),
		shouldDownloadVideos: false,
		shouldDownloadCovers: false,
		shouldDownloadSlideshowImages: false,
		shouldDownloadAvatars: false,
	};
};
