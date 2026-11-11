import { type TermTopicInputTopic, topicLines } from '../agents/term-topic.agent.js';
import {
	defaultEdgeType,
	type EdgeType,
	PROMOTION_KINDS,
} from '../constants/topic-edge.constant.js';
import { TopicKindEnum } from '../entities/topic.entity.js';

import { closeShortlist, fixedShortlist } from './topic-shortlist.js';
import type { IndexedTopic, TopicIndex } from './topics.js';

const inputTopic = (t: IndexedTopic): TermTopicInputTopic => ({
	key: t.key,
	label: t.label,
	kind: t.kind,
	...(t.isA.length && { isA: t.isA }),
});

/** The topics every call offers, for agent C's instructions (`TermTopicContext.topics`): what the `terms` backlog and the converter send */
export const termTopicInputTopics = (
	index: Pick<TopicIndex, 'topics' | 'isRoot'>,
): TermTopicInputTopic[] => fixedShortlist(index).map(inputTopic);

/** A link a wording had under the old model, told to the converter's calls as a hint */
export interface TermTopicHint {
	label: string;
	/** same | kind_of | with */
	relation: string;
}

/**
 * Agent C's input message: one wording as it was said, the topics close to it (`closeShortlist`),
 * and, for the conversion of the old links, how it was linked until now.
 */
export const termTopicInput = (
	name: string,
	close: IndexedTopic[],
	hints?: TermTopicHint[],
): string =>
	[
		`Wording: ${JSON.stringify(name)}`,
		hints?.length ?
			`Linked until now: ${hints.map(h => `${h.label} (${h.relation})`).join(', ')}`
		:	null,
		`Topics close to it:\n${topicLines(close.map(inputTopic))}`,
	]
		.filter(Boolean)
		.join('\n\n');

/** The message for one wording from its vector: the close topics picked, then `termTopicInput` */
export const termTopicMessage = (
	name: string,
	index: Pick<TopicIndex, 'topics' | 'isRoot'>,
	wording: number[] | null | undefined,
	vectors: Map<string, number[]> | null | undefined,
	hints?: TermTopicHint[],
): string => termTopicInput(name, closeShortlist(index, wording, vectors), hints);

// Modifiers a wording may carry; the longest label kept (a name, not a sentence)
const MAX_MODIFIERS = 5;
const LABEL_MAX = 60;

/** One wording as agent C answers it */
export interface TermTopicAnswer {
	none: boolean;
	topic: string | null;
	exact: boolean;
	label: string | null;
	kind: string | null;
	modifiers: { topic: string; type: EdgeType | null }[];
}

/** A wording's decision as stored (`Term`, `TermModifier`), topics by key */
export interface TermDecision {
	topicKey: string | null;
	exact: boolean;
	proposedLabel: string | null;
	proposedKind: TopicKindEnum | null;
	modifiers: { topicKey: string; type: EdgeType }[];
}

export const NO_TOPIC: TermDecision = {
	topicKey: null,
	exact: false,
	proposedLabel: null,
	proposedKind: null,
	modifiers: [],
};

/**
 * What a wording's answer stores. A label answered for a key still counts, an unknown key is
 * dropped. An exact wording keeps only its topic. A wording under an aspect is always exact, with
 * no modifiers (the aspects stay two levels, and nothing promotes under them). A narrower wording
 * keeps its label and kind (a kind promotion can't create is dropped) and its modifiers: known
 * food topics, each once, never its main topic, `MAX_MODIFIERS` at most, typed as answered, else
 * by the target's kind. `exact` with no topic it knows is a narrower wording under nothing.
 */
export const termDecisionOf = (
	answer: TermTopicAnswer,
	index: Pick<TopicIndex, 'get' | 'exact'>,
): TermDecision => {
	if (answer.none) return NO_TOPIC;
	const keyOf = (raw: string | null | undefined) =>
		raw ? (index.get(raw)?.key ?? index.exact(raw) ?? null) : null;
	const topicKey = keyOf(answer.topic);
	const topic = topicKey ? index.get(topicKey) : undefined;
	if (topic?.kind === TopicKindEnum.ASPECT) return { ...NO_TOPIC, topicKey, exact: true };
	if (answer.exact && topicKey) return { ...NO_TOPIC, topicKey, exact: true };
	const modifiers: TermDecision['modifiers'] = [];
	for (const m of answer.modifiers ?? []) {
		const key = keyOf(m.topic);
		const to = key ? index.get(key) : undefined;
		if (!to || to.kind === TopicKindEnum.ASPECT || key === topicKey) continue;
		if (modifiers.some(x => x.topicKey === key)) continue;
		modifiers.push({ topicKey: to.key, type: m.type ?? defaultEdgeType(to.kind) });
	}
	const label = answer.label?.trim().slice(0, LABEL_MAX) || null;
	const kind = (PROMOTION_KINDS as readonly string[]).includes(answer.kind ?? '') ?
		(answer.kind as TopicKindEnum)
	:	null;
	// Nothing known about it at all: the same as none
	if (!topicKey && !modifiers.length && !label) return NO_TOPIC;
	return {
		topicKey,
		exact: false,
		proposedLabel: label,
		proposedKind: label ? kind : null,
		modifiers: modifiers.slice(0, MAX_MODIFIERS),
	};
};
