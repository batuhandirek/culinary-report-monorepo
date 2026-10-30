// The aspects: what is said about a place or its food, as opposed to a kind of food. Nine roots and
// their children, one tree with the food topics (`Topic`, kind `aspect`). A point "about price,
// nothing finer" is filed at the root `price` itself, so there are no "_other" rows. The `hint` is
// what the agents are told the aspect covers, both polarities: an aspect says what a point is about,
// never whether it was good or bad (`portion_size` praised is generous, criticised small). Inserted
// by `Migration20261030110000_aspect_topics` from the vocabulary that lived in code until then
// (`FEEDBACK_THEMES`); tests seed from here; an admin adds, moves and rehints aspects in the topic
// dialog, and the agents read the legend from the table on every call.
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
	leaf('taste', 'food', 'Taste', 'how it tasted: delicious and full of flavour, or bland, tasteless, bad'),
	leaf('freshness', 'food', 'Freshness', 'fresh, or stale, soggy, old, reheated'),
	leaf('temperature', 'food', 'Temperature', 'the food served hot, or cold, lukewarm (a room too hot or too cold is atmosphere)'),
	leaf('cooking', 'food', 'Cooking', 'cooked right, or raw, undercooked, overcooked, burnt, dry'),
	leaf('seasoning', 'food', 'Seasoning', 'well seasoned, or too salty, greasy, oily, too spicy, too sweet'),
	leaf('portion_size', 'food', 'Portion size', 'generous portions, or small ones, portions that got smaller'),
	leaf('ingredient_quality', 'food', 'Ingredients', 'the quality of the ingredients, meat, produce; or cheap, industrial, frozen'),
	leaf('menu_variety', 'food', 'Menu variety', 'the choice on the menu, vegan and vegetarian options; or too little choice'),
	leaf('availability', 'food', 'Availability', 'a dish sold out, missing, only on some days or hours'),
	leaf('quality_change', 'food', 'Quality change', 'better or worse than before: declined, gone downhill, improved since the last visit (better than other places is no change)'),
	leaf('authenticity', 'food', 'Authenticity', 'authentic, like at home, or not authentic'),
	leaf('presentation', 'food', 'Presentation', 'how it looked: plating, photogenic, or sloppy'),

	root('drinks', 'Drinks', 'about the drinks, when nothing finer fits'),
	leaf('drink_quality', 'drinks', 'Drink quality', 'how the coffee, cocktails, wine, beer or tea tasted'),
	leaf('drink_selection', 'drinks', 'Drink selection', 'the drinks menu: the choice, or too little of it'),

	root('service', 'Service', 'about the service, when nothing finer fits'),
	leaf('friendliness', 'service', 'Friendliness', 'warm, welcoming, or rude, unfriendly, arrogant'),
	leaf('attentiveness', 'service', 'Attentiveness', 'looked after, or ignored, hard to get attention, forgotten'),
	leaf('speed_of_service', 'service', 'Speed of service', 'quick service, or slow service once seated (the line to get in is a wait aspect)'),
	leaf('order_accuracy', 'service', 'Order accuracy', 'got what was ordered, or wrong, forgotten or missing items'),
	leaf('advice', 'service', 'Advice', 'recommendations, explaining the menu, allergies handled, or clueless staff'),
	leaf('language', 'service', 'Language', "a language barrier, or staff speaking the guest's language"),
	leaf('reservation_handling', 'service', 'Reservations', 'a reservation honoured, or lost, no table despite booking, walk-ins refused'),
	leaf('complaint_handling', 'service', 'Complaint handling', 'how staff or the owner dealt with a problem or a complaint'),
	leaf('takeaway_handling', 'service', 'Takeaway handling', 'packaging, pickup, a delivery order prepared right or wrong'),
	leaf('staff_change', 'service', 'Staff change', 'new staff, a known waiter gone, the team changed'),

	root('vibe', 'Atmosphere', 'about the atmosphere, when nothing finer fits'),
	leaf('atmosphere', 'vibe', 'Atmosphere', 'cosy, a nice vibe, romantic, or unpleasant, cold; a room too hot, stuffy or cold'),
	leaf('noise', 'vibe', 'Noise', 'quiet, or loud, noisy music'),
	leaf('space', 'vibe', 'Space', 'spacious, room between tables, or cramped, few seats, seating removed'),
	leaf('interior', 'vibe', 'Interior', 'decor, design, furniture, the look after a renovation'),
	leaf('outdoor_seating', 'vibe', 'Outdoor seating', 'terrace, garden, seats outside'),
	leaf('crowding', 'vibe', 'Crowding', 'lively, or packed, touristy, overcrowded'),
	leaf('location', 'vibe', 'Location', 'the spot, the view, the neighbourhood'),
	leaf('family_pets', 'vibe', 'Families and pets', 'kids, families, prams, dogs welcome or not'),

	root('price', 'Price', 'about prices, when nothing finer fits'),
	leaf('price_level', 'price', 'Price level', 'expensive, pricey, or cheap, affordable, for what it is'),
	leaf('value_for_money', 'price', 'Value for money', 'worth the money, or not worth the price, small portions for the price ("worth a visit" is not about money)'),
	leaf('price_increase', 'price', 'Price increase', 'prices went up since an earlier visit, now cost more than before'),
	leaf('extra_charges', 'price', 'Extra charges', 'charged for water, sauce, a container, a service fee; the bill differs from the menu'),

	root('payment', 'Payment', 'about paying, when nothing finer fits'),
	leaf('cash_only', 'payment', 'Cash only', 'cash only, no card, cards no longer taken'),
	leaf('card_payment', 'payment', 'Card payment', 'cards or contactless accepted, or a card fee or minimum'),
	leaf('tipping', 'payment', 'Tipping', 'a tip asked for, pressured, or tip options on the terminal'),
	leaf('billing', 'payment', 'Billing', 'the bill wrong, overcharged, splitting the bill refused'),

	root('wait', 'Waiting', 'about waiting, when nothing finer fits'),
	leaf('queue', 'wait', 'Queue', 'the line to get in or to order'),
	leaf('wait_for_food', 'wait', 'Wait for food', 'the time between ordering and the food arriving'),
	leaf('wait_for_table', 'wait', 'Wait for a table', 'getting a table, a reservation not ready'),

	root('cleanliness', 'Cleanliness', 'about cleanliness, when nothing finer fits'),
	leaf('toilets', 'cleanliness', 'Toilets', 'the toilets'),
	leaf('dining_area', 'cleanliness', 'Dining area', 'tables, floor, cutlery, glasses clean or dirty'),
	leaf('food_hygiene', 'cleanliness', 'Food hygiene', 'hair in the food, handling, pests, smell'),

	root('other', 'Other', 'nothing else fits'),
	leaf('opening_hours', 'other', 'Opening hours', 'the hours, closed when listed open, closed early'),
	leaf('accessibility', 'other', 'Accessibility', 'stairs, wheelchair access, parking, hard to find'),
	leaf('ownership_change', 'other', 'Ownership change', 'a new owner or management'),
	leaf('renovation', 'other', 'Renovation', 'renovated, rebuilt, closed for works'),
	leaf('delivery_platform', 'other', 'Delivery platform', 'the delivery app order: late, cold, missing (not the kitchen)'),
	leaf('amenities', 'other', 'Amenities', 'wifi, sockets, heating, air conditioning, toilets for guests'),
];
