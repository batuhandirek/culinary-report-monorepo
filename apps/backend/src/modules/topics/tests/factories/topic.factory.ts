import type { EntityManager } from '@mikro-orm/core';

import { ASPECT_SEED } from '../../constants/aspect-seed.constant.js';
import { TOPIC_SEED, TopicSeed } from '../../constants/topic-seed.constant.js';
import { Topic } from '../../entities/topic.entity.js';
import { Term } from '../../entities/term.entity.js';
import { TermTopic } from '../../entities/term-topic.entity.js';
import { type IndexedTerm, TopicIndex } from '../../util/topics.js';
import { termKey } from 'src/modules/venues/util/dishes.js';
import type { EntityManager as PostgresEntityManager } from '@mikro-orm/postgresql';
import type { PgBossService } from 'src/modules/pgboss/pgboss.service.js';

import { TopicService } from '../../services/topic.service.js';
import type { TopicRelinkService } from '../../services/topic-relink.service.js';
import { MentionTopicService } from '../../services/mention-topic.service.js';
import { MenuTopicService } from '../../services/menu-topic.service.js';
import { VenueTopicService } from '../../services/venue-topic.service.js';

/** Every seeded topic: the kinds of food and the aspects, parents before children */
export const FULL_SEED: TopicSeed[] = [...TOPIC_SEED, ...ASPECT_SEED];

/**
 * Other names the specs seed as admin terms (the seed's old alias list, kept as test data only: no
 * database gets them, and some are not what agent C would answer). `seedTopics` and `seedIndex` add
 * them for the topics they seed.
 */
export const TEST_ALIASES: Record<string, string[]> = {
	italian: [
		'northern italian',
		'southern italian',
		'sicilian',
		'neapolitan',
		'trattoria',
		'osteria',
	],
	french: ['brasserie'],
	german: ['modern german', 'bavarian', 'swabian', 'berlin'],
	austrian: ['viennese'],
	european: ['modern european', 'central european', 'eastern european'],
	balkan: ['bosnian', 'serbian', 'yugoslav'],
	croatian: ['dalmatian'],
	turkish: ['anatolian'],
	'middle eastern': ['oriental', 'levantine', 'orientalisch'],
	arabic: ['arab'],
	persian: ['iranian'],
	afghan: ['afghani'],
	uzbek: ['central asian', 'uzbeki'],
	indian: ['north indian'],
	nepalese: ['nepali', 'himalayan'],
	asian: ['asian fusion', 'pan asian', 'east asian', 'southeast asian', 'asiatisch'],
	chinese: ['cantonese', 'sichuan', 'szechuan', 'hunan', 'shanghainese', 'dongbei', 'china'],
	japanese: ['izakaya', 'japan'],
	american: ['new american', 'diner'],
	'soul food': ['southern'],
	mexican: ['tex mex'],
	argentinian: ['argentine'],
	'west african': ['ghanaian', 'senegalese'],
	ethiopian: ['eritrean'],
	pizza: ['pinsa'],
	kebab: ['gemuse kebab', 'durum', 'iskender', 'adana', 'shish kebab'],
	flammkuchen: ['flammekueche', 'tarte flambee'],
	sushi: ['maki', 'nigiri', 'omakase'],
	'hot pot': ['hotpot'],
	noodles: ['noodle', 'nudeln'],
	dumplings: [
		'dumpling',
		'dim sum',
		'gyoza',
		'jiaozi',
		'momo',
		'momos',
		'manti',
		'pierogi',
		'xiaolongbao',
	],
	poke: ['poke bowl', 'poke bowls'],
	tacos: ['taco', 'taqueria'],
	burgers: ['hamburger', 'smash burger', 'smashburger', 'cheeseburger'],
	chicken: ['grilled chicken', 'hahnchen', 'broiler'],
	'fried chicken': ['chicken wings', 'wings', 'broasted'],
	barbecue: ['us barbecue', 'grill', 'smokehouse'],
	steakhouse: ['steak', 'steak house'],
	seafood: ['fish', 'oysters', 'fisch'],
	sandwiches: ['sandwich', 'panini'],
	bagels: ['bagel'],
	crepes: ['crepe', 'galette'],
	bowls: ['bowl', 'buddha bowl'],
	'acai bowls': ['acai', 'acai bowl'],
	dessert: ['desserts', 'sweets'],
	'ice cream': ['gelato', 'eis', 'eiscafe', 'gelateria', 'soft serve'],
	cake: ['cakes', 'kuchen', 'torte', 'cheesecake'],
	pastry: ['patisserie', 'pastries', 'croissant', 'croissants', 'viennoiserie'],
	cookies: ['cookie'],
	donuts: ['donut', 'doughnut', 'doughnuts'],
	'bubble tea': ['boba'],
	tea: ['tea house', 'teahouse'],
	wine: ['natural wine', 'wein'],
	cocktails: ['cocktail'],
	beer: ['craft beer', 'brewery', 'brewpub', 'bier'],
	vegan: ['plant based', 'pflanzlich'],
	vegetarian: ['veggie'],
	healthy: ['health', 'organic', 'bio', 'salad', 'salads', 'salad bar', 'juice', 'juice bar'],
	'gluten free': ['glutenfrei'],
	cafe: ['coffee', 'coffee shop', 'espresso', 'specialty coffee', 'roastery', 'kaffee'],
	bakery: ['backerei', 'baeckerei', 'boulangerie'],
	bar: ['sports bar', 'lounge'],
	shisha: ['hookah', 'hookah bar', 'shisha bar', 'hookah lounge'],
	pub: ['gastropub', 'irish pub', 'kneipe', 'beer hall'],
	'beer garden': ['biergarten'],
	nightclub: ['night club'],
	'street food': ['imbiss', 'imbissbude', 'snack bar', 'food truck', 'streetfood'],
	'fine dining': ['michelin', 'tasting menu', 'gourmet', 'haute cuisine'],
	deli: ['delicatessen', 'feinkost'],
	market: ['food market', 'food hall', 'markthalle'],
	breakfast: ['fruhstuck', 'fruehstueck'],
	lunch: ['mittagstisch'],
};

