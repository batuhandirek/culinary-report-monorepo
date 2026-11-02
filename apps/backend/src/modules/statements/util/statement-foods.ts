// Pure: the foods and drinks statements name, as the SQL readers (trends, themes, the landing)
// select them and the rows they are counted in.

import _ from 'lodash';

import {
	relationsOf,
	type TermRelation,
	type TermStrength,
} from 'src/modules/topics/constants/term-relation.constant.js';

/** A dish or drink topic a wording is linked to (`term_topics`), joined at read time */
export interface StatementFoodTopic {
	key: string;
	label: string;
	/** `Topic.kind`: dish or drink */
	kind: string;
	/** How strongly the wording is it (`TermTopic.relation`): same, kind_of, with */
	relation?: TermRelation;
	/** For a parent the wording counts for through a child it is linked to: that child's key ("Dürüm" → kebab via durum) */
	via?: string;
}

/**
 * One food or drink wording a statement names (a `food` part): the `Term` as the source spelled it
 * and the dish and drink topics it is linked to today — every link of kind dish or drink, none
 * until the wording is decided. A term decision moves every statement at once: nothing is copied.
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
 * `FOODS_SQL('st.review_id = r.id')` for a source's. Deleted topics are out. A wording counts for
 * the dish and drink topics it is linked to and for their dish and drink parents (two levels up,
 * `via` the child), so a finer topic never takes counts from its parent ("dürüm" linked to Dürüm
 * still counts for Döner & kebab). `strength` picks the links that count (`relationsOf`: strict =
 * same, normal = + kind_of, broad = all, the default).
 */
export const FOODS_SQL = (where: string, strength: TermStrength = 'broad') =>
	`(select coalesce(json_agg(json_build_object('name', t.name, 'key', t.key, 'topics', (
			select coalesce(json_agg(json_build_object('key', y.key, 'label', y.label, 'kind', y.kind, 'relation', l.relation, 'via', l.via)
				order by l.rank, l.depth), '[]'::json)
			from (
				select tt.rank, 0 as depth, tt.relation, x.id as topic_id, null::text as via
				from term_topics tt join topics x on x.id = tt.topic_id
				where tt.term_id = t.id and tt.relation in (${relationsOf(strength)
					.map(r => `'${r}'`)
					.join(', ')})
				union all
				select tt.rank, 1, tt.relation, x.parent_id, x.key
				from term_topics tt join topics x on x.id = tt.topic_id
				where tt.term_id = t.id and x.parent_id is not null and tt.relation in (${relationsOf(strength)
					.map(r => `'${r}'`)
					.join(', ')})
				union all
				select tt.rank, 2, tt.relation, px.parent_id, x.key
				from term_topics tt join topics x on x.id = tt.topic_id join topics px on px.id = x.parent_id
				where tt.term_id = t.id and px.parent_id is not null and tt.relation in (${relationsOf(strength)
					.map(r => `'${r}'`)
					.join(', ')})
			) l join topics y on y.id = l.topic_id
			where y.deleted_at is null and y.kind in ('dish', 'drink')
		)) order by st.id, p.rank, p.id), '[]'::json)
		from statements st
		join statement_parts p on p.statement_id = st.id and p.role = 'food'
		join terms t on t.id = p.term_id
		where ${where})`;

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
