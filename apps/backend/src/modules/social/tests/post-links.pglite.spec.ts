import type { EntityManager } from '@mikro-orm/postgresql';

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { AdminCitiesController } from 'src/modules/cities/controllers/admin.cities.controller.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CitySourceKindEnum } from 'src/modules/cities/entities/city-source.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { FoodTopicService } from 'src/modules/food-topics/services/food-topic.service.js';
import { FoodTopic } from 'src/modules/food-topics/entities/food-topic.entity.js';
import { MentionFoodTopic } from 'src/modules/food-topics/entities/mention-food-topic.entity.js';
import { seedFoodTopics } from 'src/modules/food-topics/tests/factories/food-topic.factory.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { AdminHashtagsController } from '../controllers/admin.hashtags.controller.js';
import { AdminSocialController } from '../controllers/admin.social.controller.js';
import { Hashtag } from '../entities/hashtag.entity.js';
import { Mention, MentionMatchMethodEnum } from '../entities/mention.entity.js';
import { PostSourceKindEnum } from '../entities/post-source.entity.js';
import { SocialPlatformEnum, SocialPost } from '../entities/social-post.entity.js';
import { HashtagService } from '../services/hashtag.service.js';
import { type PostFields, SocialPostService } from '../services/social-post.service.js';

/* Every source that finds a post, its caption's hashtags as rows, what a tag names, and the tags
 * worth scraping from the data. */
