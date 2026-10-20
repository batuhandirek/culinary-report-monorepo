// Pure: counting a city's mentions per food topic and month.

import type { FoodTopicIndex } from 'src/modules/food-topics/util/food-topics.js';
import { ownPostSql } from 'src/modules/social/util/accounts.js';

/** One matched mention as the topic readers select it. */
export interface TopicMentionRow {
	/** YYYY-MM of the post */
	month: string;
	brand_id: string;
	brand_name: string;
	category: string | null;
	cuisine: string | null;
	/** By one of the brand's own accounts (`ownPostSql`) */
	own: boolean;
}

export interface TopicMentionCounts {
	/** Per month, the mentions by others with any topic */
	totals: Map<string, number>;
	/** Per topic key and month, the mentions by others naming it or a child of it */
	byTopic: Map<string, Map<string, number>>;
	/** Per brand and month, its mentions by others, with a topic or not */
	byBrand: Map<string, Map<string, number>>;
}

const bump = (map: Map<string, Map<string, number>>, key: string, month: string) => {
	const perMonth = map.get(key) ?? new Map<string, number>();
	perMonth.set(month, (perMonth.get(month) ?? 0) + 1);
	map.set(key, perMonth);
};

/**
 * Counts mentions by others (a brand's own account left out) per topic and month: a mention's
 * topics are its cuisine's, else its venue's Google category's (a chain's most reviewed branch's
 * when the post named no branch), each with its parents, and it
 * counts once per topic ("vegan döner" is vegan, döner and Turkish).
 */
export const countTopicMentions = (
	rows: TopicMentionRow[],
	index: FoodTopicIndex,
): TopicMentionCounts => {
	const totals = new Map<string, number>();
	const byTopic = new Map<string, Map<string, number>>();
	const byBrand = new Map<string, Map<string, number>>();
	for (const r of rows) {
		if (r.own) continue;
		bump(byBrand, r.brand_id, r.month);
		const keys = index.withParents(index.resolveMention(r.cuisine, r.category));
		if (!keys.length) continue;
		totals.set(r.month, (totals.get(r.month) ?? 0) + 1);
		for (const key of keys) bump(byTopic, key, r.month);
	}
	return { totals, byTopic, byBrand };
};

/** A topic's share of the month's mentions with a topic, percent with one decimal; null in a month without any. */
export const topicShares = (
	counts: TopicMentionCounts,
	key: string,
	months: string[],
): (number | null)[] =>
	months.map(m => {
		const total = counts.totals.get(m);
		return total ?
				Math.round(((counts.byTopic.get(key)?.get(m) ?? 0) / total) * 1000) / 10
			:	null;
	});

/** The SQL behind `TopicMentionRow`: a city's matched mentions in [start, end). */
export const TOPIC_MENTIONS_SQL = `select to_char(p.posted_at at time zone 'UTC', 'YYYY-MM') as month, m.brand_id,
		b.name as brand_name,
		coalesce(v.category, (
			select o.category from venues o where o.brand_id = m.brand_id and o.city_id = p.city_id
			order by o.reviews_count desc nulls last, o.id limit 1
		)) as category,
		m.cuisine, ${ownPostSql('p', 'm.brand_id')} as own
	from mentions m
	join social_posts p on p.id = m.post_id
	join brands b on b.id = m.brand_id
	left join venues v on v.id = m.venue_id
	where p.city_id = ? and p.posted_at >= ? and p.posted_at < ?`;
