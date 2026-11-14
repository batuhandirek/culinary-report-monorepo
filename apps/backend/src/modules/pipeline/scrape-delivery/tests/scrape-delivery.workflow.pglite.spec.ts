import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { GOOGLE_SEARCH_ACTOR } from 'src/modules/apify/actors/google-search.actor.js';
import { LIEFERANDO_ACTOR } from 'src/modules/apify/actors/lieferando.actor.js';
import { UBER_EATS_ACTOR, type UberEatsItem } from 'src/modules/apify/actors/uber-eats.actor.js';
import { WOLT_MENU_ACTOR } from 'src/modules/apify/actors/wolt-menu.actor.js';
import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import { FakeApify } from 'src/modules/apify/tests/factories/fake-apify.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { fakeDurable } from 'src/modules/durable-workflows/tests/factories/durable.mock.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { addStatements } from 'src/modules/statements/tests/factories/statement.factory.js';
import { MenuItemTerm } from 'src/modules/topics/entities/menu-item-term.entity.js';
import { MenuItemTopic } from 'src/modules/topics/entities/menu-item-topic.entity.js';
import { MenuTermService } from 'src/modules/topics/services/menu-term.service.js';
import { MenuTopicService } from 'src/modules/topics/services/menu-topic.service.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { VenueTopicService } from 'src/modules/topics/services/venue-topic.service.js';
import { seedTopics } from 'src/modules/topics/tests/factories/topic.factory.js';
import { MenuItem } from 'src/modules/venues/entities/menu-item.entity.js';
import { MenuItemSnapshot } from 'src/modules/venues/entities/menu-item-snapshot.entity.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import {
	DeliveryPlatformEnum,
	VenueDeliveryListing,
} from 'src/modules/venues/entities/venue-delivery-listing.entity.js';
import { VenueDeliverySnapshot } from 'src/modules/venues/entities/venue-delivery-snapshot.entity.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { BrandMenuService } from 'src/modules/venues/services/brand-menu.service.js';
import { VenueDeliveryService } from 'src/modules/venues/services/venue-delivery.service.js';
import { brandFactory } from 'src/modules/venues/tests/factories/brand.factory.js';
import { venueFactory } from 'src/modules/venues/tests/factories/venue.factory.js';
import {
	GOOGLE_DELIVERY_PAGES,
	LIEFERANDO_BUN_SOCIETY,
	UBER_EATS_BUN_SOCIETY,
} from 'src/modules/venues/tests/fixtures/delivery-items.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { ReportBrandsService } from '../../shared/services/report-brands.service.js';
import { AdminScrapeDeliveryController } from '../controllers/admin.scrape-delivery.controller.js';
import { SCRAPE_DELIVERY_BRAND_QUEUE } from '../queues/scrape-delivery.queue.js';
import {
	type ScrapeDeliveryResult,
	ScrapeDeliveryWorkflow,
} from '../workflows/scrape-delivery.workflow.js';

const UBER_URL = 'https://www.ubereats.com/de/store/the-bun-society/aSPb8zC6UmqrZMgi5HzFGw';
const LIEFERANDO_URL = 'https://www.lieferando.de/speisekarte/the-bun-society';

/**
 * The delivery pages and menus as the operation runs them (the facade faked to run a started child
 * inline), on the pages The Bun Society had on 2026-11-14: "Find menus" searching the web once and
 * reading what it found, the menus kept item by item across months (a price change, an item gone
 * and back, a page that stopped answering), the wordings reviews use linked to the items, and a
 * chain's pages matched to its branches by where they stand.
 */
