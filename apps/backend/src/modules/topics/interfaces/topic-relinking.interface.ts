import type { EdgeType } from '../constants/topic-edge.constant.js';

/**
 * One wording's converted decision, by keys, never ids (ids differ per database). `decidedAt` is
 * the wording's `decided_at` as the converter saw it, to the microsecond: the import applies the
 * entry only while the wording still carries it, so a wording decided since is left alone and a
 * second boot applies nothing. `null`: the wording was never decided (the `terms` backlog's work),
 * and the entry applies only while it still isn't, as `decidedBy`.
 */
export interface TopicRelinkingEntry {
	decidedAt: string | null;
	/** Only on an entry for a wording never decided: a name match, else agent C's answer */
	decidedBy?: 'match' | 'ai';
	/** The model a "none" was asked again on (`--recheck-none`), whose answer this is */
	recheckedOn?: string;
	/** Not food, not a drink, not an aspect: no topic, nothing else */
	none?: true;
	/** The main topic's key; null for a narrower wording under no topic given */
	topic?: string | null;
	exact?: boolean;
	proposedLabel?: string;
	proposedKind?: string;
	modifiers?: { topic: string; type: EdgeType }[];
}

/** `tmp/topic-relinking/terms.json`: what one conversion run answered */
export interface TopicRelinkingFile {
	generatedAt: string;
	/** The model that answered (`LlmModelId`) */
	model: string;
	/** What the run paid, and its tokens */
	usd: number;
	tokens: number;
	/** Wordings the run could not answer: left out of `terms`, their provisional link stays */
	unanswered: string[];
	/** By term key (`Term.key`) */
	terms: Record<string, TopicRelinkingEntry>;
}
