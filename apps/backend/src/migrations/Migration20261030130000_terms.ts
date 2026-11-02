import { Migration } from '@mikro-orm/migrations';

// A copy of `venues/util/dishes.ts`' `termKey` (and `venue-names.ts`' `plain`) as of 2026-10-30: the
// migration CLI loads this file on its own and can import no app code. The runtime recomputes keys
// with the live function (`TermService.sync`), so a later change there costs nothing here.
const plain = (s: string): string =>
	s
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replaceAll('ß', 'ss')
		.replace(/[^a-z0-9 ]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
const singular = (word: string) => {
	const w = word.replace(/ies$/, 'y').replace(/ie$/, 'y');
	return w.length >= 4 && w.endsWith('s') && !/(ss|us|is)$/.test(w) ? w.slice(0, -1) : w;
};
const termKey = (name: string) => {
	const latin = plain(name).split(' ').map(singular).join(' ');
	if (latin) return latin;
	return name
		.normalize('NFKC')
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, ' ')
		.trim();
};

/**
 * Written by hand (the program `statements-and-concepts`, phase `terms`): one table of wordings
 * (`terms`) with their links to topics (`term_topics`) replaces three places a wording lived —
 * `dish_names` (one dish wording → one food topic), `topics.aliases` (an admin's other names of a
 * topic, jsonb) and `topic_ignored_words` (cuisine words an admin dismissed). Each is carried
 * across: an alias becomes an admin term linked to its topic (a spelling two topics shared links
 * to both); a dish name becomes a term with its decision and, when it had a topic, one link (an
 * admin's alias of the same wording wins); a dismissed word becomes an admin term with no link.
 * The keys are `termKey` (what `dish_names.key` already was), computed here with the same function
 * the runtime uses, so `TermService.sync` finds every wording again under the same key.
 */
export class Migration20261030130000_terms extends Migration {
	override async up(): Promise<void> {
		await this.execute(`create table "terms" ("id" serial primary key, "created_at" timestamptz not null default now(), "key" text not null, "name" text not null, "decided_by" text null, "decided_at" timestamptz null, "suggestion" text null);`);
		await this.execute(`alter table "terms" add constraint "terms_key_unique" unique ("key");`);
		await this.execute(`create table "term_topics" ("id" serial primary key, "created_at" timestamptz not null default now(), "term_id" int not null, "topic_id" uuid not null, "rank" int not null);`);
		await this.execute(`create index "term_topics_topic_id_index" on "term_topics" ("topic_id");`);
		await this.execute(`alter table "term_topics" add constraint "term_topics_term_id_topic_id_unique" unique ("term_id", "topic_id");`);
		await this.execute(`alter table "term_topics" add constraint "term_topics_term_id_foreign" foreign key ("term_id") references "terms" ("id") on update cascade on delete cascade;`);
		await this.execute(`alter table "term_topics" add constraint "term_topics_topic_id_foreign" foreign key ("topic_id") references "topics" ("id") on update cascade on delete cascade;`);

		// Aliases → admin terms linked to their topic
		const topics = (await this.execute(`select "id", "aliases" from "topics" where "deleted_at" is null`)) as {
			id: string;
			aliases: string[] | null;
		}[];
		for (const topic of topics) {
			for (const alias of topic.aliases ?? []) {
				const key = termKey(alias);
				if (!key) continue;
				const rows = (await this.execute(
					`insert into "terms" ("key", "name", "decided_by", "decided_at") values (?, ?, 'admin', now())
					on conflict ("key") do nothing returning "id"`,
					[key, alias],
				)) as { id: number }[];
				const termId = rows[0]?.id ?? ((await this.execute(`select "id" from "terms" where "key" = ?`, [key])) as { id: number }[])[0].id;
				await this.execute(
					`insert into "term_topics" ("term_id", "topic_id", "rank") values (?, ?, (select count(*) from "term_topics" where "term_id" = ?))
					on conflict do nothing`,
					[termId, topic.id, termId],
				);
			}
		}

		// Dish names → terms with their decision; an alias of the same wording (admin) wins
		await this.execute(`insert into "terms" ("key", "name", "decided_by", "decided_at", "suggestion")
			select d."key", d."name", d."decided_by", d."decided_at", d."suggestion" from "dish_names" d
			on conflict ("key") do nothing;`);
		await this.execute(`insert into "term_topics" ("term_id", "topic_id", "rank")
			select t."id", d."food_topic_id", 0 from "dish_names" d
			join "terms" t on t."key" = d."key" and t."decided_by" is not distinct from d."decided_by" and t."decided_at" is not distinct from d."decided_at"
			where d."food_topic_id" is not null
			on conflict do nothing;`);

		// Dismissed cuisine words → admin terms with no link
		const ignored = (await this.execute(`select "key" from "topic_ignored_words"`)) as { key: string }[];
		for (const { key: word } of ignored) {
			const key = termKey(word);
			if (!key) continue;
			await this.execute(
				`insert into "terms" ("key", "name", "decided_by", "decided_at") values (?, ?, 'admin', now())
				on conflict ("key") do update set "decided_by" = 'admin', "decided_at" = now(), "suggestion" = null`,
				[key, word],
			);
			await this.execute(`delete from "term_topics" where "term_id" = (select "id" from "terms" where "key" = ?)`, [key]);
		}

		await this.execute(`drop table "dish_names" cascade;`);
		await this.execute(`drop table "topic_ignored_words" cascade;`);
		await this.execute(`alter table "topics" drop column "aliases";`);
	}

	override async down(): Promise<void> {
		await this.execute(`alter table "topics" add column "aliases" jsonb not null default '[]'::jsonb;`);
		await this.execute(`create table "topic_ignored_words" ("id" serial primary key, "created_at" timestamptz not null default now(), "key" text not null);`);
		await this.execute(`alter table "topic_ignored_words" add constraint "topic_ignored_words_key_unique" unique ("key");`);
		await this.execute(`create table "dish_names" ("id" serial primary key, "created_at" timestamptz not null default now(), "key" text not null, "name" text not null, "food_topic_id" uuid null, "decided_by" text null, "decided_at" timestamptz null, "suggestion" text null);`);
		await this.execute(`alter table "dish_names" add constraint "dish_names_key_unique" unique ("key");`);
		await this.execute(`insert into "dish_names" ("key", "name", "food_topic_id", "decided_by", "decided_at", "suggestion")
			select t."key", t."name", (select tt."topic_id" from "term_topics" tt where tt."term_id" = t."id" order by tt."rank" limit 1), t."decided_by", t."decided_at", t."suggestion"
			from "terms" t;`);
		await this.execute(`drop table "term_topics" cascade;`);
		await this.execute(`drop table "terms" cascade;`);
	}
}
