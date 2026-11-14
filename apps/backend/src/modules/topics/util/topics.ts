// Pure: the topic graph — resolving raw food text (a Google category, a menu item, a hashtag) to food
// topics, walking what a topic is and has (its edges), and the aspects (what is said about a
// place) the agents file claims under.

import { cuisineWords, normalizeCuisine } from 'src/modules/venues/util/cuisine.js';
import { isMainCourse } from 'src/modules/venues/util/delivery.js';
import { termKey } from 'src/modules/venues/util/dishes.js';

import { ASPECT_ROOTS } from '../constants/aspect-seed.constant.js';
import type { CountMode, EdgeType } from '../constants/topic-edge.constant.js';
import { TopicKindEnum } from '../entities/topic.entity.js';

const DISH_KINDS = new Set([TopicKindEnum.DISH, TopicKindEnum.DRINK]);

/** What the index needs of a `Topic`. */
export interface IndexedTopic {
	/** The row's id, when built from stored topics: what a stored link points at */
	id?: string;
	key: string;
	label: string;
	kind: TopicKindEnum;
	/** The topics it is a kind of (`is_a` edges), by rank: the first is its display parent. Empty for a root */
	isA: string[];
	/** The topics it has (`has` edges: a diet, an ingredient, an attribute), by rank */
	has: string[];
	/** An aspect's: what it covers, for the agents' legend */
	hint?: string | null;
}

/** A topic as a caller hands it to the index: its edges may be left out (none) */
export type IndexedTopicInput = Omit<IndexedTopic, 'isA' | 'has'> & {
	isA?: string[];
	has?: string[];
};

/**
 * What the index needs of a decided `Term`: the wording, its main topic (null: none), whether it
 * is that topic (`exact`) or something narrower under it, and what else a narrower one is or has
 * (`modifiers`).
 */
export interface IndexedTerm {
	key: string;
	name: string;
	topicKey: string | null;
	exact: boolean;
	modifiers: { topicKey: string; type: EdgeType }[];
}

/** Which edges a walk follows: both (broad, the default) or `is_a` alone (`strict`) */
export interface WalkOptions {
	strict?: boolean;
}

export const walkOptions = (mode?: CountMode): WalkOptions => ({ strict: mode === 'strict' });

/** An aspect as the writers resolve an agent's answer: the row to link, its key and its root */
export interface AspectRef {
	id?: string;
	key: string;
	/** The topmost ancestor's key (the key itself for a root): the point's `topic` */
	root: string;
}

/** The ways a spelling is looked up: its `normalizeCuisine` key and its words before name synonyms. */
const lookupForms = (raw: string): string[] => {
	const forms = [normalizeCuisine(raw), cuisineWords(raw).join(' ')];
	return [...new Set(forms.filter((f): f is string => !!f))];
};

/**
 * An aspect's key from its label or a given key: lower case, letters and digits, words joined by
 * `_` ("Tip prompts" → `tip_prompts`); null when nothing is left. Never `normalizeCuisine`, which
 * strips and renames words for food.
 */
export const aspectKey = (raw: string | null | undefined): string | null => {
	const key = (raw ?? '')
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
	return key || null;
};

/**
 * Every topic by key with its edges, and two lookups. Whole-wording matches (`exactAll`, `exact`,
 * `dishTopic`): every food topic by its key's and its label's normalized forms, every decided term
 * by its wording's forms (as said and as its key), each form pointing at the topics the wording
 * evokes — its main topic, then its modifiers ("vegan döner": kebab, vegan) — an aspect among them
 * only through a decided term ("waiting time" → Waiting), never through its own key or label
 * ("food", "service" are words). `exact` answers a term's topic only when the wording is that topic
 * (`IndexedTerm.exact`): "kumpir", a narrower thing under Turkish, names no topic as a whole. The cuisine lookup (`resolve`, word runs over a menu item or a
 * hashtag; Google's categories and review tags are read whole, `wordingTopics`): kinds of food only — topic keys and decided terms' food topics; so "Vegan
 * Food" is vegan, not the root `food`, "#service" names no aspect, and "waiting time döner" is kebab
 * alone. A key wins over a label and over a term for the same form; between terms, the first given
 * wins. A term decided as none takes no form.
 */
