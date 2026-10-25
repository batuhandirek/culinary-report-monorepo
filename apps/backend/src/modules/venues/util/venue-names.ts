// Matching social media mentions to venues by name. Pure functions, shared by the social and
// reports modules. An account's brand is `social/util/account-match.ts`.

// Generic words venues add to their Google name ("Monkey Bar"); a city adds its own name and
// local words (`City.nameStopwords`)
const STOPWORDS = new Set([
	'restaurant',
	'restaurante',
	'ristorante',
	'cafe',
	'bar',
	'the',
	'and',
	'und',
	'das',
	'der',
	'die',
	'kitchen',
	'bistro',
	'eatery',
	'grill',
	'lounge',
	'pizzeria',
	'trattoria',
	'coffee',
	'by',
]);

/** Lowercase ASCII words, accents and punctuation removed. */
export const plain = (s: string): string =>
	s
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replaceAll('ß', 'ss')
		.replace(/[^a-z0-9 ]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

/**
 * A street as a location hint names it: no house numbers or postcodes, and "Straße" / "Str." and
 * "Platz" / "Pl." spelled one way ("Oranienburger Straße 50" and "Oranienburger Str. 50" are
 * both "oranienburger str"; "Kantstraße" is "kantstr").
 */
export const streetKey = (s: string): string =>
	plain(s)
		.replace(/strasse\b/g, 'str')
		.replace(/\bplatz\b/g, 'pl')
		.split(' ')
		.filter(w => w && !/\d/.test(w))
		.join(' ');

// Shorter street keys say too little to place a mention
const MIN_STREET_KEY = 5;

/** Whether a location hint names this street, house number or not. */
export const hintNamesStreet = (hint: string, street: string): boolean => {
	const key = streetKey(street);
	return key.replaceAll(' ', '').length >= MIN_STREET_KEY && ` ${streetKey(hint)} `.includes(` ${key} `);
};

/** A city's stopwords (`City.nameStopwords`) in the form `normalizeVenueName` compares. */
export const cityStopwords = (words: readonly string[]): ReadonlySet<string> =>
	new Set(words.flatMap(w => plain(w).split(' ')).filter(Boolean));

/** A venue name reduced to its distinctive words, without generic ones or the city's own. */
export const normalizeVenueName = (name: string, cityWords?: ReadonlySet<string>): string =>
	plain(name)
		.split(' ')
		.filter(w => w && !STOPWORDS.has(w) && !cityWords?.has(w))
		.join(' ');

/** Google names often carry a slogan after a separator: "Hard Rock Cafe | Berlin". */
export const venueAliases = (name: string, cityWords?: ReadonlySet<string>): string[] => {
	const head = name.split(/\s[|\-–·•]\s|[|]/)[0];
	return [...new Set([normalizeVenueName(name, cityWords), normalizeVenueName(head, cityWords)])].filter(
		Boolean,
	);
};

const trigrams = (s: string): Set<string> => {
	const padded = `  ${s} `;
	const out = new Set<string>();
	for (let i = 0; i < padded.length - 2; i++) out.add(padded.slice(i, i + 3));
	return out;
};

/** Dice coefficient over character trigrams, 1 for identical strings. */
export const nameSimilarity = (a: string, b: string): number => {
	if (a === b) return 1;
	const ta = trigrams(a);
	const tb = trigrams(b);
	let shared = 0;
	for (const t of ta) if (tb.has(t)) shared++;
	return (2 * shared) / (ta.size + tb.size);
};

/**
 * Whether a mention's city is the target city, given its name and aliases (`cityNames`). A
 * mention without a known city is assumed to be in it.
 */
export const isInCity = (mentionCity: string | null | undefined, names: readonly string[]): boolean =>
	!mentionCity || names.some(name => plain(mentionCity).includes(plain(name)));

// Google categories of places that serve food or drinks
const FOOD_CATEGORY =
	/restaurant|\bbar\b|cafe|café|coffee|roaster|bakery|patisserie|confectioner|snack|food|bistro|\bpub\b|imbiss|brunch|breakfast|tea ?house|ice cream|dessert|pizza|kebab|doner|falafel|burger|diner|deli|steak|sushi|ramen|noodle|dumpling|grill|bbq|barbecue|chicken|bagel|donut|juice|bubble tea|brewery|beer|biergarten|wine|cocktail|market|caterer|canteen|gastropub|brewpub|brasserie|sandwich|pastry|cookie|cake|cr[eê]perie|a[cç]a[ií]|salad|pasta|pie shop|churreria|fruit parlou?r|frozen yogh?urt|takeaway|meyhane|dinner theater/i;

export const isFoodVenue = (category: string | null | undefined): boolean =>
	!category || FOOD_CATEGORY.test(category);

/** Whether a place name from another platform, e.g. an Instagram location, is the venue. */
export const isSameVenue = (placeName: string, venueName: string): boolean => {
	const a = venueAliases(placeName);
	const b = venueAliases(venueName);
	return a.some(x => b.some(y => nameSimilarity(x, y) >= 0.6 || x.includes(y) || y.includes(x)));
};
