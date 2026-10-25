import { BadRequestException } from '@nestjs/common';

import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ReportReadyEmail, type ReportReadyEmailProps } from 'emails';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { SendEmailJob, SendEmailJobPayload } from 'src/modules/email/jobs/send-email.job.js';
import { EmailService } from 'src/modules/email/services/email.service.js';
import { renderEmail } from 'src/modules/email/util/render-email.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { ReportHighlightsAgent } from 'src/modules/reports/agents/report-highlights.agent.js';
import { ReviewReplyAgent } from 'src/modules/reports/agents/review-reply.agent.js';
import { Report } from 'src/modules/reports/entities/report.entity.js';
import { ReportShare } from 'src/modules/reports/entities/report-share.entity.js';
import { ReportBuiltEvent } from 'src/modules/reports/persisted-events/report-built.persisted-event.js';
import { ReportService } from 'src/modules/reports/services/report.service.js';
import { ReportConfigService } from 'src/modules/reports/services/report-config.service.js';
import { ReportTemplateService } from 'src/modules/reports/services/report-template.service.js';
import { ReportShareService } from 'src/modules/reports/services/report-share.service.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { CompetitorService } from 'src/modules/venues/services/competitor.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { mockAgent } from 'src/tests/mock-agent.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { OutreachTouchKindEnum, ProspectStageEnum } from '../constants/outreach.constant.js';
import { OutreachTouch } from '../entities/outreach-touch.entity.js';
import type { ProspectDetails } from '../services/outreach.service.js';
import { OutreachService } from '../services/outreach.service.js';
import {
	REPORT_READY_TEMPLATE,
	ReportDeliveryService,
} from '../services/report-delivery.service.js';

const HIGHLIGHTS = {
	title: 'The spit decides the stars',
	headline: 'Reviews held back on the meat.',
	highlights: [
		{ title: 'Meat', text: 'Dry, say 9 of 14.' },
		{ title: 'Creators', text: '6 posts.' },
		{ title: 'Replies', text: 'None to critics.' },
		{ title: 'Fourth', text: 'Left out of the mail.' },
	],
	actions: [],
};

/* A build publishes `report-built`; the outreach side mails a won prospect with an address,
 * once. The mail queue is watched, never sent. The fake bus hands the event straight to the
 * worker's service, as pg-boss would. */
