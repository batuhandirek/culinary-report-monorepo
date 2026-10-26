import { EntityManager } from '@mikro-orm/postgresql';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { ownPostSql } from 'src/modules/social/util/accounts.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import type { VenueDetails } from 'src/modules/venues/interfaces/venue-details.interface.js';

import { FoodTopic } from '../entities/food-topic.entity.js';
import { VenueFoodTopic } from '../entities/venue-food-topic.entity.js';
import { FoodTopicCityRefreshJob } from '../jobs/food-topic-city-refresh.job.js';
import { FoodTopicIndex } from '../util/food-topics.js';
import { venueTopics, type VenueTopicSource, VenueTopicTag } from '../util/venue-topics.js';

import { FoodTopicService } from './food-topic.service.js';

/** What an admin does to one topic of a venue. */
export type VenueTopicChange = 'tag' | 'exclude' | 'clear';

const CHUNK = 500;

/**
 * Venues' food topics: the one writer of `VenueFoodTopic`. The admin's rows (a tag or an
 * exclusion) are inputs; the computed tags (`venueTopics` over the venue's Google categories, its
 * posts by others' stored cuisine topics, its latest delivery menu's stored item topics, Google's
 * review tags and the admin's rows) are stored by `refresh`, and every reader reads them
 * (`tags`), so "all burger places" is a query. Refreshed per city by `FoodTopicCityRefreshJob`
 * whenever an input changes, for one venue at once after an admin's change, and for every city by
 * `FoodTopicRelinkJob`.
 */
@Injectable()
export class VenueFoodTopicService {
	private readonly logger = new Logger(VenueFoodTopicService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly foodTopicService: FoodTopicService,
		private readonly pgBossService: PgBossService,
	) {}

	/** The stored tags of these venues, by venue id, the primary first; a venue with none maps to `[]`. */
	async tags(venues: Pick<Venue, 'id'>[]): Promise<Map<string, VenueTopicTag[]>> {
		const out = new Map<string, VenueTopicTag[]>(venues.map(v => [v.id, []]));
		for (const ids of _.chunk(_.uniq(venues.map(v => v.id)), CHUNK)) {
			const rows: { venue_id: string; key: string; source: VenueTopicSource; score: number; primary: boolean }[] =
				await this.em.getConnection().execute(
					`select vt.venue_id, t.key, vt.source, vt.score, vt.primary from venue_food_topics vt
					join food_topics t on t.id = vt.topic_id
					where vt.computed and vt.venue_id in (${ids.map(() => '?').join(', ')})
					order by vt.venue_id, vt.primary desc, vt.score desc, t.key`,
					ids,
				);
			for (const r of rows)
				out.get(r.venue_id)!.push({ key: r.key, source: r.source, score: Number(r.score), primary: r.primary });
		}
		return out;
	}

	/** How many open venues of the city carry each topic as a stored tag, by topic key (no parents). */
	async venueCounts(cityId: string): Promise<Map<string, number>> {
		const rows: { key: string; n: number }[] = await this.em.getConnection().execute(
			`select t.key, count(distinct vt.venue_id)::int as n from venue_food_topics vt
			join food_topics t on t.id = vt.topic_id
			join venues v on v.id = vt.venue_id
			where vt.computed and v.city_id = ? and not v.closed
			group by t.key`,
			[cityId],
		);
		return new Map(rows.map(r => [r.key, Number(r.n)]));
	}

