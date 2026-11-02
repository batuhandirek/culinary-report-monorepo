/**
 * How strongly a wording is a topic (`TermTopic.relation`), the user's "strength" (2026-10-31):
 * `same` — the same thing, a spelling or a translation ("Pommes" → Fries); `kind_of` — a more
 * specific kind ("garlic parmesan fries" → Fries, "Biang Biang noodles" → Noodles); `with` — an
 * attribute or an ingredient of it ("vegan döner" → Vegan, "chicken döner" → Chicken).
 */
export const TERM_RELATIONS = ['same', 'kind_of', 'with'] as const;

export type TermRelation = (typeof TERM_RELATIONS)[number];

/** How much a reader counts: strict (same), normal (+ kind_of), broad (all links; the default) */
export type TermStrength = 'strict' | 'normal' | 'broad';

/** The relations a strength counts */
export const relationsOf = (strength: TermStrength): TermRelation[] =>
	strength === 'strict' ? ['same']
	: strength === 'normal' ? ['same', 'kind_of']
	: [...TERM_RELATIONS];
