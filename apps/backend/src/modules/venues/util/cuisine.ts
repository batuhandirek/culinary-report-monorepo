import { plain } from './venue-names.js';

// Words that say nothing about the kind of food
const FILLER = new Set([
	'cuisine',
	'restaurant',
	'restaurants',
	'shop',
	'style',
	'kuche',
	'kueche',
]);
// "German food" is German; "street food" and "fast food" are kinds of their own
const KEEPS_FOOD = new Set(['street', 'fast', 'sea', 'soul', 'comfort', 'junk']);

const WORD_SYNONYMS: Record<string, string> = {
	viet: 'vietnamese',
	vietnamesisch: 'vietnamese',
	turkisch: 'turkish',
	tuerkisch: 'turkish',
	italienisch: 'italian',
	japanisch: 'japanese',
	koreanisch: 'korean',
	chinesisch: 'chinese',
	indisch: 'indian',
	deutsch: 'german',
	griechisch: 'greek',
	mexikanisch: 'mexican',
	thailandisch: 'thai',
	arabisch: 'arabic',
	libanesisch: 'lebanese',
	doner: 'kebab',
	donner: 'kebab',
	kebap: 'kebab',
	burger: 'burgers',
	pizzeria: 'pizza',
	bbq: 'barbecue',
	vegetarisch: 'vegetarian',
};

// Whole names that mean the same kind of place
const NAME_SYNONYMS: Record<string, string> = {
	'turkish kebab': 'kebab',
	coffee: 'cafe',
	'coffee house': 'cafe',
	coffeehouse: 'cafe',
	'espresso bar': 'cafe',
	kaffee: 'cafe',
	steak: 'steakhouse',
	'steak house': 'steakhouse',
	'middle east': 'middle eastern',
};

const JUNK = new Set(['unknown', 'n a', 'na', 'none', 'various', 'mixed', 'other', 'food']);

/**
 * One key per kind of food, whatever the spelling: "Döner", "doner kebab", "Kebap" and
 * "Turkish/Kebab" are `kebab`; "Viet" is `vietnamese`; "Coffee shop" is `cafe`. Also takes a
 * Google category ("Doner kebab restaurant" → `kebab`). Null for nothing usable ("/", "").
 */
export const normalizeCuisine = (raw: string | null | undefined): string | null => {
	const key = cuisineWords(raw).join(' ');
	if (!key || JUNK.has(key)) return null;
	return NAME_SYNONYMS[key] ?? key;
};

/**
 * The words `normalizeCuisine` joins, before whole-name synonyms: accents and filler gone, each
 * word's synonym taken, each word once. Food topic aliases are looked up both ways.
 */
export const cuisineWords = (raw: string | null | undefined): string[] => {
	if (!raw) return [];
	const words = plain(raw.replace(/&/g, ' and '))
		.split(' ')
		.filter(w => w && !FILLER.has(w))
		.map(w => WORD_SYNONYMS[w] ?? w);
	const n = words.length;
	if (n > 1 && words[n - 1] === 'food' && !KEEPS_FOOD.has(words[n - 2])) words.pop();
	return [...new Set(words)];
};
