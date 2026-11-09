import { GOOGLE_PLACES_MIN_CAP_USD } from 'src/modules/apify/actors/google-places.actor.js';

/** The atom's workflow name: every Google Maps places run on `/admin/workflows` */
export const PLACES_WORKFLOW = 'places.run';

/** Every run's cap is floored at the actor's lowest (Apify refuses a start under it) */
export const PLACES_MIN_CAP_USD = GOOGLE_PLACES_MIN_CAP_USD;

/**
 * One map search's run (2 GB was enough for a search of twenty, 2026-11-05): the Free plan's
 * 16 GB holds the `apify` queue's four side by side with room for the other actors
 */
export const MAP_SEARCH_MEMORY_MB = 2048;
