// A topic's type as the admin names it, in the order the page groups them: the kinds of food,
// then the aspects (what guests say about a place: waiting, price, friendliness)
export type TopicKind = 'cuisine' | 'dish' | 'drink' | 'diet' | 'format' | 'meal' | 'aspect';

export const KIND_ITEMS: { value: TopicKind; label: string; hint?: string }[] = [
	{ value: 'cuisine', label: 'Cuisine' },
	{ value: 'dish', label: 'Dish' },
	{ value: 'drink', label: 'Drink' },
	{ value: 'diet', label: 'Diet' },
	{ value: 'format', label: 'Place' },
	{ value: 'meal', label: 'Meal' },
	{ value: 'aspect', label: 'Aspect', hint: 'What guests say about a place: waiting, price, friendliness.' }
];

export const kindLabel = (kind: string) => KIND_ITEMS.find((k) => k.value === kind)?.label ?? kind;

/** An aspect against the kinds of food: the two sides of the topic tree never mix */
export const isAspectKind = (kind: string) => kind === 'aspect';

/** A topic as the form dialog's parent picker and delete rule read it (`AdminTopicOutputDto` cut down) */
export interface TopicOption {
	key: string;
	label: string;
	kind: string;
	parentKey?: string;
}

export const toTopicOption = (t: TopicOption): TopicOption => ({
	key: t.key,
	label: t.label,
	kind: t.kind,
	...(t.parentKey && { parentKey: t.parentKey })
});
