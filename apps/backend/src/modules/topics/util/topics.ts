// Pure: the topic tree — resolving raw cuisine strings (a mention's, a Google category) to food
// topics, and the aspects (what is said about a place) the agents file points under.

import { cuisineWords, normalizeCuisine } from 'src/modules/venues/util/cuisine.js';
import { isMainCourse } from 'src/modules/venues/util/delivery.js';
import { dishKey } from 'src/modules/venues/util/dishes.js';

import { ASPECT_ROOTS } from '../constants/aspect-seed.constant.js';
import { TopicKindEnum } from '../entities/topic.entity.js';

const DISH_KINDS = new Set([TopicKindEnum.DISH, TopicKindEnum.DRINK]);

/** What the index needs of a `Topic`. */
export interface IndexedTopic {
	/** The row's id, when built from stored topics: what a stored link points at */
	id?: string;
	key: string;
	label: string;
	kind: TopicKindEnum;
	parentKey: string | null;
	aliases: string[];
	/** An aspect's: what it covers, for the agents' legend */
	hint?: string | null;
}

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
 * Every topic by key, and every food topic by its key's and its aliases' normalized forms. A key
 * wins over another topic's alias for the same form; between aliases, the topic listed first wins.
 * Aspects are in the tree (`get`, `withParents`, `descendants`, the legend) and never in the cuisine
 * lookup: "Vegan Food" is vegan, not the root `food`; "#service" names no aspect.
 */
export class TopicIndex {
	private readonly byKey = new Map<string, IndexedTopic>();
	private readonly lookup = new Map<string, string>();
	private readonly children = new Map<string, IndexedTopic[]>();
	// The longest form in words, so a span longer than it is never tried
	private readonly maxWords: number;

	constructor(topics: IndexedTopic[]) {
		for (const t of topics) this.byKey.set(t.key, t);
		for (const t of topics) {
			if (!t.parentKey) continue;
			this.children.set(t.parentKey, [...(this.children.get(t.parentKey) ?? []), t]);
		}
		const food = topics.filter(t => t.kind !== TopicKindEnum.ASPECT);
		for (const t of food) for (const form of lookupForms(t.key)) this.lookup.set(form, t.key);
		for (const t of food) {
			for (const alias of t.aliases) {
				for (const form of lookupForms(alias))
					if (!this.lookup.has(form)) this.lookup.set(form, t.key);
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
			.filter(t => t.kind === TopicKindEnum.ASPECT && !t.parentKey)
			.sort(
				(a, b) =>
					(rootOrder.get(a.key) ?? ASPECT_ROOTS.length) - (rootOrder.get(b.key) ?? ASPECT_ROOTS.length) ||
					byLabel(a, b),
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

	/** A root has no parent: a point filed at it is "about X, nothing finer" (what readers used to call a catch-all) */
	isRoot(key: string): boolean {
		const topic = this.byKey.get(key);
		return !!topic && !topic.parentKey;
	}

	/** The topmost ancestor's key (the key itself for a root); undefined for an unknown key */
	rootOf(key: string): string | undefined {
		let topic = this.byKey.get(key);
		if (!topic) return undefined;
		const seen = new Set<string>();
		while (topic.parentKey && !seen.has(topic.key)) {
			seen.add(topic.key);
			const parent = this.byKey.get(topic.parentKey);
			if (!parent) break;
			topic = parent;
		}
		return topic.key;
	}

	/** The key and every key under it, each once: what "who talked about X" matches. Empty for an unknown key */
	descendants(key: string): string[] {
		if (!this.byKey.has(key)) return [];
		const out: string[] = [];
		const walk = (k: string) => {
			if (out.includes(k)) return;
			out.push(k);
			for (const child of this.children.get(k) ?? []) walk(child.key);
		};
		walk(key);
		return out;
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
			.filter(t => !t.parentKey)
			.map(root => {
				const under = this.descendants(root.key).map(k => this.byKey.get(k)!);
				return `${root.key}: ${under.map(t => `${t.key}${hint(t)}`).join(', ')}`;
			})
			.join('; ');
	}

	/** The topic a spelling names as a whole (a key or an alias), without splitting it into words. */
	exact(raw: string): string | undefined {
		for (const form of lookupForms(raw)) {
			const hit = this.lookup.get(form);
			if (hit) return hit;
		}
		return undefined;
	}

	/**
	 * The dish or drink topic a dish name names as a whole, as written or by its `dishKey`
	 * ("döner", "doner kebab", "kebabs": kebab; "burger": burgers); none for a name it doesn't
	 * name whole ("vegetable kebab") or for another kind of topic. A feedback row's `foodTopic`.
	 */
	dishTopic(name: string): string | undefined {
		const key = dishKey(name);
		if (!key) return undefined;
		const topic = this.exact(name) ?? this.exact(key);
		const kind = topic ? this.byKey.get(topic)?.kind : undefined;
		return topic && kind && DISH_KINDS.has(kind) ? topic : undefined;
	}

	/**
	 * The topics a raw cuisine names, in the order it names them: the whole key or an alias of it
	 * ("Döner/Kebap" → kebab), else the longest known runs of its words, so a compound gives each
	 * part ("Vegan Döner" → vegan, kebab; "Korean Fried Chicken" → korean, fried chicken; "Snack
	 * bar" → street food, as the longer run wins). Words no topic knows are skipped. Empty for
	 * nothing known.
	 */
	resolve(raw: string | null | undefined): string[] {
		const key = normalizeCuisine(raw);
		if (!key) return [];
		const whole = this.lookup.get(key);
		if (whole) return [whole];
		const words = key.split(' ');
		const found: string[] = [];
		for (let i = 0; i < words.length;) {
			let matched = false;
			for (let j = Math.min(words.length, i + this.maxWords); j > i; j--) {
				const hit = this.lookup.get(words.slice(i, j).join(' '));
				if (hit) {
					if (!found.includes(hit)) found.push(hit);
					i = j;
					matched = true;
					break;
				}
			}
			if (!matched) i++;
		}
		return found;
	}

	/** A mention's topics: its own cuisine's, else its venue's Google category's. */
	resolveMention(
		cuisine: string | null | undefined,
		category: string | null | undefined,
	): string[] {
		const own = this.resolve(cuisine);
		return own.length ? own : this.resolve(category);
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
				return main ? kind !== TopicKindEnum.FORMAT : kind === TopicKindEnum.DRINK;
			});
		const own = keep(this.resolve(item.name));
		return own.length ? own : keep(this.resolve(item.category));
	}

	/** The keys and every ancestor of each, each once: a child counts for its parent too. */
	withParents(keys: string[]): string[] {
		const out = new Set<string>();
		for (const key of keys) {
			let topic = this.byKey.get(key);
			while (topic && !out.has(topic.key)) {
				out.add(topic.key);
				topic = topic.parentKey ? this.byKey.get(topic.parentKey) : undefined;
			}
		}
		return [...out];
	}
}
