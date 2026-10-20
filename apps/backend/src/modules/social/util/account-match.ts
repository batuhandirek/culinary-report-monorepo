// Which brand an account is the own account of, from its handle (and display name) against the
// names of a city's brands and branches. Pure, tested in `social/tests/account-match.spec.ts`.

import { brandHead } from 'src/modules/venues/util/brand-key.js';
import { nameSimilarity, normalizeVenueName, plain } from 'src/modules/venues/util/venue-names.js';

/** How close a handle is to a name, best first. */
export enum AccountMatchTier {
	// The handle is the name, once city words and generic affixes are stripped
	EXACT = 'exact',
	// Nearly the same letters (one or two off)
	NEAR = 'near',
	// The handle holds the name, or the name holds the handle
	CONTAINS = 'contains',
}

const TIER_SCORE: Record<AccountMatchTier, number> = {
	[AccountMatchTier.EXACT]: 1,
	[AccountMatchTier.NEAR]: 0.85,
	[AccountMatchTier.CONTAINS]: 0.75,
};

/** The shortest name an exact handle links on its own; a shorter one needs the account's posts to agree. */
export const EXACT_MIN_LENGTH = 5;

/**
 * The same for a name without the kinds of place around it ("olympischebruecke" of "Imbiss
 * Olympische Brücke", "napoli" of "Pizza Napoli"): what is left is often a word anyone uses.
 */
export const TRIMMED_MIN_LENGTH = 8;

/** How long a name must be for a handle holding it to count ("otto" is in too many handles). */
export const CONTAINS_MIN_LENGTH = 6;

/** Letter similarity (trigram Dice) from which two compact names are near. */
export const NEAR_SIMILARITY = 0.85;

/** The lowest score offered to an admin as a likely match. */
export const SUGGEST_MIN_SCORE = 0.75;

// What handles add around a venue's name: the city's words come from `City.nameStopwords` and
// its names. Stripped from either end, repeatedly, never from the middle
const HANDLE_AFFIXES = [
	'official',
	'offiziell',
	'restaurant',
	'restaurante',
	'ristorante',
	'cafe',
	'kaffee',
	'coffee',
	'bar',
	'kitchen',
	'bakery',
	'baeckerei',
	'backerei',
	'bistro',
	'eatery',
	'pizzeria',
	'trattoria',
	'the',
	'bln',
	'ber',
	'de',
	'eu',
	'germany',
	'deutschland',
	// Common misspellings
	'resturant',
	'restaurent',
];

// Words for food and drink: a name made only of them ("Ramen", "Pizza Pasta") is not
// distinctive, so a creator called @ramen.berlin is never linked by name alone
const GENERIC_WORDS = new Set([
	...HANDLE_AFFIXES,
	'food',
	'foods',
	'foodie',
	'eats',
	'eat',
	'ramen',
	'pizza',
	'pasta',
	'burger',
	'burgers',
	'sushi',
	'doner',
	'doener',
	'dner',
	'kebab',
	'kebap',
	'falafel',
	'pho',
	'noodle',
	'noodles',
	'dumpling',
	'dumplings',
	'curry',
	'currywurst',
	'tacos',
	'taco',
	'bagel',
	'bagels',
	'donut',
	'donuts',
	'cake',
	'cakes',
	'brunch',
	'breakfast',
	'grill',
	'bbq',
	'vegan',
	'asia',
	'asian',
	'thai',
	'indian',
	'italian',
	'italia',
	'sweet',
	'sweets',
	'dessert',
	'desserts',
	'gelato',
	'eis',
	'icecream',
	'wine',
	'wein',
	'beer',
	'bier',
	'cocktail',
	'cocktails',
	'tea',
	'chicken',
	'steak',
	'kitchen',
	'imbiss',
	'lounge',
	'club',
	'market',
	'markt',
	'deli',
	'house',
	'haus',
	'city',
	'and',
	'und',
	'by',
	// Kinds of place, often written as one word
	'osteria',
	'taverna',
	'cantina',
	'brasserie',
	'enoteca',
	'izakaya',
	'steakhouse',
	'steakhaus',
	'grillhaus',
	'kebabhaus',
	'doenerhaus',
	'burgerhaus',
	'pizzahaus',
	'sushibar',
	'cocktailbar',
	'weinbar',
	'bierbar',
	'sportsbar',
	'biergarten',
	'kneipe',
	'gaststaette',
	'gasthaus',
	'landhaus',
	'kaffeehaus',
	'kindercafe',
	'eiscafe',
	'cafeteria',
	'kantine',
	'backshop',
	'baecker',
	'konditorei',
	'eismanufaktur',
	'roastery',
	'roasters',
	'streetfood',
	'snack',
	'snackbar',
	'lunch',
	'diner',
	'bowl',
	'bowls',
	'catering',
	'lieferservice',
	'eventlocation',
	'gastronomie',
	'fruehstueck',
	'shop',
	'store',
	'express',
	'station',
	'spaetkauf',
	'hotel',
	'hostel',
]);