export class TopicIndex {
	private readonly byKey = new Map<string, IndexedTopic>();
	/** The cuisine lookup: kinds of food only, by a topic's key forms and a decided term's forms (`resolve`) */
	private readonly lookup = new Map<string, string[]>();
	/** Whole-wording matches: every topic by its key and label forms, every decided term by its forms, aspects included (`exactAll`) */
	private readonly whole = new Map<string, string[]>();
	/** The forms that are a topic as a whole: its key, its label, an exact term's wording (`exact`) */
	private readonly same = new Map<string, string>();
	/** The forms of a food topic's own key and label, no term: what a name match decides at once (`wordingTopics`) */
	private readonly named = new Map<string, string>();
	/** Every decided term by its key: the food topics it evokes, its main topic then its modifiers; empty for none (`wordingTopics`) */
	private readonly decided = new Map<string, string[]>();
	/** Reverse `is_a` edges: the topics that are a kind of the key */
	private readonly children = new Map<string, IndexedTopic[]>();
	/** Reverse `has` edges: the topics that have the key */
	private readonly havers = new Map<string, IndexedTopic[]>();
	// The longest form in words, so a span longer than it is never tried
	private readonly maxWords: number;

	constructor(given: IndexedTopicInput[], terms: IndexedTerm[] = []) {
		const known = new Set(given.map(t => t.key));
		// An edge to a topic the index doesn't hold (a partial seed, a deleted row) is no edge
		const topics: IndexedTopic[] = given.map(t => ({
			...t,
			isA: (t.isA ?? []).filter(k => known.has(k) && k !== t.key),
			has: (t.has ?? []).filter(k => known.has(k) && k !== t.key),
		}));
		for (const t of topics) this.byKey.set(t.key, t);
		for (const t of topics) {
			for (const to of t.isA) this.children.set(to, [...(this.children.get(to) ?? []), t]);
			for (const to of t.has) this.havers.set(to, [...(this.havers.get(to) ?? []), t]);
		}
		const isFood = (key: string) => this.byKey.get(key)?.kind !== TopicKindEnum.ASPECT;
		const food = topics.filter(t => isFood(t.key));
		// Keys first, then labels: a key wins over another topic's label for the same form. An aspect's
		// key or label is no match ("food", "service", "drinks" are words a dish list or a hashtag uses):
		// an aspect is reached only through a decided term ("waiting time", "Cash only" → the agent or an admin)
		for (const t of food)
			for (const form of lookupForms(t.key)) {
				this.whole.set(form, [t.key]);
				this.same.set(form, t.key);
				this.named.set(form, t.key);
			}
		for (const t of food)
			for (const form of lookupForms(t.label))
				if (!this.whole.has(form)) {
					this.whole.set(form, [t.key]);
					this.same.set(form, t.key);
					this.named.set(form, t.key);
				}
		for (const t of food) for (const form of lookupForms(t.key)) this.lookup.set(form, [t.key]);
		// A label resolves to its topic too ("Desserts" is `dessert`), never over a key
		for (const t of food)
			for (const form of lookupForms(t.label))
				if (!this.lookup.has(form)) this.lookup.set(form, [t.key]);
		for (const term of terms) {
			const keys = [
				...new Set([term.topicKey, ...term.modifiers.map(m => m.topicKey)]),
			].filter((k): k is string => !!k && this.byKey.has(k));
			if (!this.decided.has(term.key)) this.decided.set(term.key, keys.filter(isFood));
			if (!keys.length) continue;
			const food = keys.filter(isFood);
			const same = term.exact && term.topicKey && this.byKey.has(term.topicKey);
			for (const form of [...lookupForms(term.name), ...lookupForms(term.key)]) {
				if (!this.whole.has(form)) {
					this.whole.set(form, keys);
					if (same) this.same.set(form, term.topicKey!);
				}
				if (food.length && !this.lookup.has(form)) this.lookup.set(form, food);
			}
		}
		this.maxWords = Math.max(1, ...[...this.lookup.keys()].map(f => f.split(' ').length));
	}

	get(key: string): IndexedTopic | undefined {
		return this.byKey.get(key);
	}

	/** Every topic, aspects included */
	get topics(): IndexedTopic[] {
		return [...this.byKey.values()];
	}

	/** The kinds of food: every topic but the aspects (what cuisines, categories, menus and hashtags resolve to) */
	get food(): IndexedTopic[] {
		return this.topics.filter(t => t.kind !== TopicKindEnum.ASPECT);
	}

	/** The aspects: roots in `ASPECT_ROOTS` order (unknown roots after, by label), each followed by its children by label */
	get aspects(): IndexedTopic[] {
		const rootOrder = new Map<string, number>(ASPECT_ROOTS.map((key, i) => [key, i]));
		const byLabel = (a: IndexedTopic, b: IndexedTopic) => a.label.localeCompare(b.label);
		const roots = this.topics
			.filter(t => t.kind === TopicKindEnum.ASPECT && !t.isA.length)
			.sort(
				(a, b) =>
					(rootOrder.get(a.key) ?? ASPECT_ROOTS.length) -
						(rootOrder.get(b.key) ?? ASPECT_ROOTS.length) || byLabel(a, b),
			);
		const out: IndexedTopic[] = [];
		const walk = (t: IndexedTopic) => {
			out.push(t);
			for (const child of [...(this.children.get(t.key) ?? [])].sort(byLabel)) walk(child);
		};
		roots.forEach(walk);
		return out;
	}

