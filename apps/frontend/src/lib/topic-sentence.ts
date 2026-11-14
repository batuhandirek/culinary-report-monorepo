// What a kind of food is, said as a sentence from its edges, for its page's heading:
// "Menemen is a Turkish dish and a breakfast.", "Biryani is an Indian and Pakistani dish and a
// kind of rice and curry.", "Birria tacos are a kind of tacos, with beef." A cuisine, a place or a
// diet it is reads as a word before its own kind ("a Turkish dish", "a street food dish"), a meal
// as a noun ("a breakfast"), a dish, drink or ingredient as "a kind of"; a diet it has reads as a
// word of its own ("and vegan"), anything else it has as "with". A topic it is that another one it
// is already implies is left out ("a kind of rice noodles", not "rice noodles and noodles"). Each
// other topic is a part with its key, so the page links it.

/** One piece of the sentence: plain words, or another topic's name with its key */
export type SentencePart = { text: string; key?: string };

interface SentenceTopic {
	key: string;
	label: string;
	kind: string;
	edges: { to: string; type: string; rank: number }[];
}

/** The other topics by key: their name, kind and, to leave out what another implies, their edges */
type SentenceTopics = Map<string, { label: string; kind: string; edges?: { to: string; type: string }[] }>;

/** A topic's own kind as a noun: "a dish", "a cuisine", "a kind of place" */
const KIND_NOUNS: Record<string, string> = {
	cuisine: 'cuisine',
	dish: 'dish',
	drink: 'drink',
	diet: 'diet',
	format: 'kind of place',
	meal: 'meal',
	ingredient: 'ingredient'
};

/** Kinds that describe another topic as a word before its kind: a Turkish dish, a street food dish, a vegan dish */
const ADJECTIVE_KINDS = ['cuisine', 'place', 'diet'];

/** A name inside a sentence: lowercased unless it is a cuisine (Turkish) or has capitals of its own (McRib) */
const inline = (label: string, kind: string) =>
	kind === 'cuisine' || /\p{Lu}/u.test(label.slice(1)) ? label : label.charAt(0).toLowerCase() + label.slice(1);

const article = (word: string) => (/^[aeiou]/i.test(word) ? 'an' : 'a');

/** "is" or "are": a plural-looking name ("Fries", "Tacos") takes "are", "Hummus" and "Couscous" don't */
export const verbOf = (label: string) => {
	const last = label.trim().split(/\s+/).pop()?.toLowerCase() ?? '';
	return /s$/.test(last) && !/(ss|us|is)$/.test(last) ? 'are' : 'is';
};

/** The parts joined as a list: "a", "a and b", "a, b and c" */
const list = (items: SentencePart[][]): SentencePart[] =>
	items.flatMap((item, i) => [
		...(i === 0 ? [] : [{ text: i === items.length - 1 ? ' and ' : ', ' }]),
		...item
	]);

/**
 * Everything after the topic's name: " is a Turkish dish and a breakfast." Edges to topics not in
 * `byKey` are left out; a topic with none is its kind alone (" is a cuisine.").
 */
export const topicSentence = (topic: SentenceTopic, byKey: SentenceTopics): SentencePart[] => {
	const targets = (type: string) =>
		topic.edges
			.filter((e) => e.type === type && byKey.has(e.to))
			.sort((a, b) => a.rank - b.rank)
			.map((e) => ({ key: e.to, label: byKey.get(e.to)!.label, kind: byKey.get(e.to)!.kind }));
	const link = (t: { key: string; label: string; kind: string }): SentencePart => ({ text: inline(t.label, t.kind), key: t.key });
	// Everything a topic is through its "is a" edges, at any depth
	const above = (key: string, seen = new Set<string>()): Set<string> => {
		for (const e of byKey.get(key)?.edges ?? [])
			if (e.type === 'is_a' && !seen.has(e.to)) {
				seen.add(e.to);
				above(e.to, seen);
			}
		return seen;
	};
	const direct = targets('is_a');
	const implied = new Set(direct.flatMap((t) => [...above(t.key)]));
	const isA = direct.filter((t) => !implied.has(t.key));
	const has = targets('has');
	const describing = isA.filter((t) => ADJECTIVE_KINDS.includes(t.kind));
	const meals = isA.filter((t) => t.kind === 'meal');
	const kindsOf = isA.filter((t) => !ADJECTIVE_KINDS.includes(t.kind) && t.kind !== 'meal');
	const noun = KIND_NOUNS[topic.kind] ?? topic.kind;

	const items: SentencePart[][] = [];
	if (describing.length || (!meals.length && !kindsOf.length)) {
		const words = describing.map((t) => [link(t)]);
		const first = describing[0] ? inline(describing[0].label, describing[0].kind) : noun;
		items.push([{ text: `${article(first)} ` }, ...list(words), { text: `${describing.length ? ' ' : ''}${noun}` }]);
	}
	for (const meal of meals) items.push([{ text: `${article(inline(meal.label, meal.kind))} ` }, link(meal)]);
	if (kindsOf.length) items.push([{ text: 'a kind of ' }, ...list(kindsOf.map((t) => [link(t)]))]);
	for (const diet of has.filter((t) => t.kind === 'diet')) items.push([link(diet)]);
	const withs = has.filter((t) => t.kind !== 'diet');

	return [
		{ text: ` ${verbOf(topic.label)} ` },
		...list(items),
		...(withs.length ? [{ text: ', with ' }, ...list(withs.map((t) => [link(t)]))] : []),
		{ text: '.' }
	];
};

/** The sentence as plain text, name first: for a title attribute or a test */
export const topicSentenceText = (topic: SentenceTopic, byKey: SentenceTopics) =>
	topic.label + topicSentence(topic, byKey).map((p) => p.text).join('');
