// Pure: which of a venue's menu items a wording means ("banging bangkok burger" → "Banging Bangkok").

import { nameSimilarity } from 'src/modules/venues/util/venue-names.js';

import { twinKeys } from './twin-labels.js';

/** How a wording was matched to a menu item (`MenuItemTerm.method`), surest first */
export type MenuTermMethod = 'exact' | 'contains' | 'similar';

/** A menu item as wordings are matched to it: its id and its key (`menuKey`) */
export interface MenuTermItem {
	id: number;
	key: string;
}

// Articles a menu or a guest adds or drops: "The Classic Smash" is "classic smash"
const ARTICLES = new Set(['the', 'der', 'die', 'das', 'le', 'la', 'el', 'il']);

/** A key without articles: what two spellings of one item share */
const core = (key: string): string[] => key.split(' ').filter(w => w && !ARTICLES.has(w));

const holds = (words: string[], run: string[]): boolean =>
	run.length > 0 && ` ${words.join(' ')} `.includes(` ${run.join(' ')} `);

/** A close spelling counts from here (trigram Dice over the names with and without spaces) */
export const MENU_TERM_SIMILARITY = 0.72;
/** And only this far ahead of the next item that is no variant of the best one */
export const MENU_TERM_LEAD = 0.08;
/** Shorter names say too little for a close spelling to mean them ("fries", "fritz") */
export const MENU_TERM_SIMILAR_MIN_LETTERS = 8;

const similarity = (a: string[], b: string[]): number =>
	Math.max(nameSimilarity(a.join(' '), b.join(' ')), nameSimilarity(a.join(''), b.join('')));

/**
 * The item of one menu (`items`: one listing's, a key each) a wording means, or null:
 *
 * - `exact`: the same key, or the same words run together or in another order (`twinKeys`), articles
 *   aside ("classic smash" is "The Classic Smash").
 * - `contains`: the wording holds an item's whole name of two words or more ("banging bangkok
 *   burger" holds "Banging Bangkok": the longest such name wins), or one item's name holds the
 *   whole wording of two words or more, variants of that item aside ("gochu chick" of "Aktion Gochu
 *   Chick" too: the shortest name wins when every other holds it; two unrelated items holding it
 *   mean neither).
 * - `similar`: a close spelling of one item's name (`MENU_TERM_SIMILARITY`, `MENU_TERM_LEAD`
 *   ahead of the next unrelated item): "bangbang bangkok", "platain wahala".
 *
 * A one-word wording only ever matches exactly: "burger" names no item of a burger menu, and
 * "kimchi" only the item called Kimchi.
 */
export const matchMenuItem = (
	termKey: string,
	items: MenuTermItem[],
): { item: MenuTermItem; method: MenuTermMethod } | null => {
	const term = core(termKey);
	if (!term.length) return null;
	const cored = items.map(item => ({ item, words: core(item.key) })).filter(i => i.words.length);

	const twins = new Set(twinKeys(term.join(' ')));
	const exact = cored.find(
		i => i.words.join(' ') === term.join(' ') || twinKeys(i.words.join(' ')).some(k => twins.has(k)),
	);
	if (exact) return { item: exact.item, method: 'exact' };
	if (term.length < 2) return null;

	const held = cored
		.filter(i => i.words.length >= 2 && holds(term, i.words))
		.sort((a, b) => b.words.length - a.words.length || b.item.key.length - a.item.key.length);
	if (held.length) return { item: held[0].item, method: 'contains' };

	const holding = cored
		.filter(i => holds(i.words, term))
		.sort((a, b) => a.words.length - b.words.length || a.item.key.length - b.item.key.length);
	if (holding.length && holding.every(i => holds(i.words, holding[0].words)))
		return { item: holding[0].item, method: 'contains' };
	if (holding.length) return null;

	if (term.join('').length < MENU_TERM_SIMILAR_MIN_LETTERS) return null;
	const scored = cored
		.filter(i => i.words.join('').length >= MENU_TERM_SIMILAR_MIN_LETTERS)
		.map(i => ({ ...i, score: similarity(term, i.words) }))
		.sort((a, b) => b.score - a.score || a.words.length - b.words.length);
	const best = scored[0];
	if (!best || best.score < MENU_TERM_SIMILARITY) return null;
	// A variant of the best item ("… Veggie", "Aktion …") is no rival: the plain one is meant
	const rival = scored.slice(1).find(i => !holds(i.words, best.words) && !holds(best.words, i.words));
	if (rival && best.score - rival.score < MENU_TERM_LEAD) return null;
	const plainest = scored
		.filter(i => i.score >= MENU_TERM_SIMILARITY && holds(best.words, i.words))
		.sort((a, b) => a.words.length - b.words.length)[0];
	return { item: (plainest ?? best).item, method: 'similar' };
};
