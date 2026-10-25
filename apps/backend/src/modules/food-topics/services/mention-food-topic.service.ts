import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, OnModuleInit } from '@nestjs/common';

import _ from 'lodash';

import type { MentionTopicSource } from '../entities/mention-food-topic.entity.js';
import type { FoodTopicIndex } from '../util/food-topics.js';

import { FoodTopicService } from './food-topic.service.js';
import { FoodTopicRelinkService } from './food-topic-relink.service.js';

const CHUNK = 500;

/** A mention's topics as stored: keys in the order its text names them */
export interface MentionTopicLink {
	key: string;
	source: MentionTopicSource;
	rank: number;
}

/**
 * The stored link of a mention to food topics (`MentionFoodTopic`), its one writer: its cuisine's
 * topics (`FoodTopicIndex.resolve`), else its venue's Google category's, the fallback every reader
 * used on read; a mention naming the brand but no branch takes its brand's most reviewed branch's
 * category in the post's city. Re-resolved after extraction, matching, an admin's correction and a
 * brand change (for the mentions they touch), per city with the venue tags, and by
 * `FoodTopicRelinkJob` on any topic or alias change. Pure matching, no LLM.
 */
@Injectable()
export class MentionFoodTopicService implements OnModuleInit {
	constructor(
		private readonly em: EntityManager,
		private readonly foodTopicService: FoodTopicService,
		private readonly foodTopicRelinkService: FoodTopicRelinkService,
	) {}

	onModuleInit() {
		this.foodTopicRelinkService.register({ key: 'mention-topics', relink: index => this.relink({ index }) });
	}

	/** A mention's links from its cuisine and the category to fall back on (pure). */
	static linksOf(index: FoodTopicIndex, cuisine: string | null | undefined, category: string | null | undefined): MentionTopicLink[] {
		const own = index.resolve(cuisine);
		const [keys, source] = own.length ? [own, 'cuisine' as const] : [index.resolve(category), 'category' as const];
		return keys.map((key, rank) => ({ key, source, rank }));
	}

	/**
	 * Re-resolves the links of mentions (every one, a city's posts', or these ids) and writes only
	 * what changed. Safe to run twice at once: rows are upserted on (mention, topic).
	 */
	async relink(
		opts: { index?: FoodTopicIndex; cityId?: string; mentionIds?: number[] } = {},
	): Promise<{ mentions: number; changed: number }> {
		if (opts.mentionIds && !opts.mentionIds.length) return { mentions: 0, changed: 0 };
		const index = opts.index ?? (await this.foodTopicService.index());
		const conn = this.em.getConnection();
		const where: string[] = [];
		const params: unknown[] = [];
		if (opts.cityId) {
			where.push('p.city_id = ?');
			params.push(opts.cityId);
		}
		if (opts.mentionIds) {
			where.push(`m.id in (${opts.mentionIds.map(() => '?').join(', ')})`);
			params.push(...opts.mentionIds);
		}
		const mentions: { id: number; cuisine: string | null; category: string | null }[] = await conn.execute(
			`select m.id, m.cuisine,
				coalesce(v.category, case when m.brand_id is not null then (
					select o.category from venues o where o.brand_id = m.brand_id and o.city_id = p.city_id
					order by o.reviews_count desc nulls last, o.id limit 1
				) end) as category
			from mentions m
			join social_posts p on p.id = m.post_id
			left join venues v on v.id = m.venue_id
			${where.length ? `where ${where.join(' and ')}` : ''}`,
			params,
		);
		let changed = 0;
		for (const chunk of _.chunk(mentions, CHUNK)) {
			const ids = chunk.map(m => m.id);
			const stored: { mention_id: number; key: string; source: MentionTopicSource; rank: number }[] = await conn.execute(
				`select mt.mention_id, t.key, mt.source, mt.rank from mention_food_topics mt
				join food_topics t on t.id = mt.topic_id
				where mt.mention_id in (${ids.map(() => '?').join(', ')})`,
				ids,
			);
			const storedOf = _.groupBy(stored, r => r.mention_id);
			const signature = (links: MentionTopicLink[]) =>
				_.sortBy(links, l => l.rank)
					.map(l => `${l.key}|${l.source}|${l.rank}`)
					.join(',');
			const writes: { id: number; links: (MentionTopicLink & { topicId: string })[] }[] = [];
			for (const m of chunk) {
				const links = MentionFoodTopicService.linksOf(index, m.cuisine, m.category)
					.map(l => ({ ...l, topicId: index.get(l.key)?.id }))
					.filter((l): l is MentionTopicLink & { topicId: string } => !!l.topicId);
				const before = (storedOf[m.id] ?? []).map(r => ({ key: r.key, source: r.source, rank: r.rank }));
				if (signature(links) !== signature(before)) writes.push({ id: m.id, links });
			}
			if (!writes.length) continue;
			changed += writes.length;
			await this.write(writes);
		}
		return { mentions: mentions.length, changed };
	}

	/** Replaces the links of these mentions: upserts what they have, deletes what they lost. */
	private async write(writes: { id: number; links: { topicId: string; source: MentionTopicSource; rank: number }[] }[]) {
		const conn = this.em.getConnection();
		const rows = writes.flatMap(w => w.links.map(l => [w.id, l.topicId, l.source, l.rank] as const));
		for (const chunk of _.chunk(rows, CHUNK))
			await conn.execute(
				`insert into mention_food_topics (mention_id, topic_id, source, rank)
				values ${chunk.map(() => '(?, ?::uuid, ?, ?)').join(', ')}
				on conflict (mention_id, topic_id) do update set source = excluded.source, rank = excluded.rank`,
				chunk.flat(),
			);
		for (const chunk of _.chunk(writes, CHUNK)) {
			const ids = chunk.map(w => w.id);
			const keep = chunk.flatMap(w => w.links.map(l => [w.id, l.topicId] as const));
			await conn.execute(
				`delete from mention_food_topics mt where mt.mention_id in (${ids.map(() => '?').join(', ')})
				${
					keep.length ?
						`and not exists (select 1 from (values ${keep.map(() => '(?::int, ?::uuid)').join(', ')}) as k(mention_id, topic_id)
							where k.mention_id = mt.mention_id and k.topic_id = mt.topic_id)`
					:	''
				}`,
				[...ids, ...keep.flat()],
			);
		}
	}
}
