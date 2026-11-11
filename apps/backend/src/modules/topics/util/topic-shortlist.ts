// Pure: the topics agent C is offered for one wording, picked by closeness of meaning.

import {
	FIXED_SHORTLIST_KINDS,
	SHORTLIST_SIZE,
} from '../constants/topic-edge.constant.js';
import { TopicKindEnum } from '../entities/topic.entity.js';

import type { IndexedTopic, TopicIndex } from './topics.js';

/** The text a topic's vector is made from: its label, and for an aspect what it covers */
export const topicEmbeddingText = (topic: {
	label: string;
	kind: TopicKindEnum | string;
	hint?: string | null;
}): string =>
	topic.kind === TopicKindEnum.ASPECT && topic.hint?.trim() ?
		`${topic.label}: ${topic.hint.trim()}`
	:	topic.label;

/** Cosine similarity of two vectors of one length (OpenAI's are unit length, but a prefix isn't) */
export const cosine = (a: number[], b: number[]): number => {
	let dot = 0;
	let na = 0;
	let nb = 0;
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i];
		na += a[i] * a[i];
		nb += b[i] * b[i];
	}
	return na && nb ? dot / Math.sqrt(na * nb) : 0;
};

const FIXED = new Set<TopicKindEnum>(FIXED_SHORTLIST_KINDS);

const isFixed = (index: Pick<TopicIndex, 'isRoot'>, t: IndexedTopic) =>
	FIXED.has(t.kind) || (t.kind === TopicKindEnum.ASPECT && index.isRoot(t.key));

/**
 * The topics every call offers agent C, whatever the wording: the small fixed kinds (cuisine, diet,
 * meal, kind of place) and every aspect root. They change only when a topic does, so they sit in
 * the agent's instructions, cached.
 */
export const fixedShortlist = (index: Pick<TopicIndex, 'topics' | 'isRoot'>): IndexedTopic[] =>
	index.topics.filter(t => isFixed(index, t));

/**
 * The topics one wording's call adds to the fixed ones: of the many (dishes, drinks, ingredients,
 * child aspects) the `size` closest to the wording's vector, and what each of those is a kind of,
 * so "Dürüm" is never offered without Döner & kebab. Without a vector for the wording, or without
 * the topics' (`vectors` null: the embeddings account is out), every one of them is offered.
 */
export const closeShortlist = (
	index: Pick<TopicIndex, 'topics' | 'isRoot'>,
	wording: number[] | null | undefined,
	vectors: Map<string, number[]> | null | undefined,
	size = SHORTLIST_SIZE,
): IndexedTopic[] => {
	const many = index.topics.filter(t => !isFixed(index, t));
	if (!wording || !vectors) return many;
	const close = many
		.map(t => ({ t, v: vectors.get(t.key) }))
		.filter((x): x is { t: IndexedTopic; v: number[] } => !!x.v)
		.map(({ t, v }) => ({ t, score: cosine(wording, v) }))
		.sort((a, b) => b.score - a.score || a.t.key.localeCompare(b.t.key))
		.slice(0, size)
		.map(x => x.t);
	const keep = new Set(close.map(t => t.key));
	for (const t of close) for (const up of t.isA) keep.add(up);
	return many.filter(t => keep.has(t.key));
};
