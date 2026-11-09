import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** The brand and creator profiles read again, one city at a time */
export const PROFILE_TRACK_QUEUE = defineDurableQueue('profile-track', { workerConcurrency: 1 });
