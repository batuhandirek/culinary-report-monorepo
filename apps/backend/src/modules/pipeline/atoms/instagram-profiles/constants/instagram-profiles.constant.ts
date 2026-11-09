import { INSTAGRAM_PROFILE_MIN_CAP_USD } from 'src/modules/apify/actors/instagram-profile.actor.js';

/** The atom's workflow name: every Instagram profile run on `/admin/workflows` */
export const INSTAGRAM_PROFILES_WORKFLOW = 'instagram-profiles.run';

/** Every run's cap is floored at the actor's lowest (a run of one or two profiles is refused under it) */
export const INSTAGRAM_PROFILES_MIN_CAP_USD = INSTAGRAM_PROFILE_MIN_CAP_USD;
