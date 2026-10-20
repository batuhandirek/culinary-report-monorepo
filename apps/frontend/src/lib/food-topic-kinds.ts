// A food topic's type as the admin names it, in the order the page groups them
export const KIND_ITEMS: { value: 'cuisine' | 'dish' | 'drink' | 'diet' | 'format' | 'meal'; label: string }[] = [
	{ value: 'cuisine', label: 'Cuisine' },
	{ value: 'dish', label: 'Dish' },
	{ value: 'drink', label: 'Drink' },
	{ value: 'diet', label: 'Diet' },
	{ value: 'format', label: 'Place' },
	{ value: 'meal', label: 'Meal' }
];

export const kindLabel = (kind: string) => KIND_ITEMS.find((k) => k.value === kind)?.label ?? kind;
