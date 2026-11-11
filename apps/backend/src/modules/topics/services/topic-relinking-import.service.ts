import { RequestContext } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import _ from 'lodash';

import { DECIDED_AT_SQL } from '../constants/topic-relinking.constant.js';
import type { TopicRelinkingEntry } from '../interfaces/topic-relinking.interface.js';
import { readTopicRelinking } from '../util/topic-relinking-file.js';

import { TermService } from './term.service.js';
import { TopicService } from './topic.service.js';

const CHUNK = 1000;

export interface TopicRelinkingImportResult {
	/** Entries in the file */
	entries: number;
	/** Applied: the wording was still decided as the converter saw it, or still undecided */
	applied: number;
	/** Of `applied`, the wordings that were never decided (the `terms` backlog's work, done by the converter) */
	appliedUndecided: number;
	/** Left alone: no such wording here, or decided since (a second boot: every one) */
	skipped: number;
	/** Left alone: the entry names a topic this database lacks */
	unknownTopic: number;
	/** Topics promotion created after the import */
	promoted: string[];
}

/**
 * Applies the converted decisions the build ships (`tmp/topic-relinking/terms.json`, written by
 * `TopicRelinkingConvertService` on a clone of production) at boot, after the migrations
 * (`onApplicationBootstrap`: `AppModule.onModuleInit` runs the migrations, and Nest runs the root
 * module's init hook after every other module's). An entry is applied only to a wording still
 * decided at the moment the converter saw (`decidedAt`), which the same statement then moves to
 * now: a restart applies nothing twice, and a wording production's backlog or an admin decided
 * since the clone keeps its newer decision. Who decided a wording stays. An entry for a wording the
 * converter saw undecided (`decidedAt` null) is applied only while it still is, as its `decidedBy`.
 * No LLM call, no paid step.
 * Once production has applied it, the folder and this service are deleted.
 */
@Injectable()
export class TopicRelinkingImportService implements OnApplicationBootstrap {
	private readonly logger = new Logger(TopicRelinkingImportService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly topicService: TopicService,
		private readonly termService: TermService,
	) {}

	async onApplicationBootstrap() {
		try {
			await RequestContext.create(this.em, () => this.run());
		} catch (e) {
			// A failed import must not keep the app from booting: the provisional links count meanwhile
			this.logger.error(`Topic relinking import failed: ${(e as Error).stack}`);
		}
	}

	async run(): Promise<TopicRelinkingImportResult | null> {
		const file = readTopicRelinking();
		if (!file) return null;
		const entries = Object.entries(file.terms);
		const result: TopicRelinkingImportResult = {
			entries: entries.length,
			applied: 0,
			appliedUndecided: 0,
			skipped: 0,
			unknownTopic: 0,
			promoted: [],
		};
		const conn = this.em.getConnection();
		const topics: { id: string; key: string }[] = await conn.execute(
			`select id, key from topics where deleted_at is null`,
		);
		const topicId = new Map(topics.map(t => [t.key, t.id]));
		const usable = entries.filter(([, e]) => {
			const keys = [e.topic, ...(e.modifiers ?? []).map(m => m.topic)].filter(
				(k): k is string => !!k,
			);
			const known = keys.every(k => topicId.has(k));
			if (!known) result.unknownTopic++;
			return known;
		});
		await this.em.transactional(async em => {
			const run = (sql: string, params: unknown[]): Promise<{ id: number; key: string }[]> =>
				em.getConnection().execute(sql, params, 'all', em.getTransactionContext());
			const decided = usable.filter(([, e]) => e.decidedAt !== null);
			const undecided = usable.filter(([, e]) => e.decidedAt === null);
			const chunks = [
				..._.chunk(decided, CHUNK).map(chunk => ({ chunk, undecided: false })),
				..._.chunk(undecided, CHUNK).map(chunk => ({ chunk, undecided: true })),
			];
			for (const { chunk, undecided: fresh } of chunks) {
				const values = chunk.flatMap(([key, e]) => [
					key,
					fresh ? (e.decidedBy ?? 'ai') : e.decidedAt,
					e.topic ? topicId.get(e.topic)! : null,
					!!e.topic && !!e.exact,
					e.exact ? null : (e.proposedLabel ?? null),
					e.exact ? null : (e.proposedKind ?? null),
				]);
				const tuples = chunk
					.map(() => '(?::text, ?::text, ?::uuid, ?::boolean, ?::text, ?::text)')
					.join(', ');
				// The guard is in the statement: only a wording still carrying the converter's `decided_at`,
				// or, for one the converter saw undecided, still undecided
				const applied = await run(
					fresh ?
						`update terms t set topic_id = v.topic_id, exact = v.exact, proposed_label = v.label,
							proposed_kind = v.kind, decided_by = v.by, decided_at = now()
						from (values ${tuples}) as v(key, by, topic_id, exact, label, kind)
						where t.key = v.key and t.decided_by is null
						returning t.id, t.key`
					:	`update terms t set topic_id = v.topic_id, exact = v.exact, proposed_label = v.label,
							proposed_kind = v.kind, decided_at = now()
						from (values ${tuples}) as v(key, at, topic_id, exact, label, kind)
						where t.key = v.key and t.decided_by is not null and ${DECIDED_AT_SQL('t.decided_at')} = v.at
						returning t.id, t.key`,
					values,
				);
				result.applied += applied.length;
				if (fresh) result.appliedUndecided += applied.length;
				if (!applied.length) continue;
				const idOf = new Map(applied.map(r => [r.key, r.id]));
				await run(
					`delete from term_modifiers where term_id in (${applied.map(() => '?').join(', ')})`,
					applied.map(r => r.id),
				);
				const modifiers = chunk.flatMap(([key, e]) => {
					const id = idOf.get(key);
					if (!id || e.exact || !e.modifiers?.length) return [];
					return modifiersOf(e).map((m, rank) => [
						id,
						topicId.get(m.topic)!,
						m.type,
						rank,
					]);
				});
				for (const rows of _.chunk(modifiers, CHUNK))
					await run(
						`insert into term_modifiers (term_id, topic_id, type, rank)
						values ${rows.map(() => '(?::int, ?::uuid, ?::text, ?::int)').join(', ')}
						on conflict do nothing`,
						rows.flat(),
					);
			}
		});
		result.skipped = usable.length - result.applied;
		if (result.applied) {
			await this.topicService.rebuildClosure();
			result.promoted = (await this.termService.promote()).created;
			// Missing vectors, the promoted topics' too, are embedded when the account can serve (cents);
			// the shortlist copes without
			await this.topicService.vectors();
		}
		this.logger.log(
			`Topic relinking (${file.model}, ${file.generatedAt}): ${result.applied} of ${result.entries} applied ` +
				`(${result.appliedUndecided} never decided before), ` +
				`${result.skipped} left alone (decided since, or not here), ${result.unknownTopic} name a topic this database lacks` +
				(result.promoted.length ? `; promoted ${result.promoted.join(', ')}` : ''),
		);
		return result;
	}
}

/** An entry's modifiers, each topic once, never its main topic */
const modifiersOf = (e: TopicRelinkingEntry) =>
	_.uniqBy(e.modifiers ?? [], m => m.topic).filter(m => m.topic !== e.topic);
