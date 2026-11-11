import { TopicKindEnum } from '../entities/topic.entity.js';

/**
 * How one topic relates to another (`TopicEdge.type`), and how a wording's modifier relates to its
 * topic (`TermModifier.type`): `is_a` — it is a kind of it (Ramen → Japanese, Menemen → Breakfast,
 * Queue → Waiting); `has` — it has it as a diet, an ingredient or an attribute (Vegan döner →
 * Vegan, Chicken döner → Chicken).
 */
export const EDGE_TYPES = ['is_a', 'has'] as const;

export type EdgeType = (typeof EDGE_TYPES)[number];

/** Who stated an edge: the seed, a promotion's name match, the AI (a promotion from agent C's answers), an admin (never changed by anything else) */
export type EdgeDecider = 'seed' | 'match' | 'ai' | 'admin';

/**
 * How much a reader counts: `broad` (the default) follows `is_a` and `has`, so "vegan döner" counts
 * for Döner & kebab and for Vegan; `strict` follows `is_a` alone, so it counts for what the thing
 * is, never for what it has.
 */
export type CountMode = 'strict' | 'broad';

const HAS_KINDS = new Set<TopicKindEnum>([TopicKindEnum.DIET, TopicKindEnum.INGREDIENT]);

/**
 * The type an edge or a modifier gets when none is given, from what it points at: a diet or an
 * ingredient is something a dish `has`; a cuisine, a meal, a kind of place, a dish, a drink or an
 * aspect is something it `is_a`. An admin may override it (a dish that `has` another: "döner with
 * fries").
 */
export const defaultEdgeType = (toKind: TopicKindEnum): EdgeType =>
	HAS_KINDS.has(toKind) ? 'has' : 'is_a';

/** A new topic needs its wordings to sum to this many uses from this many sources (a topic for one review is noise) */
export const MIN_TOPIC_USES = 15;
export const MIN_TOPIC_SOURCES = 5;

/** The kinds a wording's own topic may have when promoted: never a kind of place, never an aspect */
export const PROMOTION_KINDS = [
	TopicKindEnum.CUISINE,
	TopicKindEnum.DISH,
	TopicKindEnum.DRINK,
	TopicKindEnum.DIET,
	TopicKindEnum.MEAL,
	TopicKindEnum.INGREDIENT,
] as const;

/** A topic's vector for the shortlist agent C is offered: `text-embedding-3-large` at 1024 values, as the claims' */
export const TOPIC_EMBEDDING_DIMENSIONS = 1024;

/** The kinds few enough to be offered whole to agent C; the others are offered by closeness to the wording */
export const FIXED_SHORTLIST_KINDS = [
	TopicKindEnum.CUISINE,
	TopicKindEnum.DIET,
	TopicKindEnum.MEAL,
	TopicKindEnum.FORMAT,
] as const;

/** The closest topics of the other kinds (dish, drink, ingredient, child aspect) agent C is offered beside the fixed groups */
export const SHORTLIST_SIZE = 20;
