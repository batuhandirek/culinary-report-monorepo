import { Migration } from '@mikro-orm/migrations';

/**
 * Written by hand (the program `statements-and-concepts`, phase `statements`): one claim per row
 * (`statements`) with its parts (`statement_parts`) replaces the feedback points. Each point
 * becomes a statement of its source (a review's, or a post's about the mention's place): `detail`
 * → `text`, sentiment, change, amount and unit as they were, the city and month, `said_at` the
 * review's or the post's date. Its parts: the aspect it was filed under (an `aspect` part), and the
 * wording of its dish (a `food` part pointing at the `terms` row of its key, created when missing;
 * the food topics are the term's links, read through `term_topics`, so the stopgap `food_topic_id`
 * is not carried). `parts_at` is now for a row that was filed and checked, null for one still
 * pending in any of the three old LLM backlogs (an unfiled theme, an unchecked dish or amount), so
 * the `statement-parts` backlog picks up exactly their remaining work. Then `feedback_points` goes.
 * The DDL carries MikroORM's names, so the generator reports no changes after it.
 */
export class Migration20261030140000_statements extends Migration {
	override async up(): Promise<void> {
		await this.execute(`create table "statements" ("id" serial primary key, "created_at" timestamptz not null default now(), "source_kind" text not null, "review_id" uuid null, "post_id" uuid null, "mention_id" int null, "comment_id" uuid null, "web_mention_id" uuid null, "venue_id" uuid null, "subject" text not null, "city_id" uuid not null, "month" text null, "said_at" timestamptz not null, "text" text null, "sentiment" text null, "change" boolean not null default false, "amount" double precision null, "unit" text null, "count" int not null default 1, "parts_at" timestamptz null, constraint "statements_one_source_check" check ((review_id is not null)::int + (post_id is not null)::int + (comment_id is not null)::int + (web_mention_id is not null)::int + (venue_id is not null)::int = 1));`);
		await this.execute(`create index "statements_review_id_index" on "statements" ("review_id");`);
		await this.execute(`create index "statements_post_id_index" on "statements" ("post_id");`);
		await this.execute(`create index "statements_mention_id_index" on "statements" ("mention_id");`);
		await this.execute(`create index "statements_comment_id_index" on "statements" ("comment_id");`);
		await this.execute(`create index "statements_web_mention_id_index" on "statements" ("web_mention_id");`);
		await this.execute(`create index "statements_city_id_month_index" on "statements" ("city_id", "month");`);
		await this.execute(`create index "statements_venue_id_source_kind_index" on "statements" ("venue_id", "source_kind");`);
		await this.execute(`create table "statement_parts" ("id" serial primary key, "created_at" timestamptz not null default now(), "statement_id" int not null, "role" text not null, "topic_id" uuid null, "term_id" int null, "rank" int not null, constraint "statement_parts_role_check" check ((role = 'aspect' and topic_id is not null and term_id is null) or (role = 'food' and term_id is not null and topic_id is null)));`);
		await this.execute(`create index "statement_parts_statement_id_index" on "statement_parts" ("statement_id");`);
		await this.execute(`create index "statement_parts_topic_id_role_index" on "statement_parts" ("topic_id", "role");`);
		await this.execute(`create index "statement_parts_term_id_index" on "statement_parts" ("term_id");`);
		await this.execute(`alter table "statements" add constraint "statements_review_id_foreign" foreign key ("review_id") references "reviews" ("id") on update cascade on delete cascade;`);
		await this.execute(`alter table "statements" add constraint "statements_post_id_foreign" foreign key ("post_id") references "social_posts" ("id") on update cascade on delete cascade;`);
		await this.execute(`alter table "statements" add constraint "statements_mention_id_foreign" foreign key ("mention_id") references "mentions" ("id") on update cascade on delete cascade;`);
		await this.execute(`alter table "statements" add constraint "statements_comment_id_foreign" foreign key ("comment_id") references "post_comments" ("id") on update cascade on delete cascade;`);
		await this.execute(`alter table "statements" add constraint "statements_web_mention_id_foreign" foreign key ("web_mention_id") references "web_mentions" ("id") on update cascade on delete cascade;`);
		await this.execute(`alter table "statements" add constraint "statements_venue_id_foreign" foreign key ("venue_id") references "venues" ("id") on update cascade on delete cascade;`);
		await this.execute(`alter table "statements" add constraint "statements_city_id_foreign" foreign key ("city_id") references "cities" ("id") on update cascade on delete cascade;`);
		await this.execute(`alter table "statement_parts" add constraint "statement_parts_statement_id_foreign" foreign key ("statement_id") references "statements" ("id") on update cascade on delete cascade;`);
		await this.execute(`alter table "statement_parts" add constraint "statement_parts_topic_id_foreign" foreign key ("topic_id") references "topics" ("id") on update cascade on delete cascade;`);
		await this.execute(`alter table "statement_parts" add constraint "statement_parts_term_id_foreign" foreign key ("term_id") references "terms" ("id") on update cascade on delete cascade;`);

		// The points, each remembering its old id for the parts below
		await this.execute(`alter table "statements" add column "legacy_id" int null;`);
		const pending = `(f.detail is not null and f.theme is null)
			or (f.detail is not null and not f.change and f.dish is null and f.dish_checked_at is null and f.topic in ('food', 'drinks'))
			or (f.detail is not null and not f.change and f.amount is null and f.amount_checked_at is null and f.topic in ('wait', 'price'))`;
		await this.execute(`insert into "statements" ("legacy_id", "created_at", "source_kind", "review_id", "subject", "city_id", "month", "said_at", "text", "sentiment", "change", "amount", "unit", "parts_at")
			select f.id, f.created_at, 'review', f.review_id, 'place', f.city_id, f.month, r.published_at, f.detail, f.sentiment, f.change, f.amount, f.unit,
				case when ${pending} then null else now() end
			from "feedback_points" f join "reviews" r on r.id = f.review_id
			where f.review_id is not null order by f.id;`);
		await this.execute(`insert into "statements" ("legacy_id", "created_at", "source_kind", "post_id", "mention_id", "subject", "city_id", "month", "said_at", "text", "sentiment", "change", "amount", "unit", "parts_at")
			select f.id, f.created_at, 'post', m.post_id, f.mention_id, 'place', f.city_id, f.month, p.posted_at, f.detail, f.sentiment, f.change, f.amount, f.unit,
				case when ${pending} then null else now() end
			from "feedback_points" f join "mentions" m on m.id = f.mention_id join "social_posts" p on p.id = m.post_id
			where f.mention_id is not null order by f.id;`);

		// The aspect each filed point was under
		await this.execute(`insert into "statement_parts" ("statement_id", "role", "topic_id", "rank")
			select s.id, 'aspect', f.aspect_id, 0 from "feedback_points" f join "statements" s on s.legacy_id = f.id
			where f.aspect_id is not null;`);
		// The wording of each point's dish, as a term (a key with no row yet gets one, undecided)
		await this.execute(`insert into "terms" ("key", "name")
			select f.dish_key, mode() within group (order by f.dish) from "feedback_points" f
			where f.dish_key is not null and f.dish_key <> '' and f.dish is not null
				and not exists (select 1 from "terms" t where t.key = f.dish_key)
			group by f.dish_key on conflict ("key") do nothing;`);
		await this.execute(`insert into "statement_parts" ("statement_id", "role", "term_id", "rank")
			select s.id, 'food', t.id, case when f.aspect_id is null then 0 else 1 end
			from "feedback_points" f join "statements" s on s.legacy_id = f.id join "terms" t on t.key = f.dish_key
			where f.dish_key is not null and f.dish_key <> '';`);

		await this.execute(`alter table "statements" drop column "legacy_id";`);
		await this.execute(`drop table "feedback_points" cascade;`);
	}

