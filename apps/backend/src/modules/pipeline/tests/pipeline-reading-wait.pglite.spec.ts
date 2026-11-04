import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityFactory, testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { ProspectQueryService } from 'src/modules/outreach/services/prospect-query.service.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { BlogScrapeService } from 'src/modules/social/services/blog-scrape.service.js';
import { MentionMatchingService } from 'src/modules/social/services/mention-matching.service.js';
import { BrandLeadScoreService } from 'src/modules/venues/services/brand-lead-score.service.js';
import { VenueScrapeService } from 'src/modules/venues/services/venue-scrape.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { MONTHLY_STEPS, PipelineStepEnum } from '../constants/pipeline.constant.js';
import { IngestionCron } from '../crons/ingestion.cron.js';
import { PipelineRun, PipelineRunParams, PipelineRunStatusEnum } from '../entities/pipeline-run.entity.js';
import { RunPipelineJob } from '../jobs/run-pipeline.job.js';
import { IngestionService, type ReadPass } from '../services/ingestion.service.js';
import { PipelineService } from '../services/pipeline.service.js';
import { READ_WAIT_HOURS } from '../util/monthly-schedule.js';

const HOUR = 3_600_000;

const pass = (fields: Partial<ReadPass> = {}): ReadPass => ({
	extracted: 0,
	skipped: 0,
	matched: 0,
	reviews: 0,
	comments: 0,
	press: 0,
	pending: { posts: 0, mentions: 0, reviews: 0, comments: 0, press: 0 },
	...fields,
});
const blocked = () =>
	pass({ blocked: 'You have no credits remaining.', pending: { posts: 120, mentions: 8, reviews: 0, comments: 0, press: 0 } });

