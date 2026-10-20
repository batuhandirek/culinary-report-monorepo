import { EntityManager } from '@mikro-orm/postgresql';

import { BadRequestException, Injectable } from '@nestjs/common';

import { ownPostSql } from 'src/modules/social/util/accounts.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';

import { FoodTopic } from '../entities/food-topic.entity.js';
import { VenueFoodTopic } from '../entities/venue-food-topic.entity.js';
import { FoodTopicIndex } from '../util/food-topics.js';
import { venueTopics, VenueTopicTag } from '../util/venue-topics.js';

import { FoodTopicService } from './food-topic.service.js';

/** What an admin does to one topic of a venue. */
export type VenueTopicChange = 'tag' | 'exclude' | 'clear';

/**
 * Venues' food topics (`venueTopics`): worked out on read from the venues' Google categories and
 * their posts by others, with the admin's tags and exclusions (`VenueFoodTopic`, of which this is
 * the one writer) on top.
 */
@Injectable()
export class VenueFoodTopicService {
	constructor(
		private readonly em: EntityManager,
		private readonly foodTopicService: FoodTopicService,
	) {}

	/** The tags of these venues, by venue id; a venue with none maps to `[]`. */
	async tags(
		venues: Pick<Venue, 'id' | 'name' | 'category' | 'categories'>[],
		index?: FoodTopicIndex,
	) {
		const out = new Map<string, VenueTopicTag[]>();
		if (!venues.length) return out;
		index ??= await this.foodTopicService.index();
		const ids = venues.map(v => v.id);
		const placeholders = ids.map(() => '?').join(', ');
		const [rows, manual] = await Promise.all([
			// A venue's own posts don't say what others call its food
			this.em.getConnection().execute<{ venue_id: string; cuisine: string | null; n: number }[]>(
				`select m.venue_id, m.cuisine, count(*)::int as n from mentions m
						join social_posts p on p.id = m.post_id
						where m.venue_id in (${placeholders}) and not ${ownPostSql('p', 'm.brand_id')}
						group by 1, 2`,
				ids,
			),
			this.em.find(VenueFoodTopic, { venue: { $in: ids } }, { populate: ['topic'] }),
		]);
		const byVenue = new Map<string, { cuisine: string | null; n: number }[]>();
		for (const r of rows) {
			const list = byVenue.get(r.venue_id) ?? [];
			list.push({ cuisine: r.cuisine, n: r.n });
			byVenue.set(r.venue_id, list);
		}
		for (const venue of venues) {
			out.set(
				venue.id,
				venueTopics(
					{
						category: venue.category,
						categories: venue.categories,
						mentionCuisines: byVenue.get(venue.id) ?? [],
						manual: manual
							.filter(m => m.venue.id === venue.id)
							.map(m => ({ key: m.topic.key, excluded: m.excluded })),
					},
					index,
				),
			);
		}
		return out;
	}

	/** One venue's tags, and the topics an admin excluded from it. */
	async forVenue(venueId: string): Promise<{ tags: VenueTopicTag[]; excluded: string[] }> {
		const venue = await this.em.findOneOrFail(Venue, { id: venueId });
		const [tags, excluded] = await Promise.all([
			this.tags([venue]),
			this.em.find(
				VenueFoodTopic,
				{ venue: venueId, excluded: true },
				{ populate: ['topic'] },
			),
		]);
		return { tags: tags.get(venueId) ?? [], excluded: excluded.map(e => e.topic.key) };
	}

	/**
	 * An admin's change to one topic of a venue: `tag` adds it, `exclude` keeps it off whatever
	 * gives it, `clear` drops the admin's word so categories and posts decide again. Flushes.
	 */
	async change(venueId: string, topicKey: string, change: VenueTopicChange): Promise<void> {
		const venue = await this.em.findOneOrFail(Venue, { id: venueId });
		const topic = await this.em.findOne(FoodTopic, { key: topicKey, deletedAt: null });
		if (!topic) throw new BadRequestException(`No topic "${topicKey}"`);
		const row = await this.em.findOne(VenueFoodTopic, { venue, topic });
		if (change === 'clear') {
			if (row) this.em.remove(row);
		} else if (row) row.excluded = change === 'exclude';
		else this.em.create(VenueFoodTopic, { venue, topic, excluded: change === 'exclude' });
		await this.em.flush();
	}
}
