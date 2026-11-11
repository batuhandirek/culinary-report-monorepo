import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { CompetitorService } from 'src/modules/venues/services/competitor.service.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { AdminCreatorsController } from '../controllers/admin.creators.controller.js';
import { AdminSocialController } from '../controllers/admin.social.controller.js';
import { Mention } from '../entities/mention.entity.js';
import { SocialAccount } from '../entities/social-account.entity.js';
import { SocialPlatformEnum, SocialPost } from '../entities/social-post.entity.js';
import { AccountWatchService } from '../services/account-watch.service.js';
import { CreatorService } from '../services/creator.service.js';
import { HashtagService } from '../services/hashtag.service.js';
import { MentionMatchingService } from '../services/mention-matching.service.js';
import { SocialAccountService } from '../services/social-account.service.js';
import { SocialPostService } from '../services/social-post.service.js';

const TT = SocialPlatformEnum.TIKTOK;
const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

describe("a creator's page: the last 30 and 90 days, the posts' dates, Scrape now's profiles (pglite)", () => {
	let harness: PgliteTestingModule;
	let posts: SocialPostService;
	let city: City;
	let creatorId: string;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				SocialAccountService,
				SocialPostService,
				CreatorService,
				AccountWatchService,
				AdminCreatorsController,
				AdminSocialController,
				{ provide: HashtagService, useValue: { relink: jest.fn() } },
				{ provide: MentionMatchingService, useValue: {} },
				{ provide: CityService, useValue: {} },
				{ provide: BrandService, useValue: {} },
				{ provide: CompetitorService, useValue: {} },
			],
		});
		posts = harness.moduleRef.get(SocialPostService);
		entityManagerManager.setEntityManager(harness.orm.em);
		const em = harness.orm.em;
		city = testCity(em);
		await em.flush();

		// Four posts by one TikTok creator: 5, 20, 60 and 200 days old; two name a brand
		const ages = [5, 20, 60, 200];
		for (const [i, age] of ages.entries()) {
			await posts.upsert(
				{
					externalId: `tt_cp_${i}`,
					platform: TT,
					url: `https://www.tiktok.com/@page_creator/video/${i}`,
					postedAt: daysAgo(age),
					author: 'page_creator',
					views: 100 * (i + 1),
				},
				city,
			);
			await em.flush();
		}
		const stored = await em.find(SocialPost, { author: 'page_creator' }, { orderBy: { postedAt: 'desc' } });
		const brand = em.create(Brand, { name: 'Page Brand', key: 'page brand' });
		const other = em.create(Brand, { name: 'Other Brand', key: 'other brand' });
		em.create(Mention, { post: stored[1], venueName: 'Page Brand', brand, visited: true });
		em.create(Mention, { post: stored[3], venueName: 'Other Brand', brand: other, visited: true });
		// Named but unmatched: not a brand
		em.create(Mention, { post: stored[0], venueName: 'Somewhere', visited: true });
		await em.flush();
		creatorId = (await em.findOneOrFail(SocialAccount, { handle: 'page_creator' })).creator.id;
		em.clear();
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('counts the last 30 and 90 days, and the posts naming a brand', async () => {
		const page = await harness.moduleRef.get(AdminCreatorsController).getCreator(creatorId, {});
		expect(page.recent).toMatchObject({ posts30: 2, views30: 300, posts90: 3, named90: 1 });
		expect(isoDay(page.recent.lastNamedAt!)).toBe(isoDay(daysAgo(20)));
		expect(page.brandCount).toBe(2);
		expect(page.posts).toBe(4);
	});

	it('lists their posts between two days', async () => {
		const list = await harness.moduleRef.get(AdminSocialController).listPosts({
			page: 1,
			size: 10,
			creatorId,
			from: isoDay(daysAgo(90)),
		});
		expect(list.totalItems).toBe(3);
		const older = await harness.moduleRef.get(AdminSocialController).listPosts({
			page: 1,
			size: 10,
			creatorId,
			to: isoDay(daysAgo(30)),
		});
		expect(older.totalItems).toBe(2);
	});

	it('names their profiles and city for Scrape now', async () => {
		const found = await harness.moduleRef.get(AccountWatchService).creatorTargets(creatorId);
		expect(found).toEqual({ cityId: city.id, targets: [{ platform: TT, handle: 'page_creator' }] });
	});
});
