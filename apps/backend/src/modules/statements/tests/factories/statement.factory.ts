import type { EntityManager } from '@mikro-orm/postgresql';

import type { Mention } from 'src/modules/social/entities/mention.entity.js';
import { Term } from 'src/modules/topics/entities/term.entity.js';
import { defaultEdgeType } from 'src/modules/topics/constants/topic-edge.constant.js';
import { TermModifier } from 'src/modules/topics/entities/term-modifier.entity.js';
import { Topic } from 'src/modules/topics/entities/topic.entity.js';
import type { TopicIndex } from 'src/modules/topics/util/topics.js';
import type { Review } from 'src/modules/venues/entities/review.entity.js';
import { seedIndex } from 'src/modules/topics/tests/factories/topic.factory.js';
import { termKey } from 'src/modules/venues/util/dishes.js';

import type { StatementKind } from '../../constants/kind.constant.js';
import type { Sentiment } from '../../constants/sentiment.constant.js';
import {
	Statement,
	type StatementSubject,
	type StatementUnit,
} from '../../entities/statement.entity.js';
import { StatementPart } from '../../entities/statement-part.entity.js';
import { monthOf } from '../../services/statement.service.js';

/** One claim as a test states it, with the parts agent B would have read */
export interface TestClaim {
	/** The claim; omit for a dish-only statement (a dish the source listed that no claim names) */
	text?: string;
	sentiment?: Sentiment;
	/** The aspect's key (`Topic.key`), from the index */
	aspect?: string;
	/** The food wordings named, as the source spelled them: each a term, linked to the topic it names as a whole */
	foods?: string[];
	amount?: number;
	unit?: StatementUnit;
	/** Shorthand for `kind: 'change'` */
	change?: boolean;
	/** Agent B's kind (default: none, as before B read it; `change` sets `change`) */
	kind?: StatementKind;
	/** The source's own words */
	quote?: string;
	/** A post's claim about the city or nothing (default: the source's place) */
	subject?: StatementSubject;
}

/**
 * Gives a review or a mention its statements and parts, as agents A and B would have: `{ text:
 * 'prices went up', sentiment: 'negative', aspect: 'price_increase' }`. The review needs its venue
 * (with a city), the mention its post. `index` must be built from stored topics
 * (`TopicService.index` after `seedTopics`): an aspect part references its row; a food wording
 * becomes a `Term` (found by key, or created) linked to the dish or drink topic it names as a whole
 * when it has no link yet. Persisted with the next flush.
 */
export const addStatements = (
	em: EntityManager,
	source: Review | Mention,
	claims: TestClaim[],
	opts: { index: TopicIndex },
): Statement[] => {
	const isReview = 'publishedAt' in source;
	const saidAt = isReview ? source.publishedAt : (source as Mention).post.postedAt;
	const base =
		isReview ?
			{ sourceKind: 'review' as const, review: source, city: source.venue.city }
		:	{
				sourceKind: 'post' as const,
				post: (source as Mention).post,
				mention: source as Mention,
				city: (source as Mention).post.city,
			};
	const now = new Date();
	return claims.map(claim => {
		const subject = claim.subject ?? 'place';
		const statement = em.create(Statement, {
			...base,
			...(!isReview && subject !== 'place' && { mention: null }),
			subject,
			month: monthOf(saidAt),
			saidAt,
			text: claim.text?.trim() || null,
			sentiment: claim.sentiment ?? (claim.text ? 'neutral' : 'positive'),
			kind: claim.change ? 'change' : (claim.kind ?? null),
			quote: claim.quote ?? null,
			amount: claim.amount ?? null,
			unit: claim.unit ?? null,
			partsAt: now,
		});
		let rank = 0;
		const aspect = claim.aspect ? opts.index.aspect(claim.aspect) : undefined;
		if (aspect?.id)
			statement.parts.add(
				em.create(StatementPart, {
					statement,
					role: 'aspect',
					topic: em.getReference(Topic, aspect.id),
					rank: rank++,
				}),
			);
		for (const name of claim.foods ?? []) {
			const term = ensureTerm(em, name, opts.index);
			if (term)
				statement.parts.add(
					em.create(StatementPart, { statement, role: 'food', term, rank: rank++ }),
				);
		}
		return statement;
	});
};

/** The terms the factory created in this unit of work, by key: one row per wording across calls */
const created = new WeakMap<EntityManager, Map<string, Term>>();

