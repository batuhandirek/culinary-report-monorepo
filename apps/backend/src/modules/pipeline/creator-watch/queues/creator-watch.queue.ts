import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** The daily creator scrapes (`CreatorWatchWorkflow.scrapeCity`): one city at a time, one waiting per city */
export const CREATOR_WATCH_QUEUE = defineDurableQueue('creator-watch', { workerConcurrency: 1 });

/**
 * One creator's profiles scraped by hand ("Scrape now", `CreatorWatchWorkflow.creator`), apart
 * from the daily city runs, so an admin's scrape never waits behind a city's
 */
export const CREATOR_SCRAPE_QUEUE = defineDurableQueue('creator-scrape', { workerConcurrency: 2 });
