import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** The daily creator scrapes (`CreatorWatchWorkflow.scrapeCity`): one city at a time, one waiting per city */
export const CREATOR_WATCH_QUEUE = defineDurableQueue('creator-watch', { workerConcurrency: 1 });