/**
 * The term of a wording for a test: the one already in the unit of work (created here, or loaded
 * before), else a new one, decided by a name match when the index knows the wording as a whole
 * (its first topic its main one, exact when the wording is that topic; the rest its modifiers), so
 * a food part gets its topics without the backlog.
 */
export const ensureTerm = (
	em: EntityManager,
	name: string,
	index: TopicIndex,
): Term | undefined => {
	const key = termKey(name);
	if (!key) return undefined;
	const map = created.get(em) ?? new Map<string, Term>();
	created.set(em, map);
	const known =
		map.get(key) ??
		em
			.getUnitOfWork()
			.getIdentityMap()
			.values()
			.find((e): e is Term => e instanceof Term && e.key === key);
	if (known) return known;
	const term = em.create(Term, { key, name: name.trim() });
	const keys = index.exactAll(name).filter(k => !index.isAspect(k));
	keys.forEach((topicKey, i) => {
		const topic = index.get(topicKey);
		if (!topic?.id) return;
		if (i === 0) {
			term.topic = em.getReference(Topic, topic.id);
			term.exact = index.exact(name) === topicKey;
		} else
			term.modifiers.add(
				em.create(TermModifier, {
					term,
					topic: em.getReference(Topic, topic.id),
					type: defaultEdgeType(topic.kind),
					rank: i - 1,
				}),
			);
	});
	if (keys.length) {
		term.decidedBy = 'match';
		term.decidedAt = new Date();
	}
	map.set(key, term);
	return term;
};

/** The seed's index (its keys, labels and `TEST_ALIASES`), built once: what `addFoods` resolves wordings with */
let seededIndex: TopicIndex | undefined;

/**
 * Gives a mention one claim naming `foods`, as agent A, the labeller and agent C would leave it:
 * each wording a term linked to the seeded topics it names (`seedIndex`: as a whole by a key, a
 * label or a `TEST_ALIASES` name, else by its known words, "Vegan Döner" → vegan, kebab), the
 * first its main topic, the rest its modifiers; a wording naming none stays undecided; no foods,
 * no claim. What a spec counting mentions by kind of food seeds. The topics must be in the unit of work (`seedTopics`).
 * Persisted with the next flush.
 */
export const addFoods = (
	em: EntityManager,
	mention: Mention,
	foods: string[],
): Statement | undefined => {
	if (!foods.length) return undefined;
	seededIndex ??= seedIndex();
	const index = seededIndex;
	// Flushed or not: what the unit of work holds
	const uow = em.getUnitOfWork();
	const held = [...uow.getIdentityMap().values(), ...uow.getPersistStack()];
	const topics = new Map(
		held.filter((e): e is Topic => e instanceof Topic).map(t => [t.key, t]),
	);
	const saidAt = mention.post.postedAt;
	const statement = em.create(Statement, {
		sourceKind: 'post',
		post: mention.post,
		mention,
		city: mention.post.city,
		subject: 'place',
		month: monthOf(saidAt),
		saidAt,
		text: `had the ${foods.join(' and ')}`,
		sentiment: 'positive',
		partsAt: new Date(),
	});
	const map = created.get(em) ?? new Map<string, Term>();
	created.set(em, map);
	foods.forEach((name, rank) => {
		const key = termKey(name);
		if (!key) return;
		// One row a wording: the factory's, else one in the unit of work (a seeded alias)
		let term =
			map.get(key) ?? held.find((e): e is Term => e instanceof Term && e.key === key);
		if (!term) {
			term = em.create(Term, { key, name: name.trim() });
			const whole = index.exactAll(name);
			const keys = (whole.length ? whole : index.resolve(name)).filter(
				k => !index.isAspect(k) && topics.has(k),
			);
			keys.forEach((topicKey, i) => {
				const topic = topics.get(topicKey)!;
				if (i === 0) {
					term!.topic = topic;
					term!.exact = index.exact(name) === topicKey;
				} else
					term!.modifiers.add(
						em.create(TermModifier, {
							term: term!,
							topic,
							type: defaultEdgeType(topic.kind),
							rank: i - 1,
						}),
					);
			});
			if (keys.length) {
				term.decidedBy = 'match';
				term.decidedAt = new Date();
			}
			map.set(key, term);
		}
		statement.parts.add(em.create(StatementPart, { statement, role: 'food', term, rank }));
	});
	return statement;
};
