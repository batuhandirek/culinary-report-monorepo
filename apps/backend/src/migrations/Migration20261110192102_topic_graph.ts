import { Migration } from '@mikro-orm/migrations';

/**
 * The topic graph. Generated (`migration:create:dev`) for the schema, then restructured by hand so
 * the data is carried across before the old shapes are dropped; the DDL statements and constraint
 * names are the generator's, `halfvec(1024)` has its length added by hand (the generator leaves it
 * out), and the data steps sit between the creates and the drops:
 *
 * - every `topics.parent_id` becomes an `is_a` edge (`topic_edges`, rank 0, decided by `seed`);
 * - a wording whose only link was one `same` link is that topic, `exact`;
 * - every other wording with links takes its first link as its main topic, not exact (exact when
 *   that topic is an aspect: a wording under an aspect is always exact), and keeps its other links
 *   to kinds of food as modifiers (`with` → `has`, the rest → `is_a`), so no count goes blank
 *   between this migration and the import of the converted decisions
 *   (`tmp/topic-relinking/terms.json`, applied at boot by `TopicRelinkingImportService`);
 * - who decided a wording and when stay as they were: the import applies an entry only to a
 *   wording still decided at the moment the converter saw;
 * - `terms.suggestion` (the old agent's label for a missing topic) lives on as `proposed_label`;
 * - `topic_closure` is filled from the edges (the SQL of `TOPIC_CLOSURE_SQL`, copied: a migration
 *   never imports code that moves on).
 */
export class Migration20261110192102_topic_graph extends Migration {
	override up(): void | Promise<void> {
		this.addSql(`create table "term_modifiers" ("term_id" int not null, "topic_id" uuid not null, "type" text not null, "rank" int not null default 0, primary key ("term_id", "topic_id"));`);
		this.addSql(`create index "term_modifiers_topic_id_index" on "term_modifiers" ("topic_id");`);

		this.addSql(`create table "topic_closure" ("topic_id" uuid not null, "ancestor_id" uuid not null, "depth" int not null, "has_edge" boolean not null, primary key ("topic_id", "ancestor_id"));`);
		this.addSql(`create index "topic_closure_ancestor_id_index" on "topic_closure" ("ancestor_id");`);

		this.addSql(`create table "topic_edges" ("id" serial primary key, "created_at" timestamptz not null default now(), "from_id" uuid not null, "to_id" uuid not null, "type" text not null, "rank" int not null default 0, "decided_by" text not null, "decided_at" timestamptz not null default now());`);
		this.addSql(`create index "topic_edges_to_id_index" on "topic_edges" ("to_id");`);
		this.addSql(`alter table "topic_edges" add constraint "topic_edges_from_id_to_id_type_unique" unique ("from_id", "to_id", "type");`);

		this.addSql(`alter table "term_modifiers" add constraint "term_modifiers_term_id_foreign" foreign key ("term_id") references "terms" ("id") on update cascade on delete cascade;`);
		this.addSql(`alter table "term_modifiers" add constraint "term_modifiers_topic_id_foreign" foreign key ("topic_id") references "topics" ("id") on update cascade on delete cascade;`);

		this.addSql(`alter table "topic_closure" add constraint "topic_closure_topic_id_foreign" foreign key ("topic_id") references "topics" ("id") on update cascade on delete cascade;`);
		this.addSql(`alter table "topic_closure" add constraint "topic_closure_ancestor_id_foreign" foreign key ("ancestor_id") references "topics" ("id") on update cascade on delete cascade;`);

		this.addSql(`alter table "topic_edges" add constraint "topic_edges_from_id_foreign" foreign key ("from_id") references "topics" ("id") on update cascade on delete cascade;`);
		this.addSql(`alter table "topic_edges" add constraint "topic_edges_to_id_foreign" foreign key ("to_id") references "topics" ("id") on update cascade on delete cascade;`);

		// The length is added by hand: the generator emits a bare `halfvec`
		this.addSql(`alter table "topics" add "embedding" halfvec(1024) null, add "embedded_text" text null;`);

		this.addSql(`alter table "terms" drop column "grouped_at";`);
		this.addSql(`alter table "terms" add "topic_id" uuid null, add "exact" boolean not null default false, add "proposed_kind" text null;`);
		this.addSql(`alter table "terms" add constraint "terms_topic_id_foreign" foreign key ("topic_id") references "topics" ("id") on update cascade on delete set null;`);
		this.addSql(`alter table "terms" rename column "suggestion" to "proposed_label";`);
		this.addSql(`create index "terms_topic_id_index" on "terms" ("topic_id");`);

		// --- The data, by hand ---

		// A parent is an edge like any other: the first `is_a`, the display parent
		this.addSql(`insert into "topic_edges" ("from_id", "to_id", "type", "rank", "decided_by")
			select t.id, t.parent_id, 'is_a', 0, 'seed' from "topics" t where t.parent_id is not null;`);

		// One `same` link and nothing else: the wording is that topic
		this.addSql(`update "terms" t set topic_id = tt.topic_id, exact = true
			from "term_topics" tt
			where tt.term_id = t.id and tt.relation = 'same'
				and (select count(*) from "term_topics" x where x.term_id = t.id) = 1;`);

		// Every other wording with links: its first link is its main topic, provisionally. A wording
		// under an aspect is always exact
		this.addSql(`update "terms" t set topic_id = f.topic_id, exact = (f.kind = 'aspect')
			from (
				select distinct on (tt.term_id) tt.term_id, tt.topic_id, x.kind
				from "term_topics" tt join "topics" x on x.id = tt.topic_id
				order by tt.term_id, tt.rank, tt.id
			) f
			where f.term_id = t.id and t.topic_id is null;`);

		// …and its other links to kinds of food stay as modifiers, so nothing it counted for is lost
		this.addSql(`insert into "term_modifiers" ("term_id", "topic_id", "type", "rank")
			select tt.term_id, tt.topic_id, case when tt.relation = 'with' then 'has' else 'is_a' end,
				(row_number() over (partition by tt.term_id order by tt.rank, tt.id) - 1)::int
			from "term_topics" tt
			join "terms" t on t.id = tt.term_id
			join "topics" x on x.id = tt.topic_id
			where t.exact = false and tt.topic_id <> t.topic_id and x.kind <> 'aspect';`);

		// A wording that is its topic proposes none
		this.addSql(`update "terms" set proposed_label = null where exact and proposed_label is not null;`);

		// --- The old shapes go ---

		this.addSql(`drop table if exists "term_topics" cascade;`);

		this.addSql(`alter table "topics" drop constraint "topics_parent_id_foreign";`);
		this.addSql(`alter table "topics" drop column "parent_id";`);

		// Every topic with each topic it counts for, itself at depth 0 (`TOPIC_CLOSURE_SQL`)
		this.addSql(`insert into "topic_closure" ("topic_id", "ancestor_id", "depth", "has_edge")
			with recursive walk(topic_id, ancestor_id, depth, has_edge) as (
				select id, id, 0, false from "topics" where deleted_at is null
				union
				select w.topic_id, e.to_id, w.depth + 1, w.has_edge or e.type = 'has'
				from walk w
				join "topic_edges" e on e.from_id = w.ancestor_id
				join "topics" a on a.id = e.to_id and a.deleted_at is null
				where w.depth < 12
			)
			select topic_id, ancestor_id, min(depth)::int, bool_and(has_edge) from walk group by topic_id, ancestor_id;`);
	}
}
