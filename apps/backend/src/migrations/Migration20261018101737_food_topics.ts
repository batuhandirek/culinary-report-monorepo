import { Migration } from '@mikro-orm/migrations';

/**
 * Written by hand (not generated): the generator would add 'topic' to `search_term_kind` next to
 * 'cuisine' instead of renaming it. Creates `food_topics` and links the trends rows to it, then
 * seeds the topics of `FOOD_TOPIC_SEED` (`modules/food-topics/constants/food-topic-seed.constant.ts`)
 * as of this migration. The old cuisine rows searched bare English words ("german" was mostly
 * translation searches) and are dropped; the next `SEARCH_INTEREST` run pulls the topics.
 */
export class Migration20261018101737_food_topics extends Migration {
	override up(): void | Promise<void> {
		this.addSql(`create type "food_topic_kind" as enum ('cuisine', 'dish', 'drink', 'diet', 'format', 'meal');`);
		this.addSql(`create table "food_topics" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "key" text not null, "label" text not null, "kind" "food_topic_kind" not null, "parent_id" uuid null, "aliases" jsonb not null, "trends_topic_id" text null, "trends_query" text null, primary key ("id"));`);
		this.addSql(`alter table "food_topics" add constraint "food_topics_key_unique" unique ("key");`);
		this.addSql(`alter table "food_topics" add constraint "food_topics_parent_id_foreign" foreign key ("parent_id") references "food_topics" ("id") on update cascade on delete set null;`);

		this.addSql(`delete from "trend_related_queries" where "kind" = 'cuisine';`);
		this.addSql(`delete from "trend_search_interest" where "kind" = 'cuisine';`);
		this.addSql(`alter type "search_term_kind" rename value 'cuisine' to 'topic';`);
		this.addSql(`alter table "trend_search_interest" add "topic_id" uuid null;`);
		this.addSql(`alter table "trend_search_interest" add constraint "trend_search_interest_topic_id_foreign" foreign key ("topic_id") references "food_topics" ("id") on update cascade on delete cascade;`);
		this.addSql(`alter table "trend_related_queries" add "topic_id" uuid null;`);
		this.addSql(`alter table "trend_related_queries" add constraint "trend_related_queries_topic_id_foreign" foreign key ("topic_id") references "food_topics" ("id") on update cascade on delete cascade;`);

		this.addSql(`insert into "food_topics" ("key", "label", "kind", "aliases", "trends_topic_id")
			select v."key", v."label", v."kind"::"food_topic_kind", v."aliases"::jsonb, v."mid"
			from (values
				('italian', 'Italian', 'cuisine', '["northern italian","southern italian","sicilian","neapolitan","trattoria","osteria"]', '/m/09y2k2'),
				('french', 'French', 'cuisine', '["brasserie"]', '/m/02z3r'),
				('alsatian', 'Alsatian', 'cuisine', '[]', '/g/121dplnm'),
				('spanish', 'Spanish', 'cuisine', '[]', '/m/06wqv'),
				('portuguese', 'Portuguese', 'cuisine', '[]', '/m/03pvdc'),
				('greek', 'Greek', 'cuisine', '[]', '/m/038sf'),
				('mediterranean', 'Mediterranean', 'cuisine', '[]', '/m/04v5by'),
				('german', 'German', 'cuisine', '["modern german","bavarian","swabian","berlin"]', '/m/038rz'),
				('austrian', 'Austrian', 'cuisine', '["viennese"]', '/m/02t8kn'),
				('european', 'European', 'cuisine', '["modern european","central european","eastern european"]', '/m/02lggn'),
				('balkan', 'Balkan', 'cuisine', '["bosnian","serbian","yugoslav"]', '/m/0c3f19'),
				('croatian', 'Croatian', 'cuisine', '["dalmatian"]', '/m/0555vl'),
				('polish', 'Polish', 'cuisine', '[]', '/m/0263f0'),
				('ukrainian', 'Ukrainian', 'cuisine', '[]', '/m/03xnpw'),
				('russian', 'Russian', 'cuisine', '[]', '/m/02z_6v'),
				('georgian', 'Georgian', 'cuisine', '[]', '/m/02q2dt8'),
				('turkish', 'Turkish', 'cuisine', '["anatolian"]', '/m/07qr6'),
				('kurdish', 'Kurdish', 'cuisine', '[]', '/m/0b6hln'),
				('middle eastern', 'Middle Eastern', 'cuisine', '["oriental","levantine","orientalisch"]', '/m/03ly4k'),
				('lebanese', 'Lebanese', 'cuisine', '[]', '/m/09ktw6'),
				('syrian', 'Syrian', 'cuisine', '[]', '/m/02r6d2s'),
				('iraqi', 'Iraqi', 'cuisine', '[]', '/m/073px8'),
				('palestinian', 'Palestinian', 'cuisine', '[]', '/m/02r1klt'),
				('israeli', 'Israeli', 'cuisine', '[]', '/m/02rczg1'),
				('arabic', 'Arabic', 'cuisine', '["arab"]', '/m/06ht1t'),
				('persian', 'Persian', 'cuisine', '["iranian"]', '/m/06nkpw'),
				('afghan', 'Afghan', 'cuisine', '["afghani"]', '/m/01z97vt'),
				('uzbek', 'Uzbek', 'cuisine', '["central asian","uzbeki"]', '/m/0g2269'),
				('pakistani', 'Pakistani', 'cuisine', '[]', '/m/027gjj'),
				('indian', 'Indian', 'cuisine', '["north indian"]', '/m/01h5q0'),
				('south indian', 'South Indian', 'cuisine', '[]', '/m/0gxvkh'),
				('nepalese', 'Nepalese', 'cuisine', '["nepali","himalayan"]', '/m/0gxnzr'),
				('sri lankan', 'Sri Lankan', 'cuisine', '[]', '/m/04zjpx'),
				('asian', 'Asian', 'cuisine', '["asian fusion","pan asian","east asian","southeast asian","asiatisch"]', '/m/01r1z5'),
				('chinese', 'Chinese', 'cuisine', '["cantonese","sichuan","szechuan","hunan","shanghainese","dongbei","china"]', '/m/01xw9'),
				('taiwanese', 'Taiwanese', 'cuisine', '[]', '/m/07hx8'),
				('japanese', 'Japanese', 'cuisine', '["izakaya","japan"]', '/m/042ck'),
				('korean', 'Korean', 'cuisine', '[]', '/m/048vr'),
				('vietnamese', 'Vietnamese', 'cuisine', '[]', '/m/07_19'),
				('thai', 'Thai', 'cuisine', '[]', '/m/07hxn'),
				('indonesian', 'Indonesian', 'cuisine', '[]', '/m/024h08'),
				('malaysian', 'Malaysian', 'cuisine', '[]', '/m/01tm2f'),
				('filipino', 'Filipino', 'cuisine', '[]', '/m/06hf0n'),
				('burmese', 'Burmese', 'cuisine', '[]', '/m/06z57z'),
				('hawaiian', 'Hawaiian', 'cuisine', '[]', '/m/053n10'),
				('american', 'American', 'cuisine', '["new american","diner"]', '/m/01z1jf2'),
				('soul food', 'Soul food', 'cuisine', '["southern"]', '/m/06yhg'),
				('mexican', 'Mexican', 'cuisine', '["tex mex"]', '/m/051zk'),
				('brazilian', 'Brazilian', 'cuisine', '[]', '/m/012y2h'),
				('argentinian', 'Argentinian', 'cuisine', '["argentine"]', '/m/0xtb'),
				('peruvian', 'Peruvian', 'cuisine', '[]', '/m/065p8z'),
				('caribbean', 'Caribbean', 'cuisine', '[]', '/m/01ypv'),
				('jamaican', 'Jamaican', 'cuisine', '[]', '/m/02sp4_'),
				('african', 'African', 'cuisine', '[]', '/m/05vjqp'),
				('west african', 'West African', 'cuisine', '["ghanaian","senegalese"]', '/m/0bh7np8'),
				('nigerian', 'Nigerian', 'cuisine', '[]', '/m/03cb3yv'),
				('ethiopian', 'Ethiopian', 'cuisine', '["eritrean"]', '/m/02mzl'),
				('sudanese', 'Sudanese', 'cuisine', '[]', '/m/07sb_n4'),
				('moroccan', 'Moroccan', 'cuisine', '[]', '/m/04_05'),
				('tunisian', 'Tunisian', 'cuisine', '[]', '/m/03d6bnx'),
				('egyptian', 'Egyptian', 'cuisine', '[]', '/m/0277w53'),
				('pizza', 'Pizza', 'dish', '["pinsa"]', '/m/0663v'),
				('pasta', 'Pasta', 'dish', '[]', '/m/05z55'),
				('kebab', 'Döner & kebab', 'dish', '["gemuse kebab","durum","iskender","adana","shish kebab"]', '/m/03k_qs'),
				('lahmacun', 'Lahmacun', 'dish', '[]', '/g/11bc5f9x_t'),
				('currywurst', 'Currywurst', 'dish', '[]', '/m/05nt1k'),
				('schnitzel', 'Schnitzel', 'dish', '[]', '/m/03xbgv'),
				('flammkuchen', 'Flammkuchen', 'dish', '["flammekueche","tarte flambee"]', '/m/079ftr'),
				('tapas', 'Tapas', 'dish', '[]', '/m/07q3b'),
				('khachapuri', 'Khachapuri', 'dish', '[]', '/m/075brp'),
				('falafel', 'Falafel', 'dish', '[]', '/m/015w3y'),
				('shawarma', 'Shawarma', 'dish', '[]', '/m/02bbz9'),
				('curry', 'Curry', 'dish', '[]', '/m/0hr1s_w'),
				('sushi', 'Sushi', 'dish', '["maki","nigiri","omakase"]', '/m/07030'),
				('ramen', 'Ramen', 'dish', '[]', '/m/09gms'),
				('korean barbecue', 'Korean barbecue', 'dish', '[]', '/m/03wg0nc'),
				('pho', 'Pho', 'dish', '[]', '/m/02y17j'),
				('banh mi', 'Bánh mì', 'dish', '[]', '/m/03ht_b'),
				('hot pot', 'Hot pot', 'dish', '["hotpot"]', '/m/04y0_x'),
				('malatang', 'Malatang', 'dish', '[]', '/m/0k2lwwt'),
				('noodles', 'Noodles', 'dish', '["noodle","nudeln"]', '/m/0mfnf'),
				('dumplings', 'Dumplings', 'dish', '["dumpling","dim sum","gyoza","jiaozi","momo","momos","manti","pierogi","xiaolongbao"]', '/m/02cv5l'),
				('poke', 'Poke', 'dish', '["poke bowl","poke bowls"]', '/m/0btg7q'),
				('tacos', 'Tacos', 'dish', '["taco","taqueria"]', '/m/07crc'),
				('burgers', 'Burgers', 'dish', '["hamburger","smash burger","smashburger","cheeseburger"]', '/m/0cdn1'),
				('chicken', 'Chicken', 'dish', '["grilled chicken","hahnchen","broiler"]', null),
				('fried chicken', 'Fried chicken', 'dish', '["chicken wings","wings","broasted"]', '/g/1hb_fkqr4'),
				('barbecue', 'Barbecue', 'dish', '["us barbecue","grill","smokehouse"]', '/m/0983v'),
				('steakhouse', 'Steak', 'dish', '["steak","steak house"]', '/m/0grtl'),
				('seafood', 'Seafood', 'dish', '["fish","oysters","fisch"]', '/m/06nwz'),
				('sandwiches', 'Sandwiches', 'dish', '["sandwich","panini"]', '/m/0l515'),
				('bagels', 'Bagels', 'dish', '["bagel"]', '/m/01fb_0'),
				('crepes', 'Crêpes', 'dish', '["crepe","galette"]', '/g/1214fc4y'),
				('bowls', 'Bowls', 'dish', '["bowl","buddha bowl"]', null),
				('acai bowls', 'Açaí bowls', 'dish', '["acai","acai bowl"]', '/m/025ttl_'),
				('dessert', 'Desserts', 'dish', '["desserts","sweets"]', '/m/0270h'),
				('ice cream', 'Ice cream', 'dish', '["gelato","eis","eiscafe","gelateria","soft serve"]', '/m/0cxn2'),
				('cake', 'Cake', 'dish', '["cakes","kuchen","torte","cheesecake"]', '/m/0fszt'),
				('pastry', 'Pastry', 'dish', '["patisserie","pastries","croissant","croissants","viennoiserie"]', '/m/0hnyx'),
				('cookies', 'Cookies', 'dish', '["cookie"]', '/m/021mn'),
				('donuts', 'Donuts', 'dish', '["donut","doughnut","doughnuts"]', '/m/0jy4k'),
				('matcha', 'Matcha', 'drink', '[]', '/m/06c60c'),
				('bubble tea', 'Bubble tea', 'drink', '["boba"]', '/m/019v4'),
				('tea', 'Tea', 'drink', '["tea house","teahouse"]', '/m/07clx'),
				('wine', 'Wine', 'drink', '["natural wine","wein"]', '/m/081qc'),
				('cocktails', 'Cocktails', 'drink', '["cocktail"]', '/m/024g6'),
				('beer', 'Beer', 'drink', '["craft beer","brewery","brewpub","bier"]', '/m/01599'),
				('vegan', 'Vegan', 'diet', '["plant based","pflanzlich"]', '/m/07_hy'),
				('vegetarian', 'Vegetarian', 'diet', '["veggie"]', '/m/07_jd'),
				('halal', 'Halal', 'diet', '[]', '/m/025lg2'),
				('healthy', 'Healthy', 'diet', '["health","organic","bio","salad","salads","salad bar","juice","juice bar"]', '/m/043t_fc'),
				('gluten free', 'Gluten-free', 'diet', '["glutenfrei"]', '/m/034n2g'),
				('cafe', 'Café', 'format', '["coffee","coffee shop","espresso","specialty coffee","roastery","kaffee"]', '/m/020fb2'),
				('bakery', 'Bakery', 'format', '["backerei","baeckerei","boulangerie"]', '/m/02wv6th'),
				('bar', 'Bar', 'format', '["sports bar","lounge"]', null),
				('shisha', 'Shisha bar', 'format', '["hookah","hookah bar","shisha bar","hookah lounge"]', '/m/0270w0s'),
				('pub', 'Pub', 'format', '["gastropub","irish pub","kneipe","beer hall"]', null),
				('beer garden', 'Beer garden', 'format', '["biergarten"]', '/m/03krv6'),
				('nightclub', 'Nightclub', 'format', '["night club"]', null),
				('fast food', 'Fast food', 'format', '[]', '/m/01_bhs'),
				('street food', 'Street food', 'format', '["imbiss","imbissbude","snack bar","food truck","streetfood"]', '/m/05xnqg'),
				('fine dining', 'Fine dining', 'format', '["michelin","tasting menu","gourmet","haute cuisine"]', '/g/11fjn3mbjf'),
				('bistro', 'Bistro', 'format', '[]', null),
				('deli', 'Deli', 'format', '["delicatessen","feinkost"]', '/m/01_6hg'),
				('market', 'Food market', 'format', '["food market","food hall","markthalle"]', null),
				('brunch', 'Brunch', 'meal', '[]', '/m/0dw_m'),
				('breakfast', 'Breakfast', 'meal', '["fruhstuck","fruehstueck"]', '/m/0hz4q'),
				('lunch', 'Lunch', 'meal', '["mittagstisch"]', null)
			) as v ("key", "label", "kind", "aliases", "mid")
			on conflict ("key") do nothing;`);
		this.addSql(`update "food_topics" t set "parent_id" = p."id"
			from (values
				('alsatian', 'french'),
				('croatian', 'balkan'),
				('lebanese', 'middle eastern'),
				('syrian', 'middle eastern'),
				('iraqi', 'middle eastern'),
				('palestinian', 'middle eastern'),
				('israeli', 'middle eastern'),
				('south indian', 'indian'),
				('soul food', 'american'),
				('jamaican', 'caribbean'),
				('west african', 'african'),
				('nigerian', 'west african'),
				('ethiopian', 'african'),
				('sudanese', 'african'),
				('moroccan', 'african'),
				('tunisian', 'african'),
				('egyptian', 'african'),
				('pizza', 'italian'),
				('pasta', 'italian'),
				('kebab', 'turkish'),
				('lahmacun', 'turkish'),
				('currywurst', 'german'),
				('flammkuchen', 'alsatian'),
				('tapas', 'spanish'),
				('khachapuri', 'georgian'),
				('falafel', 'middle eastern'),
				('shawarma', 'middle eastern'),
				('sushi', 'japanese'),
				('ramen', 'japanese'),
				('korean barbecue', 'korean'),
				('pho', 'vietnamese'),
				('banh mi', 'vietnamese'),
				('hot pot', 'chinese'),
				('malatang', 'chinese'),
				('poke', 'hawaiian'),
				('tacos', 'mexican'),
				('burgers', 'american'),
				('fried chicken', 'chicken'),
				('acai bowls', 'bowls'),
				('ice cream', 'dessert'),
				('cake', 'dessert'),
				('shisha', 'bar'),
				('pub', 'bar')
			) as v ("key", "parent"), "food_topics" p
			where t."key" = v."key" and p."key" = v."parent";`);
	}

	override down(): void | Promise<void> {
		this.addSql(`alter table "trend_search_interest" drop constraint "trend_search_interest_topic_id_foreign";`);
		this.addSql(`alter table "trend_related_queries" drop constraint "trend_related_queries_topic_id_foreign";`);
		this.addSql(`alter table "trend_related_queries" drop column "topic_id";`);
		this.addSql(`alter table "trend_search_interest" drop column "topic_id";`);
		this.addSql(`delete from "trend_related_queries" where "kind" = 'topic';`);
		this.addSql(`delete from "trend_search_interest" where "kind" = 'topic';`);
		this.addSql(`alter type "search_term_kind" rename value 'topic' to 'cuisine';`);
		this.addSql(`drop table if exists "food_topics" cascade;`);
		this.addSql(`drop type "food_topic_kind";`);
	}
}
