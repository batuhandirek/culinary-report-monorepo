import type { CanActivate } from '@nestjs/common';

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { BrandAccessGuard } from 'src/modules/auth/guards/brand-access.guard.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { OutreachService } from 'src/modules/outreach/services/outreach.service.js';
import { BrandReportConfig } from 'src/modules/reports/entities/brand-report-config.entity.js';
import { Report } from 'src/modules/reports/entities/report.entity.js';
import type {
	ReportData,
	ReportHighlights,
	ReportPost,
	ReportReviewItem,
} from 'src/modules/reports/interfaces/report-data.interface.js';
import type { ReportCorrelations } from 'src/modules/reports/interfaces/report-signals.interface.js';
import { ReportService } from 'src/modules/reports/services/report.service.js';
import { ReportConfigService } from 'src/modules/reports/services/report-config.service.js';
import { ReportTemplateService } from 'src/modules/reports/services/report-template.service.js';
import { OwnAccountService } from 'src/modules/social/services/own-account.service.js';
import { SocialAccountService } from 'src/modules/social/services/social-account.service.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { VenueBusyness } from 'src/modules/venues/entities/venue-busyness.entity.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { VenueBusynessService } from 'src/modules/venues/services/venue-busyness.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { PortalController } from '../controllers/portal.controller.js';
import { PortalService } from '../services/portal.service.js';

/* The Patterns page: each month's stored relations (absent where the report has none or there
 * is no report), and the weeks across months from the reports' posts, reviews and evenings plus
 * the busyness samples, a week spanning two reports summed, one with an unreported month partial. */

const post = (postedAt: string, views: number) => ({ postedAt, views }) as ReportPost;
const review = (publishedAt: string, platform?: 'tripadvisor') =>
	({ reviewId: publishedAt, publishedAt, replied: false, ...(platform && { platform }) }) as ReportReviewItem;

const CORRELATIONS: ReportCorrelations = {
	buzzToReviews: {
		weeks: [{ week: '2026-08-31', posts: 2, views: 1100, reviews: 2 }],
		baselinePerWeek: 1.5,
		peakWeek: '2026-08-31',
		followingWeek: '2026-09-07',
		followingReviews: 4,
		ratio: 2.7,
		sentence: 'The 2 posts in the week of 31 Aug (1,100 views) were followed by 4 new Google reviews the week after, 2.7× your usual 1.5 a week.',
	},
	paidVsOrganic: {
		paid: { posts: 1, medianViews: 1000, reviewsAfter: 3 },
		organic: { posts: 1, medianViews: 50, reviewsAfter: 1 },
		sentence: 'Paid or gifted posts (1) drew a median 1,000 views against 50 for organic ones (1).',
	},
};