	isAspect(key: string): boolean {
		return this.byKey.get(key)?.kind === TopicKindEnum.ASPECT;
	}

	/** A root is a kind of nothing (no `is_a` edge): a claim filed at an aspect root is "about X, nothing finer" */
	isRoot(key: string): boolean {
		const topic = this.byKey.get(key);
		return !!topic && !topic.isA.length;
	}

	/** The display parent: the topic's first `is_a` (a dish's cuisine, an aspect's root); null for a root or an unknown key */
	parentOf(key: string): string | null {
		return this.byKey.get(key)?.isA[0] ?? null;
	}

	/** The topics that are a kind of the key (`is_a`, one step), by label: its rows in a tree. A topic with several parents is under each */
	childrenOf(key: string): IndexedTopic[] {
		return [...(this.children.get(key) ?? [])].sort((a, b) => a.label.localeCompare(b.label));
	}

	/** The topmost ancestor's key along the display parents (the key itself for a root); undefined for an unknown key */
	rootOf(key: string): string | undefined {
		let topic = this.byKey.get(key);
		if (!topic) return undefined;
		const seen = new Set<string>();
		while (topic.isA.length && !seen.has(topic.key)) {
			seen.add(topic.key);
			const parent = this.byKey.get(topic.isA[0]);
			if (!parent) break;
			topic = parent;
		}
		return topic.key;
	}

	/**
	 * The key and every topic that counts for it, each once: what "who talked about X" matches. By
	 * default those that are a kind of it or have it, at any depth (broad: Vegan gathers Vegan
	 * döner); `strict` follows `is_a` alone. Empty for an unknown key.
	 */
	descendants(key: string, opts: WalkOptions = {}): string[] {
		if (!this.byKey.has(key)) return [];
		const out: string[] = [];
		const walk = (k: string) => {
			if (out.includes(k)) return;
			out.push(k);
			for (const child of this.children.get(k) ?? []) walk(child.key);
			if (!opts.strict) for (const haver of this.havers.get(k) ?? []) walk(haver.key);
		};
		walk(key);
		return out;
	}

	/**
	 * The keys and every topic each counts for, each once, as `topic_closure` holds them: by default
	 * along `is_a` and `has` (broad); `strict` follows `is_a` alone, so what a thing has never counts.
	 */
	ancestors(keys: string[], opts: WalkOptions = {}): string[] {
		const out = new Set<string>();
		const walk = (key: string) => {
			const topic = this.byKey.get(key);
			if (!topic || out.has(key)) return;
			out.add(key);
			topic.isA.forEach(walk);
			if (!opts.strict) topic.has.forEach(walk);
		};
		keys.forEach(walk);
		return [...out];
	}

	/** The label, the key itself for an unknown one */
	label(key: string): string {
		return this.byKey.get(key)?.label ?? key;
	}

	/** "price / price increase": how an aspect is named to the report models and in prompts; a root alone is its label ("price") */
	promptLabel(key: string): string {
		const root = this.rootOf(key);
		const own = this.label(key).toLowerCase();
		return root && root !== key ? `${this.label(root).toLowerCase()} / ${own}` : own;
	}

	/** An aspect as the writers link it, by the key an agent answered; undefined for an unknown key or a kind of food */
	aspect(key: string | null | undefined): AspectRef | undefined {
		const topic = key ? this.byKey.get(key) : undefined;
		if (!topic || topic.kind !== TopicKindEnum.ASPECT) return undefined;
		return { id: topic.id, key: topic.key, root: this.rootOf(topic.key) ?? topic.key };
	}

	/**
	 * The aspects as one string for a prompt, by root, each with its key and hint: "food: food
	 * (about the food, when nothing finer fits), taste (how it tasted …), …; drinks: …". The root
	 * itself is listed first under its name, so the agent may answer it when nothing finer fits.
	 */
	aspectLegend(): string {
		const hint = (t: IndexedTopic) => (t.hint ? ` (${t.hint})` : '');
		return this.aspects
			.filter(t => !t.isA.length)
			.map(root => {
				const under = this.descendants(root.key).map(k => this.byKey.get(k)!);
				return `${root.key}: ${under.map(t => `${t.key}${hint(t)}`).join(', ')}`;
			})
			.join('; ');
	}

