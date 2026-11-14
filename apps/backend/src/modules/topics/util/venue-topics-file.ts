import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { venueTopicsFile } from '../constants/venue-topics.constant.js';
import type { EdgeType } from '../constants/topic-edge.constant.js';
import type { TopicKindEnum } from '../entities/topic.entity.js';

import { NO_TOPIC, type TermDecision } from './term-topic-input.js';

/**
 * One Google category's decision as the file keeps it, one JSON object a line: its wording (`key`
 * = `termKey`, `name` as Google writes it), who decided it (`match`: a topic's name as a whole, no
 * call; `ai`: agent C on `model`; `admin`: by hand, written into the file, `model` saying who),
 * and the decision with topics by key; `none` for no topic.
 */
export interface VenueTopicsEntry {
	key: string;
	name: string;
	/** Venues carrying it when it was asked, main category or other */
	venues: number;
	decidedBy: 'match' | 'ai' | 'admin';
	model?: string;
	none?: true;
	topic?: string | null;
	exact?: boolean;
	proposedLabel?: string;
	proposedKind?: TopicKindEnum;
	modifiers?: { topic: string; type: EdgeType }[];
	usd?: number;
	tokens?: number;
	at: string;
}

/** A decision as an entry keeps it */
export const venueTopicsEntry = (
	wording: { key: string; name: string; venues: number },
	d: TermDecision,
	by: { decidedBy: 'match' | 'ai'; model?: string; usd?: number; tokens?: number },
	at = new Date(),
): VenueTopicsEntry => ({
	key: wording.key,
	name: wording.name,
	venues: wording.venues,
	...by,
	...(!d.topicKey && !d.modifiers.length && !d.proposedLabel ?
		{ none: true as const }
	:	{
			topic: d.topicKey,
			exact: d.exact,
			...(d.proposedLabel && { proposedLabel: d.proposedLabel }),
			...(d.proposedKind && { proposedKind: d.proposedKind }),
			modifiers: d.modifiers.map(m => ({ topic: m.topicKey, type: m.type })),
		}),
	at: at.toISOString(),
});

/** An entry's decision, topics by key */
export const entryDecision = (e: VenueTopicsEntry): TermDecision =>
	e.none ? NO_TOPIC : (
		{
			topicKey: e.topic ?? null,
			exact: !!e.topic && !!e.exact,
			proposedLabel: e.exact ? null : (e.proposedLabel ?? null),
			proposedKind: e.exact ? null : (e.proposedKind ?? null),
			modifiers: e.exact ? [] : (e.modifiers ?? []).map(m => ({ topicKey: m.topic, type: m.type })),
		}
	);

/** The file's entries by key, a later line over an earlier one; empty when there is no file */
export const readVenueTopics = (file = venueTopicsFile()): Map<string, VenueTopicsEntry> => {
	const out = new Map<string, VenueTopicsEntry>();
	if (!existsSync(file)) return out;
	for (const line of readFileSync(file, 'utf8').split('\n')) {
		if (!line.trim()) continue;
		const entry = JSON.parse(line) as VenueTopicsEntry;
		out.set(entry.key, entry);
	}
	return out;
};

/** Appends entries, one line each, so a run that dies keeps what it paid for */
export const appendVenueTopics = (entries: VenueTopicsEntry[], file = venueTopicsFile()): void => {
	if (!entries.length) return;
	mkdirSync(path.dirname(file), { recursive: true });
	appendFileSync(file, entries.map(e => `${JSON.stringify(e)}\n`).join(''));
};
