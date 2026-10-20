import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import type { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { brandFactory } from 'src/modules/venues/tests/factories/brand.factory.js';
import { venueFactory } from 'src/modules/venues/tests/factories/venue.factory.js';
import { cityStopwords, venueAliases } from 'src/modules/venues/util/venue-names.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { VenueMatchAgent } from '../agents/venue-match.agent.js';
import { Mention, MentionMatchMethodEnum } from '../entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from '../entities/social-post.entity.js';
import { MentionMatchingService, rankCandidates } from '../services/mention-matching.service.js';

const words = cityStopwords(['berlin']);

describe('rankCandidates with brands', () => {
	const candidate = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
		id,
		name,
		category: 'Hamburger restaurant',
		district: null,
		street: null,
		aliases: venueAliases(name, words),
		brandId: 'b',
		brandName: 'Burgermeister',
		branchCount: 3,
		...extra,
	});
	const branches = [
		candidate('kotti', 'Burgermeister Kottbusser Tor', {
			district: 'Friedrichshain-Kreuzberg',
		}),
		candidate('pankow', 'Burgermeister', { district: 'Pankow' }),
		candidate('zoo', 'Burgermeister', { district: 'Charlottenburg-Wilmersdorf' }),
		candidate('other', 'Burger Vision', { brandId: 'bv', brandName: 'Burger Vision', branchCount: 1 }),
	];

	it('makes a chain one candidate, its branch unknown when the post names none', () => {
		const ranked = rankCandidates(
			{ venueName: 'Burgermeister', locationHint: null },
			null,
			branches,
			words,
		);
		expect(ranked[0]).toMatchObject({ brandId: 'b', branchKnown: false, branches: 3 });
		expect(ranked.filter(c => c.brandId === 'b')).toHaveLength(1);
		// A one-branch brand is a plain venue: its branch is known
		expect(ranked.find(c => c.brandId === 'bv')).toMatchObject({ id: 'other', branchKnown: true });
	});

	it('never gives the brand to a branch named just like it, on the name alone', () => {
		const bare = [
			candidate('bare', 'Frittenwerk', { district: 'Mitte', brandName: 'Frittenwerk', branchCount: 2 }),
			candidate('alexa', 'Frittenwerk Alexa', { district: 'Mitte', brandName: 'Frittenwerk', branchCount: 2 }),
		];
		expect(rankCandidates({ venueName: 'Frittenwerk', locationHint: null }, null, bare, words)[0]).toMatchObject({
			branchKnown: false,
		});
		// One branch alone among the candidates is no clue either
		expect(
			rankCandidates({ venueName: 'Frittenwerk', locationHint: null }, null, bare.slice(0, 1), words)[0],
		).toMatchObject({ branchKnown: false });
	});

	it("knows the branch from a hint naming its district, or the branch's own words", () => {
		expect(
			rankCandidates(
				{ venueName: 'Burgermeister', locationHint: 'in Pankow' },
				null,
				branches,
				words,
			)[0],
		).toMatchObject({ id: 'pankow', branchKnown: true });
		expect(
			rankCandidates(
				{ venueName: 'Burgermeister Kottbusser Tor', locationHint: null },
				null,
				branches,
				words,
			)[0],
		).toMatchObject({ id: 'kotti', branchKnown: true });
	});

	it('reads a street in the hint however it is spelled, house number or not', () => {
		const streets = [
			candidate('mitte', 'Bandol', { street: 'Oranienburger Str. 50', brandName: 'Bandol', brandId: 'bd', branchCount: 2 }),
			candidate('kant', 'Bandol', { street: 'Kantstraße 67', brandName: 'Bandol', brandId: 'bd', branchCount: 2 }),
		];
		const rank = (locationHint: string) =>
			rankCandidates({ venueName: 'Bandol', locationHint }, null, streets, words)[0];
		expect(rank('Oranienburger Straße 50, 10117 Berlin')).toMatchObject({ id: 'mitte', branchKnown: true });
		expect(rank('Kantstr.')).toMatchObject({ id: 'kant', branchKnown: true });
		// Both streets: no branch
		expect(rank('Oranienburger Straße and Kantstraße')).toMatchObject({ branchKnown: false });
	});
});

