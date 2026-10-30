import { Migration } from '@mikro-orm/migrations';

/**
 * Written by hand (the program `statements-and-concepts`, phase `topics-tree`): the aspects — the
 * nine feedback topics as roots and their themes as children, until now the vocabulary in code
 * (`FEEDBACK_THEMES`) — become rows of `topics` with kind `aspect` and a `hint`, as
 * `ASPECT_SEED` (`modules/topics/constants/aspect-seed.constant.ts`) lists them as of this
 * migration; the nine `_other` catch-alls are folded into their roots; every filed feedback point
 * is linked to its aspect row (`aspect_id`, next to the `theme` key the SQL readers use).
 *
 * The enum type is recreated rather than extended: Postgres lets a value added with `alter type …
 * add value` be used only after the transaction commits, and every pending migration runs in one
 * (`allOrNothing`); a recreated type is usable at once, so this also runs on a fresh database.
 */

interface AspectRow {
	key: string;
	label: string;
	hint: string;
	parent?: string;
}

// A copy of ASPECT_SEED as of 2026-10-30: a migration never reads the live seed
const ROWS: AspectRow[] = [
	{ key: 'food', label: 'Food', hint: 'about the food, when nothing finer fits' },
	{ key: 'taste', parent: 'food', label: 'Taste', hint: 'how it tasted: delicious and full of flavour, or bland, tasteless, bad' },
	{ key: 'freshness', parent: 'food', label: 'Freshness', hint: 'fresh, or stale, soggy, old, reheated' },
	{ key: 'temperature', parent: 'food', label: 'Temperature', hint: 'the food served hot, or cold, lukewarm (a room too hot or too cold is atmosphere)' },
	{ key: 'cooking', parent: 'food', label: 'Cooking', hint: 'cooked right, or raw, undercooked, overcooked, burnt, dry' },
	{ key: 'seasoning', parent: 'food', label: 'Seasoning', hint: 'well seasoned, or too salty, greasy, oily, too spicy, too sweet' },
	{ key: 'portion_size', parent: 'food', label: 'Portion size', hint: 'generous portions, or small ones, portions that got smaller' },
	{ key: 'ingredient_quality', parent: 'food', label: 'Ingredients', hint: 'the quality of the ingredients, meat, produce; or cheap, industrial, frozen' },
	{ key: 'menu_variety', parent: 'food', label: 'Menu variety', hint: 'the choice on the menu, vegan and vegetarian options; or too little choice' },
	{ key: 'availability', parent: 'food', label: 'Availability', hint: 'a dish sold out, missing, only on some days or hours' },
	{ key: 'quality_change', parent: 'food', label: 'Quality change', hint: 'better or worse than before: declined, gone downhill, improved since the last visit (better than other places is no change)' },
	{ key: 'authenticity', parent: 'food', label: 'Authenticity', hint: 'authentic, like at home, or not authentic' },
	{ key: 'presentation', parent: 'food', label: 'Presentation', hint: 'how it looked: plating, photogenic, or sloppy' },
	{ key: 'drinks', label: 'Drinks', hint: 'about the drinks, when nothing finer fits' },
	{ key: 'drink_quality', parent: 'drinks', label: 'Drink quality', hint: 'how the coffee, cocktails, wine, beer or tea tasted' },
	{ key: 'drink_selection', parent: 'drinks', label: 'Drink selection', hint: 'the drinks menu: the choice, or too little of it' },
	{ key: 'service', label: 'Service', hint: 'about the service, when nothing finer fits' },
	{ key: 'friendliness', parent: 'service', label: 'Friendliness', hint: 'warm, welcoming, or rude, unfriendly, arrogant' },
	{ key: 'attentiveness', parent: 'service', label: 'Attentiveness', hint: 'looked after, or ignored, hard to get attention, forgotten' },
	{ key: 'speed_of_service', parent: 'service', label: 'Speed of service', hint: 'quick service, or slow service once seated (the line to get in is a wait aspect)' },
	{ key: 'order_accuracy', parent: 'service', label: 'Order accuracy', hint: 'got what was ordered, or wrong, forgotten or missing items' },
	{ key: 'advice', parent: 'service', label: 'Advice', hint: 'recommendations, explaining the menu, allergies handled, or clueless staff' },
	{ key: 'language', parent: 'service', label: 'Language', hint: "a language barrier, or staff speaking the guest's language" },
	{ key: 'reservation_handling', parent: 'service', label: 'Reservations', hint: 'a reservation honoured, or lost, no table despite booking, walk-ins refused' },
	{ key: 'complaint_handling', parent: 'service', label: 'Complaint handling', hint: 'how staff or the owner dealt with a problem or a complaint' },
	{ key: 'takeaway_handling', parent: 'service', label: 'Takeaway handling', hint: 'packaging, pickup, a delivery order prepared right or wrong' },
	{ key: 'staff_change', parent: 'service', label: 'Staff change', hint: 'new staff, a known waiter gone, the team changed' },
	{ key: 'vibe', label: 'Atmosphere', hint: 'about the atmosphere, when nothing finer fits' },
	{ key: 'atmosphere', parent: 'vibe', label: 'Atmosphere', hint: 'cosy, a nice vibe, romantic, or unpleasant, cold; a room too hot, stuffy or cold' },
	{ key: 'noise', parent: 'vibe', label: 'Noise', hint: 'quiet, or loud, noisy music' },
	{ key: 'space', parent: 'vibe', label: 'Space', hint: 'spacious, room between tables, or cramped, few seats, seating removed' },
	{ key: 'interior', parent: 'vibe', label: 'Interior', hint: 'decor, design, furniture, the look after a renovation' },
	{ key: 'outdoor_seating', parent: 'vibe', label: 'Outdoor seating', hint: 'terrace, garden, seats outside' },
	{ key: 'crowding', parent: 'vibe', label: 'Crowding', hint: 'lively, or packed, touristy, overcrowded' },
	{ key: 'location', parent: 'vibe', label: 'Location', hint: 'the spot, the view, the neighbourhood' },
	{ key: 'family_pets', parent: 'vibe', label: 'Families and pets', hint: 'kids, families, prams, dogs welcome or not' },
	{ key: 'price', label: 'Price', hint: 'about prices, when nothing finer fits' },
	{ key: 'price_level', parent: 'price', label: 'Price level', hint: 'expensive, pricey, or cheap, affordable, for what it is' },
	{ key: 'value_for_money', parent: 'price', label: 'Value for money', hint: 'worth the money, or not worth the price, small portions for the price ("worth a visit" is not about money)' },
	{ key: 'price_increase', parent: 'price', label: 'Price increase', hint: 'prices went up since an earlier visit, now cost more than before' },
	{ key: 'extra_charges', parent: 'price', label: 'Extra charges', hint: 'charged for water, sauce, a container, a service fee; the bill differs from the menu' },
	{ key: 'payment', label: 'Payment', hint: 'about paying, when nothing finer fits' },
	{ key: 'cash_only', parent: 'payment', label: 'Cash only', hint: 'cash only, no card, cards no longer taken' },
	{ key: 'card_payment', parent: 'payment', label: 'Card payment', hint: 'cards or contactless accepted, or a card fee or minimum' },
	{ key: 'tipping', parent: 'payment', label: 'Tipping', hint: 'a tip asked for, pressured, or tip options on the terminal' },
	{ key: 'billing', parent: 'payment', label: 'Billing', hint: 'the bill wrong, overcharged, splitting the bill refused' },
	{ key: 'wait', label: 'Waiting', hint: 'about waiting, when nothing finer fits' },
	{ key: 'queue', parent: 'wait', label: 'Queue', hint: 'the line to get in or to order' },
	{ key: 'wait_for_food', parent: 'wait', label: 'Wait for food', hint: 'the time between ordering and the food arriving' },
	{ key: 'wait_for_table', parent: 'wait', label: 'Wait for a table', hint: 'getting a table, a reservation not ready' },
	{ key: 'cleanliness', label: 'Cleanliness', hint: 'about cleanliness, when nothing finer fits' },
	{ key: 'toilets', parent: 'cleanliness', label: 'Toilets', hint: 'the toilets' },
	{ key: 'dining_area', parent: 'cleanliness', label: 'Dining area', hint: 'tables, floor, cutlery, glasses clean or dirty' },
	{ key: 'food_hygiene', parent: 'cleanliness', label: 'Food hygiene', hint: 'hair in the food, handling, pests, smell' },
	{ key: 'other', label: 'Other', hint: 'nothing else fits' },
	{ key: 'opening_hours', parent: 'other', label: 'Opening hours', hint: 'the hours, closed when listed open, closed early' },
	{ key: 'accessibility', parent: 'other', label: 'Accessibility', hint: 'stairs, wheelchair access, parking, hard to find' },
	{ key: 'ownership_change', parent: 'other', label: 'Ownership change', hint: 'a new owner or management' },
	{ key: 'renovation', parent: 'other', label: 'Renovation', hint: 'renovated, rebuilt, closed for works' },
	{ key: 'delivery_platform', parent: 'other', label: 'Delivery platform', hint: 'the delivery app order: late, cold, missing (not the kitchen)' },
	{ key: 'amenities', parent: 'other', label: 'Amenities', hint: 'wifi, sockets, heating, air conditioning, toilets for guests' },
];

