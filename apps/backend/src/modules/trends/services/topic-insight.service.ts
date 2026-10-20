import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, NotFoundException } from '@nestjs/common';

import _ from 'lodash';

import {
	FoodTopic,
	FoodTopicKindEnum,
} from 'src/modules/food-topics/entities/food-topic.entity.js';
import { FoodTopicService } from 'src/modules/food-topics/services/food-topic.service.js';
import { VenueFoodTopicService } from 'src/modules/food-topics/services/venue-food-topic.service.js';
import { FoodTopicIndex } from 'src/modules/food-topics/util/food-topics.js';
import { VenueTopicTag } from 'src/modules/food-topics/util/venue-topics.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { monthRange } from 'src/modules/venues/util/month.js';
import { isFoodVenue } from 'src/modules/venues/util/venue-names.js';

import { TrendRelatedQuery } from '../entities/trend-related-query.entity.js';
import {
	SearchTermKindEnum,
	TrendSearchInterest,
} from '../entities/trend-search-interest.entity.js';
import { change, monthsUpTo } from '../util/search-interest.js';
import {
	countTopicMentions,
	TOPIC_MENTIONS_SQL,
	TopicMentionCounts,
	TopicMentionRow,
	topicShares,
} from '../util/topic-mentions.js';

import { RelatedQuery, SEARCH_WINDOW_MONTHS } from './search-interest.service.js';

/** One topic's figures in a city and month. */
export interface TopicInsightRow {
	key: string;
	label: string;
	kind: FoodTopicKindEnum;
	parentKey?: string;
	/** How many topics sit directly under it */
	children: number;
	/** Open food venues of the city tagged with it or a child of it */
	venues: number;
	/** Of those, the ones it (or a child) is the primary food of */
	primaryVenues: number;
	/** The month's mentions by others naming it or a child of it */
	posts: number;
	/** Their share of the month's mentions with a topic, percent; null without any that month */
	share: number | null;
	/** Against the month before, in percentage points; null when either month has none */
	shareChange: number | null;
	/** Google's 0–100 per month over the twelve months (null: too little data or not pulled) */
	searches: (number | null)[];
	/** The month's searches against the month before: 0.4 = up 40 % */
	searchChange: number | null;
}

export interface TopicInsightList {
	month: string;
	months: string[];
	/** Topics with a venue, a mention in the window or a search figure */
	topics: TopicInsightRow[];
}

/** A venue tagged with the topic or a child of it. */
export interface TopicVenueRow {
	venue: Venue;
	/** The tag that puts it here: the topic itself or a descendant */
	viaKey: string;
	viaLabel: string;
	/** It or a child is the venue's primary food */
	primary: boolean;
	source: VenueTopicTag['source'];
	/** The month's mentions of its brand by others (a chain's branches share them) */
	posts: number;
}

export interface TopicInsightDetail {
	topic: FoodTopic;
	parent?: { key: string; label: string };
	row: TopicInsightRow;
	children: TopicInsightRow[];
	months: string[];
	/** The topic's mentions by others per month */
	postsByMonth: number[];
	/** Their share per month, percent */
	shareByMonth: (number | null)[];
	related?: { top: RelatedQuery[]; rising: RelatedQuery[] };
	venues: TopicVenueRow[];
}

/** Most posted about first, then most venues, then by label. */
const byBuzz = (rows: TopicInsightRow[]) =>
	_.orderBy(rows, [r => r.posts, r => r.venues, r => r.label], ['desc', 'desc', 'asc']);

interface CityData {
	months: string[];
	index: FoodTopicIndex;
	topics: FoodTopic[];
	counts: TopicMentionCounts;
	searches: Map<string, (number | null)[]>;
	venues: Venue[];
	tags: Map<string, VenueTopicTag[]>;
}

/**
 * What the city's food topics are doing: venues tagged (supply), the month's posts (buzz) and
 * Google searches (demand), per topic and for one topic with its venues and children. Reads
 * stored rows only; the one reader behind `/admin/topic-insights`.
 */
@Injectable()
export class TopicInsightService {
	constructor(
		private readonly em: EntityManager,
		private readonly foodTopicService: FoodTopicService,
		private readonly venueFoodTopicService: VenueFoodTopicService,
	) {}

	/** Every topic with a signal in the city, most posted about this month first. */
	async list(cityId: string, month: string): Promise<TopicInsightList> {
		const data = await this.cityData(cityId, month);
		const rows = data.topics
			.map(t => this.row(t, data))
			.filter(r => r.venues || r.posts || r.searches.some(v => v !== null));
		return {
			month,
			months: data.months,
			topics: byBuzz(rows),
		};
	}

