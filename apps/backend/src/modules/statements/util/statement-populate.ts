/**
 * What a route serving a source's statements populates (`Review`, `Mention`, `SocialPost`): the
 * parts with an aspect's parent (its root) and a food wording's links (its topics, each with its
 * parent: a dish's cuisine). The output DTO is `StatementOutputDto`; a topic's `parent` is typed
 * there, so it is loaded wherever a topic is, or `forceObject` would serialize it as `{ id }`.
 */
export const STATEMENT_POPULATE = [
	'statements.parts.topic.parent',
	'statements.parts.term.topics.topic.parent',
] as const;

/** The same for a statement loaded on its own (`StatementOutputDto` straight from the row) */
export const STATEMENT_PARTS_POPULATE = [
	'parts.topic.parent',
	'parts.term.topics.topic.parent',
] as const;
