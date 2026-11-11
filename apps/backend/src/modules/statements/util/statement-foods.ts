// Pure: the foods and drinks statements name, as the SQL readers (trends, themes, the landing)
// select them and the rows they are counted in.

import _ from 'lodash';

import type { CountMode, EdgeType } from 'src/modules/topics/constants/topic-edge.constant.js';

/** A dish or drink topic a wording counts for (its main topic, its modifiers, and what those are and have), joined at read time */
export interface StatementFoodTopic {
	key: string;
	label: string;
	/** `Topic.kind`: dish or drink */
	kind: string;
	/** How it counts: `is_a` when the wording is a kind of it along `is_a` edges alone, `has` when a `has` modifier or edge is on the way */
	type?: EdgeType;
	/** For a topic the wording counts for through another: the key of the topic it points at ("Dürüm" → kebab via durum) */
	via?: string;
}

/**
 * One food or drink wording a statement names (a `food` part): the `Term` as the source spelled it
 * and the dish and drink topics it counts for today, none until the wording is decided. A term
 * decision or a topic's edge moves every statement at once: nothing is copied.
 */
export interface StatementFood {
	/** `Term.name` */
	name: string;
	/** `Term.key` */
	key: string;
	topics: StatementFoodTopic[];
}

/**
 * SQL: the food wordings of the statements `where` picks (the inner alias is `st`), as a
 * `StatementFood[]` json, in the order named: `FOODS_SQL('st.id = s.id')` for one statement,
 * `FOODS_SQL('st.review_id = r.id')` for a source's. A wording evokes its main topic (`is_a`) and
 * its modifiers (each with its type), and each of those counts for everything `topic_closure`
 * gives it, at any depth, so a finer topic never takes counts from what it is ("dürüm" under Dürüm
 * still counts for Döner & kebab; "Melemen" for Menemen and so for Breakfast). Of those, the dish
 * and drink topics are kept, each once, by its most direct way. `mode` `strict` leaves out what a
 * wording or a topic only has (`has` modifiers, closure rows through a `has` edge); broad, the
 * default, follows both. Deleted topics are out.
 */
export const FOODS_SQL = (where: string, mode: CountMode = 'broad') =>
	`(select coalesce(json_agg(json_build_object('name', t.name, 'key', t.key, 'topics', (
			select coalesce(json_agg(json_build_object('key', y.key, 'label', y.label, 'kind', y.kind, 'type', l.type, 'via', l.via)
				order by l.rank, l.depth, y.key), '[]'::json)
			from (
				select distinct on (c.ancestor_id) c.ancestor_id as topic_id, e.rank, c.depth,
					case when e.type = 'has' or c.has_edge then 'has' else 'is_a' end as type,
					case when c.depth > 0 then x.key end as via
				from (
					select t.topic_id as topic_id, 'is_a'::text as type, 0 as rank where t.topic_id is not null
					union all
					select tm.topic_id, tm.type, tm.rank + 1 from term_modifiers tm where tm.term_id = t.id
				) e
				join topic_closure c on c.topic_id = e.topic_id
				join topics x on x.id = e.topic_id
				${mode === 'strict' ? "where e.type = 'is_a' and c.has_edge = false" : ''}
				order by c.ancestor_id, (e.type = 'has' or c.has_edge), e.rank, c.depth
			) l join topics y on y.id = l.topic_id
			where y.deleted_at is null and y.kind in ('dish', 'drink')
		)) order by st.id, p.rank, p.id), '[]'::json)
		from statements st
		join statement_parts p on p.statement_id = st.id and p.role = 'food'
		join terms t on t.id = p.term_id
		where ${where})`;

/**
 * SQL: the kinds of food the food wordings of the statements `where` picks (the inner alias is
 * `st`) are linked to, as a `text[]` of topic keys in the order named: each wording's main topic,
 * then its modifiers, each topic once, aspects and deleted topics out, nothing for a wording not
 * decided yet. Only what the wordings name: a reader expands what each counts for itself
 * (`TopicIndex.withParents`). What a mention is about is `FOOD_TOPIC_KEYS_SQL('st.mention_id =
 * m.id')`: its claims' foods, joined at read time like `FOODS_SQL`, so a term decision or a topic
 * change moves every reader at once.
 */
export const FOOD_TOPIC_KEYS_SQL = (where: string) =>
	`(select coalesce(array_agg(f.key order by f.statement_id, f.part_rank, f.part_id, f.rank), '{}') from (
		select distinct on (y.id) y.key, st.id as statement_id, p.rank as part_rank, p.id as part_id, e.rank
		from statements st
		join statement_parts p on p.statement_id = st.id and p.role = 'food'
		join terms t on t.id = p.term_id
		join lateral (
			select t.topic_id as topic_id, 0 as rank where t.topic_id is not null
			union all
			select tm.topic_id, tm.rank + 1 from term_modifiers tm where tm.term_id = t.id
		) e on true
		join topics y on y.id = e.topic_id and y.deleted_at is null and y.kind <> 'aspect'
		where ${where}
		order by y.id, st.id, p.rank, p.id, e.rank
	) f)`;

/** One row a food is counted in: a dish or drink topic (`topic` set, `key` its key), or the wording itself (`key` the term's) when it links none */
export interface FoodRow {
	key: string;
	topic?: StatementFoodTopic;
	/** The wording, as spelled */
	spelling: string;
}

/** A food row's key with its kind, as the theme pages name a dish (`topic:kebab`, `dish:vegetable kebab`) */
export const foodRowKey = (row: Pick<FoodRow, 'key' | 'topic'>): string =>
	`${row.topic ? 'topic' : 'dish'}:${row.key}`;

/**
 * The rows a source's foods fall in, each once: every dish or drink topic of each wording ("döner"
 * and "doner kebab" are one row, "vegan döner" is Döner & kebab), else the wording's own key
 * ("vegetable kebab" stays apart until a decision links it). A source counts once per row.
 */
export const foodRowsOf = (foods: StatementFood[]): FoodRow[] =>
	_.uniqBy(
		foods.flatMap(f =>
			f.topics.length ?
				f.topics.map(topic => ({ key: topic.key, topic, spelling: f.name }))
			:	[{ key: f.key, spelling: f.name }],
		),
		foodRowKey,
	);