const KINDS = ['cuisine', 'dish', 'drink', 'diet', 'format', 'meal', 'aspect'];

const quote = (s: string) => `'${s.replace(/'/g, "''")}'`;

export class Migration20261030110000_aspect_topics extends Migration {
	override up(): void {
		// The enum, recreated with the new value (see above)
		this.addSql(`alter type "topic_kind" rename to "topic_kind_old";`);
		this.addSql(`create type "topic_kind" as enum (${KINDS.map(quote).join(', ')});`);
		this.addSql(`alter table "topics" alter column "kind" type "topic_kind" using "kind"::text::"topic_kind";`);
		this.addSql(`drop type "topic_kind_old";`);

		this.addSql(`alter table "topics" add column "hint" text null;`);
		this.addSql(`alter table "feedback_points" add column "aspect_id" uuid null;`);
		this.addSql(`alter table "feedback_points" add constraint "feedback_points_aspect_id_foreign" foreign key ("aspect_id") references "topics" ("id") on update cascade on delete set null;`);
		this.addSql(`create index "feedback_points_aspect_id_index" on "feedback_points" ("aspect_id");`);

		// The aspects: roots first (ROWS lists a parent before its children)
		for (const row of ROWS) {
			const parent = row.parent ? `(select "id" from "topics" where "key" = ${quote(row.parent)})` : 'null';
			this.addSql(
				`insert into "topics" ("key", "label", "kind", "parent_id", "aliases", "hint") values (${quote(row.key)}, ${quote(row.label)}, 'aspect', ${parent}, '[]'::jsonb, ${quote(row.hint)});`,
			);
		}

		// A point filed under a root's catch-all is filed at the root ("price_other" → "price"; "other" is the root's own key)
		this.addSql(`update "feedback_points" set "theme" = "topic" where "theme" like '%\\_other';`);
		// Every filed point linked to its aspect row
		this.addSql(`update "feedback_points" f set "aspect_id" = t."id" from "topics" t where t."key" = f."theme" and t."kind" = 'aspect';`);
	}

	override down(): void {
		this.addSql(`alter table "feedback_points" drop constraint "feedback_points_aspect_id_foreign";`);
		this.addSql(`drop index "feedback_points_aspect_id_index";`);
		this.addSql(`alter table "feedback_points" drop column "aspect_id";`);
		this.addSql(`delete from "topics" where "kind" = 'aspect';`);
		this.addSql(`alter table "topics" drop column "hint";`);
		this.addSql(`alter type "topic_kind" rename to "topic_kind_old";`);
		this.addSql(`create type "topic_kind" as enum (${KINDS.filter(k => k !== 'aspect').map(quote).join(', ')});`);
		this.addSql(`alter table "topics" alter column "kind" type "topic_kind" using "kind"::text::"topic_kind";`);
		this.addSql(`drop type "topic_kind_old";`);
	}
}
