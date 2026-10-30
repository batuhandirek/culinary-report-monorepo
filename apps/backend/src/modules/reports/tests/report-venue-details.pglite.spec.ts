import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { CompetitorService } from 'src/modules/venues/services/competitor.service.js';
import { DETAIL_ITEM } from 'src/modules/venues/tests/fixtures/google-place-items.js';
import { venueDetailsFromItem } from 'src/modules/venues/util/venue-details.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { mockAgent } from 'src/tests/mock-agent.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { ReportEditorAgent } from '../agents/report-editor.agent.js';
import { ReviewReplyAgent } from '../agents/review-reply.agent.js';
import { ReportService } from '../services/report.service.js';
import { ReportConfigService } from '../services/report-config.service.js';
import { ReportTemplateService } from '../services/report-template.service.js';

describe('ReportData.venue Google Maps details (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: ReportService;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				ReportService,
				// Real: the report keeps the aspect vocabulary it was built with (the auto-mock has no index)
				TopicService,
				ReportConfigService,
				ReportTemplateService,
				CompetitorService,
				BrandService,
				CityService,
				{
					provide: ReportEditorAgent,
					useValue: mockAgent({ title: 'T', headline: 'H', highlights: [], actions: [] }),
				},
				{ provide: ReviewReplyAgent, useValue: mockAgent({ replies: [] }) },
			],
		});
		service = harness.moduleRef.get(ReportService);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('puts the offered amenities and the star distribution on the cover data', async () => {
		const em = harness.orm.em;
		const known = em.create(Venue, {
			city: testCity(em),
			placeId: 'p-known',
			name: 'Pinoli Restaurant',
			details: venueDetailsFromItem(DETAIL_ITEM),
			detailsAt: new Date('2026-10-02T06:00:00Z'),
		});
		const unknown = em.create(Venue, { city: testCity(em), placeId: 'p-unknown', name: 'Unknown' });
		await em.flush();

		const report = await service.build(known.brand.id, known.city.id, '2026-09');
		expect(report.data.branches[0].amenities).toEqual([
			'Outdoor seating',
			'Takeout',
			'Accepts reservations',
			'Credit cards',
			'NFC mobile payments',
			'Wheelchair accessible entrance',
		]);
		expect(report.data.branches[0].reviewsDistribution).toEqual(DETAIL_ITEM.reviewsDistribution);

		// Unknown stays absent, never an empty list or zeros
		const bare = await service.build(unknown.brand.id, unknown.city.id, '2026-09');
		expect(bare.data.branches[0].amenities).toBeUndefined();
		expect(bare.data.branches[0].reviewsDistribution).toBeUndefined();
	});
});
