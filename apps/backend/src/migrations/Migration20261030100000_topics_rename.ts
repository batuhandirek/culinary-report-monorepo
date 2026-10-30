import { Migration } from '@mikro-orm/migrations';

// `FoodTopic` became `Topic` (the program `statements-and-concepts`, phase `topics-tree`): the tables, the
// enum type, hashtags' link column and every constraint, index and sequence named after the old tables are
// renamed in place, so the data stays and the names match what the schema generator derives from the
// renamed entities (a generated migration would have dropped and recreated the tables). Written by hand
// against the dev database's names of 2026-10-30. `feedback_points.food_topic_id` and
// `dish_names.food_topic_id` keep their names: both tables go in the next phases.

const TABLES: [string, string][] = [
	['food_topics', 'topics'],
	['venue_food_topics', 'venue_topics'],
	['mention_food_topics', 'mention_topics'],
	['menu_item_food_topics', 'menu_item_topics'],
	['food_topic_ignored_words', 'topic_ignored_words'],
];

// Constraints named `<table>_<suffix>` (a renamed primary key or unique constraint renames its index too)
const CONSTRAINTS: Record<string, string[]> = {
	food_topics: [
		'pkey',
		'key_unique',
		'parent_id_foreign',
		'aliases_not_null',
		'created_at_not_null',
		'id_not_null',
		'key_not_null',
		'kind_not_null',
		'label_not_null',
		'updated_at_not_null',
	],
	venue_food_topics: [
		'pkey',
		'topic_id_foreign',
		'venue_id_foreign',
		'venue_id_topic_id_computed_unique',
		'computed_not_null',
		'created_at_not_null',
		'excluded_not_null',
		'id_not_null',
		'primary_not_null',
		'topic_id_not_null',
		'venue_id_not_null',
	],
	mention_food_topics: [
		'pkey',
		'mention_id_foreign',
		'mention_id_topic_id_unique',
		'topic_id_foreign',
		'created_at_not_null',
		'id_not_null',
		'mention_id_not_null',
		'rank_not_null',
		'source_not_null',
		'topic_id_not_null',
	],
	menu_item_food_topics: [
		'pkey',
		'menu_item_id_foreign',
		'menu_item_id_topic_id_unique',
		'topic_id_foreign',
		'created_at_not_null',
		'id_not_null',
		'menu_item_id_not_null',
		'topic_id_not_null',
	],
	food_topic_ignored_words: ['pkey', 'key_unique', 'created_at_not_null', 'id_not_null', 'key_not_null'],
};

// Indexes that back no constraint
const INDEXES: Record<string, string[]> = {
	venue_food_topics: ['topic_id_computed_primary_index', 'venue_id_index'],
	mention_food_topics: ['topic_id_index'],
	menu_item_food_topics: ['topic_id_index'],
};

// Tables with a serial id
const SEQUENCES = ['venue_food_topics', 'mention_food_topics', 'menu_item_food_topics', 'food_topic_ignored_words'];

export class Migration20261030100000_topics_rename extends Migration {
	override up(): void {
		for (const [from, to] of TABLES) this.renameTable(from, to);
		this.addSql(`alter type "food_topic_kind" rename to "topic_kind";`);
		this.addSql(`alter table "hashtags" rename column "food_topic_id" to "topic_id";`);
		this.addSql(`alter table "hashtags" rename constraint "hashtags_food_topic_id_foreign" to "hashtags_topic_id_foreign";`);
		this.addSql(`alter index "hashtags_food_topic_id_index" rename to "hashtags_topic_id_index";`);
	}

	override down(): void {
		this.addSql(`alter index "hashtags_topic_id_index" rename to "hashtags_food_topic_id_index";`);
		this.addSql(`alter table "hashtags" rename constraint "hashtags_topic_id_foreign" to "hashtags_food_topic_id_foreign";`);
		this.addSql(`alter table "hashtags" rename column "topic_id" to "food_topic_id";`);
		this.addSql(`alter type "topic_kind" rename to "food_topic_kind";`);
		for (const [from, to] of [...TABLES].reverse()) this.renameTable(to, from, from);
	}

	/** Renames a table and everything named after it; `named` is the old name, the key of the lists above */
	private renameTable(from: string, to: string, named = from) {
		this.addSql(`alter table "${from}" rename to "${to}";`);
		for (const suffix of CONSTRAINTS[named] ?? [])
			this.addSql(`alter table "${to}" rename constraint "${from}_${suffix}" to "${to}_${suffix}";`);
		for (const suffix of INDEXES[named] ?? [])
			this.addSql(`alter index "${from}_${suffix}" rename to "${to}_${suffix}";`);
		if (SEQUENCES.includes(named)) this.addSql(`alter sequence "${from}_id_seq" rename to "${to}_id_seq";`);
	}
}
