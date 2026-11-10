// The aspects: what is said about a place or its food, as opposed to a kind of food. Nine roots and
// their children, one tree with the food topics (`Topic`, kind `aspect`). A point "about price,
// nothing finer" is filed at the root `price` itself, so there are no "_other" rows. The `hint` is
// what the agents are told the aspect covers, both polarities: an aspect says what a point is about,
// never whether it was good or bad (`portion_size` praised is generous, criticised small). Inserted
// by `Migration20261030110000_aspect_topics` from the vocabulary that lived in code until then
// (once a list in code); tests seed from here; an admin adds, moves and rehints aspects in the topic
// dialog, and the agents read the legend from the table on every call.
// An aspect never says "it changed": that is the claim's kind (`change`), so the change-only leaves
// (price increase, quality, staff and ownership change, renovation) were folded into the aspect a claim
// is about by `Migration20261031180000_claim_model_v2`, which added `ownership`. The six aspects the
// claims' vectors showed missing (hype & reputation, events & entertainment, concept & character,
// ordering system, professionalism & organisation, staffing) came with
// `Migration20261110130000_aspects_from_vectors`, which renamed the root `vibe` "Vibe & setting".
import { TopicKindEnum } from '../entities/topic.entity.js';

import type { TopicSeed } from './topic-seed.constant.js';

const { ASPECT } = TopicKindEnum;

/** The roots, in the order the legend and the pages show them */
export const ASPECT_ROOTS = [
	'food',
	'drinks',
	'service',
	'vibe',
	'price',
	'payment',
	'wait',
	'cleanliness',
	'other',
] as const;

const root = (key: (typeof ASPECT_ROOTS)[number], label: string, hint: string): TopicSeed => ({
	key,
	label,
	kind: ASPECT,
	hint,
});

const leaf = (
	key: string,
	parent: (typeof ASPECT_ROOTS)[number],
	label: string,
	hint: string,
): TopicSeed => ({ key, label, kind: ASPECT, parent, hint });

