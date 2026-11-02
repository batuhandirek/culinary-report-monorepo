// Pure: how wordings (dish names, tags, aliases) are compared across spellings.

import { plain } from './venue-names.js';

/**
 * An English plural folded to its singular's form: "fries" and "fry", "cookies" and "cookie" (both
 * "cooky"), a trailing s off a word of 4+ letters unless it ends in ss, us or is ("burgers",
 * never "hummus"). Not a lemmatizer: "sandwiches" stays "sandwiche".
 */
const singular = (word: string) => {
	const w = word.replace(/ies$/, 'y').replace(/ie$/, 'y');
	return w.length >= 4 && w.endsWith('s') && !/(ss|us|is)$/.test(w) ? w.slice(0, -1) : w;
};

/**
 * The key a wording is kept under (`Term.key`), across spellings and plurals: "Döner" and "doner"
 * are one dish, and so are "burgers" and "burger"; "Pommes" stays apart from "fries" (a term is kept
 * as said; its links say what it is). A name in another script ("تشريب", "牛肉面") keeps its own
 * letters, lower case: the Latin key of such a name is empty, and an empty key would drop the
 * wording or lump every such wording together.
 */
export const termKey = (name: string) => {
	const latin = plain(name).split(' ').map(singular).join(' ');
	if (latin) return latin;
	return name
		.normalize('NFKC')
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, ' ')
		.trim();
};

/**
 * Whether a phrase names a dish: the dish's key is a run of whole words of the phrase's
 * ("the burgers got pricier" names "Burger", "cold fries" names "Fries", "hamburger buns" not "bun").
 */
export const namesDish = (phrase: string, key: string): boolean => {
	if (!key) return false;
	return ` ${termKey(phrase)} `.includes(` ${key} `);
};
