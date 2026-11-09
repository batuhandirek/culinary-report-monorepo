import type { OperationRun } from '../../shared/util/operations.js';
import { BRAND_BRANCH_SEARCH_QUEUE } from '../queues/brand-branch-search.queue.js';

/** Every chain with a branch in the city, called by `scrape-venues.month` after the quarter's list */
export const BRAND_BRANCH_SEARCH_MONTH: OperationRun = {
	operation: 'brand-branch-search',
	cadence: 'month',
	queue: BRAND_BRANCH_SEARCH_QUEUE,
};

/** One brand by hand ("Find branches" on the brand page): the workflow's name */
export const BRAND_BRANCH_SEARCH_BRAND = 'brand-branch-search.brand';

/**
 * Places kept per brand name: Berlin's Burgermeister came back as 15 branches and 25
 * look-alikes, Brammibal's as 9 and 3 (2026-10-18)
 */
export const BRAND_SEARCH_RESULTS = 40;

/** What one brand's search may spend when an admin runs it (~$0.20 spent) */
export const BRAND_SEARCH_BUDGET_USD = 1;
