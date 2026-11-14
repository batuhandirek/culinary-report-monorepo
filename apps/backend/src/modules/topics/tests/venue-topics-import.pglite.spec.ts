import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { LlmBacklogRegistry } from 'src/modules/backlog/services/llm-backlog-registry.service.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { TermTopicAgent } from '../agents/term-topic.agent.js';
import { venueTopicsFile } from '../constants/venue-topics.constant.js';
import { Term } from '../entities/term.entity.js';
import { TermService } from '../services/term.service.js';
import { TopicService } from '../services/topic.service.js';
import { TopicRelinkService } from '../services/topic-relink.service.js';
import { VenueTopicsImportService } from '../services/venue-topics-import.service.js';
import { appendVenueTopics, type VenueTopicsEntry } from '../util/venue-topics-file.js';

import { seedTopics } from './factories/topic.factory.js';

const dir = mkdtempSync(path.join(tmpdir(), 'venue-topics-'));
process.env.VENUE_TOPICS_DIR = dir;

const at = '2026-11-14T09:00:00.000Z';
const entry = (name: string, e: Partial<VenueTopicsEntry>): VenueTopicsEntry => ({
	key: name.toLowerCase(),
	name,
	venues: 3,
	decidedBy: 'ai',
	model: 'anthropic/claude-haiku-5-5',
	at,
	...e,
});

/*
 * The categories agent C decided on a copy of production, shipped as `tmp/venue-topics/results.jsonl`
 * and applied at boot: a wording stored when missing, its decision taken only while undecided, the
 * re-link queued once (it refreshes every city's venue tags), nothing applied twice.
 */
describe('VenueTopicsImportService (pglite)', () => {
	let harness: PgliteTestingModule;
	const pgBoss = { sendJob: jest.fn(async (..._args: unknown[]) => 'job-id') };
	const em = () => harness.orm.em;
	const importer = () => harness.moduleRef.get(VenueTopicsImportService);
	const term = (key: string) =>
		em().fork().findOneOrFail(Term, { key }, { populate: ['topic', 'modifiers', 'modifiers.topic'] });

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				TermService,
				TopicService,
				TopicRelinkService,
				LlmBacklogRegistry,
				VenueTopicsImportService,
				{ provide: PgBossService, useValue: pgBoss },
				{ provide: TermTopicAgent, useValue: {} },
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
		seedTopics(em(), ['bar', 'cocktails', 'pizza', 'street food', 'bakery']);
		await em().flush();
		// The seed's "snack bar" is an admin's term (street food); "Donut shop" waits for the agent here
		await em().getConnection().execute(`insert into terms (key, name) values ('donut shop', 'Donut shop')`);
	});

	afterAll(async () => {
		await harness?.stop();
		rmSync(dir, { recursive: true, force: true });
	});

	beforeEach(() => {
		pgBoss.sendJob.mockClear();
		em().clear();
	});

	it('applies nothing without a file', async () => {
		expect(venueTopicsFile()).toBe(path.join(dir, 'results.jsonl'));
		expect(await importer().run()).toBeNull();
		expect(pgBoss.sendJob).not.toHaveBeenCalled();
	});

	it('stores the wordings, decides the undecided ones, leaves an admin and an unknown topic alone, and queues the re-link once', async () => {
		appendVenueTopics([
			entry('Cocktail bar', {
				topic: 'bar',
				exact: false,
				proposedLabel: 'Cocktail bar',
				modifiers: [{ topic: 'cocktails', type: 'has' }],
			}),
			entry('Pizza Takeout', { decidedBy: 'match', model: undefined, topic: 'pizza', exact: true, modifiers: [] }),
			entry('Donut shop', { topic: 'bakery', exact: false, modifiers: [{ topic: 'donuts', type: 'has' }] }),
			entry('Snack bar', { none: true }),
			entry('Wine store', { none: true }),
		]);
		expect(await importer().run()).toEqual({ entries: 5, applied: 3, skipped: 1, unknownTopic: 1 });
		const cocktail = await term('cocktail bar');
		expect(cocktail).toMatchObject({ name: 'Cocktail bar', exact: false, decidedBy: 'ai', proposedLabel: 'Cocktail bar' });
		expect(cocktail.topic?.key).toBe('bar');
		expect(cocktail.modifiers.getItems().map(m => [m.topic.key, m.type])).toEqual([['cocktails', 'has']]);
		expect(await term('pizza takeout')).toMatchObject({ exact: true, decidedBy: 'match' });
		expect(await term('wine store')).toMatchObject({ topic: null, decidedBy: 'ai' });
		// An admin's word stays; a topic this database lacks ("donuts") leaves the wording to the backlog
		expect(await term('snack bar')).toMatchObject({ decidedBy: 'admin' });
		expect(await term('donut shop')).toMatchObject({ decidedBy: null });
		expect(pgBoss.sendJob).toHaveBeenCalledTimes(1);
		// The index reads the categories through them
		const index = await harness.moduleRef.get(TopicService).index();
		expect(index.wordingTopics('Cocktail bar')).toEqual(['bar', 'cocktails']);
		expect(index.wordingTopics('Wine store')).toEqual([]);
	});

	it('applies nothing twice', async () => {
		expect(await importer().run()).toEqual({ entries: 5, applied: 0, skipped: 4, unknownTopic: 1 });
		expect(pgBoss.sendJob).not.toHaveBeenCalled();
	});

	it("lets a hand decision replace the agent's, never an admin's, once", async () => {
		await em()
			.getConnection()
			.execute(`insert into terms (key, name, decided_by, decided_at) values ('gastropub', 'gastropub', 'ai', now())`);
		const byHand = { decidedBy: 'admin' as const, model: 'by hand' };
		appendVenueTopics([
			entry('Gastropub', { ...byHand, topic: 'bar', exact: false, proposedLabel: 'Gastropub', modifiers: [] }),
			// The seed's admin term: an admin's word stays
			entry('Snack bar', { ...byHand, topic: 'bar', exact: true, modifiers: [] }),
		]);
		expect(await importer().run()).toMatchObject({ applied: 1 });
		const gastropub = await term('gastropub');
		expect(gastropub).toMatchObject({ decidedBy: 'admin', exact: false, proposedLabel: 'Gastropub' });
		expect(gastropub.topic?.key).toBe('bar');
		expect((await term('snack bar')).topic?.key).toBe('street food');
		expect(await importer().run()).toMatchObject({ applied: 0 });
	});
});
