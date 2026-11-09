import { TIKTOK_PROFILE_MIN_CAP_USD } from 'src/modules/apify/actors/tiktok-profile.actor.js';

/** The atom's workflow name: every TikTok profile run on `/admin/workflows` */
export const TIKTOK_PROFILES_WORKFLOW = 'tiktok-profiles.run';

/** Every run's cap is floored at the actor's lowest (a run of one or two profiles is refused under it) */
export const TIKTOK_PROFILES_MIN_CAP_USD = TIKTOK_PROFILE_MIN_CAP_USD;
