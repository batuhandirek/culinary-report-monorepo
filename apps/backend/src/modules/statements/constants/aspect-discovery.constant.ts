import type { ClusterFloors } from '../util/cluster.js';

/**
 * Aspect discovery (`AspectDiscoveryService`): what a group of a city's loose claims (no aspect,
 * or filed at a root) needs before the job names it and may create an aspect from it. Looser
 * than the 0.82 first tried (at 256 dimensions it left 5,014 of October's 6,000 claims alone),
 * stricter on size, since nobody reviews what it creates: on dev Berlin (2026-11-03) 12,000
 * claims gave 74 groups at these floors.
 */
export const DISCOVERY_FLOORS: ClusterFloors = {
	threshold: 0.74,
	minClaims: 10,
	minSources: 6,
	minBrands: 3,
};

/** Claims of fewer words ("pizza", "chicken") say nothing about a place: left out of the groups */
export const DISCOVERY_MIN_WORDS = 3;

/** Loose claims a city's run groups at most, in a fixed pseudo-random order (`md5(id)`): ~10 s a pass */
export const DISCOVERY_MAX_CLAIMS = 12_000;

/** Groups named by the suggestion agent (one mini call each), the largest first: the big ones are verdicts and root-level claims, the gaps are in the tail */
export const DISCOVERY_MAX_NAMED = 100;

/** Loose claims a new aspect takes for agent B to read again, the closest to its group first */
export const DISCOVERY_MAX_REFILE = 3_000;

/**
 * Mondays 03:30 UTC: after Sunday's listening scrape (03:00) and the nightly backlogs (22:00) that
 * read and embed its claims, and early in OpenAI's day, so agent B's re-read runs on a fresh allowance
 */
export const ASPECT_DISCOVERY_CRON = '30 3 * * 1';

/** Claims agent B reads again per call of `StatementPartsService.read` */
export const DISCOVERY_READ_CHUNK = 500;