export const ASPECT_SEED: TopicSeed[] = [
	root('food', 'Food', 'about the food, when nothing finer fits'),
	leaf(
		'taste',
		'food',
		'Taste',
		"how the food tasted: delicious and full of flavour, or bland, tasteless, bad (a drink's taste is drink quality)",
	),
	leaf(
		'freshness',
		'food',
		'Freshness',
		'fresh, or stale, old, reheated, not made that day (soggy or dry is cooking & texture)',
	),
	leaf(
		'temperature',
		'food',
		'Temperature',
		'the food served hot, or cold, lukewarm (a room too hot or too cold is atmosphere)',
	),
	leaf(
		'cooking',
		'food',
		'Cooking & texture',
		'cooked right or not, and the texture: crispy, juicy, tender, chewy, soggy, dry, raw, undercooked, overcooked, burnt',
	),
	leaf(
		'seasoning',
		'food',
		'Seasoning',
		'well seasoned, or too salty, greasy, oily, too spicy, too sweet',
	),
	leaf(
		'portion_size',
		'food',
		'Portion size',
		'generous portions, or small ones, portions that got smaller',
	),
	leaf(
		'ingredient_quality',
		'food',
		'Ingredients',
		'the quality and sourcing of the ingredients, meat, produce: regional, organic, imported, homemade or bought-in; or cheap, industrial, frozen',
	),
	leaf(
		'menu_variety',
		'food',
		'Menu & offering',
		'what is on offer: the cuisine, the dishes and specials served, and how much choice there is (dietary options are Dietary)',
	),
	leaf(
		'availability',
		'food',
		'Availability',
		'a dish sold out, missing, only on some days or hours',
	),
	leaf(
		'authenticity',
		'food',
		'Authenticity',
		'authentic, like at home, made with care and love; or not authentic',
	),
	leaf('presentation', 'food', 'Presentation', 'how it looked: plating, photogenic, or sloppy'),
	leaf(
		'dietary',
		'food',
		'Dietary',
		'halal, kosher, vegan, vegetarian, gluten-free or lactose-free options, allergens handled or ignored',
	),
	leaf(
		'consistency',
		'food',
		'Consistency',
		'the same quality every time, or varying between visits, days or dishes ("hit or miss")',
	),

	root('drinks', 'Drinks', 'about the drinks, when nothing finer fits'),
	leaf(
		'drink_quality',
		'drinks',
		'Drink quality',
		'how the coffee, cocktails, wine, beer or tea tasted',
	),
	leaf(
		'drink_selection',
		'drinks',
		'Drink selection',
		'the drinks on offer: which ones are served, the choice, or too little of it',
	),

	root('service', 'Service', 'about the service, when nothing finer fits'),
	leaf(
		'friendliness',
		'service',
		'Friendliness',
		'warm, welcoming, hospitable, or rude, unfriendly, arrogant, and guests treated differently for being tourists or for who they are',
	),
	leaf(
		'attentiveness',
		'service',
		'Attentiveness',
		'looked after, or ignored, hard to get attention, forgotten',
	),
	leaf(
		'speed_of_service',
		'service',
		'Speed of service',
		'how quickly staff take the order, bring the drinks or the bill (the kitchen taking long is wait for food; the line to get in is the queue)',
	),
	leaf(
		'order_accuracy',
		'service',
		'Order accuracy',
		'got what was ordered, or wrong, forgotten or missing items',
	),
	leaf(
		'ordering_system',
		'service',
		'Ordering system',
		'how ordering works: at the counter, a kiosk or screen, a QR code or app, self-service, easy or confusing (wrong or missing items are order accuracy)',
	),
	leaf(
		'professionalism_organisation',
		'service',
		'Professionalism & organisation',
		'competent, well trained and organised, a team working together, or unprofessional, chaotic, disorganised (warmth is friendliness, speed is speed of service)',
	),
	leaf(
		'staffing',
		'service',
		'Staffing',
		'enough staff or too few: understaffed, staff overwhelmed, one person working everything (slow service itself is speed of service)',
	),
	leaf(
		'advice',
		'service',
		'Advice',
		'recommendations, explaining the menu, allergies handled, or clueless staff',
	),
	leaf(
		'language',
		'service',
		'Language',
		"a language barrier, or staff speaking the guest's language",
	),
	leaf(
		'reservation_handling',
		'service',
		'Reservations',
		'a reservation honoured, or lost, no table despite booking, walk-ins refused',
	),
	leaf(
		'complaint_handling',
		'service',
		'Complaint handling',
		'how staff or the owner dealt with a problem or a complaint',
	),
	leaf(
		'takeaway_handling',
		'service',
		'Takeaway handling',
		'packaging, pickup, a delivery order prepared right or wrong',
	),
	leaf(
		'on_the_house',
		'service',
		'On the house',
		'something given free: tea, a dessert or a shot on the house, the owner treating the guests',
	),
	leaf(
		'pressure',
		'service',
		'Pressure & rushing',
		'rushed to order or to leave, a time limit at the table, pushed to order more or to tip, upselling',
	),

	root('vibe', 'Vibe & setting', 'about the vibe and the setting as a whole, when nothing finer fits'),
	leaf(
		'atmosphere',
		'vibe',
		'Atmosphere',
		'cosy, a nice vibe, romantic, or unpleasant, cold; a room too hot, stuffy or cold',
	),
	leaf('noise', 'vibe', 'Noise', 'quiet, or loud, noisy music'),
	leaf(
		'hype_reputation',
		'vibe',
		'Hype & reputation',
		'whether it lives up to its hype or name: overhyped, worth the hype, a legend, a tourist trap, reviews that look fake or get deleted (a recommendation or a rating is no aspect)',
	),
	leaf(
		'events_entertainment',
		'vibe',
		'Events & entertainment',
		'live music, DJs, shows, quiz or ladies nights, events and their dates, entry tickets and what they cost (a new dish is a new item, not an event)',
	),
	leaf(
		'concept_character',
		'vibe',
		'Concept & character',
		'the idea behind the place and what makes it different: its concept, its character, a meal as an experience, grilling at the table, an open kitchen (the decor is interior, the mood atmosphere)',
	),
	leaf(
		'space',
		'vibe',
		'Space',
		'spacious, room between tables, or cramped, few seats, seating removed',
	),
	leaf('interior', 'vibe', 'Interior', 'decor, design, furniture, the look after a renovation'),
	leaf('outdoor_seating', 'vibe', 'Outdoor seating', 'terrace, garden, seats outside'),
	leaf('crowding', 'vibe', 'Crowding', 'lively, or packed, touristy, overcrowded'),
	leaf('location', 'vibe', 'Location', 'the spot, the view, the neighbourhood'),
	leaf('family_pets', 'vibe', 'Families and pets', 'kids, families, prams, dogs welcome or not'),
	leaf(
		'occasion',
		'vibe',
		'Occasion',
		'who it suits and for what: a date, families with kids, groups, a business lunch, working on a laptop, a birthday, eating alone, late at night',
	),

	root(
		'price',
		'Price',
		'about prices when no finer one fits (a price stated for a dish is price level)',
	),
	leaf(
		'price_level',
		'price',
		'Price level',
		'expensive, pricey, or cheap, affordable, for what it is, and the prices stated ("the döner costs 8 €"; an entry ticket is events & entertainment)',
	),
	leaf(
		'value_for_money',
		'price',
		'Value for money',
		'worth the money, or not worth the price, small portions for the price ("worth the wait" is the queue and "worth a visit" a verdict: neither is about money)',
	),
	leaf(
		'extra_charges',
		'price',
		'Extra charges',
		'charged for water, sauce, a container, a service fee; the bill differs from the menu',
	),

	root('payment', 'Payment', 'about paying, when nothing finer fits'),
	leaf('cash_only', 'payment', 'Cash only', 'cash only, no card, cards no longer taken'),
	leaf(
		'card_payment',
		'payment',
		'Card payment',
		'cards or contactless accepted, or a card fee or minimum',
	),
	leaf(
		'tipping',
		'payment',
		'Tipping',
		'a tip asked for, pressured, or tip options on the terminal',
	),
	leaf(
		'billing',
		'payment',
		'Billing',
		'the bill wrong, overcharged, splitting the bill refused',
	),

	root('wait', 'Waiting', 'about waiting, when nothing finer fits'),
	leaf('queue', 'wait', 'Queue', 'the line to get in or to order'),
	leaf(
		'wait_for_food',
		'wait',
		'Wait for food',
		"the time between ordering and the food arriving: the kitchen's pace",
	),
	leaf('wait_for_table', 'wait', 'Wait for a table', 'getting a table, a reservation not ready'),

	root('cleanliness', 'Cleanliness', 'about cleanliness, when nothing finer fits'),
	leaf('toilets', 'cleanliness', 'Toilets', 'the toilets'),
	leaf(
		'dining_area',
		'cleanliness',
		'Dining area',
		'tables, floor, cutlery, glasses clean or dirty',
	),
	leaf(
		'food_hygiene',
		'cleanliness',
		'Food hygiene',
		'hair in the food, handling, pests, smell, and guests who got sick after eating (food poisoning)',
	),

	root(
		'other',
		'Practical',
		'practical matters when no finer one fits: hours, access, amenities, ownership, delivery apps, wrong details online (hours on Google, an old online menu); a verdict on the whole visit has no aspect',
	),
	leaf(
		'opening_hours',
		'other',
		'Opening hours',
		'the hours it is open, closed when listed open, closed early (when a place opened is news, no aspect)',
	),
	leaf(
		'accessibility',
		'other',
		'Accessibility',
		'stairs, wheelchair access, parking, hard to find',
	),
	leaf(
		'ownership',
		'other',
		'Ownership',
		'who owns or runs the place and changes of hands: the owner, the family, the management (what the owner does for the guests is service)',
	),
	leaf(
		'delivery_platform',
		'other',
		'Delivery platform',
		'the delivery app order: late, cold, missing (not the kitchen)',
	),
	leaf(
		'amenities',
		'other',
		'Amenities',
		'wifi, sockets, heating, air conditioning, toilets for guests',
	),
];
