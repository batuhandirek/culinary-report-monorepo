/**
 * The city's matching sweep (`match-mentions.city`): daily at 05:40 UTC, after the night's reading
 * and the 22:00 re-read. A post's places are matched by its own reading (`read-posts.post`); the
 * sweep takes what that leaves: unmatched names once the city has new venues, brand rematches,
 * the re-read's new places, a post read before this rule. Then the tags' brands and the accounts.
 */
export const MATCH_MENTIONS_CRON = '40 5 * * *';

/** `MatchMentionsWorkflow.matchMention` by name: a post's reading queues its close calls (it can't import the class, which imports it) */
export const MATCH_MENTION_WORKFLOW = {
	className: 'MatchMentionsWorkflow',
	name: 'match-mentions.mention',
} as const;
