// A topic's type as the admin names it, in the order the page groups them: the kinds of food,
// then the aspects (what guests say about a place: waiting, price, friendliness)
export type TopicKind = 'cuisine' | 'dish' | 'drink' | 'diet' | 'format' | 'meal' | 'ingredient' | 'aspect';

export const KIND_ITEMS: { value: TopicKind; label: string; hint?: string }[] = [
	{ value: 'cuisine', label: 'Cuisine' },
	{ value: 'dish', label: 'Dish' },
	{ value: 'drink', label: 'Drink' },
	{ value: 'diet', label: 'Diet' },
	{ value: 'format', label: 'Place' },
	{ value: 'meal', label: 'Meal' },
	{ value: 'ingredient', label: 'Ingredient', hint: 'What dishes are made with: beef, cheese, avocado.' },
	{ value: 'aspect', label: 'Aspect', hint: 'What guests say about a place: waiting, price, friendliness.' }
];

export const kindLabel = (kind: string) => KIND_ITEMS.find((k) => k.value === kind)?.label ?? kind;

/** The kinds the dish-search snapshot searches on Google Maps ("pasta Mitte", "cafe Mitte"): not ingredients or aspects */
export const isSearchedKind = (kind: string) => kind !== 'ingredient' && kind !== 'aspect';

/** An aspect against the kinds of food: the two sides of the topic tree never mix */
export const isAspectKind = (kind: string) => kind === 'aspect';

/** The kinds of food, without the aspects: what the Topics pages list and a food topic's type picker offers */
export const FOOD_KIND_ITEMS = KIND_ITEMS.filter((k) => k.value !== 'aspect');

/** How strongly a wording is a topic (`TermTopic.relation`) */
export const RELATION_ITEMS = [
	{ value: 'same', label: 'Same', hint: 'A spelling or a translation: "Pommes" is Fries' },
	{ value: 'kind_of', label: 'Kind of', hint: 'A finer kind: "garlic parmesan fries" is a kind of Fries' },
	{ value: 'with', label: 'With', hint: 'An attribute or an ingredient: "vegan döner" is with Vegan' }
] as const;

export const relationLabel = (relation: string) => RELATION_ITEMS.find((r) => r.value === relation)?.label ?? relation;

/** Who decided a wording's topics */
export const DECIDED_LABELS: Record<string, string> = { match: 'name match', ai: 'AI', admin: 'admin' };
