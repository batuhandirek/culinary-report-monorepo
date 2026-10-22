// The vocabulary every praise and complaint point is filed under: one theme per point, each
// theme under one of the nine topics. A theme is what the point is about, never whether it
// was good or bad: `portion_size` praised is "generous", criticised "small"; the list the point
// sits in (praise or complaints) says which. Changes against an earlier visit are themes too
// (`price_increase`, `quality_change`), so "prices went up" counts as a price increase without
// a second list. Edited in code, since the agents' output schema is typed from it; the
// `feedback-theme-discovery` task is how themes the list lacks are found.
import type { FeedbackTopic } from '../interfaces/feedback.interface.js';

export const FEEDBACK_TOPICS = [
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

export interface FeedbackThemeDefinition {
	topic: FeedbackTopic;
	/** Shown to people: "Price increase" */
	label: string;
	/** Told to the agents: what the theme covers, both polarities */
	hint: string;
}

const define = <const T extends Record<string, FeedbackThemeDefinition>>(themes: T) => themes;

export const FEEDBACK_THEMES = define({
	// food
	taste: { topic: 'food', label: 'Taste', hint: 'how it tasted: delicious and full of flavour, or bland, tasteless, bad' },
	freshness: { topic: 'food', label: 'Freshness', hint: 'fresh, or stale, soggy, old, reheated' },
	temperature: { topic: 'food', label: 'Temperature', hint: 'the food served hot, or cold, lukewarm (a room too hot or too cold is atmosphere)' },
	cooking: { topic: 'food', label: 'Cooking', hint: 'cooked right, or raw, undercooked, overcooked, burnt, dry' },
	seasoning: { topic: 'food', label: 'Seasoning', hint: 'well seasoned, or too salty, greasy, oily, too spicy, too sweet' },
	portion_size: { topic: 'food', label: 'Portion size', hint: 'generous portions, or small ones, portions that got smaller' },
	ingredient_quality: { topic: 'food', label: 'Ingredients', hint: 'the quality of the ingredients, meat, produce; or cheap, industrial, frozen' },
	menu_variety: { topic: 'food', label: 'Menu variety', hint: 'the choice on the menu, vegan and vegetarian options; or too little choice' },
	availability: { topic: 'food', label: 'Availability', hint: 'a dish sold out, missing, only on some days or hours' },
	quality_change: { topic: 'food', label: 'Quality change', hint: 'better or worse than before: declined, gone downhill, improved since the last visit (better than other places is no change)' },
	authenticity: { topic: 'food', label: 'Authenticity', hint: 'authentic, like at home, or not authentic' },
	presentation: { topic: 'food', label: 'Presentation', hint: 'how it looked: plating, photogenic, or sloppy' },
	food_other: { topic: 'food', label: 'Food, other', hint: 'about the food, nothing else fits' },
	// drinks
	drink_quality: { topic: 'drinks', label: 'Drink quality', hint: 'how the coffee, cocktails, wine, beer or tea tasted' },
	drink_selection: { topic: 'drinks', label: 'Drink selection', hint: 'the drinks menu: the choice, or too little of it' },
	drinks_other: { topic: 'drinks', label: 'Drinks, other', hint: 'about the drinks, nothing else fits' },
	// service
	friendliness: { topic: 'service', label: 'Friendliness', hint: 'warm, welcoming, or rude, unfriendly, arrogant' },
	attentiveness: { topic: 'service', label: 'Attentiveness', hint: 'looked after, or ignored, hard to get attention, forgotten' },
	speed_of_service: { topic: 'service', label: 'Speed of service', hint: 'quick service, or slow service once seated (the line to get in is a wait theme)' },
	order_accuracy: { topic: 'service', label: 'Order accuracy', hint: 'got what was ordered, or wrong, forgotten or missing items' },
	advice: { topic: 'service', label: 'Advice', hint: 'recommendations, explaining the menu, allergies handled, or clueless staff' },
	language: { topic: 'service', label: 'Language', hint: 'a language barrier, or staff speaking the guest\'s language' },
	reservation_handling: { topic: 'service', label: 'Reservations', hint: 'a reservation honoured, or lost, no table despite booking, walk-ins refused' },
	complaint_handling: { topic: 'service', label: 'Complaint handling', hint: 'how staff or the owner dealt with a problem or a complaint' },
	takeaway_handling: { topic: 'service', label: 'Takeaway handling', hint: 'packaging, pickup, a delivery order prepared right or wrong' },
	staff_change: { topic: 'service', label: 'Staff change', hint: 'new staff, a known waiter gone, the team changed' },
	service_other: { topic: 'service', label: 'Service, other', hint: 'about the service, nothing else fits' },
	// vibe
	atmosphere: { topic: 'vibe', label: 'Atmosphere', hint: 'cosy, a nice vibe, romantic, or unpleasant, cold; a room too hot, stuffy or cold' },
	noise: { topic: 'vibe', label: 'Noise', hint: 'quiet, or loud, noisy music' },
	space: { topic: 'vibe', label: 'Space', hint: 'spacious, room between tables, or cramped, few seats, seating removed' },
	interior: { topic: 'vibe', label: 'Interior', hint: 'decor, design, furniture, the look after a renovation' },
	outdoor_seating: { topic: 'vibe', label: 'Outdoor seating', hint: 'terrace, garden, seats outside' },
	crowding: { topic: 'vibe', label: 'Crowding', hint: 'lively, or packed, touristy, overcrowded' },
	location: { topic: 'vibe', label: 'Location', hint: 'the spot, the view, the neighbourhood' },
	family_pets: { topic: 'vibe', label: 'Families and pets', hint: 'kids, families, prams, dogs welcome or not' },
	vibe_other: { topic: 'vibe', label: 'Atmosphere, other', hint: 'about the atmosphere, nothing else fits' },
	// price
	price_level: { topic: 'price', label: 'Price level', hint: 'expensive, pricey, or cheap, affordable, for what it is' },
	value_for_money: { topic: 'price', label: 'Value for money', hint: 'worth the money, or not worth the price, small portions for the price ("worth a visit" is not about money)' },
	price_increase: { topic: 'price', label: 'Price increase', hint: 'prices went up since an earlier visit, now cost more than before' },
	extra_charges: { topic: 'price', label: 'Extra charges', hint: 'charged for water, sauce, a container, a service fee; the bill differs from the menu' },
	price_other: { topic: 'price', label: 'Price, other', hint: 'about prices, nothing else fits' },
	// payment
	cash_only: { topic: 'payment', label: 'Cash only', hint: 'cash only, no card, cards no longer taken' },
	card_payment: { topic: 'payment', label: 'Card payment', hint: 'cards or contactless accepted, or a card fee or minimum' },
	tipping: { topic: 'payment', label: 'Tipping', hint: 'a tip asked for, pressured, or tip options on the terminal' },
	billing: { topic: 'payment', label: 'Billing', hint: 'the bill wrong, overcharged, splitting the bill refused' },
	payment_other: { topic: 'payment', label: 'Payment, other', hint: 'about paying, nothing else fits' },
	// wait
	queue: { topic: 'wait', label: 'Queue', hint: 'the line to get in or to order' },
	wait_for_food: { topic: 'wait', label: 'Wait for food', hint: 'the time between ordering and the food arriving' },
	wait_for_table: { topic: 'wait', label: 'Wait for a table', hint: 'getting a table, a reservation not ready' },
	wait_other: { topic: 'wait', label: 'Waiting, other', hint: 'about waiting, nothing else fits' },
	// cleanliness
	toilets: { topic: 'cleanliness', label: 'Toilets', hint: 'the toilets' },
	dining_area: { topic: 'cleanliness', label: 'Dining area', hint: 'tables, floor, cutlery, glasses clean or dirty' },
	food_hygiene: { topic: 'cleanliness', label: 'Food hygiene', hint: 'hair in the food, handling, pests, smell' },
	cleanliness_other: { topic: 'cleanliness', label: 'Cleanliness, other', hint: 'about cleanliness, nothing else fits' },
	// other
	opening_hours: { topic: 'other', label: 'Opening hours', hint: 'the hours, closed when listed open, closed early' },
	accessibility: { topic: 'other', label: 'Accessibility', hint: 'stairs, wheelchair access, parking, hard to find' },
	ownership_change: { topic: 'other', label: 'Ownership change', hint: 'a new owner or management' },
	renovation: { topic: 'other', label: 'Renovation', hint: 'renovated, rebuilt, closed for works' },
	delivery_platform: { topic: 'other', label: 'Delivery platform', hint: 'the delivery app order: late, cold, missing (not the kitchen)' },
	amenities: { topic: 'other', label: 'Amenities', hint: 'wifi, sockets, heating, air conditioning, toilets for guests' },
	other: { topic: 'other', label: 'Other', hint: 'nothing else fits' },
});

export type FeedbackTheme = keyof typeof FEEDBACK_THEMES;

export const FEEDBACK_THEME_KEYS = Object.keys(FEEDBACK_THEMES) as [FeedbackTheme, ...FeedbackTheme[]];

export const isFeedbackTheme = (key: string): key is FeedbackTheme => key in FEEDBACK_THEMES;

/** The theme a topic falls back on when nothing finer fits: `food` → `food_other`, `other` → `other`. */
export const fallbackTheme = (topic: FeedbackTopic): FeedbackTheme =>
	topic === 'other' ? 'other' : (`${topic}_other` as FeedbackTheme);

/** The themes of one topic, in the order defined. */
export const themesOfTopic = (topic: FeedbackTopic): FeedbackTheme[] =>
	FEEDBACK_THEME_KEYS.filter(key => FEEDBACK_THEMES[key].topic === topic);

/** "price / price increase": how a theme is named to the highlights model and in prompts. */
export const feedbackThemeLabel = (theme: FeedbackTheme): string =>
	`${FEEDBACK_THEMES[theme].topic} / ${FEEDBACK_THEMES[theme].label.toLowerCase()}`;

/**
 * The whole vocabulary as one string for a prompt, by topic: "food: taste (how it tasted …),
 * freshness (…); drinks: …".
 */
export const feedbackThemeLegend = (): string =>
	FEEDBACK_TOPICS.map(
		topic =>
			`${topic}: ${themesOfTopic(topic)
				.map(key => `${key} (${FEEDBACK_THEMES[key].hint})`)
				.join(', ')}`,
	).join('; ');
