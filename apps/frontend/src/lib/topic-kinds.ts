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

/** How one topic relates to another, and a narrower wording's modifier to its topic (`TopicEdge.type`, `TermModifier.type`) */
export type EdgeType = 'is_a' | 'has';

export const EDGE_ITEMS: { value: EdgeType; label: string; hint: string }[] = [
	{ value: 'is_a', label: 'Is a', hint: 'A kind of it: Menemen is a Turkish dish, is a breakfast. Counts always.' },
	{ value: 'has', label: 'Has', hint: 'A diet, an ingredient or an attribute of it: Vegan döner has Vegan. Counts in broad mode only.' }
];

export const edgeLabel = (type: string) => EDGE_ITEMS.find((e) => e.value === type)?.label.toLowerCase() ?? type;

/** The type an edge or a modifier gets from what it points at, as the backend defaults it: a diet or an ingredient is had, anything else is a kind */
export const defaultEdgeType = (toKind: string): EdgeType => (toKind === 'diet' || toKind === 'ingredient' ? 'has' : 'is_a');

/** Who decided a wording's topic, or stated an edge */
export const DECIDED_LABELS: Record<string, string> = { match: 'name match', ai: 'AI', admin: 'admin', seed: 'seed' };
