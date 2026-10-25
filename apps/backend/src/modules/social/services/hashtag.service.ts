import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';

import _ from 'lodash';

import { FoodTopicService } from 'src/modules/food-topics/services/food-topic.service.js';
import { FoodTopicRelinkService } from 'src/modules/food-topics/services/food-topic-relink.service.js';
import type { FoodTopicIndex } from 'src/modules/food-topics/util/food-topics.js';

import { Hashtag } from '../entities/hashtag.entity.js';
import { hashtagBrandIndex, hashtagKey, hashtagLinks } from '../util/hashtags.js';

const CHUNK = 500;

/**
 * Hashtags' links, pure matching, no LLM: the one writer of `Hashtag.foodTopic` and `Hashtag.brand`
 * (`hashtagLinks`), and of `ignored`. `relink` runs over every tag after posts are saved, from `FoodTopicRelinkJob` and
 * after a brand change; it writes only what changed.
 */
@Injectable()
export class HashtagService implements OnModuleInit {
	private readonly logger = new Logger(HashtagService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly foodTopicService: FoodTopicService,
		private readonly foodTopicRelinkService: FoodTopicRelinkService,
	) {}

	onModuleInit() {
		this.foodTopicRelinkService.register({ key: 'hashtags', relink: index => this.relink({ index }) });
	}

	async relink(opts: { index?: FoodTopicIndex } = {}): Promise<{ tags: number; changed: number }> {
		const index = opts.index ?? (await this.foodTopicService.index());
		const conn = this.em.getConnection();
		const [tags, brands, handles, cities, evidence] = await Promise.all([
			conn.execute<{ id: number; tag: string; food_topic_id: string | null; brand_id: string | null }[]>(
				`select id, tag, food_topic_id, brand_id from hashtags`,
			),
			conn.execute<{ id: string; name: string }[]>(`select id, name from brands where deleted_at is null`),
			conn.execute<{ brandId: string; handle: string }[]>(
				`select a.brand_id as "brandId", a.handle from social_accounts a
				join brands b on b.id = a.brand_id and b.deleted_at is null`,
			),
			conn.execute<{ name: string; aliases: string[] | null }[]>(`select name, aliases from cities`),
			// A tag and a brand seen together: on a post with a mention matched to it, or by its own account
			conn.execute<{ hashtag_id: number; brand_id: string }[]>(
				`select ph.hashtag_id, m.brand_id from post_hashtags ph join mentions m on m.post_id = ph.post_id
				where m.brand_id is not null
				union
				select ph.hashtag_id, a.brand_id from post_hashtags ph join social_posts p on p.id = ph.post_id
				join social_accounts a on a.id = p.account_id where a.brand_id is not null`,
			),
		]);
		const ctx = {
			index,
			brandOf: hashtagBrandIndex(brands, handles),
			cityKeys: new Set(cities.flatMap(c => [c.name, ...(c.aliases ?? [])]).map(hashtagKey)),
			seenWith: new Set(evidence.map(e => `${e.hashtag_id} ${e.brand_id}`)),
		};
		const changed: [number, string | null, string | null][] = [];
		for (const t of tags) {
			const link = hashtagLinks(t, ctx);
			if (link.topicId !== t.food_topic_id || link.brandId !== t.brand_id) changed.push([t.id, link.topicId, link.brandId]);
		}
		for (const chunk of _.chunk(changed, CHUNK))
			await conn.execute(
				`update hashtags h set food_topic_id = v.topic_id, brand_id = v.brand_id
				from (values ${chunk.map(() => '(?::int, ?::uuid, ?::uuid)').join(', ')}) as v(id, topic_id, brand_id)
				where h.id = v.id`,
				chunk.flat(),
			);
		if (changed.length) this.logger.log(`Hashtags re-linked: ${changed.length} of ${tags.length}`);
		return { tags: tags.length, changed: changed.length };
	}

	/** An admin's "this tag is noise" (never suggested as a source), or its undo. Flushes. */
	async setIgnored(id: number, ignored: boolean): Promise<Hashtag> {
		const tag = await this.em.findOne(Hashtag, { id });
		if (!tag) throw new NotFoundException(`No hashtag ${id}`);
		tag.ignored = ignored;
		await this.em.flush();
		return tag;
	}
}
