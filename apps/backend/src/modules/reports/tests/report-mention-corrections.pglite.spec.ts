import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { FeedbackPoint } from 'src/modules/feedback/entities/feedback-point.entity.js';
import { addFeedback } from 'src/modules/feedback/tests/factories/feedback.factory.js';
import { ASPECT_SEED } from 'src/modules/topics/constants/aspect-seed.constant.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { VenueTopicService } from 'src/modules/topics/services/venue-topic.service.js';
import { seedTopics } from 'src/modules/topics/tests/factories/topic.factory.js';
import { BrandPostsService } from 'src/modules/social/services/brand-posts.service.js';
import { ThemeInsightService } from 'src/modules/trends/services/theme-insight.service.js';
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

import { ReportEditorAgent } from '../agents/report-editor.agent.js';
import { ReportService } from '../services/report.service.js';
import { ReportConfigService } from '../services/report-config.service.js';
import { ReportTemplateService } from '../services/report-template.service.js';

describe('Report input after an admin corrects mentions (pglite)', () => {
	let harness: PgliteTestingModule;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				ReportService,
				ReportConfigService,
				ReportTemplateService,
				CompetitorService,
				BrandService,
				CityService,
				MentionMatchingService,
				ThemeInsightService,
				TopicService,
				VenueTopicService,
				BrandPostsService,
				{
					provide: ReportEditorAgent,
					useValue: mockAgent({ title: 'T', headline: 'H', highlights: [], actions: [] }),
				},
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
		// The aspects the points are filed under: the readers take the vocabulary from the table
		seedTopics(harness.orm.em, ASPECT_SEED.map(a => a.key));
		await harness.orm.em.flush();
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
	// Rows never copy brand or venue: a re-match moves a mention's feedback in every reader at once
	it('moves a re-matched mention\'s feedback to its new brand in every reader, no row rewritten', async () => {
		const em = harness.orm.em;
		const city = testCity(em, { name: 'Rematchburg' });
		const right = em.create(Venue, { city, placeId: 'rm-1', name: 'Cash Corner', category: 'Kebab shop' });
		const wrong = em.create(Venue, { city, placeId: 'rm-2', name: 'Cash Kitchen', category: 'Restaurant' });
		await em.flush();
		const post = em.create(SocialPost, {
			city,
			externalId: 'rm-post',
			platform: SocialPlatformEnum.TIKTOK,
			url: 'https://tiktok.com/rm',
			author: 'creator-rm',
			text: 'Cash only at Cash Corner',
			postedAt: new Date('2026-09-12T00:00:00Z'),
		});
		const mention = em.create(Mention, {
			post,
			venue: wrong,
			brand: wrong.brand,
			venueName: 'Cash Corner',
			visited: true,
			sentiment: 'negative',
			summary: 'Cash only.',
		});
		addFeedback(em, mention, {
			complaints: [{ theme: 'cash_only', detail: 'cash only' }],
			dishes: [{ name: 'Dürüm', sentiment: 'positive' }],
		});
		await em.flush();
		const rows = async () =>
			(await em.fork().find(FeedbackPoint, { mention: mention.id }, { orderBy: { id: 'asc' } })).map(r => ({ ...r }));
		const before = await rows();

		await harness.moduleRef.get(MentionMatchingService).correct(mention.id, { venueId: right.id });

		const themes = await harness.moduleRef.get(ThemeInsightService).city(city.id, '2026-09');
		const cash = themes.complaints.find(t => t.key === 'cash_only');
		expect(cash?.topBrands?.map(b => b.name)).toEqual(['Cash Corner']);
		const data = (await harness.moduleRef.get(ReportService).compute(right.brand.id, city.id, '2026-09')).data;
		expect(data.social.complaints).toEqual({ payment: 1 });
		expect(data.dishes.map(d => d.name)).toEqual(['Dürüm']);
		const posts = await harness.moduleRef.get(BrandPostsService).list(right.brand.id, {}, 1, 10);
		expect(posts.items.map(p => p.mention.feedback.getItems().map(r => r.detail ?? r.dish))).toEqual([['cash only', 'Dürüm']]);
		const wrongData = (await harness.moduleRef.get(ReportService).compute(wrong.brand.id, city.id, '2026-09')).data;
		expect(wrongData.social.complaints).toEqual({});
		expect(await rows()).toEqual(before);
	});
});
