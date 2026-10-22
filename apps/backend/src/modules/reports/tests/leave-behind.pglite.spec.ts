import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import type { Response } from 'express';

import { userFactory } from 'src/modules/auth/tests/factories/user.factory.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { AdminReportsController } from '../controllers/admin.reports.controller.js';
import { Report } from '../entities/report.entity.js';
import { ReportShare } from '../entities/report-share.entity.js';
import type { ReportData, ReportHighlights } from '../interfaces/report-data.interface.js';
import type { LeaveBehindData } from '../interfaces/leave-behind.interface.js';
import { ReportPdfService } from '../services/report-pdf.service.js';
import { ReportShareService } from '../services/report-share.service.js';
import { leaveBehindQr } from '../util/leave-behind.js';

describe('The leave-behind (pglite)', () => {
	let harness: PgliteTestingModule;
	let controller: AdminReportsController;
	const renderLeaveBehind = jest.fn(async (_data: LeaveBehindData) => new Uint8Array([0x25, 0x50]));

	const fakeResponse = () => {
		const headers: Record<string, string> = {};
		let body: Buffer | undefined;
		const res = {
			setHeader: (name: string, value: string) => {
				headers[name] = value;
			},
			send: (data: Buffer) => {
				body = data;
			},
		} as unknown as Response;
		return { res, headers, body: () => body };
	};

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				AdminReportsController,
				ReportShareService,
				{ provide: ReportPdfService, useValue: { renderLeaveBehind } },
			],
		});
		controller = harness.moduleRef.get(AdminReportsController);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('draws the share link as a QR code with no network', () => {
		const svg = leaveBehindQr('https://culinaryreport.com/r/abcdefghijklmnopqrstuv');
		expect(svg.startsWith('<svg')).toBe(true);
		expect(svg).toContain('<path');
	});

	it('prints the cover, three findings, the brand and a QR code to the live share link', async () => {
		const em = harness.orm.em;
		const venue = em.create(Venue, {
			city: testCity(em, { name: 'Berlin' }),
			placeId: 'place-lb-1',
			name: 'Döner Pro',
		});
		await em.flush();
		const report = em.create(Report, {
			brand: venue.brand,
			city: venue.city,
			month: '2026-09',
			data: {} as ReportData,
			highlights: {
				title: 'Lunch crowds, quiet evenings',
				headline: 'Twelve creators posted about you in September.',
				highlights: [
					{ title: 'Creators came for the dürüm', text: '8 of 12 posts named it.' },
					{ title: 'Evenings are slow', text: 'Reviews after 19:00 mention waiting.' },
					{ title: 'Replies are rare', text: '2 of 19 reviews got an answer.' },
					{ title: 'A fourth finding', text: 'Does not fit on the page.' },
				],
				actions: [],
			} as ReportHighlights,
		});
		await em.flush();
		const admin = await userFactory
			.admin()
			.create({ firstName: 'Batu', lastName: 'D', email: 'batu@culinaryreport.com' });

		const { res, headers, body } = fakeResponse();
		await controller.getReportLeaveBehindPdf(report.id, admin.id, res);

		expect(headers['Content-Type']).toBe('application/pdf');
		expect(headers['Content-Disposition']).toContain('leave-behind-2026-09.pdf');
		expect(body()).toEqual(Buffer.from([0x25, 0x50]));

		const share = await em.fork().findOneOrFail(ReportShare, { report: report.id });
		expect(share.revokedAt).toBeNull();
		expect(share.createdBy?.id).toBe(admin.id);
		const data = renderLeaveBehind.mock.calls.at(-1)![0];
		expect(data).toMatchObject({
			reportId: report.id,
			month: '2026-09',
			brand: 'Döner Pro',
			city: 'Berlin',
			title: 'Lunch crowds, quiet evenings',
			headline: 'Twelve creators posted about you in September.',
			shareUrl: expect.stringMatching(new RegExp(`/r/${share.token}$`)),
			contact: { name: 'Batu D', email: admin.email },
		});
		expect(data.findings).toHaveLength(3);
		expect(data.findings[2]).toEqual({ title: 'Replies are rare', text: '2 of 19 reviews got an answer.' });
		expect(data.qrSvg.startsWith('<svg')).toBe(true);

		// Printing again reuses the live link, so every scan counts on the same share
		await controller.getReportLeaveBehindPdf(report.id, admin.id, fakeResponse().res);
		expect(renderLeaveBehind.mock.calls.at(-1)![0].shareUrl).toBe(data.shareUrl);
		expect(await em.fork().count(ReportShare, { report: report.id })).toBe(1);
	});
});
