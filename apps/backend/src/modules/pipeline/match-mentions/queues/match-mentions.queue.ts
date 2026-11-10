import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/**
 * A city's matching sweep (`MatchMentionsWorkflow.matchCity`): one at a time, one in flight per
 * city (`dedupe` the city id), since two runs over the same mentions would match them twice
 */
export const MATCH_MENTIONS_QUEUE = defineDurableQueue('match-mentions', { workerConcurrency: 1 });

/**
 * One close call each (`MatchMentionsWorkflow.matchMention`), queued by its post's reading or the
 * city's sweep, one in flight per mention (`closeCallStart`): a queue of their own, as the sweep
 * holds the one slot of `MATCH_MENTIONS_QUEUE` while it awaits them. They spend their time waiting
 * on their agent call (their tier's LLM queue), so as many run as that queue does; the sure matches
 * never wait behind them, as a post's reading saves those itself.
 */
export const MATCH_MENTION_QUEUE = defineDurableQueue('match-mention', { workerConcurrency: 8 });
