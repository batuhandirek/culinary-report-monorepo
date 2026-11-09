import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/**
 * A city's matching (`MatchMentionsWorkflow.matchCity`): one at a time, one in flight per city
 * (`dedupe` the city id), since two runs over the same mentions would match them twice
 */
export const MATCH_MENTIONS_QUEUE = defineDurableQueue('match-mentions', { workerConcurrency: 1 });

/**
 * One close call each (`MatchMentionsWorkflow.matchMention`), started by its city's run: a queue
 * of their own, as the city's run holds the one slot of `MATCH_MENTIONS_QUEUE` while it awaits
 * them. They spend their time waiting on their agent call (their tier's LLM queue), so as many run as
 * that queue does.
 */
export const MATCH_MENTION_QUEUE = defineDurableQueue('match-mention', { workerConcurrency: 8 });
