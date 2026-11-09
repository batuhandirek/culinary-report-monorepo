import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** The weekly mentioned-profile runs (`ReadMentionedProfilesWorkflow.week`): one city at a time, one waiting per city */
export const READ_MENTIONED_PROFILES_QUEUE = defineDurableQueue('read-mentioned-profiles', {
	workerConcurrency: 1,
});