// German handles spell an umlaut three ways: "brücke", "bruecke", "brcke"
const UMLAUT_SPELLINGS: Record<string, string>[] = [
	{ ä: 'a', ö: 'o', ü: 'u' },
	{ ä: 'ae', ö: 'oe', ü: 'ue' },
	{ ä: '', ö: '', ü: '' },
];

const compact = (s: string): string => plain(s).replace(/ /g, '');

/** One name an account may be the own account of: a brand's, or one of its branches'. */
export interface AccountMatchName {
	brandId: string;
	/** A branch's own name; absent for the brand's */
	branchId?: string;
	name: string;
}

/** A compact spelling of a name, and whether it says more than a word for food. */
interface NameForm {
	text: string;
	distinctive: boolean;
	ref: AccountMatchName;
	/** A run of the name's words that starts the name ("papapane" of "Papa Pane di Sorrento") */
	prefix?: boolean;
	/** Only a run of words, never compared letter by letter (`grams` holds starting runs too) */
	run?: boolean;
	/** How long it must be to link on its own (`EXACT_MIN_LENGTH`, `TRIMMED_MIN_LENGTH`) */
	minLength?: number;
}

/** The city's names, indexed for `matchAccount`: build once per city (`accountMatchIndex`). */
export interface AccountMatchIndex {
	// The whole name and its distinctive words, compact: what an exact handle is
	exact: Map<string, NameForm[]>;
	// Every run of a name's words, compact: what a handle that is part of the name is
	runs: Map<string, NameForm[]>;
	// Four-letter pieces → exact forms and starting runs holding them: the near and contained candidates
	grams: Map<string, Set<NameForm>>;
	cityWords: ReadonlySet<string>;
	/** Branch names given per brand: a chain's (2+) branch accounts are told apart */
	branchCount: Map<string, number>;
}

const GRAM = 4;
const grams = (s: string): string[] => {
	const out: string[] = [];
	for (let i = 0; i + GRAM <= s.length; i++) out.push(s.slice(i, i + GRAM));
	return out;
};

/** Whether plain words say more than food and the city ("Ramen Berlin": no; "Miss Pho": yes). */
export const isDistinctive = (words: string, cityWords: ReadonlySet<string>): boolean =>
	words
		.split(' ')
		.some(w => w.length >= 3 && !GENERIC_WORDS.has(w) && !cityWords.has(w) && !/^\d+$/.test(w));

/** Plain words without the kinds of place and the city's words at either end ("imbiss olympische bruecke" → "olympische bruecke"). */
const trimGeneric = (words: string, cityWords: ReadonlySet<string>): string => {
	const list = words.split(' ').filter(Boolean);
	const generic = (w: string) => GENERIC_WORDS.has(w) || cityWords.has(w);
	while (list.length && generic(list[0])) list.shift();
	while (list.length && generic(list[list.length - 1])) list.pop();
	return list.join(' ');
};

