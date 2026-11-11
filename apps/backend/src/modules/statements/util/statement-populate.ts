/**
 * What a route serving a source's statements populates (`Review`, `Mention`, `SocialPost`): the
 * parts with an aspect's edges (so its `parent`, the root, is there) and a food wording's main
 * topic (with its edges: a dish's cuisine) and modifiers. The output DTO is `StatementOutputDto`.
 * A topic's `parent` is worked out from its loaded edges (`Topic.parent`), so `edges.to` is loaded
 * wherever a topic is served.
 */
export const STATEMENT_POPULATE = [
	'statements.parts.topic.edges.to',
	'statements.parts.term.topic.edges.to',
	'statements.parts.term.modifiers.topic',
] as const;

/** The same for a statement loaded on its own (`StatementOutputDto` straight from the row) */
export const STATEMENT_PARTS_POPULATE = [
	'parts.topic.edges.to',
	'parts.term.topic.edges.to',
	'parts.term.modifiers.topic',
] as const;
