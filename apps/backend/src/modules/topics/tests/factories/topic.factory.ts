import type { EntityManager } from '@mikro-orm/core';

import { ASPECT_SEED } from '../../constants/aspect-seed.constant.js';
import { TOPIC_SEED, TopicSeed } from '../../constants/topic-seed.constant.js';
import { Topic } from '../../entities/topic.entity.js';
import { TopicIndex } from '../../util/topics.js';
import type { EntityManager as PostgresEntityManager } from '@mikro-orm/postgresql';
import type { PgBossService } from 'src/modules/pgboss/pgboss.service.js';

import { TopicService } from '../../services/topic.service.js';
import type { TopicRelinkService } from '../../services/topic-relink.service.js';
import { MentionTopicService } from '../../services/mention-topic.service.js';
import { MenuTopicService } from '../../services/menu-topic.service.js';
import { VenueTopicService } from '../../services/venue-topic.service.js';

/** Every seeded topic: the kinds of food and the aspects, parents before children */
export const FULL_SEED: TopicSeed[] = [...TOPIC_SEED, ...ASPECT_SEED];

/** The seeded topics as the index takes them, without a database: food and aspects. */
export const seedIndex = (seed: TopicSeed[] = FULL_SEED): TopicIndex =>
	new TopicIndex(
		seed.map(s => ({
			key: s.key,
			label: s.label,
			kind: s.kind,
			parentKey: s.parent ?? null,
			aliases: s.aliases ?? [],
			hint: s.hint ?? null,
		})),
	);

/**
 * The seed's topics in this entity manager, not flushed, as the seed migrations insert them (food
 * and aspects): `keys` picks some (their parents come along), all of them otherwise. Returns them
 * by key.
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
				aliases: seed.aliases ?? [],
				trendsTopicId: seed.mid ?? null,
				hint: seed.hint ?? null,
			}),
		);
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