describe('Steps that wait for the reading (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: PipelineService;
	const sendJob = jest.fn(async (..._args: unknown[]) => 'job');
	const catchUp = jest.fn(async (..._args: unknown[]) => ({ ready: true, pass: pass() }));
	const queue = jest.fn(async (..._args: unknown[]) => undefined);
	const lookupNames = jest.fn(async (..._args: unknown[]) => ({ looked: 4, saved: 3 }));
	const scoreAll = jest.fn(async (..._args: unknown[]) => ({ scored: 9 }));
	const scrapeCity = jest.fn(async (..._args: unknown[]) => ({ articles: 2 }));

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				PipelineService,
				CityService,
				IngestionCron,
				{ provide: PgBossService, useValue: { sendJob } },
				{ provide: IngestionService, useValue: { catchUp, queue, locked: (_id: string, fn: () => unknown) => fn() } },
				{ provide: VenueScrapeService, useValue: { lookupNames } },
				{ provide: MentionMatchingService, useValue: { unmatchedNames: async () => ['Baba Pirzola'], topBrandIds: async () => [] } },
				{ provide: BrandLeadScoreService, useValue: { scoreAll } },
				{ provide: BlogScrapeService, useValue: { scrapeCity } },
				{ provide: ProspectQueryService, useValue: { wonBrandIds: async () => [] } },
			],
		});
		service = harness.moduleRef.get(PipelineService);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(async () => {
		jest.clearAllMocks();
		catchUp.mockResolvedValue({ ready: true, pass: pass() });
		await harness.orm.em.fork().nativeDelete(PipelineRun, {});
	});

	const createRun = async (step: PipelineStepEnum, fields: Partial<PipelineRun> = {}, params: PipelineRunParams = {}) => {
		const em = harness.orm.em.fork();
		const run = em.create(PipelineRun, {
			city: testCity(em),
			step,
			month: '2026-10',
			params,
			status: PipelineRunStatusEnum.QUEUED,
			...fields,
		});
		await em.flush();
		return run;
	};
	const reload = (id: string) => harness.orm.em.fork().findOneOrFail(PipelineRun, id);

	it('waits before a step that needs the posts read while no model answers, and pays for nothing', async () => {
		catchUp.mockResolvedValue({ ready: false, pass: blocked() });
		const run = await createRun(PipelineStepEnum.LOOKUP_VENUES);

		await service.execute(run.id);

		expect(catchUp).toHaveBeenCalledWith(expect.objectContaining({ id: run.city.id }), 'posts', '2026-10');
		expect(lookupNames).not.toHaveBeenCalled();
		const waiting = await reload(run.id);
		expect(waiting.status).toBe(PipelineRunStatusEnum.WAITING);
		expect(waiting.waitingSince).toBeInstanceOf(Date);
		expect(waiting.finishedAt ?? null).toBeNull();
		expect(waiting.result).toEqual({});
	});

	it('goes on where it stopped once a reading pass wakes it, with what the pass read in the result', async () => {
		catchUp.mockResolvedValue({ ready: false, pass: blocked() });
		const run = await createRun(PipelineStepEnum.LOOKUP_VENUES);
		await service.execute(run.id);

		expect(await service.wakeWaiting(run.city.id)).toBe(1);
		expect((await reload(run.id)).status).toBe(PipelineRunStatusEnum.QUEUED);
		expect(sendJob).toHaveBeenCalledWith(RunPipelineJob.jobName, new RunPipelineJob({ pipelineRunId: run.id }));

		catchUp.mockResolvedValue({ ready: true, pass: pass({ extracted: 120, matched: 8 }) });
		await service.execute(run.id);

		const done = await reload(run.id);
		expect(done.status).toBe(PipelineRunStatusEnum.SUCCEEDED);
		expect(done.waitingSince ?? null).toBeNull();
		expect(done.result).toEqual({ '1. LOOKUP_VENUES': { looked: 4, saved: 3, read: { posts: 120, mentions: 8 } } });
		expect(done.finishedAt).toBeInstanceOf(Date);
	});

	it(`goes on with what is read after ${READ_WAIT_HOURS} h, saying how much was left`, async () => {
		catchUp.mockResolvedValue({ ready: false, pass: blocked() });
		const run = await createRun(PipelineStepEnum.LOOKUP_VENUES, {
			waitingSince: new Date(Date.now() - (READ_WAIT_HOURS + 1) * HOUR),
		});

		await service.execute(run.id);

		const done = await reload(run.id);
		expect(done.status).toBe(PipelineRunStatusEnum.SUCCEEDED);
		expect(lookupNames).toHaveBeenCalledTimes(1);
		expect(done.result).toEqual({
			'1. LOOKUP_VENUES': {
				looked: 4,
				saved: 3,
				read: { waitedHours: READ_WAIT_HOURS + 1, unreadPosts: 120, unmatchedMentions: 8 },
			},
		});
	});

	it('waits once for a whole monthly run: after the wait, its later gated steps go on at once', async () => {
		catchUp.mockResolvedValue({ ready: false, pass: blocked() });
		const at = MONTHLY_STEPS.indexOf(PipelineStepEnum.LOOKUP_VENUES);
		// Every step before LOOKUP_VENUES done, and the ones after it up to the reports done too
		// but SCRAPE_VENUE_SOCIAL: two posts-gated steps in a row are left
		const left = [PipelineStepEnum.LOOKUP_VENUES, PipelineStepEnum.SCRAPE_VENUE_SOCIAL, PipelineStepEnum.BUILD_REPORTS, PipelineStepEnum.SCORE_LEADS];
		const finished = Object.fromEntries(
			MONTHLY_STEPS.flatMap((step, i) => (left.includes(step) ? [] : [[`${i + 1}. ${step}`, { done: true }]])),
		);
		const run = await createRun(PipelineStepEnum.MONTHLY, {
			result: finished,
			waitingSince: new Date(Date.now() - (READ_WAIT_HOURS + 2) * HOUR),
		});

		await service.execute(run.id);

		const after = await reload(run.id);
		// The lookup went on, so did the venue search after it, without a new day's wait
		expect(after.result?.[`${at + 1}. LOOKUP_VENUES`]).toMatchObject({ read: { waitedHours: READ_WAIT_HOURS + 2 } });
		expect(Object.keys(after.result ?? {})).toContain(`${at + 2}. SCRAPE_VENUE_SOCIAL`);
		// The reports never go on unread
		expect(after.status).toBe(PipelineRunStatusEnum.WAITING);
		expect(Object.keys(after.result ?? {})).not.toContain(`${MONTHLY_STEPS.length - 1}. BUILD_REPORTS`);
	});

	it('never builds reports or scores leads unread, however long it waits', async () => {
		catchUp.mockResolvedValue({ ready: false, pass: blocked() });
		const run = await createRun(PipelineStepEnum.SCORE_LEADS, { waitingSince: new Date(Date.now() - 100 * HOUR) });

		await service.execute(run.id);

		expect(catchUp).toHaveBeenCalledWith(expect.anything(), 'all', '2026-10');
		expect(scoreAll).not.toHaveBeenCalled();
		expect((await reload(run.id)).status).toBe(PipelineRunStatusEnum.WAITING);
	});

	it('skips the wait when an admin says so', async () => {
		catchUp.mockResolvedValue({ ready: false, pass: blocked() });
		const run = await createRun(PipelineStepEnum.SCORE_LEADS, {}, { noWait: true });
		await service.execute(run.id);
		expect(catchUp).not.toHaveBeenCalled();
		expect((await reload(run.id)).status).toBe(PipelineRunStatusEnum.SUCCEEDED);
	});

	it('keeps a monthly run’s finished scrapes and waits at its first gated step', async () => {
		catchUp.mockResolvedValue({ ready: false, pass: blocked() });
		const first = MONTHLY_STEPS.findIndex(step => step === PipelineStepEnum.LOOKUP_VENUES);
		const finished = Object.fromEntries(MONTHLY_STEPS.slice(0, first).map((step, i) => [`${i + 1}. ${step}`, { done: true }]));
		const run = await createRun(PipelineStepEnum.MONTHLY, { result: finished });

		await service.execute(run.id);

		const waiting = await reload(run.id);
		expect(waiting.status).toBe(PipelineRunStatusEnum.WAITING);
		expect(waiting.result).toEqual(finished);
		expect(lookupNames).not.toHaveBeenCalled();
	});

	it('queues a reading pass when a run that stores sources ends, not after one that only reads', async () => {
		const scrape = await createRun(PipelineStepEnum.SCRAPE_BLOGS);
		await service.execute(scrape.id);
		expect(queue).toHaveBeenCalledWith(scrape.city.id);

		queue.mockClear();
		const score = await createRun(PipelineStepEnum.SCORE_LEADS);
		await service.execute(score.id);
		expect(queue).not.toHaveBeenCalled();
	});

	it('wakes every waiting run of the cron cities each hour, with a reading pass each', async () => {
		const em = harness.orm.em.fork();
		const berlin = cityFactory.build({ name: 'Hourly', cronEnabled: true });
		cityFactory.build({ name: 'Off', cronEnabled: false });
		await em.flush();
		const run = em.create(PipelineRun, {
			city: berlin,
			step: PipelineStepEnum.LOOKUP_VENUES,
			month: '2026-10',
			params: {},
			status: PipelineRunStatusEnum.WAITING,
		});
		await em.flush();

		await harness.moduleRef.get(IngestionCron).queueAll();

		expect(queue.mock.calls.map(c => c[0])).toContain(berlin.id);
		expect((await reload(run.id)).status).toBe(PipelineRunStatusEnum.QUEUED);
	});
});
