import { NotFoundException } from '@nestjs/common';

import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { addFeedback } from 'src/modules/feedback/tests/factories/feedback.factory.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import {
	seedTopics,
	seedIndex,
} from 'src/modules/topics/tests/factories/topic.factory.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { Mention } from 'src/modules/social/entities/mention.entity.js';
import { SocialAccount } from 'src/modules/social/entities/social-account.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import {
	ownAccount,
	socialAccountFactory,
} from 'src/modules/social/tests/factories/social-account.factory.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { mockAgent } from 'src/tests/mock-agent.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { LandingCopyAgent } from '../agents/landing-copy.agent.js';
import { LandingEdition } from '../entities/landing-edition.entity.js';
import { LandingBuildJob } from '../jobs/landing-build.job.js';
import { LandingEditionService } from '../services/landing-edition.service.js';
import type { LandingCopyAnswer } from '../util/landing-copy.js';

describe('LandingEditionService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: LandingEditionService;
	let city: City;
	let sori: Venue;
	const NOW = new Date('2026-10-25T06:30:00Z');
	const agent = mockAgent<LandingCopyAnswer | null>(null);
	const pgBoss = { sendJob: jest.fn(async (..._args: unknown[]) => undefined) };

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				LandingEditionService,
				CityService,
				TopicService,
				{ provide: LandingCopyAgent, useValue: agent },
				{ provide: PgBossService, useValue: pgBoss },
			],
		});
		service = harness.moduleRef.get(LandingEditionService);
		entityManagerManager.setEntityManager(harness.orm.em);
		const em = harness.orm.em;
		seedTopics(em, ['ramen']);

		city = testCity(em, {
			slug: 'berlin',
			name: 'Berlin',
			doNotListVenues: ['Quiet Corner'],
			cronEnabled: true,
		});
		const wien = testCity(em, { slug: 'wien', name: 'Wien', cronEnabled: false });
		const venue = (
			name: string,
			opts: { city?: City; district?: string; reviewsCount?: number } = {},
		) =>
			em.create(Venue, {
				city: opts.city ?? city,
				placeId: name,
				name,
				category: 'Restaurant',
				district: opts.district ?? 'Mitte',
				street: 'Torstraße 12',
				reviewsCount: opts.reviewsCount ?? 400,
			});
		sori = venue('Sori Ramen');
		const doner = venue('Döner X', { district: 'Neukölln' });
		const quiet = venue('Quiet Corner');
		const fresh = venue('Fresh Bakery', { reviewsCount: 8 });
		const schnitzel = venue('Schnitzelwirt', { city: wien });
		await em.flush();

		const accounts = new Map<string, SocialAccount>([
			['soriramen', ownAccount(em, sori.brand, city, 'soriramen')],
		]);
		let n = 0;
		const post = (
			venues: Venue[],
			author: string,
			views: number,
			opts: { city?: City; day?: string; promotional?: boolean; isNew?: boolean } = {},
		) => {
			const postCity = opts.city ?? city;
			const account =
				accounts.get(author) ??
				socialAccountFactory.build(
					{ handle: author },
					{ associations: { city: postCity }, transient: { em } },
				);
			accounts.set(author, account);
			const id = `7${String(++n).padStart(18, '0')}`;
			const p = em.create(SocialPost, {
				city: postCity,
				externalId: id,
				platform: SocialPlatformEnum.TIKTOK,
				url: `https://www.tiktok.com/@${author}/video/${id}`,
				author,
				account,
				views,
				isPromotional: opts.promotional ?? false,
				postedAt: new Date(`2026-${opts.day ?? '10-20'}T12:00:00Z`),
			});
			return venues.map(v =>
				em.create(Mention, {
					post: p,
					venue: v,
					brand: v.brand,
					venueName: v.name,
					cuisine: 'Ramen',
					visited: true,
					sentiment: 'positive',
					summary: `Loved ${v.name}.`,
					isNewOpening: opts.isNew ?? false,
				}),
			);
		};
		// Sori: three people; its own account and a paid post don't count
		const [m1] = post([sori], 'anna', 1_000);
		post([sori], 'ben', 2_000);
		post([sori], 'cleo', 500);
		post([sori], 'soriramen', 90_000);
		post([sori], 'promo', 80_000, { promotional: true });
		// Döner X: two people now, more than Sori in September
		post([doner], 'anna', 300);
		post([doner], 'dora', 300);
		for (const who of ['e', 'f', 'g', 'h']) post([doner], who, 100, { day: '09-10' });
		// Quiet Corner asked to be left out
		for (let i = 0; i < 5; i++) post([quiet], `fan${i}`, 100);
		// Fresh Bakery: first called new this week
		post([fresh], 'ivy', 700, { isNew: true });
		// Another city's talk stays there
		for (let i = 0; i < 8; i++) post([schnitzel], `wiener${i}`, 5_000, { city: wien });
		await em.flush();
		addFeedback(
			em,
			m1,
			{
				praise: [{ topic: 'food', theme: 'taste', detail: 'rich broth', dish: 'Tonkotsu' }],
				dishes: [{ name: 'Tonkotsu', sentiment: 'positive' }],
			},
			{ index: seedIndex() },
		);
		await em.flush();
	});

	beforeEach(async () => {
		agent.generate.mockReset();
		agent.generate.mockImplementation(async () => ({ object: null, usage: undefined }));
		pgBoss.sendJob.mockClear();
		await harness.orm.em.nativeDelete(LandingEdition, {});
		harness.orm.em.clear();
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('counts the last 30 days of posts by others: own, paid, denied and other cities out', async () => {
		const edition = await service.build(city.id, NOW);
		expect(edition.windowStart.toISOString()).toBe('2026-09-25T00:00:00.000Z');
		expect(edition.windowEnd.toISOString()).toBe('2026-10-25T00:00:00.000Z');
		const { data } = edition;
		expect(
			data.places.map(p => [p.rank, p.name, p.creators, p.posts, p.views, p.move]),
		).toEqual([
			[1, 'Sori Ramen', 3, 3, 3_500, 'new'],
			// First in September: a fall shows nothing
			[2, 'Döner X', 2, 2, 600, 'none'],
			[3, 'Fresh Bakery', 1, 1, 700, 'new'],
		]);
		expect(data.places[0]).toMatchObject({
			district: 'Mitte',
			street: 'Torstraße',
			branches: 1,
		});
		const json = JSON.stringify(data);
		for (const out of ['Quiet Corner', 'Schnitzelwirt', 'soriramen', 'promo'])
			expect(json).not.toContain(out);
		// Totals count Quiet Corner's posts (a count names nobody), never own, paid or Wien ones
		expect(data.totals).toEqual({
			posts: 11,
			views: 1_000 + 2_000 + 500 + 300 + 300 + 500 + 700,
			creators: 10,
			places: 4,
		});
		expect(data.openings.map(o => [o.name, o.firstSeen])).toEqual([
			['Fresh Bakery', '2026-10-20'],
		]);
		expect(data.places[2].isNew).toBe(true);
	});

	it('writes the lines with the model, given only praise from the posts, and publishes', async () => {
		agent.generate.mockImplementation(async (...args: unknown[]) => {
			const input = JSON.parse((args[0] as { content: string }[])[0].content);
			const answer: LandingCopyAnswer = {
				lede: 'Berlin talked: 3 people on Sori Ramen.',
				places: input.places.map((p: { brandId: string; name: string }) => ({
					brandId: p.brandId,
					said: `${p.name} had people talking.`,
					tagline: 'the talk of the town',
				})),
				dishes: [],
				trends: [],
				ticker: [],
				openings: [],
			};
			return { object: answer, usage: undefined };
		});
		const edition = await service.build(city.id, NOW);
		const [[messages, context]] = agent.generate.mock.calls as unknown as [
			[{ content: string }[], { cityName: string }],
		];
		expect(context).toEqual({ cityName: 'Berlin' });
		const input = JSON.parse(messages[0].content);
		expect(input.places[0]).toMatchObject({
			name: 'Sori Ramen',
			peoplePosting: 3,
			views: '3,500',
			praiseInPosts: ['rich broth'],
			whatPostsSaid: ['Loved Sori Ramen.'],
		});
		expect(edition.copy.lede).toBe('Berlin talked: 3 people on Sori Ramen.');
		expect(edition.copy.places[0].said).toBe('Sori Ramen had people talking.');
		expect(edition.copyError).toBeNull();
		expect(edition.publishedAt).toEqual(NOW);
		expect((await service.published('berlin')).id).toBe(edition.id);
	});

	it('goes out with plain lines when the model fails, and says why', async () => {
		agent.generate.mockImplementation(async () => {
			throw new Error('every account is out of allowance');
		});
		const edition = await service.build(city.id, NOW);
		expect(edition.copyError).toBe('every account is out of allowance');
		expect(edition.copy.written).toBe(0);
		expect(edition.copy.places[0].said).toBe(
			'3 people posted about Sori Ramen in the last 30 days, 3 posts in all.',
		);
		expect(edition.publishedAt).toEqual(NOW);
	});

	it("replaces the same day's edition, keeps older ones, and shows the newest published", async () => {
		const older = await service.build(city.id, new Date('2026-10-21T06:30:00Z'));
		const first = await service.build(city.id, NOW);
		const again = await service.build(city.id, new Date('2026-10-25T09:00:00Z'));
		expect(again.id).toBe(first.id);
		expect((await service.list(city.id)).map(e => e.id)).toEqual([first.id, older.id]);
		expect((await service.published('berlin')).id).toBe(first.id);

		// Taking the newest down puts the one before back
		await service.unpublish(first.id);
		expect((await service.published('berlin')).id).toBe(older.id);
		await service.unpublish(older.id);
		await expect(service.published('berlin')).rejects.toBeInstanceOf(NotFoundException);
		await service.publish(first.id, NOW);
		expect((await service.published('berlin')).id).toBe(first.id);
	});

	it('keeps an edition without places as a draft', async () => {
		const edition = await service.build(city.id, new Date('2027-03-01T06:30:00Z'));
		expect(edition.data.places).toEqual([]);
		expect(edition.publishedAt).toBeUndefined();
		await expect(service.published('berlin')).rejects.toBeInstanceOf(NotFoundException);
		expect(agent.generate).not.toHaveBeenCalled();
	});

	it('queues a build for a cron city five days after its newest edition', async () => {
		expect((await service.dueCities(NOW)).map(c => c.slug)).toEqual(['berlin']);
		await service.build(city.id, new Date('2026-10-20T06:31:00Z'));
		// Four days later: not yet
		expect(await service.dueCities(new Date('2026-10-24T06:30:00Z'))).toEqual([]);
		// The fifth day's cron, a minute earlier in the day than the build: due
		expect(await service.queueDue(new Date('2026-10-25T06:30:00Z'))).toEqual([city.id]);
		expect(pgBoss.sendJob).toHaveBeenCalledWith(
			LandingBuildJob.jobName,
			new LandingBuildJob({ cityId: city.id }),
			{
				singletonKey: city.id,
			},
		);
	});

	it('answers 404 for an unknown city', async () => {
		await expect(service.published('nowhere')).rejects.toBeInstanceOf(NotFoundException);
	});
});