/** A name in its three umlaut spellings, each whole and without its slogan. */
export const nameVariants = (name: string): string[] => {
	const out = new Set<string>();
	for (const map of UMLAUT_SPELLINGS) {
		const spelled = name.replace(/[äöü]/gi, c => map[c.toLowerCase()]);
		out.add(spelled);
		out.add(brandHead(spelled));
	}
	return [...out];
};

const push = <K, V>(map: Map<K, V[]>, key: K, value: V) => {
	const list = map.get(key);
	if (list) list.push(value);
	else map.set(key, [value]);
};

/**
 * Indexes a city's brand and branch names. `cityWords` are what handles and names add around a
 * name in that city: its stopwords, its names and its districts' ("Neukölln" for "Slicebox
 * Neukölln", "@thetastezehlendorf").
 */
export const accountMatchIndex = (
	names: readonly AccountMatchName[],
	cityWords: readonly string[],
): AccountMatchIndex => {
	const words = new Set(
		cityWords
			.flatMap(nameVariants)
			.flatMap(w => plain(w).split(' '))
			.filter(w => w.length >= 3),
	);
	const index: AccountMatchIndex = {
		exact: new Map(),
		runs: new Map(),
		grams: new Map(),
		cityWords: words,
		branchCount: new Map(),
	};
	for (const ref of names) {
		if (ref.branchId)
			index.branchCount.set(ref.brandId, (index.branchCount.get(ref.brandId) ?? 0) + 1);
		const exact = new Map<string, { distinctive: boolean; minLength: number }>();
		const addExact = (form: string, minLength: number) => {
			const text = form.replace(/ /g, '');
			if (text.length < 3) return;
			const known = exact.get(text);
			exact.set(text, {
				distinctive: (known?.distinctive ?? false) || isDistinctive(form, words),
				minLength: Math.min(known?.minLength ?? minLength, minLength),
			});
		};
		const runs = new Map<string, NameForm>();
		for (const variant of nameVariants(ref.name)) {
			const whole = plain(variant);
			const core = normalizeVenueName(variant, words);
			addExact(whole, EXACT_MIN_LENGTH);
			addExact(core, EXACT_MIN_LENGTH);
			// What is left of a name without its kinds of place, when it is still a word of its own
			const trimmed = trimGeneric(core, words);
			if (trimmed.replace(/ /g, '').length >= CONTAINS_MIN_LENGTH)
				addExact(trimmed, TRIMMED_MIN_LENGTH);
			const list = whole.split(' ').filter(Boolean);
			for (let from = 0; from < list.length; from++)
				for (let to = from + 1; to <= list.length; to++) {
					const run = list.slice(from, to);
					const text = run.join('');
					if (text.length < CONTAINS_MIN_LENGTH || !isDistinctive(run.join(' '), words))
						continue;
					const known = runs.get(text);
					if (!known || (from === 0 && !known.prefix))
						runs.set(text, { text, distinctive: true, ref, prefix: from === 0 });
				}
		}
		const addGrams = (form: NameForm) => {
			for (const g of grams(form.text)) {
				let set = index.grams.get(g);
				if (!set) index.grams.set(g, (set = new Set()));
				set.add(form);
			}
		};
		for (const [text, { distinctive, minLength }] of exact) {
			const form: NameForm = { text, distinctive, ref, minLength };
			push(index.exact, text, form);
			addGrams(form);
		}
		for (const [text, form] of runs) {
			push(index.runs, text, form);
			// "berlinburger" of "Berlinburger International" inside "berlin.burger.int"
			if (form.prefix && !exact.has(text)) addGrams({ ...form, run: true });
		}
	}
	return index;
};

/**
 * The compact forms of a handle: as written, without digits at its ends, then with the city's
 * words and generic affixes taken off either end, one at a time ("soriramen.berlin" →
 * "soriramen", "restaurant.salamat" → "salamat"). A display name adds its own.
 */