describe('Post sources and hashtags (pglite)', () => {
	let harness: PgliteTestingModule;
	let em: EntityManager;
	let posts: SocialPostService;
	let cities: AdminCitiesController;
	let city: City;
	const venues: Record<string, Venue> = {};
	const recently = new Date(Date.now() - 10 * 24 * 3600 * 1000);
	const tag = (value: string) => ({ kind: PostSourceKindEnum.TIKTOK_HASHTAG, value });

	let n = 0;
	const fields = (over: Partial<PostFields> = {}): PostFields => ({
		externalId: `pl-${++n}`,
		platform: SocialPlatformEnum.TIKTOK,
		url: `https://www.tiktok.com/@eater/video/${n}`,
		postedAt: recently,
		author: 'eater',
		views: 100,
		likes: 10,
		text: 'Food in Berlin',
		...over,
	});
	const save = async (rows: PostFields[]) => {
		for (const row of rows) await posts.upsert(row, city);
		await em.flush();
		await posts.finishSave(city.id);
	};
	const stored = async (externalId: string) => {
		const post = await em
			.fork()
			.findOneOrFail(SocialPost, { externalId }, { populate: ['foundBy', 'foundBy.source', 'hashtagLinks.hashtag'] });
		return {
			post,
			finds: post.foundBy.getItems().map(f => [f.kind, f.value, f.source?.value ?? null]),
			tags: post.hashtagLinks.getItems().map(link => link.hashtag.tag),
		};
	};
	const hashtag = (value: string) =>
		em.fork().findOneOrFail(Hashtag, { tag: value }, { populate: ['foodTopic', 'brand'] });
	// A post matched to a venue (its brand comes with the subscriber)
	const matchedPost = async (externalId: string, venue: Venue) => {
		const post = await em.findOneOrFail(SocialPost, { externalId });
		em.create(Mention, {
			post,
			venue,
			venueName: venue.name,
			matchMethod: MentionMatchMethodEnum.EXACT,
			visited: true,
			sentiment: 'positive',
			summary: 'Good.',
		});
		await em.flush();
	};

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				SocialPostService,
				HashtagService,
				FoodTopicService,
				CityService,
				AdminCitiesController,
				AdminHashtagsController,
				AdminSocialController,
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
		em = harness.orm.em as EntityManager;
		posts = harness.moduleRef.get(SocialPostService);
		cities = harness.moduleRef.get(AdminCitiesController);
		seedFoodTopics(em, ['burgers']);
		city = testCity(em, { name: 'Berlin', aliases: [] });
		for (const name of ['Burger Bros', 'Kiez Kebab', 'Pho Ga', 'Lucky Noodle'])
			venues[name] = em.create(Venue, { city, placeId: `pl-${name}`, name });
		await em.flush();
		const service = harness.moduleRef.get(CityService);
		await service.addSource(city.id, { kind: CitySourceKindEnum.TIKTOK_HASHTAG, value: 'berlinfood' });
		await service.addSource(city.id, { kind: CitySourceKindEnum.TIKTOK_HASHTAG, value: '#BerlinEats' });
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('records every source that finds a post; a known post only refreshes its counts', async () => {
		const first = fields({
			// Two days old: its counts still move with each find (they are kept from seven days)
			postedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
			text: 'Smash burgers at Burger Bros #BerlinFood #smashburger',
			hashtags: ['BerlinFood', 'smashburger'],
			finds: [tag('berlinfood')],
		});
		await save([first]);
		// Found again by another tag, with new counts and a caption edited since
		await save([
			{
				...first,
				views: 500,
				likes: 50,
				text: 'Edited',
				hashtags: ['other'],
				finds: [tag('berlineats')],
			},
		]);
		// And again by the first tag: nothing new
		await save([{ ...first, views: 600, finds: [tag('berlinfood')] }]);

		const { post, finds, tags } = await stored(first.externalId);
		expect([post.views, post.likes, post.text]).toEqual([600, 10, first.text]);
		expect(finds).toEqual([
			[PostSourceKindEnum.TIKTOK_HASHTAG, 'berlinfood', 'berlinfood'],
			[PostSourceKindEnum.TIKTOK_HASHTAG, 'berlineats', 'berlineats'],
		]);
		expect(tags).toEqual(['berlinfood', 'smashburger']);
	});

	it('keeps one Hashtag per tag, and links a tag to the food topic or the brand it names', async () => {
		const second = fields({ hashtags: ['berlinfood', 'Berlin', 'burgerbros', 'kiezkebab'], finds: [tag('berlinfood')] });
		await save([second]);
		const tagRows = await em.fork().find(Hashtag, { tag: { $in: ['berlinfood', 'BerlinFood'] } });
		expect(tagRows.map(t => t.tag)).toEqual(['berlinfood']);
		expect((await stored(second.externalId)).tags).toEqual(['berlinfood', 'berlin', 'burgerbros', 'kiezkebab']);

		expect((await hashtag('smashburger')).foodTopic?.key).toBe('burgers');
		// The city's own name names no food and no brand
		expect(await hashtag('berlin')).toMatchObject({ foodTopic: null, brand: null });
		// A brand's name, but no post carrying it is about the brand yet
		expect((await hashtag('burgerbros')).brand).toBeNull();

		await matchedPost(second.externalId, venues['Burger Bros']);
		await harness.moduleRef.get(HashtagService).relink();
		expect((await hashtag('burgerbros')).brand?.name).toBe('Burger Bros');
		// The post is about Burger Bros, not Kiez Kebab
		expect((await hashtag('kiezkebab')).brand).toBeNull();
	});

	it("suggests tags on the city's matched posts of 3+ brands that it doesn't scrape, never an ignored one", async () => {
		// Five posts each tagged #kiezfood, #berlinfood (scraped), #fyp and #berlin (the city), over three
		// brands; #pholove on one brand's
		const brands = ['Kiez Kebab', 'Pho Ga', 'Lucky Noodle', 'Kiez Kebab', 'Pho Ga'];
		const rows = brands.map(brand =>
			fields({
				hashtags: ['kiezfood', 'berlinfood', 'fyp', 'berlin', ...(brand === 'Pho Ga' ? ['pholove'] : [])],
				finds: [tag('berlinfood')],
			}),
		);
		await save(rows);
		for (const [i, row] of rows.entries()) await matchedPost(row.externalId, venues[brands[i]]);

		const suggested = async () => (await cities.listCityHashtagSuggestions(city.id)).items;
		expect((await suggested()).map(s => [s.tag, s.kind, s.matchedPosts, s.brands])).toEqual([
			['fyp', CitySourceKindEnum.TIKTOK_HASHTAG, 5, 3],
			['kiezfood', CitySourceKindEnum.TIKTOK_HASHTAG, 5, 3],
		]);
		expect((await suggested())[1].sampleBrands).toEqual(['Kiez Kebab', 'Lucky Noodle', 'Pho Ga']);

		// Ignored, it is never suggested again
		const fyp = (await suggested())[0];
		expect(await harness.moduleRef.get(AdminHashtagsController).updateHashtag(fyp.hashtagId, { ignored: true })).toMatchObject({
			tag: 'fyp',
			ignored: true,
		});
		expect((await suggested()).map(s => s.tag)).toEqual(['kiezfood']);

		// Added (off, for review like the LLM's), it is a source and no suggestion
		await cities.addCitySource(city.id, { kind: CitySourceKindEnum.TIKTOK_HASHTAG, value: 'kiezfood', enabled: false });
		expect(await suggested()).toEqual([]);
	});

	it("lists a tag's posts, and serves a post's page with what it links to", async () => {
		const social = harness.moduleRef.get(AdminSocialController);
		const tagged = fields({ hashtags: ['LinkTest'], finds: [tag('berlinfood')] });
		await save([tagged]);
		const list = await social.listPosts({ page: 1, size: 10, hashtag: '#linktest' });
		expect(list.items.map(p => p.externalId)).toEqual([tagged.externalId]);

		// A mention's stored food topics come with the post's page
		const post = await em.findOneOrFail(SocialPost, { externalId: tagged.externalId });
		const mention = em.create(Mention, {
			post,
			venue: venues['Kiez Kebab'],
			venueName: 'Kiez Kebab',
			matchMethod: MentionMatchMethodEnum.EXACT,
			cuisine: 'Burgers',
			visited: true,
			sentiment: 'positive',
			summary: 'Good.',
		});
		await em.flush();
		em.create(MentionFoodTopic, { mention, topic: (await em.findOneOrFail(FoodTopic, { key: 'burgers' })), source: 'cuisine', rank: 0 });
		await em.flush();
		em.clear();
		const page = await social.getPost(post.id);
		expect(page.mentions[0].foodTopics).toEqual([
			expect.objectContaining({ source: 'cuisine', topic: expect.objectContaining({ key: 'burgers', label: 'Burgers' }) }),
		]);
		expect(page.foundBy[0]).toMatchObject({ kind: 'tiktok_hashtag', value: 'berlinfood', source: { enabled: true } });
		expect(page.hashtagLinks.map(l => l.hashtag.tag)).toEqual(['linktest']);
	});
});