/** `TEST_ALIASES` of the given topics as the decided terms the index takes: one term per spelling */
export const aliasTerms = (seed: TopicSeed[] = FULL_SEED): IndexedTerm[] =>
	seed.flatMap(s =>
		(TEST_ALIASES[s.key] ?? []).map(alias => ({
			key: termKey(alias),
			name: alias,
			topicKeys: [s.key],
		})),
	);

/** The seeded topics as the index takes them, without a database: food and aspects, `TEST_ALIASES` as decided terms */
export const seedIndex = (seed: TopicSeed[] = FULL_SEED): TopicIndex =>
	new TopicIndex(
		seed.map(s => ({
			key: s.key,
			label: s.label,
			kind: s.kind,
			parentKey: s.parent ?? null,
			hint: s.hint ?? null,
		})),
		aliasTerms(seed),
	);

/**
 * The seed's topics in this entity manager, not flushed, as the seed migrations insert them (food
 * and aspects, with `TEST_ALIASES` as admin terms linked to their topics): `keys` picks some (their parents
 * come along), all of them otherwise. Returns the topics by key.
 */
export const seedTopics = (em: EntityManager, keys?: string[]): Map<string, Topic> => {
	const byKey = new Map(FULL_SEED.map(s => [s.key, s]));
	const wanted = new Set<string>();
	const want = (key: string) => {
		const seed = byKey.get(key);
		if (!seed) throw new Error(`No seeded topic "${key}"`);
		wanted.add(key);
		if (seed.parent) want(seed.parent);
	};
	(keys ?? [...byKey.keys()]).forEach(want);
	const created = new Map<string, Topic>();
	// The seed lists parents before their children
	for (const seed of FULL_SEED.filter(s => wanted.has(s.key))) {
		created.set(
			seed.key,
			em.create(Topic, {
				key: seed.key,
				label: seed.label,
				kind: seed.kind,
				parent: seed.parent ? created.get(seed.parent) : null,
				trendsTopicId: seed.mid ?? null,
				hint: seed.hint ?? null,
			}),
		);
	}
	const now = new Date();
	const terms = new Map<string, Term>();
	for (const seed of FULL_SEED.filter(s => wanted.has(s.key))) {
		for (const alias of TEST_ALIASES[seed.key] ?? []) {
			const key = termKey(alias);
			if (!key || terms.has(key)) continue;
			const term = em.create(Term, { key, name: alias, decidedBy: 'admin', decidedAt: now });
			em.create(TermTopic, { term, topic: created.get(seed.key)!, rank: 0 });
			terms.set(key, term);
		}
	}
	return created;
};

/**
 * Brings the stored topic links up to date after a spec seeded posts, venues or menus, as the
 * writers and the per-city refresh do in the app: every mention's and menu item's topics, then every
 * venue's tags.
 * Built on the entity manager alone, so a suite needs none of the services provided.
 */
export const linkTopics = async (anyEm: EntityManager): Promise<void> => {
	const em = anyEm as unknown as PostgresEntityManager;
	const noJobs = { sendJob: async () => undefined } as unknown as PgBossService;
	const topics = new TopicService(em, noJobs);
	const index = await topics.index();
	const registry = { register: () => undefined } as unknown as TopicRelinkService;
	const venueTopics = new VenueTopicService(em, topics, noJobs);
	await new MentionTopicService(em, topics, registry).relink({ index });
	await new MenuTopicService(em, topics, venueTopics, registry).relink(index);
	await venueTopics.refreshAll(index);
};