	/**
	 * The topics a spelling evokes as a whole (a topic's key or label, or a decided term's main
	 * topic and modifiers), without splitting it into words: one for most, several for a narrower
	 * wording with modifiers. Empty for none.
	 */
	exactAll(raw: string): string[] {
		for (const form of lookupForms(raw)) {
			const hit = this.whole.get(form);
			if (hit) return [...hit];
		}
		return [];
	}

	/**
	 * The topic a spelling **is** as a whole: a topic's key or label, or an exact term's topic
	 * ("Pommes" → fries). A narrower wording ("kumpir" under Turkish, "vegan döner") is no topic as a
	 * whole: undefined, though `exactAll` gives what it evokes.
	 */
	exact(raw: string): string | undefined {
		for (const form of lookupForms(raw)) {
			if (this.whole.has(form)) return this.same.get(form);
		}
		return undefined;
	}

	/**
	 * The dish or drink topic a dish name names as a whole, as written or by its `termKey`
	 * ("döner", "doner kebab", "kebabs": kebab; "burger": burgers; a decided term's first dish or
	 * drink: "vegan döner" → kebab); none for a name it doesn't name whole ("vegetable kebab") or
	 * that is only another kind of topic. What a dish wording names as a whole.
	 */
	dishTopic(name: string): string | undefined {
		const key = termKey(name);
		if (!key) return undefined;
		const hits = this.exactAll(name).length ? this.exactAll(name) : this.exactAll(key);
		return hits.find(k => {
			const kind = this.byKey.get(k)?.kind;
			return !!kind && DISH_KINDS.has(kind);
		});
	}

	/**
	 * The food topics one of Google's wordings names (a category, a "people often mention" review tag),
	 * read whole, never split into words: its decided
	 * term's (by `termKey`: the main topic, then the modifiers; "Donut shop" → bakery, donuts; a term
	 * decided as none names nothing), else the topic it is as a whole by that topic's own key or
	 * label ("Italian restaurant", "Coffee shop": what the name match decides once the term is
	 * stored), else nothing, until agent C decides it ("Snack bar" is no bar because it ends in one;
	 * "cheese counter" no cheese).
	 */
	wordingTopics(raw: string | null | undefined): string[] {
		const key = raw ? termKey(raw) : '';
		if (!key) return [];
		const decided = this.decided.get(key);
		if (decided) return [...decided];
		for (const form of lookupForms(raw!)) {
			const named = this.named.get(form);
			if (named) return [named];
		}
		return [];
	}

	/**
	 * The topics a raw cuisine names, in the order it names them: the whole key or an alias of it
	 * ("Döner/Kebap" → kebab), else the longest known runs of its words, so a compound gives each
	 * part ("Vegan Döner" → vegan, kebab; "Korean Fried Chicken" → korean, fried chicken). Words no
	 * topic knows are skipped. Empty for nothing known. Never Google's categories or review tags (`wordingTopics`).
	 */
	resolve(raw: string | null | undefined): string[] {
		const key = normalizeCuisine(raw);
		if (!key) return [];
		const whole = this.lookup.get(key);
		if (whole) return [...whole];
		const words = key.split(' ');
		const found: string[] = [];
		for (let i = 0; i < words.length;) {
			let matched = false;
			for (let j = Math.min(words.length, i + this.maxWords); j > i; j--) {
				const hit = this.lookup.get(words.slice(i, j).join(' '));
				if (hit) {
					for (const k of hit) if (!found.includes(k)) found.push(k);
					i = j;
					matched = true;
					break;
				}
			}
			if (!matched) i++;
		}
		return found;
	}

	/**
	 * A delivery menu item's topics: its name's, else its menu section's ("Tonkotsu" under
	 * "Ramen"). A kind of place never comes from a menu ("Bistro Salat" is no bistro), and an item
	 * that is not a main course (`isMainCourse`: drinks, desserts, sides, extras) only gives drinks
	 * ("Matcha Latte" under "Getränke"), so an extra cheese in the pizza section is no pizza.
	 */
	resolveMenuItem(item: { name: string; category?: string | null }): string[] {
		const main = isMainCourse(item);
		const keep = (keys: string[]) =>
			keys.filter(key => {
				const kind = this.byKey.get(key)?.kind;
				return main ? kind !== TopicKindEnum.PLACE : kind === TopicKindEnum.DRINK;
			});
		const own = keep(this.resolve(item.name));
		return own.length ? own : keep(this.resolve(item.category));
	}

	/** The keys and everything each counts for (`ancestors`): a topic counts for what it is and has too. */
	withParents(keys: string[], opts: WalkOptions = {}): string[] {
		return this.ancestors(keys, opts);
	}
}
