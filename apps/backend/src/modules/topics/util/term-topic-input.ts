import type { TermTopicInputTopic } from '../agents/term-topic.agent.js';
import type { TermRelation } from '../constants/term-relation.constant.js';

import type { TopicIndex } from './topics.js';

/** Agent C's input message: one wording, as it was said (one a call) */
export const termTopicInput = (name: string): string => `Wording: ${JSON.stringify(name)}`;

/** Every topic, as agent C picks from them: what the `terms` backlog sends, and the eval too */
export const termTopicInputTopics = (index: Pick<TopicIndex, 'topics'>): TermTopicInputTopic[] =>
	index.topics.map(t => ({
		key: t.key,
		label: t.label,
		kind: t.kind,
		...(t.parentKey && { parent: t.parentKey }),
	}));

// Topics a wording may link to; the longest suggestion kept (a label, not a sentence)
const MAX_LINKS = 10;
const SUGGESTION_MAX = 60;

/** One wording as agent C answers it */
export interface TermTopicAnswer {
	topics: { key: string; relation: TermRelation }[];
	suggestion: string | null;
}

/**
 * What a wording's answer stores: a label answered for a key still counts, unknown keys are
 * dropped and the first answer of a key wins (`MAX_LINKS` at most); a suggestion is a missing
 * topic, so one naming a topic the agent passed over is dropped.
 */
export const termAnswerLinks = (
	answer: TermTopicAnswer,
	index: Pick<TopicIndex, 'get' | 'exact' | 'exactAll'>,
): { keys: string[]; relations: Map<string, TermRelation>; suggestion: string | null } => {
	const relations = new Map<string, TermRelation>();
	for (const answered of answer.topics) {
		const key = index.get(answered.key) ? answered.key : index.exact(answered.key);
		if (key && !relations.has(key)) relations.set(key, answered.relation);
	}
	const keys = [...relations.keys()].slice(0, MAX_LINKS);
	const suggestion = answer.suggestion?.trim().slice(0, SUGGESTION_MAX) || null;
	return {
		keys,
		relations,
		suggestion:
			keys.length || (suggestion && index.exactAll(suggestion).length) ? null : suggestion,
	};
};
