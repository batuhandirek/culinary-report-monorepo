import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { SendEmailJob, SendEmailJobPayload } from 'src/modules/email/jobs/send-email.job.js';
import { EmailService } from 'src/modules/email/services/email.service.js';
import { ProspectStageEnum } from 'src/modules/outreach/constants/outreach.constant.js';
import { OutreachTouch } from 'src/modules/outreach/entities/outreach-touch.entity.js';
import { OutreachService } from 'src/modules/outreach/services/outreach.service.js';
import { ProspectQueryService } from 'src/modules/outreach/services/prospect-query.service.js';
import {
	REVIEW_ALERT_TEMPLATE,
	ReviewAlertService,
} from 'src/modules/outreach/services/review-alert.service.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { ReviewReplyAgent } from 'src/modules/reports/agents/review-reply.agent.js';
import { ReviewAnalysisAgent } from 'src/modules/venues/agents/review-analysis.agent.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { ReviewAlertEvent } from 'src/modules/venues/persisted-events/review-alert.persisted-event.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { ReviewService } from 'src/modules/venues/services/review.service.js';
import { VenueService } from 'src/modules/venues/services/venue.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { mockAgent } from 'src/tests/mock-agent.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { PipelineStepEnum, REVIEW_WATCH_DAYS } from '../constants/pipeline.constant.js';
import { ReviewWatchCron } from '../crons/review-watch.cron.js';
import { PipelineRun, PipelineRunStatusEnum } from '../entities/pipeline-run.entity.js';
import { PipelineService } from '../services/pipeline.service.js';

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();

/* The weekly watch: the cron queues a WATCH_REVIEWS run per city with a subscriber, the step
 * scrapes the subscribers' last ten days (Apify mocked), analyses them (agent mocked) and
 * publishes one `review-alert` per new critical review; the outreach side mails it with a
 * reply draft. The mail queue is watched, never sent. */