	/**
	 * Works out these venues' tags (`venueTopics`) from what is stored and replaces their computed
	 * rows; the admin's rows are never touched. Safe to run twice at once: rows are upserted on
	 * (venue, topic, computed) and only the ones a venue lost are deleted.
	 */
	async refresh(venueIds: string[], index?: FoodTopicIndex): Promise<{ venues: number; tags: number }> {
		if (!venueIds.length) return { venues: 0, tags: 0 };
		index ??= await this.foodTopicService.index();
		const conn = this.em.getConnection();
		let tags = 0;
		for (const ids of _.chunk(_.uniq(venueIds), CHUNK)) {
			const marks = ids.map(() => '?').join(', ');
			const [venues, mentions, menus, manual] = await Promise.all([
				conn.execute<
					{ id: string; category: string | null; categories: string[] | null; review_tags: VenueDetails['reviewsTags'] | null }[]
				>(`select id, category, categories, details->'reviewsTags' as review_tags from venues where id in (${marks})`, ids),
				// A venue's own posts don't say what others call its food; a mention's cuisine topics only
				conn.execute<{ venue_id: string; keys: string[] }[]>(
					`select m.venue_id, array_agg(t.key order by mt.rank) as keys from mention_food_topics mt
					join mentions m on m.id = mt.mention_id
					join social_posts p on p.id = m.post_id
					join food_topics t on t.id = mt.topic_id
					where m.venue_id in (${marks}) and mt.source = 'cuisine' and not ${ownPostSql('p', 'm.brand_id')}
					group by m.venue_id, m.id`,
					ids,
				),
				// Each listing's latest menu: what the venue sells now
				conn.execute<{ venue_id: string; keys: string[] }[]>(
					`select l.venue_id, coalesce(array_agg(t.key) filter (where t.key is not null), '{}') as keys from menu_items mi
					join venue_delivery_listings l on l.id = mi.listing_id
					left join menu_item_food_topics it on it.menu_item_id = mi.id
					left join food_topics t on t.id = it.topic_id
					where l.venue_id in (${marks})
					and mi.month = (select max(x.month) from menu_items x where x.listing_id = mi.listing_id)
					group by l.venue_id, mi.id`,
					ids,
				),
				conn.execute<{ venue_id: string; key: string; excluded: boolean }[]>(
					`select vt.venue_id, t.key, vt.excluded from venue_food_topics vt join food_topics t on t.id = vt.topic_id
					where not vt.computed and vt.venue_id in (${marks})`,
					ids,
				),
			]);
			const mentionsOf = _.groupBy(mentions, r => r.venue_id);
			const menusOf = _.groupBy(menus, r => r.venue_id);
			const manualOf = _.groupBy(manual, r => r.venue_id);
			const rows: (readonly [string, string, VenueTopicSource, number, boolean])[] = [];
			for (const venue of venues) {
				const computed = venueTopics(
					{
						category: venue.category,
						categories: venue.categories,
						mentionTopics: (mentionsOf[venue.id] ?? []).map(r => ({ keys: r.keys, n: 1 })),
						menuItems: (menusOf[venue.id] ?? []).map(r => ({ keys: r.keys })),
						reviewTags: venue.review_tags ?? [],
						manual: (manualOf[venue.id] ?? []).map(r => ({ key: r.key, excluded: r.excluded })),
					},
					index,
				);
				for (const tag of computed) {
					const topicId = index.get(tag.key)?.id;
					if (topicId) rows.push([venue.id, topicId, tag.source, tag.score, tag.primary] as const);
				}
			}
			for (const chunk of _.chunk(rows, CHUNK))
				await conn.execute(
					`insert into venue_food_topics (venue_id, topic_id, computed, source, score, "primary")
					values ${chunk.map(() => '(?::uuid, ?::uuid, true, ?, ?, ?)').join(', ')}
					on conflict (venue_id, topic_id, computed) do update
					set source = excluded.source, score = excluded.score, "primary" = excluded."primary"`,
					chunk.flat(),
				);
			// What a venue lost since the last refresh
			await conn.execute(
				`delete from venue_food_topics vt where vt.computed and vt.venue_id in (${marks})
				${
					rows.length ?
						`and not exists (select 1 from (values ${rows.map(() => '(?::uuid, ?::uuid)').join(', ')}) as k(venue_id, topic_id)
							where k.venue_id = vt.venue_id and k.topic_id = vt.topic_id)`
					:	''
				}`,
				[...ids, ...rows.flatMap(r => [r[0], r[1]])],
			);
			tags += rows.length;
		}
		return { venues: _.uniq(venueIds).length, tags };
	}

	/** `refresh` of every venue of a city, open or closed. */
	async refreshCity(cityId: string, index?: FoodTopicIndex): Promise<{ venues: number; tags: number }> {
		const rows: { id: string }[] = await this.em
			.getConnection()
			.execute(`select id from venues where city_id = ? and deleted_at is null order by id`, [cityId]);
		const res = await this.refresh(
			rows.map(r => r.id),
			index,
		);
		this.logger.log(`Food topic tags of city ${cityId}: ${res.tags} on ${res.venues} venues`);
		return res;
	}

	/** `refreshCity` of every city (`FoodTopicRelinkJob`, after the topics moved). */
	async refreshAll(index?: FoodTopicIndex): Promise<{ venues: number; tags: number }> {
		index ??= await this.foodTopicService.index();
		const cities: { city_id: string }[] = await this.em
			.getConnection()
			.execute(`select distinct city_id from venues where deleted_at is null`);
		let venues = 0;
		let tags = 0;
		for (const { city_id } of cities) {
			const res = await this.refreshCity(city_id, index);
			venues += res.venues;
			tags += res.tags;
		}
		return { venues, tags };
	}

	/**
	 * Queues a city's refresh (`FoodTopicCityRefreshJob`): its mentions' topics, then its venues'
	 * tags. After anything that changes their inputs: extraction, matching, account matching, a
	 * Google Maps save, a delivery scrape. One runs and one waits per city.
	 */
	async queueCityRefresh(cityIds: string[]): Promise<void> {
		for (const cityId of _.uniq(cityIds))
			await this.pgBossService.sendJob(FoodTopicCityRefreshJob.jobName, new FoodTopicCityRefreshJob({ cityId }), {
				singletonKey: cityId,
			});
	}

	/** One venue's tags, and the topics an admin excluded from it. */
	async forVenue(venueId: string): Promise<{ tags: VenueTopicTag[]; excluded: string[] }> {
		await this.em.findOneOrFail(Venue, { id: venueId });
		const [tags, excluded] = await Promise.all([
			this.tags([{ id: venueId }]),
			this.em.find(VenueFoodTopic, { venue: venueId, excluded: true, computed: false }, { populate: ['topic'] }),
		]);
		return { tags: tags.get(venueId) ?? [], excluded: excluded.map(e => e.topic.key) };
	}

	/**
	 * An admin's change to one topic of a venue: `tag` adds it, `exclude` keeps it off whatever
	 * gives it, `clear` drops the admin's word so categories and posts decide again. Flushes, then
	 * refreshes the venue's tags.
	 */
	async change(venueId: string, topicKey: string, change: VenueTopicChange): Promise<void> {
		const venue = await this.em.findOneOrFail(Venue, { id: venueId });
		const topic = await this.em.findOne(FoodTopic, { key: topicKey, deletedAt: null });
		if (!topic) throw new BadRequestException(`No topic "${topicKey}"`);
		const row = await this.em.findOne(VenueFoodTopic, { venue, topic, computed: false });
		if (change === 'clear') {
			if (row) this.em.remove(row);
		} else if (row) row.excluded = change === 'exclude';
		else this.em.create(VenueFoodTopic, { venue, topic, excluded: change === 'exclude' });
		await this.em.flush();
		await this.refresh([venueId]);
	}
}