	override async down(): Promise<void> {
		await this.execute(`create table "feedback_points" ("id" serial primary key, "created_at" timestamptz not null default now(), "source_kind" text not null, "review_id" uuid null, "mention_id" int null, "city_id" uuid not null, "month" text not null, "sentiment" text not null, "topic" text null, "theme" text null, "aspect_id" uuid null, "detail" text null, "dish" text null, "dish_key" text null, "food_topic_id" uuid null, "amount" double precision null, "unit" text null, "dish_checked_at" timestamptz null, "amount_checked_at" timestamptz null, "change" boolean not null default false, constraint "feedback_points_one_source_check" check ((review_id is null) <> (mention_id is null)));`);
		await this.execute(`create index "feedback_points_review_id_index" on "feedback_points" ("review_id");`);
		await this.execute(`create index "feedback_points_mention_id_index" on "feedback_points" ("mention_id");`);
		await this.execute(`create index "feedback_points_aspect_id_index" on "feedback_points" ("aspect_id");`);
		await this.execute(`create index "feedback_points_city_id_month_index" on "feedback_points" ("city_id", "month");`);
		await this.execute(`create index "feedback_points_food_topic_id_month_index" on "feedback_points" ("food_topic_id", "month");`);
		await this.execute(`alter table "feedback_points" add constraint "feedback_points_review_id_foreign" foreign key ("review_id") references "reviews" ("id") on update cascade on delete cascade;`);
		await this.execute(`alter table "feedback_points" add constraint "feedback_points_mention_id_foreign" foreign key ("mention_id") references "mentions" ("id") on update cascade on delete cascade;`);
		await this.execute(`alter table "feedback_points" add constraint "feedback_points_city_id_foreign" foreign key ("city_id") references "cities" ("id") on update cascade on delete cascade;`);
		await this.execute(`alter table "feedback_points" add constraint "feedback_points_aspect_id_foreign" foreign key ("aspect_id") references "topics" ("id") on update cascade on delete set null;`);
		await this.execute(`alter table "feedback_points" add constraint "feedback_points_food_topic_id_foreign" foreign key ("food_topic_id") references "topics" ("id") on update cascade on delete set null;`);
		await this.execute(`insert into "feedback_points" ("created_at", "source_kind", "review_id", "mention_id", "city_id", "month", "sentiment", "topic", "theme", "aspect_id", "detail", "dish", "dish_key", "food_topic_id", "amount", "unit", "dish_checked_at", "amount_checked_at", "change")
			select s.created_at, case when s.source_kind = 'review' then 'review' else 'mention' end, s.review_id, s.mention_id, s.city_id, coalesce(s.month, ''),
				coalesce(s.sentiment, 'neutral'), root.key, a.key, a.id, s.text, t.name, t.key,
				(select tt.topic_id from "term_topics" tt join "topics" x on x.id = tt.topic_id where tt.term_id = t.id and x.kind in ('dish', 'drink') order by tt.rank limit 1),
				s.amount, s.unit, s.parts_at, s.parts_at, s.change
			from "statements" s
			left join "statement_parts" pa on pa.statement_id = s.id and pa.role = 'aspect'
			left join "topics" a on a.id = pa.topic_id
			left join "topics" root on root.id = coalesce(a.parent_id, a.id)
			left join "statement_parts" pf on pf.statement_id = s.id and pf.role = 'food' and pf.rank = (select min(rank) from "statement_parts" where statement_id = s.id and role = 'food')
			left join "terms" t on t.id = pf.term_id
			where s.source_kind in ('review', 'post') and (s.review_id is not null or s.mention_id is not null);`);
		await this.execute(`drop table "statement_parts" cascade;`);
		await this.execute(`drop table "statements" cascade;`);
	}
}
