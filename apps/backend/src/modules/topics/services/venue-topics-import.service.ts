import { RequestContext } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import _ from 'lodash';

import { Term } from '../entities/term.entity.js';
import { entryDecision, readVenueTopics } from '../util/venue-topics-file.js';

import { TermService } from './term.service.js';
import { TopicService } from './topic.service.js';

const CHUNK = 500;

export interface VenueTopicsImportResult {
	/** Entries in the file */
	entries: number;
	/** Applied: the wording was undecided here, or the entry is a hand decision over the agent's or a name match's */
	applied: number;
	/** Left alone: decided here already (a second boot: every one), or an admin's here */
	skipped: number;
	/** Left alone: the entry names a topic this database lacks */
	unknownTopic: number;
}

/**
 * Applies agent C's answers about the Google categories the build ships
 * (`tmp/venue-topics/results.jsonl`, written by `VenueTopicsConvertService` on a copy of
 * production) at boot, after the migrations (`onApplicationBootstrap`: `AppModule.onModuleInit`
 * runs them first). Each wording is stored when missing and takes its entry's decision only while
 * undecided, so a restart applies nothing twice and a wording the backlog decided keeps its
 * decision; an entry decided by hand (`admin`) also replaces the agent's or a name match's, never
 * an admin's, and is an admin's once applied. Then the re-link is queued, which refreshes every city's venue tags. No LLM call.
 * Once production has applied it, the folder and this service are deleted.
 */
@Injectable()
export class VenueTopicsImportService implements OnApplicationBootstrap {
	private readonly logger = new Logger(VenueTopicsImportService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly topicService: TopicService,
		private readonly termService: TermService,
	) {}

	async onApplicationBootstrap() {
		try {
			await RequestContext.create(this.em, () => this.run());
		} catch (e) {
			// A failed import must not keep the app from booting: the categories wait for the backlog meanwhile
			this.logger.error(`Venue topics import failed: ${(e as Error).stack}`);
		}
	}

	async run(): Promise<VenueTopicsImportResult | null> {
		const file = readVenueTopics();
		if (!file.size) return null;
		const result: VenueTopicsImportResult = { entries: file.size, applied: 0, skipped: 0, unknownTopic: 0 };
		const index = await this.topicService.index();
		const usable = [...file.values()].filter(e => {
			const keys = [e.topic, ...(e.modifiers ?? []).map(m => m.topic)].filter((k): k is string => !!k);
			const known = keys.every(k => index.get(k));
			if (!known) result.unknownTopic++;
			return known;
		});
		const conn = this.em.getConnection();
		for (const chunk of _.chunk(usable, CHUNK))
			await conn.execute(
				`insert into terms (key, name) values ${chunk.map(() => '(?, ?)').join(', ')} on conflict (key) do nothing`,
				chunk.flatMap(e => [e.key, e.name]),
			);
		const now = new Date();
		for (const chunk of _.chunk(usable, CHUNK)) {
			const terms = await this.em.find(
				Term,
				{ key: { $in: chunk.map(e => e.key) }, $or: [{ decidedBy: null }, { decidedBy: { $ne: 'admin' } }] },
				{ populate: ['modifiers'] },
			);
			for (const term of terms) {
				const entry = file.get(term.key)!;
				// The agent's and a name match's answers fill undecided wordings only; a hand decision replaces theirs too
				if (term.decidedBy && entry.decidedBy !== 'admin') continue;
				this.termService.setDecision(term, entryDecision(entry), index, entry.decidedBy, now);
				result.applied++;
			}
			await this.em.flush();
		}
		result.skipped = usable.length - result.applied;
		// The venues' category tags, and everything else reading the index, follow the new decisions
		if (result.applied) await this.topicService.queueRelink();
		this.logger.log(
			`Venue topics: ${result.applied} of ${result.entries} applied, ${result.skipped} decided here already, ` +
				`${result.unknownTopic} name a topic this database lacks`,
		);
		return result;
	}
}