export const handleForms = (
	handle: string,
	cityWords: ReadonlySet<string>,
	displayName?: string | null,
): string[] => {
	const affixes = [...new Set([...HANDLE_AFFIXES, ...cityWords])].filter(a => a.length >= 2);
	const out = new Set<string>();
	const strip = (s: string) => {
		// Digits may be the name's own ("9ja.flavour", "huhnerhaus36") or a year or area code
		for (const text of new Set([s, s.replace(/^\d+|\d+$/g, '')])) {
			if (text.length < 3 || out.has(text)) continue;
			out.add(text);
			for (const affix of affixes) {
				if (text.startsWith(affix) && text.length > affix.length)
					strip(text.slice(affix.length));
				if (text.endsWith(affix) && text.length > affix.length)
					strip(text.slice(0, -affix.length));
			}
		}
	};
	strip(compact(handle.replace(/[._]/g, ' ')));
	if (displayName)
		for (const variant of nameVariants(displayName)) {
			strip(compact(variant));
			strip(normalizeVenueName(variant, cityWords).replace(/ /g, ''));
		}
	return [...out];
};

/**
 * Whether a name found inside a handle sits on its word breaks: "midori" in "east_of_midori"
 * does, "vegang" in "vegan.garden" does not. A handle written as one word gives no breaks, so
 * the name must start or end it ("lovebirds" in "lovebirdspizzaberlin").
 */
const alignedIn = (handle: string, name: string): boolean => {
	const tokens = plain(handle.replace(/[._]/g, ' ')).split(' ').filter(Boolean);
	const raw = tokens.join('');
	const breaks = new Set<number>([0]);
	let at = 0;
	for (const t of tokens) breaks.add((at += t.length));
	const lead = raw.length - raw.replace(/^\d+/, '').length;
	const tail = raw.replace(/\d+$/, '').length;
	for (let i = raw.indexOf(name); i >= 0; i = raw.indexOf(name, i + 1)) {
		const end = i + name.length;
		if (tokens.length > 1 ? breaks.has(i) && breaks.has(end) : i === lead || end === tail)
			return true;
	}
	return false;
};

/** The account to match: its handle, its display name when known, and what its posts named. */
export interface AccountMatchInput {
	handle: string;
	displayName?: string | null;
	/** Brands its posts' mentions were matched to: evidence that a looser match is right */
	postedAbout?: ReadonlySet<string>;
	/** Brands an admin said it is not */
	rejected?: ReadonlySet<string>;
}

/** The best brand for an account. */
export interface AccountMatch {
	brandId: string;
	/** A branch's own account: the handle is that branch's name and not the brand's */
	branchId?: string;
	tier: AccountMatchTier;
	score: number;
	/** The account's posts named this brand */
	postedAbout: boolean;
	/** Certain enough to store without an admin (see `matchAccount`) */
	link: boolean;
	/** The name form it matched */
	matched: string;
}

interface Hit {
	form: NameForm;
	tier: AccountMatchTier;
	score: number;
	/** Worth an admin's look without the posts agreeing */
	suggestable: boolean;
}

/**
 * The brand an account most likely belongs to, or null. `link` says it is certain enough to
 * store without an admin:
 * - exact: the handle is a distinctive name of `EXACT_MIN_LENGTH`+ letters ("soriramen" for
 *   "SORI Ramen Berlin") that no other brand of the city has, or any name the account's posts
 *   named and no other brand they named has ("drei" for "DREI.");
 * - near or contained (the handle is a run of the name's words, or holds the name on its word
 *   breaks): only when the account's posts named that brand and no other as close.
 * Anything else the posts named is a suggestion, and so is a distinctive exact or near name, a
 * start of the name, or a name that is most of the handle; a name made only of food words
 * ("Ramen", "Dönerhaus") is never linked or suggested by itself.
 */
