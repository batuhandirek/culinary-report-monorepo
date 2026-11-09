import _ from 'lodash';

import type { InstagramProfileInput } from 'src/modules/apify/actors/instagram-profile.actor.js';

/**
 * What a caller asks the Instagram profile actor for. Its item always carries the profile's
 * twelve latest posts, so the read only says what the save keeps: the profile alone (the follower
 * fill, the lookups: no post stored, an asked account that came back without a count stamped), or
 * the posts since a day as well.
 */
export type InstagramProfilesRead = { mode: 'profile' } | { mode: 'posts'; since: string };

/** One Instagram profile run as a plan hands it to the atom */
export interface InstagramProfilesCall {
	handles: string[];
	read: InstagramProfilesRead;
	/** The run's cap, floored by the atom at the actor's lowest */
	maxCostUsd: number;
	/** The `ApifyRun`'s purpose: "instagram profiles creators: 120" */
	purpose: string;
}

/** The handles a call asks for, each once, in the order given */
export const handlesOf = (call: Pick<InstagramProfilesCall, 'handles'>): string[] =>
	_.uniq(call.handles);

/** The actor's input: the handles alone */
export const instagramProfilesInput = (call: InstagramProfilesCall): InstagramProfileInput => ({
	usernames: handlesOf(call),
});
