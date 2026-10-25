import { CanActivate, ForbiddenException, NotFoundException } from '@nestjs/common';

import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { randomUUID } from 'crypto';

import { ExceptionCodes } from 'exceptions';

import { BrandAccessGuard } from 'src/modules/auth/guards/brand-access.guard.js';
import { UserService } from 'src/modules/auth/services/user.service.js';
import { BrandMemberService } from 'src/modules/auth/services/brand-member.service.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { EmailService } from 'src/modules/email/services/email.service.js';
import { Prospect } from 'src/modules/outreach/entities/prospect.entity.js';
import { OutreachService } from 'src/modules/outreach/services/outreach.service.js';
import { Report } from 'src/modules/reports/entities/report.entity.js';
import type {
	ReportData,
	ReportHighlights,
} from 'src/modules/reports/interfaces/report-data.interface.js';
import { ReportService } from 'src/modules/reports/services/report.service.js';
import { ReportConfigService } from 'src/modules/reports/services/report-config.service.js';
import { ReportTemplateService } from 'src/modules/reports/services/report-template.service.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { PortalController } from '../controllers/portal.controller.js';
import { PortalService } from '../services/portal.service.js';

describe('the portal API (pglite)', () => {
	let harness: PgliteTestingModule;
	let controller: PortalController;
	let members: BrandMemberService;
	let count = 0;

	const emailService = { queueEmail: jest.fn<EmailService['queueEmail']>(async () => undefined) };

	const newVenue = async (name: string) => {
		const venue = harness.orm.em.create(Venue, { city: testCity(harness.orm.em), placeId: `place-${count++}`, name });
		await harness.orm.em.flush();
		return venue;
	};

	const newReport = async (venue: Venue, month: string) => {
		const report = harness.orm.em.create(Report, {
			brand: venue.brand,
			city: venue.city,
			month,
			data: {} as ReportData,
			highlights: { title: `Title ${month}`, headline: `Headline ${month}` } as ReportHighlights,
		});
		await harness.orm.em.flush();
		return report;
	};

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				BrandService,
				CityService,
				PortalController,
				PortalService,
				ReportService,
				ReportConfigService,
				ReportTemplateService,
				OutreachService,
				BrandMemberService,
				UserService,
				{ provide: EmailService, useValue: emailService },
			],
		});
		controller = harness.moduleRef.get(PortalController);
		members = harness.moduleRef.get(BrandMemberService);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it("lists the person's brands by name, each with its branches and cities", async () => {
		const zebra = await newVenue('Zebra Bar');
		const anker = await newVenue('Anker Café');
		await newVenue('Not theirs');
		// Anker is a chain: a second branch, in another city, the most reviewed
		const second = harness.orm.em.create(Venue, {
			city: testCity(harness.orm.em, { name: 'Hamburg' }),
			placeId: `place-${count++}`,
			name: 'Anker Café Altona',
			brand: anker.brand,
			reviewsCount: 500,
		});
		await harness.orm.em.flush();
		await members.invite({ brandId: zebra.brand.id, email: 'two@example.com' });
		const member = await members.invite({ brandId: anker.brand.id, email: 'two@example.com' });

		const { items } = await controller.listPortalBrands(member.user.id);
		expect(items.map(item => item.brand.name)).toEqual(['Anker Café', 'Zebra Bar']);
		expect(items[0].brand.branches.map(b => b.id)).toEqual([second.id, anker.id]);
		expect(items[0].brand.cities.map(c => c.name).sort()).toEqual(['Berlin', 'Hamburg']);
		expect((await controller.getPortalBrand(anker.brand.id)).branches).toHaveLength(2);
	});

	it("lists a brand's months newest first, with their city, and none of another's", async () => {
		const venue = await newVenue('Months');
		const other = await newVenue('Other months');
		await newReport(venue, '2026-08');
		await newReport(venue, '2026-09');
		await newReport(other, '2026-09');

		const { items } = await controller.listPortalReports(venue.brand.id);
		expect(items.map(item => item.month)).toEqual(['2026-09', '2026-08']);
		expect(items[0]).toMatchObject({
			title: 'Title 2026-09',
			headline: 'Headline 2026-09',
			city: { id: venue.city.id, name: venue.city.name },
		});
	});

	it("refuses another brand's report and says when one does not exist", async () => {
		const venue = await newVenue('Mine');
		const other = await newVenue('Theirs');
		const mine = await newReport(venue, '2026-09');
		const theirs = await newReport(other, '2026-09');

		expect((await controller.getPortalReport(venue.brand.id, mine.id)).id).toBe(mine.id);
		await expect(controller.getPortalReport(venue.brand.id, theirs.id)).rejects.toMatchObject({
			response: { code: ExceptionCodes.NO_BRAND_ACCESS },
		});
		await expect(controller.getPortalReport(venue.brand.id, theirs.id)).rejects.toBeInstanceOf(
			ForbiddenException,
		);
		await expect(controller.getPortalReport(venue.brand.id, randomUUID())).rejects.toBeInstanceOf(
			NotFoundException,
		);
	});

	it("reads and writes the report's address and language on the outreach record", async () => {
		const venue = await newVenue('Settings');
		harness.orm.em.create(Prospect, { brand: venue.brand, contactEmail: 'old@settings.de' });
		await harness.orm.em.flush();

		expect(await controller.getPortalSettings(venue.brand.id)).toEqual({
			contactEmail: 'old@settings.de',
			language: 'en',
			editable: true,
		});
		expect(
			await controller.updatePortalSettings(venue.brand.id, {
				contactEmail: 'New@Settings.de',
				language: 'de',
			}),
		).toEqual({ contactEmail: 'new@settings.de', language: 'de', editable: true });

		const plain = await newVenue('No record');
		expect(await controller.getPortalSettings(plain.brand.id)).toEqual({
			language: 'en',
			editable: false,
		});
		await expect(
			controller.updatePortalSettings(plain.brand.id, { language: 'de' }),
		).rejects.toBeInstanceOf(NotFoundException);
	});

	it('guards every brand route with BrandAccessGuard', () => {
		const proto = PortalController.prototype as unknown as Record<string, object>;
		const brandRoutes = Object.getOwnPropertyNames(PortalController.prototype).filter(name => {
			const path: string | undefined = Reflect.getMetadata('path', proto[name]);
			return path?.includes(':brandId');
		});
		expect(brandRoutes.length).toBeGreaterThan(5);
		for (const name of brandRoutes) {
			const guards: CanActivate[] = Reflect.getMetadata('__guards__', proto[name]) ?? [];
			expect(guards).toContain(BrandAccessGuard);
		}
	});
});
