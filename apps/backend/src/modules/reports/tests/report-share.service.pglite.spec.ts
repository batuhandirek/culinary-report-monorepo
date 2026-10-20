import { NotFoundException } from '@nestjs/common';

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { userFactory } from 'src/modules/auth/tests/factories/user.factory.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { SharedReportsController } from '../controllers/shared-reports.controller.js';
import { Report } from '../entities/report.entity.js';
import { ReportShare } from '../entities/report-share.entity.js';
import type { ReportData, ReportHighlights } from '../interfaces/report-data.interface.js';
import { ReportShareService } from '../services/report-share.service.js';

describe('ReportShareService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: ReportShareService;
	let controller: SharedReportsController;
	let reportCount = 0;

	const newReport = async () => {
		const em = harness.orm.em;
		const venue = em.create(Venue, {
			city: testCity(em),
			placeId: `place-${reportCount}`,
			name: `Venue ${reportCount}`,
		});
		// Saved first: the venue gets its brand
		await em.flush();
		const report = em.create(Report, {
			brand: venue.brand,
			city: venue.city,
			month: '2026-09',
			// The share logic never reads the report's body
			data: {} as ReportData,
			highlights: { title: 'T', headline: `Report ${reportCount++}` } as ReportHighlights,
		});
		await em.flush();
		return report;
	};

	const reload = (share: ReportShare) =>
		harness.orm.em.fork().findOneOrFail(ReportShare, { id: share.id });

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [ReportShareService, SharedReportsController],
		});
		service = harness.moduleRef.get(ReportShareService);
		controller = harness.moduleRef.get(SharedReportsController);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('makes an unguessable URL-safe token and finds the report by it', async () => {
		const report = await newReport();
		const admin = await userFactory.admin().create();

		const share = await service.create(report.id, admin.id);
		const other = await service.create(report.id);

		expect(share.token).toMatch(/^[A-Za-z0-9_-]{22}$/);
		expect(other.token).not.toBe(share.token);
		expect(share.createdBy?.firstName).toBe(admin.firstName);
		expect(other.createdBy).toBeNull();
		expect(share.openCount).toBe(0);

		const found = await service.findReport(share.token);
		expect(found.id).toBe(report.id);
		expect(found.brand.name).toBe(report.brand.name);
		expect(found.city?.name).toBe(report.city?.name);
	});

	it('answers 404 for an unknown token', async () => {
		await expect(service.findReport('x'.repeat(22))).rejects.toBeInstanceOf(NotFoundException);
		await expect(service.recordOpen('x'.repeat(22))).rejects.toBeInstanceOf(NotFoundException);
	});

	it('counts every open, concurrent ones too, and when the last was', async () => {
		const share = await service.create((await newReport()).id);
		const at = new Date('2026-10-17T10:00:00Z');

		await Promise.all([
			service.recordOpen(share.token, at),
			service.recordOpen(share.token, at),
			service.recordOpen(share.token, at),
		]);

		const counted = await reload(share);
		expect(counted.openCount).toBe(3);
		expect(counted.lastOpenedAt).toEqual(at);
	});

	it('does not count an admin checking the link, but does count anyone else', async () => {
		const share = await service.create((await newReport()).id);

		await controller.recordSharedReportOpen(share.token, [
			UserRoleEnum.USER,
			UserRoleEnum.ADMIN,
		]);
		expect((await reload(share)).openCount).toBe(0);

		await controller.recordSharedReportOpen(share.token, undefined);
		await controller.recordSharedReportOpen(share.token, [UserRoleEnum.USER]);
		expect((await reload(share)).openCount).toBe(2);
	});

	it('answers 404 once revoked, and keeps the first revocation time', async () => {
		const report = await newReport();
		const share = await service.create(report.id);
		await service.recordOpen(share.token);

		const revoked = await service.revoke(report.id, share.id);
		const firstRevokedAt = revoked.revokedAt;
		expect(firstRevokedAt).toBeInstanceOf(Date);
		expect((await service.revoke(report.id, share.id)).revokedAt).toEqual(firstRevokedAt);

		await expect(service.findReport(share.token)).rejects.toBeInstanceOf(NotFoundException);
		await expect(service.recordOpen(share.token)).rejects.toBeInstanceOf(NotFoundException);
		await expect(controller.getSharedReport(share.token)).rejects.toBeInstanceOf(
			NotFoundException,
		);
		// The count stays on record
		expect((await reload(share)).openCount).toBe(1);
	});

	it('revokes only a link of that report', async () => {
		const share = await service.create((await newReport()).id);
		const otherReport = await newReport();
		await expect(service.revoke(otherReport.id, share.id)).rejects.toThrow();
		expect((await reload(share)).revokedAt).toBeNull();
	});

	it('lists a report’s links newest first, revoked ones included', async () => {
		const report = await newReport();
		const first = await service.create(report.id);
		const second = await service.create(report.id);
		await service.revoke(report.id, first.id);

		const listed = await service.list(report.id);
		expect(listed.map(s => s.id)).toEqual([second.id, first.id]);
		expect(listed[1].revokedAt).toBeInstanceOf(Date);
	});

	it('ensureShare reuses the live link and makes a new one when all are revoked', async () => {
		const report = await newReport();
		const made = await service.ensureShare(report.id);
		expect((await service.ensureShare(report.id)).id).toBe(made.id);

		await service.revoke(report.id, made.id);
		const fresh = await service.ensureShare(report.id);
		expect(fresh.id).not.toBe(made.id);
		expect(fresh.revokedAt).toBeFalsy();
	});
});
