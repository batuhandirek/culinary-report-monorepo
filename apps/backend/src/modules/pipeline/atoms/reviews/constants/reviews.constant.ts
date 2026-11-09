import { GOOGLE_REVIEWS_MIN_CAP_USD } from 'src/modules/apify/actors/google-maps-reviews.actor.js';

/** The atom's workflow name: every Google review fetch on `/admin/workflows` */
export const REVIEWS_WORKFLOW = 'reviews.run';

/** Every run's cap is floored at the actor's lowest (Apify may refuse a start under it) */
export const REVIEWS_MIN_CAP_USD = GOOGLE_REVIEWS_MIN_CAP_USD;

/** A run that spent this share of its cap may have been cut by it: its last place's older reviews missing */
export const REVIEWS_CAP_REACHED_SHARE = 0.9;
