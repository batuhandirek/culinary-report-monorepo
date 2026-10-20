// Pure: resolving raw cuisine strings (a mention's, a Google category) to food topics.

import { cuisineWords, normalizeCuisine } from 'src/modules/venues/util/cuisine.js';

import type { FoodTopicKindEnum } from '../entities/food-topic.entity.js';

/** What the index needs of a `FoodTopic`. */
export interface IndexedFoodTopic {
	key: string;
	label: string;
	kind: FoodTopicKindEnum;
	parentKey: string | null;
	aliases: string[];
}

/** The ways a spelling is looked up: its `normalizeCuisine` key and its words before name synonyms. */
const lookupForms = (raw: string): string[] => {
	const forms = [normalizeCuisine(raw), cuisineWords(raw).join(' ')];
	return [...new Set(forms.filter((f): f is string => !!f))];
};

/**
 * Every topic by key and by its aliases' normalized forms. A key wins over another topic's alias
 * for the same form; between aliases, the topic listed first wins.
 */
export class FoodTopicIndex {
	private readonly byKey = new Map<string, IndexedFoodTopic>();
	private readonly lookup = new Map<string, string>();
	// The longest form in words, so a span longer than it is never tried
	private readonly maxWords: number;

	constructor(topics: IndexedFoodTopic[]) {
		for (const t of topics) this.byKey.set(t.key, t);
		for (const t of topics) for (const form of lookupForms(t.key)) this.lookup.set(form, t.key);
		for (const t of topics) {
			for (const alias of t.aliases) {
				for (const form of lookupForms(alias))
					if (!this.lookup.has(form)) this.lookup.set(form, t.key);
			}
		}
		this.maxWords = Math.max(1, ...[...this.lookup.keys()].map(f => f.split(' ').length));
	}

	get(key: string): IndexedFoodTopic | undefined {
		return this.byKey.get(key);
	}

	get topics(): IndexedFoodTopic[] {
		return [...this.byKey.values()];
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