describe('MentionMatchingService with brands (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: MentionMatchingService;
	let berlin: City;
	let hamburg: City;
	let brand: Brand;
	let main: Venue;
	let pankow: Venue;
	let inHamburg: Venue;
	const generate = jest.fn(async (_input: string) => ({
		object: { venueId: null as string | null, branchId: null as string | null },
	}));
	let n = 0;

	const post = (
		city: City,
		author = 'foodie',
		postedAt = '2026-09-10T00:00:00Z',
		locationName?: string,
	) =>
		harness.orm.em.create(SocialPost, {
			city,
			externalId: `p${++n}`,
			platform: SocialPlatformEnum.TIKTOK,
			url: `https://tiktok.com/p${n}`,
			postedAt: new Date(postedAt),
			author,
			views: 1000,
			locationName,
		});
	const mention = (p: SocialPost, venueName: string, extra: Partial<Mention> = {}) =>
		harness.orm.em.create(Mention, {
			post: p,
			venueName,
			visited: true,
			sentiment: 'positive',
			summary: 'Good.',
			dishes: [],
			praise: [],
			complaints: [],
			...extra,
		});

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				MentionMatchingService,
				CityService,
				{ provide: VenueMatchAgent, useValue: { generate } },
			],
		});
		service = harness.moduleRef.get(MentionMatchingService);
		entityManagerManager.setEntityManager(harness.orm.em);
		berlin = await cityFactory.create({ name: 'Berlin', nameStopwords: ['berlin'] });
		hamburg = await cityFactory.create({
			name: 'Hamburg',
			locationQuery: 'Hamburg, Germany',
			nameStopwords: ['hamburg'],
		});
		brand = await brandFactory.create({ name: 'Burgermeister' });
		const branch = (city: City, name: string, reviewsCount: number, district: string) =>
			venueFactory.build(
				{ name, reviewsCount, district, category: 'Hamburger restaurant' },
				{ associations: { city, brand } },
			);
		main = branch(berlin, 'Burgermeister Schlesisches Tor', 17617, 'Friedrichshain-Kreuzberg');
		pankow = branch(berlin, 'Burgermeister', 2332, 'Pankow');
		branch(berlin, 'Burgermeister', 1446, 'Mitte');
		inHamburg = branch(hamburg, 'Burgermeister', 300, 'Altona');
		venueFactory.build(
			{ name: 'Hisar', category: 'Kebab shop' },
			{ associations: { city: berlin } },
		);
		await harness.orm.em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(async () => {
		await harness.orm.em.nativeDelete(Mention, {});
		await harness.orm.em.nativeDelete(SocialPost, {});
		harness.orm.em.clear();
		generate.mockClear();
	});

	it('gives a mention naming only the chain the brand and no venue, without asking the LLM', async () => {
		const em = harness.orm.em;
		const hisar = await em.findOneOrFail(Venue, { name: 'Hisar' }, { populate: ['brand'] });
		const brandOnly = mention(post(berlin), 'Burgermeister');
		const inPankow = mention(post(berlin), 'Burgermeister', { locationHint: 'Pankow' });
		const tagged = mention(
			post(berlin, 'eater', '2026-09-11T00:00:00Z', 'Burgermeister Schlesisches Tor'),
			'Burgermeister',
		);
		const hamburgPost = mention(post(hamburg), 'Burgermeister');
		const lone = mention(post(berlin), 'Hisar');
		await em.flush();

		await service.match();
		em.clear();
		const read = (m: Mention) => em.findOneOrFail(Mention, { id: m.id });
		expect(await read(brandOnly)).toMatchObject({ brand: { id: brand.id }, venue: null });
		expect(await read(inPankow)).toMatchObject({ brand: { id: brand.id }, venue: { id: pankow.id } });
		// The creator tagged one branch
		expect(await read(tagged)).toMatchObject({ brand: { id: brand.id }, venue: { id: main.id } });
		// Hamburg has one branch of the chain: there it is a plain venue, its branch known
		expect(await read(hamburgPost)).toMatchObject({ brand: { id: brand.id }, venue: { id: inHamburg.id } });
		// A brand of its own: the brand and the venue
		expect(await read(lone)).toMatchObject({ brand: { id: hisar.brand.id }, venue: { id: hisar.id } });
		expect(generate).not.toHaveBeenCalled();
	});

	it("sends the LLM a chain's branch locations and the post's author, so a namesake elsewhere is ruled out", async () => {
		const em = harness.orm.em;
		// A close name at an address none of the branches is on, posted by the venue's own account
		const own = mention(post(berlin, 'burgermeisterei.berlin'), 'Burgermeisterei', {
			locationHint: 'Frankfurter Allee 21',
		});
		await em.flush();

		await service.match();
		expect(generate).toHaveBeenCalledTimes(1);
		const input = JSON.parse((generate.mock.calls[0] as unknown as [string])[0]);
		expect(input.mention).toMatchObject({ author: 'burgermeisterei.berlin', locationHint: 'Frankfurter Allee 21' });
		const chain = input.candidates.find((c: { branches?: number }) => c.branches);
		expect(chain).toMatchObject({ name: 'Burgermeister', branches: 3 });
		// Every Berlin branch, most reviewed first; never the Hamburg one
		expect(chain.locations.map((l: { district: string }) => l.district)).toEqual([
			'Friedrichshain-Kreuzberg',
			'Pankow',
			'Mitte',
		]);
		em.clear();
		expect(await em.findOneOrFail(Mention, { id: own.id })).toMatchObject({ brand: null, venue: null });
	});

	it('asks the LLM for the branch when the chain is sure but the code cannot place the hint', async () => {
		const em = harness.orm.em;
		const near = mention(post(berlin), 'Burgermeister', { locationHint: 'near Rosenthaler Platz' });
		const vague = mention(post(berlin), 'Burgermeister', { locationHint: 'multiple locations' });
		const noHint = mention(post(berlin), 'Burgermeister', { locationHint: '/' });
		await em.flush();
		// The LLM knows Rosenthaler Platz for the first, and gives no branch for the second
		generate.mockImplementation(async (input: string) => {
			const { mention: m, candidates } = JSON.parse(input);
			return {
				object: {
					venueId: candidates[0].id,
					branchId: m.locationHint.includes('Rosenthaler') ? pankow.id : null,
				},
			};
		});

		await service.match();
		// Once per hinted mention; never for "/"
		expect(generate).toHaveBeenCalledTimes(2);
		generate.mockImplementation(async () => ({ object: { venueId: null, branchId: null } }));
		em.clear();
		const read = (m: Mention) => em.findOneOrFail(Mention, { id: m.id });
		expect(await read(near)).toMatchObject({
			brand: { id: brand.id },
			venue: { id: pankow.id },
			matchMethod: MentionMatchMethodEnum.EXACT,
		});
		expect(await read(vague)).toMatchObject({ brand: { id: brand.id }, venue: null });
		expect(await read(noHint)).toMatchObject({ brand: { id: brand.id }, venue: null });
	});

	it('never asks for a branch when the hint lists the streets of several', async () => {
		const em = harness.orm.em;
		const streets = await em.find(Venue, { id: { $in: [main.id, pankow.id] } });
		streets[0].street = 'Oranienstraße 187';
		streets[1].street = 'Reichsstraße 87';
		const both = mention(post(berlin), 'Burgermeister', { locationHint: 'Oranienstraße 187, Reichsstraße 87' });
		await em.flush();

		await service.match();
		expect(generate).not.toHaveBeenCalled();
		em.clear();
		expect(await em.findOneOrFail(Mention, { id: both.id })).toMatchObject({ brand: { id: brand.id }, venue: null });
		await em.nativeUpdate(Venue, { id: { $in: [main.id, pankow.id] } }, { street: null });
	});

	it("never takes a branch of another brand from the LLM", async () => {
		const em = harness.orm.em;
		const hisar = await em.findOneOrFail(Venue, { name: 'Hisar' });
		const m = mention(post(berlin), 'Burgermeister', { locationHint: 'near Hisar' });
		await em.flush();
		generate.mockImplementationOnce(async (input: string) => ({
			object: { venueId: JSON.parse(input).candidates[0].id, branchId: hisar.id },
		}));

		await service.match();
		const input = JSON.parse(generate.mock.calls[0][0]);
		expect(input.candidates).toHaveLength(1);
		expect(input.candidates[0].locations.map((l: { id: string }) => l.id)).toContain(pankow.id);
		em.clear();
		expect(await em.findOneOrFail(Mention, { id: m.id })).toMatchObject({ brand: { id: brand.id }, venue: null });
	});

	it("rematches the brand's mentions after a change, never an admin's correction", async () => {
		const em = harness.orm.em;
		// Matched to a branch at random before the chain existed
		const stale = mention(post(berlin), 'Burgermeister', {
			venue: pankow,
			brand: pankow.brand,
			matchMethod: MentionMatchMethodEnum.LLM,
			matchedAt: new Date(),
		});
		const corrected = mention(post(berlin), 'Burgermeister', {
			venue: pankow,
			brand: pankow.brand,
			matchMethod: MentionMatchMethodEnum.MANUAL,
			matchedAt: new Date(),
		});
		await em.flush();

		await service.rematchBrands([brand.id]);
		em.clear();
		expect(await em.findOneOrFail(Mention, { id: stale.id })).toMatchObject({
			brand: { id: brand.id },
			venue: null,
			matchMethod: MentionMatchMethodEnum.EXACT,
		});
		expect(await em.findOneOrFail(Mention, { id: corrected.id })).toMatchObject({
			venue: { id: pankow.id },
			matchMethod: MentionMatchMethodEnum.MANUAL,
		});
	});

	it("ranks a brand once in the city's top list, its branches' posts together", async () => {
		const em = harness.orm.em;
		const hisar = await em.findOneOrFail(Venue, { name: 'Hisar' }, { populate: ['brand'] });
		// Two posts on two branches, one naming two branches (counted once), one naming only the
		// brand, and the brand's own account
		const both = post(berlin, 'a');
		mention(both, 'Burgermeister', { venue: main, brand });
		mention(both, 'Burgermeister', { venue: pankow, brand });
		mention(post(berlin, 'b'), 'Burgermeister', { brand });
		mention(post(berlin, 'burgermeister.official'), 'Burgermeister', { venue: main, brand });
		// Hisar has two posts too, but fewer views in total
		mention(post(berlin, 'c'), 'Hisar', { venue: hisar, brand: hisar.brand });
		const quiet = post(berlin, 'd');
		quiet.views = 10;
		mention(quiet, 'Hisar', { venue: hisar, brand: hisar.brand });
		await em.flush();

		expect(await service.topBrandIds('2026-09', 10, berlin.id)).toEqual([brand.id, hisar.brand.id]);
	});
});
