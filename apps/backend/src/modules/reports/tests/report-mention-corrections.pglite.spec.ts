import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { Mention } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { MentionMatchingService } from 'src/modules/social/services/mention-matching.service.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { CompetitorService } from 'src/modules/venues/services/competitor.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { mockAgent } from 'src/tests/mock-agent.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { ReportHighlightsAgent } from '../agents/report-highlights.agent.js';
import { ReportService } from '../services/report.service.js';

describe('Report input after an admin corrects mentions (pglite)', () => {
	let harness: PgliteTestingModule;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				ReportService,
				CompetitorService,
				BrandService,
				CityService,
				MentionMatchingService,
				{
					provide: ReportHighlightsAgent,
					useValue: mockAgent({ title: 'T', headline: 'H', highlights: [], actions: [] }),
				},
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('leaves an ignored mention out and counts a manually linked one', async () => {
		const em = harness.orm.em;
		const city = testCity(em);
		const venue = em.create(Venue, { city, placeId: 'p-1', name: 'Hisar', category: 'Kebab shop' });
		const other = em.create(Venue, {
			city,
			placeId: 'p-2',
			name: 'Elsewhere',
			category: 'Restaurant',
		});
		// Saved first: the venues get their brands
		await em.flush();
		const [, ignored, relinked] = ['a', 'b', 'c'].map(id => {
			const post = em.create(SocialPost, {
				city,
				externalId: id,
				platform: SocialPlatformEnum.TIKTOK,
				url: `https://tiktok.com/${id}`,
				author: `creator${id}`,
				postedAt: new Date('2026-09-10T00:00:00Z'),
			});
			return em.create(Mention, {
				post,
				venue: id === 'c' ? other : venue,
				brand: (id === 'c' ? other : venue).brand,
				venueName: 'Hisar',
				visited: true,
				sentiment: 'positive',
				summary: 'Good.',
				dishes: [],
				praise: [],
				complaints: [],
			});
		});
		await em.flush();

		const matching = harness.moduleRef.get(MentionMatchingService);
		await matching.correct(ignored.id, { venueId: venue.id, ignored: true });
		await matching.correct(relinked.id, { venueId: venue.id });

		const report = await harness.moduleRef.get(ReportService).build(venue.brand.id, venue.city.id, '2026-09');
		// a (automatic) and c (manual); b is not a venue
		expect(report.postCount).toBe(2);
	});
});
