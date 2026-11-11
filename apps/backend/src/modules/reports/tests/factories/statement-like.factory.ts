// In-memory statements for the pure specs: what `addStatements` persists, as the plain objects the
// readers (`statement-views`) take, with the parts agent B would have read, from a `TopicIndex`.

import type { TestClaim } from 'src/modules/statements/tests/factories/statement.factory.js';
import type { PartLike, StatementLike } from 'src/modules/statements/util/statement-views.js';
import type { TopicIndex } from 'src/modules/topics/util/topics.js';
import { termKey } from 'src/modules/venues/util/dishes.js';

/**
 * A source's statements as plain objects: `{ text: 'prices went up', sentiment: 'negative', aspect:
 * 'price_level', change: true, foods: ['dürüm'] }` (`change` is the kind `change`). An aspect must be in `index` (its parent comes along, so a
 * reader sees the root); a food wording becomes a term linked to the topics the index knows it as
 * a whole (`exactAll`), to none otherwise. A dish-only statement (no `text`) is positive by default,
 * a claim neutral.
 */
export const said = (index: TopicIndex, claims: TestClaim[]): StatementLike[] =>
	claims.map(claim => {
		const parts: PartLike[] = [];
		if (claim.aspect) {
			const topic = index.get(claim.aspect);
			if (!topic || !index.isAspect(claim.aspect)) throw new Error(`No aspect "${claim.aspect}" in the index`);
			const parent = topic.isA.length ? index.get(topic.isA[0]) : undefined;
			parts.push({
				role: 'aspect',
				topic: { key: topic.key, label: topic.label, parent: parent ? { key: parent.key, label: parent.label } : null },
			});
		}
		for (const name of claim.foods ?? []) {
			const key = termKey(name);
			if (!key) continue;
			parts.push({
				role: 'food',
				term: {
					key,
					name: name.trim(),
					...foodTopics(index, name),
				},
			});
		}
		return {
			text: claim.text?.trim() || null,
			sentiment: claim.sentiment ?? (claim.text ? 'neutral' : 'positive'),
			kind: claim.change ? 'change' : (claim.kind ?? null),
			quote: claim.quote ?? null,
			amount: claim.amount ?? null,
			unit: claim.unit ?? null,
			parts,
		};
	});

/** A wording's main topic and modifiers as the index knows it as a whole (kinds of food only) */
const foodTopics = (index: TopicIndex, name: string) => {
	const [first, ...rest] = index
		.exactAll(name)
		.filter(k => !index.isAspect(k))
		.map(k => ({ key: k, label: index.label(k) }));
	return { topic: first ?? null, modifiers: rest.map(topic => ({ topic })) };
};