describe('Report e-mail delivery (pglite)', () => {
	let harness: PgliteTestingModule;
	let reports: ReportService;
	let outreach: OutreachService;
	let delivery: ReportDeliveryService;
	const pgBossService = {
		sendJob: jest.fn<PgBossService['sendJob']>(async () => undefined),
		publish: jest.fn(async (name: string, event: { payload: unknown }) => {
			if (name === ReportBuiltEvent.eventName)
				await delivery.deliverBuilt((event.payload as { reportId: string }).reportId);
		}),
	};
	const mails = () =>
		pgBossService.sendJob.mock.calls
			.filter(([name]) => name === SendEmailJob.jobName)
			.map(([, job]) => job.payload as SendEmailJobPayload);

	let venueCount = 0;
	const prospectOf = async (stage: ProspectStageEnum, details: ProspectDetails) => {
		const em = harness.orm.em;
		const venue = em.create(Venue, {
			city: testCity(em),
			placeId: `place-${venueCount}`,
			name: `Imbiss ${venueCount++}`,
		});
		await em.flush();
		const prospect = await outreach.add(venue.brand.id, details);
		if (stage !== prospect.stage) await outreach.update(prospect.id, { stage });
		return { venue, prospect };
	};
	const touchesOf = (prospectId: string) =>
		harness.orm.em.fork().find(OutreachTouch, {
			prospect: prospectId,
			kind: { $ne: OutreachTouchKindEnum.STAGE },
		});

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				BrandService,
				CityService,
				ReportService,
				ReportConfigService,
				ReportTemplateService,
				CompetitorService,
				ReportShareService,
				OutreachService,
				ReportDeliveryService,
				EmailService,
				{ provide: ReportHighlightsAgent, useValue: mockAgent(HIGHLIGHTS) },
				{ provide: ReviewReplyAgent, useValue: mockAgent({ replies: [] }) },
				{ provide: PgBossService, useValue: pgBossService },
			],
		});
		reports = harness.moduleRef.get(ReportService);
		outreach = harness.moduleRef.get(OutreachService);
		delivery = harness.moduleRef.get(ReportDeliveryService);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(() => {
		pgBossService.sendJob.mockClear();
		pgBossService.publish.mockClear();
	});

	it('mails a won prospect with an address once per report, and logs it', async () => {
		const { venue, prospect } = await prospectOf(ProspectStageEnum.WON, {
			contactEmail: 'owner@imbiss.de',
			contactName: 'Mehmet',
		});

		const report = await reports.build(venue.brand.id, venue.city.id, '2026-09');

		expect(pgBossService.publish).toHaveBeenCalledWith(ReportBuiltEvent.eventName, {
			payload: { reportId: report.id },
		});
		const [mail, ...rest] = mails();
		expect(rest).toHaveLength(0);
		expect(mail.to).toEqual({ email: 'owner@imbiss.de', name: 'Mehmet' });
		expect(mail.subject).toBe(`${venue.name}: your September 2026 report`);
		expect(mail.html).toContain('The spit decides the stars');
		expect(mail.html).toContain('Dry, say 9 of 14.');
		expect(mail.html).not.toContain('Left out of the mail.');
		expect(mail.text).toMatch(/\/r\/[A-Za-z0-9_-]{22}/);

		const touches = await touchesOf(prospect.id);
		expect(touches).toHaveLength(1);
		expect(touches[0]).toMatchObject({
			kind: OutreachTouchKindEnum.EMAIL,
			template: REPORT_READY_TEMPLATE,
			subject: mail.subject,
		});
		expect(mail.text).toContain(touches[0].body!);
		const stored = await harness.orm.em.fork().findOneOrFail(Report, { id: report.id });
		expect(stored.sentAt).toBeInstanceOf(Date);

		// A rebuild (a correction) doesn't mail the same month again
		await reports.build(venue.brand.id, venue.city.id, '2026-09');
		expect(mails()).toHaveLength(1);
		expect(await touchesOf(prospect.id)).toHaveLength(1);
	});

	it("mails a chain each city's report: each is the newest of its city", async () => {
		const em = harness.orm.em;
		const { venue, prospect } = await prospectOf(ProspectStageEnum.WON, { contactEmail: 'chain@imbiss.de' });
		const hamburg = testCity(em, { name: 'Hamburg' });
		em.create(Venue, { city: hamburg, brand: venue.brand, placeId: `place-${venueCount++}`, name: venue.name });
		await em.flush();

		await reports.build(venue.brand.id, venue.city.id, '2026-09');
		await reports.build(venue.brand.id, hamburg.id, '2026-09');

		expect(mails()).toHaveLength(2);
		expect(await touchesOf(prospect.id)).toHaveLength(2);
	});

	it("mails each of the newest month's configurations its own report", async () => {
		const { venue, prospect } = await prospectOf(ProspectStageEnum.WON, { contactEmail: 'two@imbiss.de' });
		const configs = harness.moduleRef.get(ReportConfigService);
		await configs.create(venue.brand.id, { name: 'Full' });
		await configs.create(venue.brand.id, { name: 'Reviews' });

		const built = await reports.buildAll(venue.brand.id, venue.city.id, '2026-09');

		expect(built).toHaveLength(2);
		expect(mails()).toHaveLength(2);
		expect(await touchesOf(prospect.id)).toHaveLength(2);
	});

	it('mails nobody for a prospect that has not subscribed', async () => {
		const { venue, prospect } = await prospectOf(ProspectStageEnum.CONTACTED, {
			contactEmail: 'maybe@imbiss.de',
		});

		await reports.build(venue.brand.id, venue.city.id, '2026-09');

		expect(mails()).toHaveLength(0);
		expect(await touchesOf(prospect.id)).toHaveLength(0);
	});

	it('mails nobody for a won prospect without an address', async () => {
		const { venue, prospect } = await prospectOf(ProspectStageEnum.WON, {});

		const report = await reports.build(venue.brand.id, venue.city.id, '2026-09');

		expect(mails()).toHaveLength(0);
		expect(await touchesOf(prospect.id)).toHaveLength(0);
		await expect(delivery.sendNow(report.id)).rejects.toBeInstanceOf(BadRequestException);
	});

	it('mails nothing for a backfilled older month', async () => {
		const { venue } = await prospectOf(ProspectStageEnum.WON, { contactEmail: 'a@imbiss.de' });
		await reports.build(venue.brand.id, venue.city.id, '2026-09');
		pgBossService.sendJob.mockClear();

		await reports.build(venue.brand.id, venue.city.id, '2026-07');

		expect(mails()).toHaveLength(0);
	});

	it('sends again on "Send now", in German for a German prospect', async () => {
		const { venue, prospect } = await prospectOf(ProspectStageEnum.WON, {
			contactEmail: 'chef@imbiss.de',
			language: 'de',
		});
		const report = await reports.build(venue.brand.id, venue.city.id, '2026-09');

		const sent = await delivery.sendNow(report.id);

		const [first, second] = mails();
		expect(second.subject).toBe(first.subject);
		expect(first.subject).toBe(`${venue.name}: Ihr Bericht für September 2026`);
		expect(first.html).toContain('Bericht öffnen');
		expect(sent.sentAt).toBeInstanceOf(Date);
		expect(await touchesOf(prospect.id)).toHaveLength(2);
	});

	it('refuses "Send now" to a prospect that has not subscribed', async () => {
		const { venue } = await prospectOf(ProspectStageEnum.REPLIED, {
			contactEmail: 'x@imbiss.de',
		});
		const report = await reports.build(venue.brand.id, venue.city.id, '2026-09');

		await expect(delivery.sendNow(report.id)).rejects.toBeInstanceOf(BadRequestException);
		expect(mails()).toHaveLength(0);
	});

	it('links each report mail to the report and a link of its own, whose opens are that mail’s', async () => {
		const { venue, prospect } = await prospectOf(ProspectStageEnum.WON, { contactEmail: 'links@imbiss.de' });
		const report = await reports.build(venue.brand.id, venue.city.id, '2026-09');
		await delivery.sendNow(report.id);
		// The admin's own link to the report (copied from the report page) is another one again
		const copied = await harness.moduleRef.get(ReportShareService).create(report.id);

		const touches = await harness.orm.em
			.fork()
			.find(
				OutreachTouch,
				{ prospect: prospect.id, kind: OutreachTouchKindEnum.EMAIL },
				{ populate: ['report', 'share'], orderBy: { createdAt: 'asc' } },
			);
		expect(touches.map(t => t.report?.id)).toEqual([report.id, report.id]);
		const [built, resent] = touches.map(t => t.share!);
		expect(new Set([built.id, resent.id, copied.id]).size).toBe(3);
		expect(touches[0].body).toContain(built.token);

		const shares = harness.moduleRef.get(ReportShareService);
		await shares.recordOpen(built.token);
		await shares.recordOpen(built.token);
		await shares.recordOpen(copied.token);
		const opens = async (id: string) => (await harness.orm.em.fork().findOneOrFail(ReportShare, { id })).openCount;
		expect([await opens(built.id), await opens(resent.id), await opens(copied.id)]).toEqual([2, 0, 1]);
	});

	it('renders the template in English and German', async () => {
		const props: ReportReadyEmailProps = ReportReadyEmail.PreviewProps;
		const de: ReportReadyEmailProps = { ...props, language: 'de', contactName: null };
		const en = await renderEmail(ReportReadyEmail, props);
		const deMail = await renderEmail(ReportReadyEmail, de);

		expect(en.html).toContain('lang="en"');
		expect(en.text).toContain('Hi Mehmet,');
		expect(en.text).toContain('Open the report');
		expect(en.text).toContain('Reply “stop”');
		expect(deMail.html).toContain('lang="de"');
		expect(deMail.text).toContain('Guten Tag,');
		expect(deMail.text).toContain('Der Bericht selbst ist auf Englisch.');
		expect(deMail.text).toContain('„Stopp“');
		for (const mail of [en, deMail]) expect(mail.html).not.toMatch(/hesab|pazaryeri/);
	});
});