describe('ScrapeDeliveryWorkflow (pglite)', () => {
	let harness: PgliteTestingModule;
	let workflow: ScrapeDeliveryWorkflow;
	let controller: AdminScrapeDeliveryController;
	let menus: BrandMenuService;
	let berlin: City;
	let bunSociety: Venue;
	const apify = new FakeApify<unknown>();
	const durable = fakeDurable(() => [workflow], 'op-1');
	const sendJob = jest.fn(async (..._args: unknown[]) => undefined);
	const scope = jest.fn<ReportBrandsService['scope']>();
	const thisMonth = new Date().toISOString().slice(0, 7);

	/** What each platform's page says when read; a URL not listed answers nothing (the page is gone) */
	let uberEats: Record<string, UberEatsItem> = {};
	let lieferando: Record<string, unknown> = {};
	let wolt: Record<string, unknown> = {};
	const answer = (input: Record<string, unknown>, actor: string): unknown[] => {
		if (actor === GOOGLE_SEARCH_ACTOR.id)
			return String(input.queries)
				.split('\n')
				.map(
					term =>
						GOOGLE_DELIVERY_PAGES.find(page => page.searchQuery?.term === term) ?? {
							searchQuery: { term, page: 1 },
							organicResults: [],
						},
				);
		if (actor === UBER_EATS_ACTOR.id)
			return (input.urls as string[]).flatMap(url => (uberEats[url] ? [uberEats[url]] : []));
		if (actor === LIEFERANDO_ACTOR.id)
			return (input.startUrls as { url: string }[]).flatMap(({ url }) =>
				lieferando[url] ? [lieferando[url]] : [],
			);
		if (actor === WOLT_MENU_ACTOR.id) {
			const item = wolt[String(input.restaurantUrl)];
			if (item instanceof Error) throw item;
			return item ? [item] : [];
		}
		throw new Error(`Unexpected actor ${actor}`);
	};
	const runsOf = (actor: { id: string }) => apify.calls.filter(call => call.actor === actor.id);
	const em = () => harness.orm.em.fork();
	const last = async () => (await durable.started.at(-1)!.result) as ScrapeDeliveryResult;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				ScrapeDeliveryWorkflow,
				AdminScrapeDeliveryController,
				VenueDeliveryService,
				BrandMenuService,
				MenuTermService,
				MenuTopicService,
				TopicService,
				VenueTopicService,
				BrandService,
				CityService,
				{ provide: ReportBrandsService, useValue: { scope } },
				{ provide: ApifyService, useValue: apify },
				{ provide: DurableWorkflowsService, useValue: durable },
				{ provide: PgBossService, useValue: { sendJob } },
			],
		});
		workflow = harness.moduleRef.get(ScrapeDeliveryWorkflow);
		controller = harness.moduleRef.get(AdminScrapeDeliveryController);
		menus = harness.moduleRef.get(BrandMenuService);
		entityManagerManager.setEntityManager(harness.orm.em);
		seedTopics(harness.orm.em);
		berlin = await cityFactory.create({ name: 'Berlin' });
		bunSociety = await venueFactory.create(
			{
				name: 'The Bun Society',
				category: 'Hamburger restaurant',
				street: 'Adalbertstraße 23',
				postalCode: '10997',
				lat: 52.50305,
				lng: 13.42078,
				reviewsCount: 538,
			},
			{ associations: { city: berlin } },
		);
		// Two guests name the same burger their own way; one names another
		const index = await harness.moduleRef.get(TopicService).index();
		const review = (id: string, claims: Parameters<typeof addStatements>[2]) =>
			addStatements(
				harness.orm.em,
				harness.orm.em.create(Review, {
					venue: bunSociety,
					reviewId: id,
					publishedAt: new Date('2026-10-10T12:00:00Z'),
					stars: 5,
					text: 'Text',
				}),
				claims,
				{ index },
			);
		review('r1', [
			{ text: 'The banging bangkok burger was great', sentiment: 'positive', foods: ['banging bangkok burger'] },
			{ text: 'The Bussin Bulgogi was dry', sentiment: 'negative', foods: ['Bussin Bulgogi'] },
		]);
		review('r2', [
			{ text: 'Bangbang Bangkok is the best burger in town', sentiment: 'positive', foods: ['Bangbang Bangkok', 'burger'] },
		]);
		await harness.orm.em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(() => {
		apify.reset();
		apify.answer = answer;
		durable.started.length = 0;
		sendJob.mockClear();
		scope.mockReset();
		uberEats = { [UBER_URL]: UBER_EATS_BUN_SOCIETY };
		lieferando = { [LIEFERANDO_URL]: LIEFERANDO_BUN_SOCIETY };
		wolt = {};
	});

	it('finds a brand’s pages with one web search and stores each as its listing, snapshot and menu', async () => {
		const started = await controller.searchBrandMenus(bunSociety.brand.id, { cityId: berlin.id });
		expect(started.workflowId).toBeTruthy();
		expect(durable.started[0].options).toMatchObject({
			queue: SCRAPE_DELIVERY_BRAND_QUEUE,
			dedupe: `${bunSociety.brand.id}:${berlin.id}`,
			onDuplicate: 'return-existing',
			priority: 'high',
		});
		const result = await last();

		// One query for a one-venue brand, at the search actor's lowest cap
		expect(runsOf(GOOGLE_SEARCH_ACTOR)).toHaveLength(1);
		expect(runsOf(GOOGLE_SEARCH_ACTOR)[0]).toMatchObject({
			input: {
				queries: '"The Bun Society" Berlin site:lieferando.de OR site:wolt.com OR site:ubereats.com',
				maxPagesPerQuery: 1,
				countryCode: 'de',
			},
			options: { maxCostUsd: 0.5 },
		});
		// Google lists the Uber Eats page twice (German and English): read once. No Wolt page found
		expect(runsOf(UBER_EATS_ACTOR)[0].input).toEqual({ urls: [UBER_URL], locale: 'de-DE' });
		expect(runsOf(LIEFERANDO_ACTOR)[0].input).toMatchObject({
			country: 'de',
			startUrls: [{ url: LIEFERANDO_URL }],
			fetchMenu: true,
		});
		expect(runsOf(WOLT_MENU_ACTOR)).toHaveLength(0);
		expect(result).toMatchObject({
			venues: 1,
			brandsSearched: 1,
			pages: 2,
			listings: 0,
			saved: 2,
			found: 2,
			menuItems: 84,
			itemsAdded: 84,
			itemsRemoved: 0,
			gone: 0,
			unmatched: 0,
			failed: 0,
			searched: 1,
			byPlatform: { uber_eats: 1, lieferando: 1 },
		});

		const listings = await em().find(VenueDeliveryListing, { venue: bunSociety.id }, { orderBy: { platform: 'asc' } });
		expect(listings.map(l => l.platform)).toEqual([DeliveryPlatformEnum.LIEFERANDO, DeliveryPlatformEnum.UBER_EATS]);
		expect(listings[0]).toMatchObject({
			url: LIEFERANDO_URL,
			name: 'The Bun Society',
			address: 'Adalbertstraße 23, 10997',
			rating: expect.closeTo(3.7),
			reviewsCount: 1,
			deliveryFee: expect.closeTo(0.79),
			minOrder: 10,
			etaMin: 20,
			etaMax: 40,
			removedAt: null,
		});
		expect(listings[0].menuFetchedAt).toBeInstanceOf(Date);
		expect(listings[1]).toMatchObject({ url: UBER_URL, cuisines: ['Burger'], reviewsCount: 170 });
		const snapshots = await em().find(VenueDeliverySnapshot, {}, { populate: ['listing'] });
		expect(snapshots.map(s => [s.listing.platform, s.month, s.menuItems]).sort()).toEqual([
			['lieferando', thisMonth, 50],
			['uber_eats', thisMonth, 34],
		]);
		expect(await em().count(MenuItem, { removedAt: null })).toBe(84);
		expect(await em().count(MenuItemSnapshot, { month: thisMonth })).toBe(84);
		expect((await em().findOneOrFail(Venue, bunSociety.id)).deliverySearchedAt).toBeInstanceOf(Date);

		// A house name has no food in it: its menu section says what it is
		const links = await em().find(
			MenuItemTopic,
			{ menuItem: { key: 'banging bangkok' } },
			{ populate: ['topic'] },
		);
		expect(new Set(links.map(link => link.topic.key))).toContain('burgers');
	});

	it('links the wordings reviews use to the items, and counts the reviews naming each', async () => {
		const linked = await em().find(MenuItemTerm, {}, { populate: ['menuItem', 'term'] });
		const of = (wording: string) =>
			linked.filter(link => link.term.key === wording).map(link => [link.menuItem.key, link.method]);
		// One link per listing that has the item
		expect(of('banging bangkok burger')).toEqual([
			['banging bangkok', 'contains'],
			['banging bangkok', 'contains'],
		]);
		expect(of('bangbang bangkok').map(([, method]) => method)).toEqual(['similar', 'similar']);
		expect(of('bussin bulgogi').map(([, method]) => method)).toEqual(['exact', 'exact']);
		// A kind of food is no item
		expect(of('burger')).toEqual([]);

		const { branches } = await menus.menu(bunSociety.brand.id, berlin.id);
		expect(branches).toHaveLength(1);
		expect(branches[0]).toMatchObject({ venueId: bunSociety.id, name: 'The Bun Society' });
		expect(branches[0].searchedAt).toBeTruthy();
		expect(branches[0].listings.map(l => [l.platform, l.items, l.removedItems, l.snapshots.length])).toEqual([
			['lieferando', 50, 0, 1],
			['uber_eats', 34, 0, 1],
		]);
		// The most named first: one row an item across the platforms listing it
		const [first, second] = branches[0].items;
		expect(first).toMatchObject({
			key: 'banging bangkok',
			removed: false,
			category: 'Smashed Beef Burger',
			sources: 2,
			reviews: 2,
			posts: 0,
			praise: 2,
			complaints: 0,
		});
		expect(first.topics.map(topic => topic.key)).toContain('burgers');
		expect(first.offers.map(offer => [offer.platform, offer.price])).toEqual([
			['lieferando', 10.5],
			['uber_eats', 10.5],
		]);
		expect(first.wordings.map(wording => [wording.name, wording.method, wording.sources]).sort()).toEqual([
			['Bangbang Bangkok', 'similar', 1],
			['banging bangkok burger', 'contains', 1],
		]);
		expect(second).toMatchObject({ key: 'bussin bulgogi', sources: 1, praise: 0, complaints: 1 });
		// Uber Eats lists it as "Platain Wahala": one row all the same
		const wahala = branches[0].items.filter(item => /^pla\w+ wahala$/.test(item.key));
		expect(wahala.map(item => [item.name, item.offers.map(offer => offer.platform)])).toEqual([
			['Plantain Wahala', ['lieferando', 'uber_eats']],
		]);
		// A house name that only spells an ingredient is what its section says too
		expect(branches[0].items.find(item => item.key === 'sumac slap')!.topics.map(t => t.key)).toContain('burgers');
		// 50 on Lieferando, 34 on Uber Eats, most of them on both
		expect(branches[0].items.length).toBeGreaterThan(50);
		expect(branches[0].items.length).toBeLessThan(84);
	});

	it('reads the held pages again in a month’s run: a new price, an item gone, a page gone', async () => {
		scope.mockResolvedValue({ brands: [], branches: [bunSociety], competitors: [] });
		const sections = UBER_EATS_BUN_SOCIETY.menu!.map(section => ({
			...section,
			catalogItems: section
				.catalogItems!.filter(item => item.title !== 'Midnight Sando')
				.map(item => (item.title?.startsWith('Banging Bangkok') ? { ...item, price: 1150 } : item)),
		}));
		uberEats = { [UBER_URL]: { ...UBER_EATS_BUN_SOCIETY, menu: sections } };
		lieferando = {};
		const result = await workflow.month(berlin.id, '2099-01');

		// Searched a moment ago: no search, only the two held pages
		expect(runsOf(GOOGLE_SEARCH_ACTOR)).toHaveLength(0);
		expect(result).toMatchObject({
			pages: 2,
			listings: 2,
			saved: 1,
			found: 0,
			itemsAdded: 0,
			itemsRemoved: 1,
			gone: 1,
			failed: 0,
		});
		const uber = await em().findOneOrFail(VenueDeliveryListing, {
			venue: bunSociety.id,
			platform: DeliveryPlatformEnum.UBER_EATS,
		});
		const item = (key: string) => em().findOneOrFail(MenuItem, { listing: uber.id, key });
		// One row a month the menu had it: its price then, and how Uber Eats' raters liked it
		const monthsOf = async (menuItem: MenuItem) =>
			(await em().find(MenuItemSnapshot, { menuItem: menuItem.id }, { orderBy: { month: 'asc' } })).map(row => [
				row.month,
				row.price,
			]);
		const bangkok = await item('banging bangkok');
		expect(bangkok).toMatchObject({ price: 11.5, removedAt: null });
		expect(await monthsOf(bangkok)).toEqual([
			[thisMonth, 10.5],
			['2099-01', 11.5],
		]);
		const smash = await em().findOneOrFail(MenuItemSnapshot, {
			menuItem: { listing: uber.id, key: 'the classic smash' },
			month: '2099-01',
		});
		expect(smash).toMatchObject({ price: 8, likedShare: expect.closeTo(0.91), ratingsCount: 23 });
		const sando = await item('midnight sando');
		expect(sando.removedAt).toBeInstanceOf(Date);
		expect(await monthsOf(sando)).toEqual([[thisMonth, 13]]);
		// The page that did not answer is marked, its menu and its snapshots left as they were
		const gone = await em().findOneOrFail(VenueDeliveryListing, {
			venue: bunSociety.id,
			platform: DeliveryPlatformEnum.LIEFERANDO,
		});
		expect(gone.removedAt).toBeInstanceOf(Date);
		expect(await em().count(MenuItem, { listing: gone.id, removedAt: null })).toBe(50);
		expect(await em().count(VenueDeliverySnapshot, { month: '2099-01' })).toBe(1);

		// The menus as of each month
		const service = harness.moduleRef.get(VenueDeliveryService);
		const at = async (month: string) =>
			(await service.menus([bunSociety.id], month)).map(m => [m.listing.platform, m.month, m.items.length]);
		expect(await at(thisMonth)).toEqual([
			['lieferando', thisMonth, 50],
			['uber_eats', thisMonth, 34],
		]);
		expect(await at('2099-01')).toEqual([
			['lieferando', thisMonth, 50],
			['uber_eats', '2099-01', 33],
		]);
		const { branches } = await menus.menu(bunSociety.brand.id, berlin.id);
		const row = branches[0].items.find(i => i.key === 'midnight sando')!;
		// Still on Lieferando's menu as last read
		expect(row.removed).toBe(false);
		expect(row.offers.find(offer => offer.platform === 'uber_eats')?.removedAt).toBeTruthy();
	});

	it('takes an item and a page back when they answer again', async () => {
		scope.mockResolvedValue({ brands: [], branches: [bunSociety], competitors: [] });
		const result = await workflow.month(berlin.id, '2099-02');
		expect(result).toMatchObject({ saved: 2, gone: 0, itemsAdded: 0, itemsRemoved: 0 });
		const listings = await em().find(VenueDeliveryListing, { venue: bunSociety.id });
		expect(listings.map(l => l.removedAt)).toEqual([null, null]);
		expect(await em().count(MenuItem, { removedAt: { $ne: null } })).toBe(0);
		const sando = await em().findOneOrFail(MenuItem, { key: 'midnight sando', listing: { platform: DeliveryPlatformEnum.UBER_EATS } });
		const months = await em().find(MenuItemSnapshot, { menuItem: sando.id }, { orderBy: { month: 'asc' } });
		expect(months.map(row => row.month)).toEqual([thisMonth, '2099-02']);
	});

	it('matches a chain’s pages to its branches by where they stand, and searches again after a failed read', async () => {
		const brand = await brandFactory.create({ name: 'Burgermeister' });
		const branch = (name: string, street: string, postalCode: string) =>
			venueFactory.create({ name, street, postalCode }, { associations: { city: berlin, brand } });
		const hermannplatz = await branch('Burgermeister Hermannplatz', 'Hermannplatz 1', '10967');
		const alexanderplatz = await branch('Burgermeister Alexanderplatz', 'Alexanderplatz 8', '10178');
		scope.mockResolvedValue({ brands: [], branches: [hermannplatz, alexanderplatz], competitors: [] });
		uberEats = {};
		lieferando = {};
		const page = (slug: string) => `https://wolt.com/en/deu/berlin/restaurant/${slug}`;
		const woltItem = (name: string, address: string, postCode: string) => ({
			id: name,
			name,
			address,
			postCode,
			ratingScore: 8.8,
			reviewCount: 500,
			currency: 'EUR',
			menuItems: [{ id: '1', name: 'Meisterburger', priceInCents: 890, category: 'Burger' }],
		});
		wolt = {
			[page('burgermeister-hermannplatz')]: woltItem('Burgermeister Hermannplatz', 'Hermannplatz 1', '10967'),
			// A branch we don't hold
			[page('burgermeister-schlostrae')]: woltItem('Burgermeister Schloßstraße', 'Schloßstraße 1', '12163'),
			[page('burgermeister-alexanderplatz')]: new Error('The run timed out'),
		};
		const result = await workflow.month(berlin.id, '2099-03');

		// A chain is searched a site at a time
		expect(String(runsOf(GOOGLE_SEARCH_ACTOR)[0].input.queries).split('\n')).toEqual([
			'"Burgermeister" Berlin site:lieferando.de',
			'"Burgermeister" Berlin site:wolt.com',
			'"Burgermeister" Berlin site:ubereats.com',
		]);
		// The three restaurant pages of Wolt's result page, never its brand, district or press pages
		expect(runsOf(WOLT_MENU_ACTOR).map(call => call.input.restaurantUrl)).toEqual([
			page('burgermeister-schlostrae'),
			page('burgermeister-hermannplatz'),
			page('burgermeister-alexanderplatz'),
		]);
		expect(result).toMatchObject({ brandsSearched: 1, found: 1, unmatched: 1, failed: 1, searched: 0 });
		const listings = await em().find(VenueDeliveryListing, { venue: { brand: brand.id } });
		expect(listings.map(l => [l.venue.id, l.platform, l.rating])).toEqual([
			[hermannplatz.id, DeliveryPlatformEnum.WOLT, expect.closeTo(4.4)],
		]);
		// A read failed, so nobody is settled: next month's run searches for them again
		const branches = await em().find(Venue, { brand: brand.id });
		expect(branches.map(v => v.deliverySearchedAt)).toEqual([null, null]);
	});
});