	/** One topic: its figures, children, monthly posts, related searches and venues. 404 for no such topic. */
	async detail(cityId: string, key: string, month: string): Promise<TopicInsightDetail> {
		const data = await this.cityData(cityId, month);
		const topic = data.topics.find(t => t.key === key);
		if (!topic) throw new NotFoundException(`No topic "${key}"`);
		const parentKey = data.index.get(key)?.parentKey;
		const related = await this.em.find(
			TrendRelatedQuery,
			{ city: cityId, kind: SearchTermKindEnum.TOPIC, term: key, month },
			{ orderBy: { rank: 'asc' } },
		);
		const out = (q: TrendRelatedQuery): RelatedQuery => ({
			query: q.query,
			value: q.value,
			...(q.breakout && { breakout: true }),
		});
		const [rising, top] = _.partition(related, q => q.rising);

		// Its venues: tagged with it or a descendant, the deepest tag naming why
		const venues: TopicVenueRow[] = [];
		for (const venue of data.venues) {
			const tags = data.tags.get(venue.id) ?? [];
			const via = tags.find(t => data.index.withParents([t.key]).includes(key));
			if (!via) continue;
			const primaryTag = tags.find(t => t.primary);
			venues.push({
				venue,
				viaKey: via.key,
				viaLabel: data.index.get(via.key)?.label ?? via.key,
				primary: !!primaryTag && data.index.withParents([primaryTag.key]).includes(key),
				source: via.source,
				posts: data.counts.byBrand.get(venue.brand.id)?.get(month) ?? 0,
			});
		}
		return {
			topic,
			...(parentKey && {
				parent: { key: parentKey, label: data.index.get(parentKey)?.label ?? parentKey },
			}),
			row: this.row(topic, data),
			children: byBuzz(
				data.topics.filter(t => t.parent?.id === topic.id).map(t => this.row(t, data)),
			),
			months: data.months,
			postsByMonth: data.months.map(m => data.counts.byTopic.get(key)?.get(m) ?? 0),
			shareByMonth: topicShares(data.counts, key, data.months),
			...(related.length && { related: { top: top.map(out), rising: rising.map(out) } }),
			venues: _.orderBy(
				venues,
				[v => v.posts, v => v.primary, v => v.venue.reviewsCount ?? 0, v => v.venue.name],
				['desc', 'desc', 'desc', 'asc'],
			),
		};
	}

	private row(topic: FoodTopic, data: CityData): TopicInsightRow {
		const { months, index, counts } = data;
		const last = months.length - 1;
		const shares = topicShares(counts, topic.key, months);
		const searches = data.searches.get(topic.key) ?? months.map(() => null);
		let venues = 0;
		let primaryVenues = 0;
		for (const venue of data.venues) {
			const tags = data.tags.get(venue.id) ?? [];
			if (!index.withParents(tags.map(t => t.key)).includes(topic.key)) continue;
			venues++;
			const primary = tags.find(t => t.primary);
			if (primary && index.withParents([primary.key]).includes(topic.key)) primaryVenues++;
		}
		const parentKey = index.get(topic.key)?.parentKey;
		return {
			key: topic.key,
			label: topic.label,
			kind: topic.kind,
			...(parentKey && { parentKey }),
			children: data.topics.filter(t => t.parent?.id === topic.id).length,
			venues,
			primaryVenues,
			posts: counts.byTopic.get(topic.key)?.get(months[last]) ?? 0,
			share: shares[last],
			shareChange:
				shares[last] === null || shares[last - 1] === null ?
					null
				:	Math.round((shares[last]! - shares[last - 1]!) * 10) / 10,
			searches,
			searchChange: change(searches[last], searches[last - 1]),
		};
	}

	/** Everything both reads need, for the twelve months up to `month`. */
	private async cityData(cityId: string, month: string): Promise<CityData> {
		const months = monthsUpTo(month, SEARCH_WINDOW_MONTHS);
		const [index, topics, rows, stored, venues] = await Promise.all([
			this.foodTopicService.index(),
			this.foodTopicService.all(),
			this.em
				.getConnection()
				.execute<TopicMentionRow[]>(TOPIC_MENTIONS_SQL, [
					cityId,
					monthRange(months[0]).start,
					monthRange(months.at(-1)!).end,
				]),
			this.em.find(TrendSearchInterest, {
				city: cityId,
				kind: SearchTermKindEnum.TOPIC,
				month: { $in: months },
			}),
			this.em.find(Venue, { city: cityId, closed: false }),
		]);
		const searches = new Map(
			Object.entries(_.groupBy(stored, r => r.term)).map(([term, group]) => {
				const byMonth = new Map(group.map(r => [r.month, r.interest ?? null]));
				return [term, months.map(m => byMonth.get(m) ?? null)];
			}),
		);
		const food = venues.filter(v => isFoodVenue(v.category));
		return {
			months,
			index,
			topics,
			counts: countTopicMentions(rows, index),
			searches,
			venues: food,
			tags: await this.venueFoodTopicService.tags(food, index),
		};
	}
}