describe('the portal patterns (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: PortalService;
	let venue: Venue;
	const now = new Date('2026-10-17T12:00:00Z');

	const addReport = (month: string, data: Partial<ReportData>) =>
		harness.orm.em.create(Report, {
			brand: venue.brand,
			city: venue.city,
			month,
			data: { month, ...data } as ReportData,
			highlights: { title: 'T', headline: 'H', highlights: [], actions: [] } as ReportHighlights,
		});

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [BrandService, CityService, PortalService, ReportService, ReportConfigService, ReportTemplateService, OutreachService, VenueBusynessService, OwnAccountService, SocialAccountService],
		});
		service = harness.moduleRef.get(PortalService);
		entityManagerManager.setEntityManager(harness.orm.em);
		const em = harness.orm.em;

		venue = em.create(Venue, { city: testCity(em), placeId: 'patterns-venue', name: 'Patterns Venue' });
		// Saved first: the venue gets its brand
		await em.flush();
		// An old report: posts, but no review list and no relations
		addReport('2026-07', { posts: [post('2026-07-22T10:00:00Z', 30)] });
		// No relations (below the floors), but its posts and reviews count by week
		addReport('2026-08', {
			posts: [post('2026-08-31T10:00:00Z', 100)],
			reviews: { list: [review('2026-08-31T12:00:00Z')] } as unknown as ReportData['reviews'],
		});
		addReport('2026-09', {
			posts: [post('2026-09-02T10:00:00Z', 1000), post('2026-09-15T10:00:00Z', 50)],
			reviews: {
				list: [review('2026-09-01T09:00:00Z'), review('2026-09-02T09:00:00Z', 'tripadvisor')],
			} as unknown as ReportData['reviews'],
			branches: [
				{
					venueId: venue.id,
					demand: {
						platform: 'thefork',
						booked: 75,
						evenings: [
							{ date: '2026-09-04', booked: 50 },
							{ date: '2026-09-05', booked: 100 },
						],
					},
				} as ReportData['branches'][number],
			],
			correlations: CORRELATIONS,
		});
		em.create(VenueBusyness, { venue, sampledAt: new Date('2026-09-03T17:00:00Z'), histogram: null, busynessIndex: 60 });
		em.create(VenueBusyness, { venue, sampledAt: new Date('2026-09-05T17:00:00Z'), histogram: null, busynessIndex: 80 });
		// No popular times: not a busyness value
		em.create(VenueBusyness, { venue, sampledAt: new Date('2026-09-17T17:00:00Z'), histogram: null });
		await em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('answers each month’s relations as stored, absent where a report lacks them', async () => {
		const res = await service.patterns(venue.brand.id, 4, undefined, now);
		expect(res.months.map(m => m.month)).toEqual(['2026-06', '2026-07', '2026-08', '2026-09']);
		const [june, july, august, september] = res.months;
		expect(june).toEqual({ month: '2026-06', reportId: null });
		expect(july.reportId).toEqual(expect.any(String));
		expect(july.buzzToReviews).toBeUndefined();
		expect(august).toEqual({ month: '2026-08', reportId: expect.any(String) });
		expect(september.buzzToReviews).toEqual(CORRELATIONS.buzzToReviews);
		expect(september.paidVsOrganic).toEqual(CORRELATIONS.paidVsOrganic);
		expect(september.complaintTimes).toBeUndefined();
	});

	it('lays out the weeks across months: summed across reports, partial or unknown where uncovered', async () => {
		const { weeks } = await service.patterns(venue.brand.id, 4, undefined, now);
		const at = (week: string) => weeks.find(w => w.week === week);
		// Every Monday from June's first week to September's last, none skipped
		expect(weeks[0].week).toBe('2026-06-01');
		expect(weeks.at(-1)!.week).toBe('2026-09-28');
		expect(weeks.length).toBe(18);

		// June has no report: no counts at all
		expect(at('2026-06-15')).toEqual({ week: '2026-06-15' });
		// Partly in June, partly in July (whose report lists no reviews)
		expect(at('2026-06-29')).toEqual({ week: '2026-06-29', posts: 0, views: 0, partial: true });
		expect(at('2026-07-20')).toEqual({ week: '2026-07-20', posts: 1, views: 30 });
		// July's report has no review list, so a week touching July has no reviews
		expect(at('2026-07-27')).toEqual({ week: '2026-07-27', posts: 0, views: 0 });
		// Spans the August and September reports: both months' posts and Google reviews, the
		// evenings and the busyness samples
		expect(at('2026-08-31')).toEqual({
			week: '2026-08-31',
			posts: 2,
			views: 1100,
			reviews: 2,
			busyness: 70,
			booked: 75,
		});
		expect(at('2026-09-14')).toEqual({ week: '2026-09-14', posts: 1, views: 50, reviews: 0 });
		// A sample without popular times is no busyness value
		expect(at('2026-09-14')!.busyness).toBeUndefined();
		// Ends in October, which has no report
		expect(at('2026-09-28')).toEqual({ week: '2026-09-28', posts: 0, views: 0, reviews: 0, partial: true });
	});

	it("counts a month once when it has a report per configuration (they share one data)", async () => {
		const em = harness.orm.em;
		const september = await em.findOneOrFail(Report, { brand: venue.brand, month: '2026-09' });
		const config = em.create(BrandReportConfig, { brand: venue.brand, name: 'Reviews', sections: [] });
		em.create(Report, {
			brand: venue.brand,
			city: venue.city,
			month: '2026-09',
			config,
			name: 'Reviews',
			data: september.data,
			highlights: { title: 'T2', headline: 'H2', highlights: [], actions: [] } as ReportHighlights,
		});
		await em.flush();

		const { weeks } = await service.patterns(venue.brand.id, 4, undefined, now);
		expect(weeks.find(w => w.week === '2026-09-14')).toEqual({ week: '2026-09-14', posts: 1, views: 50, reviews: 0 });
	});

	it('is behind BrandAccessGuard', () => {
		const guards: CanActivate[] =
			Reflect.getMetadata('__guards__', PortalController.prototype.getPortalPatterns) ?? [];
		expect(guards).toContain(BrandAccessGuard);
		expect(Reflect.getMetadata('path', PortalController.prototype.getPortalPatterns)).toBe(
			'/brands/:brandId/patterns',
		);
	});
});