export const matchAccount = (
	input: AccountMatchInput,
	index: AccountMatchIndex,
): AccountMatch | null => {
	const rejected = input.rejected ?? new Set<string>();
	const postedAbout = input.postedAbout ?? new Set<string>();
	const hits: Hit[] = [];
	for (const text of handleForms(input.handle, index.cityWords, input.displayName)) {
		for (const form of index.exact.get(text) ?? [])
			hits.push({
				form,
				tier: AccountMatchTier.EXACT,
				score: TIER_SCORE[AccountMatchTier.EXACT],
				suggestable: true,
			});
		// The handle is part of the name: "papapane" for "Papa Pane di Sorrento"
		if (isDistinctive(text, index.cityWords))
			for (const form of index.runs.get(text) ?? [])
				hits.push({
					form,
					tier: AccountMatchTier.CONTAINS,
					score: TIER_SCORE[AccountMatchTier.CONTAINS],
					suggestable: !!form.prefix,
				});
		const candidates = new Set<NameForm>();
		for (const g of grams(text))
			for (const form of index.grams.get(g) ?? []) candidates.add(form);
		for (const form of candidates) {
			if (form.text === text || form.text.length < CONTAINS_MIN_LENGTH) continue;
			const similarity =
				text.length >= CONTAINS_MIN_LENGTH && !form.run ?
					nameSimilarity(form.text, text)
				:	0;
			if (similarity >= NEAR_SIMILARITY)
				hits.push({
					form,
					tier: AccountMatchTier.NEAR,
					score: similarity,
					suggestable: true,
				});
			// The name is part of the handle, on its word breaks: "midori" in "east_of_midori"
			else if (
				form.distinctive &&
				text.includes(form.text) &&
				alignedIn(input.handle, form.text)
			)
				hits.push({
					form,
					tier: AccountMatchTier.CONTAINS,
					score: TIER_SCORE[AccountMatchTier.CONTAINS],
					suggestable:
						!form.run && form.text.length >= 8 && form.text.length / text.length >= 0.5,
				});
		}
	}
	const usable = hits.filter(h => !rejected.has(h.form.ref.brandId));
	if (!usable.length) return null;

	// Per brand, its best hit: exact first, then the closest, a distinctive one, the longest name
	const rank = (h: Hit) =>
		(h.tier === AccountMatchTier.EXACT ? 2 : 0) +
		h.score +
		(h.form.distinctive ? 0.5 : 0) +
		h.form.text.length / 1000;
	const byBrand = new Map<string, Hit>();
	for (const hit of usable) {
		const best = byBrand.get(hit.form.ref.brandId);
		if (!best || rank(hit) > rank(best)) byBrand.set(hit.form.ref.brandId, hit);
	}
	const ranked = [...byBrand.values()].sort(
		(a, b) =>
			Number(postedAbout.has(b.form.ref.brandId)) -
				Number(postedAbout.has(a.form.ref.brandId)) || rank(b) - rank(a),
	);
	const best = ranked[0];
	const brandId = best.form.ref.brandId;
	const evidenced = postedAbout.has(brandId);
	const rivals = ranked.slice(1);
	const exact = (h: Hit) => h.tier === AccountMatchTier.EXACT;

	let link: boolean;
	if (exact(best))
		link =
			(best.form.distinctive &&
				best.form.text.length >= (best.form.minLength ?? EXACT_MIN_LENGTH) &&
				!rivals.some(r => exact(r) && r.form.distinctive)) ||
			(evidenced && !rivals.some(r => exact(r) && postedAbout.has(r.form.ref.brandId)));
	else
		link =
			evidenced &&
			best.form.distinctive &&
			!rivals.some(r => postedAbout.has(r.form.ref.brandId) && rank(r) >= rank(best));
	if (!link && !evidenced && !(best.suggestable && best.form.distinctive)) return null;

	// A chain's branch: this brand's hits name one branch and not the brand itself
	let branchId: string | undefined;
	if ((index.branchCount.get(brandId) ?? 0) >= 2) {
		const own = usable.filter(h => h.form.ref.brandId === brandId);
		const branches = new Set(own.map(h => h.form.ref.branchId).filter(Boolean));
		if (!own.some(h => !h.form.ref.branchId) && branches.size === 1)
			branchId = [...branches][0];
	}

	return {
		brandId,
		...(branchId ? { branchId } : {}),
		tier: best.tier,
		score: Math.round(best.score * 100) / 100,
		postedAbout: evidenced,
		link,
		matched: best.form.text,
	};
};
