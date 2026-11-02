import type { EntityManager } from '@mikro-orm/postgresql';

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { Mention, MentionMatchMethodEnum } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { seedTopics } from 'src/modules/topics/tests/factories/topic.factory.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { AdminStatementsController } from '../controllers/admin.statements.controller.js';
import type { AdminStatementsInputDto } from '../dto/admin-statements.dto.js';
import { Statement } from '../entities/statement.entity.js';
import { StatementService } from '../services/statement.service.js';

import { addStatements } from './factories/statement.factory.js';

/*
 * The Claims tab: a city's month of claims with where each was said, narrowed by source, subject,
 * sentiment, aspect (its children included), parts, kind and text, and the month's figures as a
 * whole on their own route.
 */
describe('statement list (pglite)', () => {
	let harness: PgliteTestingModule;
	let em: EntityManager;
	let city: City;
	let controller: AdminStatementsController;
	let venue: Venue;
	let other: Venue;
	const MONTH = '2026-09';
	const list = (query: Partial<AdminStatementsInputDto> = {}) =>
		controller.listStatements({ cityId: city.id, month: MONTH, page: 1, size: 50, ...query });
	const texts = async (query: Partial<AdminStatementsInputDto> = {}) =>
		(await list(query)).items.map(s => s.text).sort();

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [StatementService, TopicService, AdminStatementsController],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
		em = harness.orm.em as EntityManager;
		controller = harness.moduleRef.get(AdminStatementsController);
		seedTopics(em, ['wait_for_food', 'taste', 'price_level', 'pasta']);
		city = testCity(em, { name: 'Berlin', aliases: [] });
		venue = em.create(Venue, { city, placeId: 'sl-1', name: 'Pasta Bar' });
		other = em.create(Venue, { city, placeId: 'sl-2', name: 'Kebab Haus' });
		await em.flush();
		const index = await harness.moduleRef.get(TopicService).index();

		const review = em.create(Review, {
			venue,
			reviewId: 'sl-r1',
			stars: 2,
			publishedAt: new Date('2026-09-10T12:00:00Z'),
		});
		addStatements(
			em,
			review,
			[
				{
					text: 'waited 50 minutes for the food',
					sentiment: 'negative',
					aspect: 'wait_for_food',
					amount: 50,
					unit: 'minutes',
				},
				{
					text: 'the pasta was great',
					sentiment: 'positive',
					aspect: 'taste',
					foods: ['Pasta'],
					kind: 'opinion',
				},
				{
					text: 'prices went up since spring',
					sentiment: 'negative',
					aspect: 'price_level',
					change: true,
				},
			],
			{ index },
		);
		const post = em.create(SocialPost, {
			city,
			externalId: 'sl-p1',
			platform: SocialPlatformEnum.TIKTOK,
			url: 'https://tiktok.com/sl-p1',
			author: 'eater',
			postedAt: new Date('2026-09-20T18:00:00Z'),
		});
		const mention = em.create(Mention, {
			post,
			venue,
			brand: venue.brand,
			venueName: 'Pasta Bar',
			matchMethod: MentionMatchMethodEnum.EXACT,
			visited: true,
		});
		addStatements(
			em,
			mention,
			[
				{
					text: 'the carbonara is creamy',
					sentiment: 'positive',
					aspect: 'taste',
					foods: ['Pasta'],
				},
				{
					text: 'Berlin has an underrated food scene',
					sentiment: 'positive',
					subject: 'city',
				},
				{ text: 'the video is about the second food test', subject: 'none' },
			],
			{ index },
		);
		// A claim agent B has not read yet: no sentiment, no parts
		const [unread] = addStatements(em, mention, [{ text: 'they open at noon' }], { index });
		unread.sentiment = null;
		unread.partsAt = null;
		// Another place's claim: in the city's month, never in Pasta Bar's
		addStatements(
			em,
			em.create(Review, {
				venue: other,
				reviewId: 'sl-r3',
				publishedAt: new Date('2026-09-12T12:00:00Z'),
			}),
			[{ text: 'the kebab was dry', sentiment: 'negative' }],
			{ index },
		);
		// Another month and another city are never listed
		addStatements(
			em,
			em.create(Review, {
				venue,
				reviewId: 'sl-r2',
				publishedAt: new Date('2026-08-10T12:00:00Z'),
			}),
			[{ text: 'august claim', sentiment: 'positive' }],
			{ index },
		);
		await em.flush();
		em.clear();
	});

	afterAll(async () => {
		await harness.stop();
	});

	it("lists the city's month newest first, each with where it was said and its parts", async () => {
		const res = await list();
		expect([res.totalItems, res.page, res.pageSize]).toEqual([8, 1, 50]);
		expect(res.items[0].saidAt.getTime()).toBeGreaterThanOrEqual(
			res.items.at(-1)!.saidAt.getTime(),
		);
		const pasta = res.items.find(s => s.text === 'the pasta was great')!;
		expect(pasta).toMatchObject({
			sourceKind: 'review',
			subject: 'place',
			sentiment: 'positive',
			review: { stars: 2, venue: { name: 'Pasta Bar' } },
		});
		expect(pasta.parts.map(p => p.topic?.key ?? p.term?.topics[0].topic.key)).toEqual([
			'taste',
			'pasta',
		]);
		expect(pasta.parts[1].term?.topics[0].topic.parent).toMatchObject({ key: 'italian' });
		const city = res.items.find(s => s.subject === 'city')!;
		expect(city).toMatchObject({
			sourceKind: 'post',
			post: { author: 'eater', platform: 'tiktok' },
		});
		expect(city.mention).toBeUndefined();
		expect(res.items.find(s => s.text === 'the carbonara is creamy')?.mention).toMatchObject({
			venueName: 'Pasta Bar',
		});
	});

	it('sums the whole month', async () => {
		const summary = await controller.getStatementsSummary({ cityId: city.id, month: MONTH });
		expect(summary).toEqual({
			statements: 8,
			reviews: 4,
			posts: 4,
			place: 6,
			city: 1,
			none: 1,
			positive: 3,
			negative: 3,
			neutral: 1,
			mixed: 0,
			unread: 1,
			kinds: {
				opinion: 1,
				fact: 0,
				change: 1,
				new_item: 0,
				deal: 0,
				event: 0,
				question: 0,
				verdict: 0,
			},
			noParts: 4,
			noAspect: 4,
			withFood: 2,
		});
	});

	it('narrows by source, subject, sentiment, kind and text', async () => {
		expect(await texts({ sourceKind: 'review' })).toEqual([
			'prices went up since spring',
			'the kebab was dry',
			'the pasta was great',
			'waited 50 minutes for the food',
		]);
		expect(await texts({ subject: 'none' })).toEqual([
			'the video is about the second food test',
		]);
		expect(await texts({ sentiment: 'unread' })).toEqual(['they open at noon']);
		expect(await texts({ kind: 'change' })).toEqual(['prices went up since spring']);
		expect(await texts({ kind: 'opinion' })).toEqual(['the pasta was great']);
		expect(await texts({ q: 'CARBON' })).toEqual(['the carbonara is creamy']);
		expect(await texts({ q: '100%' })).toEqual([]);
	});

	it('narrows by an aspect with the aspects below it, and by what parts a claim has', async () => {
		expect(await texts({ aspect: 'wait' })).toEqual(['waited 50 minutes for the food']);
		expect(await texts({ aspect: 'taste' })).toEqual([
			'the carbonara is creamy',
			'the pasta was great',
		]);
		expect(await texts({ aspect: 'pasta' })).toEqual([]);
		expect(await texts({ aspect: 'nothing_like_it' })).toEqual([]);
		expect(await texts({ parts: 'none' })).toEqual([
			'Berlin has an underrated food scene',
			'the kebab was dry',
			'the video is about the second food test',
			'they open at noon',
		]);
		expect(await texts({ parts: 'food' })).toEqual([
			'the carbonara is creamy',
			'the pasta was great',
		]);
	});

	it('pages', async () => {
		const first = await list({ size: 4 });
		const second = await list({ size: 4, page: 2 });
		expect([first.items.length, second.items.length, first.totalItems]).toEqual([4, 4, 8]);
		const ids = [...first.items, ...second.items].map(s => s.id);
		expect(new Set(ids).size).toBe(8);
		expect(await em.fork().count(Statement, {})).toBe(9);
	});

	it("lists a brand's or a branch's claims, its reviews' and the posts' about it, every month unless one is given", async () => {
		const scoped = async (scope: Partial<AdminStatementsInputDto>) =>
			(await controller.listStatements({ page: 1, size: 50, ...scope })).items
				.map(s => s.text)
				.sort();
		const ours = [
			'august claim',
			'prices went up since spring',
			'the carbonara is creamy',
			'the pasta was great',
			'they open at noon',
			'waited 50 minutes for the food',
		];
		expect(await scoped({ brandId: venue.brand.id })).toEqual(ours);
		expect(await scoped({ venueId: venue.id })).toEqual(ours);
		expect(await scoped({ venueId: venue.id, month: MONTH })).toEqual(
			ours.filter(t => t !== 'august claim'),
		);
		expect(await scoped({ venueId: other.id })).toEqual(['the kebab was dry']);
		const summary = await controller.getStatementsSummary({ brandId: venue.brand.id });
		expect([
			summary.statements,
			summary.reviews,
			summary.posts,
			summary.place,
			summary.city,
		]).toEqual([6, 4, 2, 6, 0]);
		await expect(controller.listStatements({ page: 1, size: 10 })).rejects.toThrow(
			'A city, a brand or a venue is needed',
		);
	});
});