describe('the weekly review watch (pglite)', () => {
	let harness: PgliteTestingModule;
	let pipeline: PipelineService;
	let alerts: ReviewAlertService;
	let outreach: OutreachService;
	let city: City;
	let won: Venue;
	let lost: Venue;

	const runActor = jest.fn<ApifyService['runActor']>();
	const published: { name: string; reviewId: string }[] = [];
	const pgBossService = {
		sendJob: jest.fn<PgBossService['sendJob']>(async () => undefined),
		publishWithEm: jest.fn(async (_em: unknown, name: string, event: { payload: { reviewId: string } }) => {
			published.push({ name, reviewId: event.payload.reviewId });
		}),
	};
	const replyAgent = mockAgent((input: unknown) => ({
		replies: (JSON.parse(input as string).reviews as { reviewId: string }[]).map(r => ({
			reviewId: r.reviewId,
			reply: 'Danke, das schauen wir uns an.',
		})),
	}));
	const analysisAgent = mockAgent((input: unknown) => ({
		reviews: (JSON.parse(input as string).reviews as { reviewId: string }[]).map(r => ({
			reviewId: r.reviewId,
			sentiment: 'negative',
			praise: [],
			complaints: [{ theme: 'cooking', detail: 'dry meat' }],
			dishes: [],
			changes: [],
		})),
	}));

	const mails = () =>
		pgBossService.sendJob.mock.calls
			.filter(([name]) => name === SendEmailJob.jobName)
			.map(([, job]) => job.payload as SendEmailJobPayload);

	const items = () => [
		// New and critical: alerts
		{
			reviewId: 'r-critical',
			placeId: won.placeId,
			publishedAtDate: daysAgo(2),
			stars: 2,
			text: 'Das Fleisch war trocken.',
			textTranslated: 'The meat was dry.',
			originalLanguage: 'de',
			totalScore: 4.3,
			reviewsCount: 512,
		},
		// Five stars: no alert
		{ reviewId: 'r-happy', placeId: won.placeId, publishedAtDate: daysAgo(3), stars: 5, text: 'Super!' },
		// Stars only: nothing to answer
		{ reviewId: 'r-stars-only', placeId: won.placeId, publishedAtDate: daysAgo(3), stars: 1 },
		// Older than the window: not kept
		{ reviewId: 'r-old', placeId: won.placeId, publishedAtDate: daysAgo(30), stars: 1, text: 'Old news' },
	];

	const runWatch = async () => {
		const run = await pipeline.queue(city.id, PipelineStepEnum.WATCH_REVIEWS, '2026-10');
		await pipeline.execute(run.id);
		return harness.orm.em.fork().findOneOrFail(PipelineRun, { id: run.id });
	};

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				BrandService,
				PipelineService,
				ReviewWatchCron,
				CityService,
				ReviewService,
				VenueService,
				ProspectQueryService,
				OutreachService,
				ReviewAlertService,
				EmailService,
				{ provide: ApifyService, useValue: { runActor } },
				{ provide: PgBossService, useValue: pgBossService },
				{ provide: ReviewAnalysisAgent, useValue: analysisAgent },
				{ provide: ReviewReplyAgent, useValue: replyAgent },
			],
		});
		pipeline = harness.moduleRef.get(PipelineService);
		alerts = harness.moduleRef.get(ReviewAlertService);
		outreach = harness.moduleRef.get(OutreachService);
		entityManagerManager.setEntityManager(harness.orm.em);

		const em = harness.orm.em;
		city = cityFactory.build({ name: 'Berlin', cronEnabled: true });
		cityFactory.build({ name: 'Nobody subscribed', cronEnabled: true });
		won = em.create(Venue, {
			city,
			placeId: 'place-won',
			name: 'Imbiss Won',
			googleUrl: 'https://maps.google.com/?cid=1',
		});
		lost = em.create(Venue, { city, placeId: 'place-lost', name: 'Imbiss Lost' });
		await em.flush();
		const wonProspect = await outreach.add(won.brand.id, {
			contactEmail: 'owner@won.de',
			contactName: 'Mehmet',
		});
		await outreach.update(wonProspect.id, { stage: ProspectStageEnum.WON, language: 'de' });
		const lostProspect = await outreach.add(lost.brand.id, { contactEmail: 'owner@lost.de' });
		await outreach.update(lostProspect.id, { stage: ProspectStageEnum.LOST });
		runActor.mockImplementation(async () => items() as never);
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(() => {
		pgBossService.sendJob.mockClear();
		published.length = 0;
	});

	it('queues a run only for a city with a subscriber', async () => {
		await harness.moduleRef.get(ReviewWatchCron).handleCron();
		const runs = await harness.orm.em
			.fork()
			.find(PipelineRun, { step: PipelineStepEnum.WATCH_REVIEWS }, { populate: ['city'] });
		expect(runs.map(r => [r.city.id, r.status])).toEqual([[city.id, PipelineRunStatusEnum.QUEUED]]);
		expect(pgBossService.sendJob).toHaveBeenCalledTimes(1);
	});

	it("scrapes only the won prospect's venue, ten days back, and alerts on the critical review", async () => {
		const run = await runWatch();
		expect(run.status).toBe(PipelineRunStatusEnum.SUCCEEDED);

		expect(runActor).toHaveBeenCalledTimes(1);
		const [, input, options] = runActor.mock.calls[0];
		expect((input as { placeIds: string[] }).placeIds).toEqual(['place-won']);
		expect((input as { reviewsStartDate: string }).reviewsStartDate).toBe(
			daysAgo(REVIEW_WATCH_DAYS).slice(0, 10),
		);
		expect(options.maxCostUsd).toBe(1);

		const saved = await harness.orm.em.fork().find(Review, {}, { orderBy: { reviewId: 'asc' } });
		expect(saved.map(r => r.reviewId)).toEqual(['r-critical', 'r-happy', 'r-stars-only']);
		const critical = saved.find(r => r.reviewId === 'r-critical')!;
		expect(critical.alertedAt).toBeInstanceOf(Date);
		expect(critical.analysedAt).toBeInstanceOf(Date);
		expect(published).toEqual([{ name: ReviewAlertEvent.eventName, reviewId: critical.id }]);
		expect(Object.values(run.result!)[0]).toMatchObject({ venues: 1, saved: 3, alerted: 1 });
	});

	it('alerts a review once, however often the watch sees it', async () => {
		await runWatch();
		expect(runActor).toHaveBeenCalledTimes(2);
		expect(published).toEqual([]);
	});

	it('mails the owner the review with a reply draft, in their language, and logs it', async () => {
		const critical = await harness.orm.em.fork().findOneOrFail(Review, { reviewId: 'r-critical' });
		expect(await alerts.send(critical.id)).toBe(true);

		const [mail, ...rest] = mails();
		expect(rest).toHaveLength(0);
		expect(mail.to).toEqual({ email: 'owner@won.de', name: 'Mehmet' });
		expect(mail.subject).toBe('Imbiss Won: eine 2-Sterne-Bewertung zum Beantworten');
		expect(mail.html).toContain('Das Fleisch war trocken.');
		expect(mail.html).toContain('Danke, das schauen wir uns an.');
		expect(mail.html).toContain('https://maps.google.com/?cid=1');
		expect(mail.text).toContain(`/portal/${won.brand.id}/reviews`);
		expect(replyAgent.generate).toHaveBeenCalledTimes(1);

		const stored = await harness.orm.em.fork().findOneOrFail(Review, { id: critical.id });
		expect(stored.replyDraft).toBe('Danke, das schauen wir uns an.');
		const touches = await harness.orm.em
			.fork()
			.find(OutreachTouch, { template: REVIEW_ALERT_TEMPLATE });
		expect(touches).toHaveLength(1);
	});

	it('mails nothing to a venue that is no longer subscribed', async () => {
		const em = harness.orm.em;
		const review = em.create(Review, {
			reviewId: 'r-lost',
			venue: lost,
			publishedAt: new Date(),
			stars: 1,
			text: 'Bad',
		});
		await em.flush();
		expect(await alerts.send(review.id)).toBe(false);
		expect(mails()).toHaveLength(0);
	});
});
