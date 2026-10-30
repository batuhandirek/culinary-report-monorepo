import type { EntityManager } from '@mikro-orm/postgresql';

import { Topic } from 'src/modules/topics/entities/topic.entity.js';
import { seedIndex } from 'src/modules/topics/tests/factories/topic.factory.js';
import type { TopicIndex } from 'src/modules/topics/util/topics.js';
import type { Mention } from 'src/modules/social/entities/mention.entity.js';
import type { Review } from 'src/modules/venues/entities/review.entity.js';

import { FeedbackPoint } from '../../entities/feedback-point.entity.js';
import { type FeedbackAnswer, feedbackRows } from '../../util/feedback-rows.js';

/**
 * Gives a review or a mention its feedback rows, as an extraction would (`feedbackRows` with the
 * agent asked): `{ praise: [{ topic: 'price', theme: 'price_increase', detail: 'prices went up' }] }`.
 * The review needs its venue (with a city), the mention its post. With `index` built from stored
 * topics (`TopicService.index` after `seedTopics`), dishes get their food topic and points their
 * `aspect` row; the seed index alone sets the keys. Persisted with the next flush.
 */
export const addFeedback = (
	em: EntityManager,
	source: Review | Mention,
	answer: Partial<FeedbackAnswer>,
	opts: { index?: TopicIndex; asked?: boolean } = {},
): FeedbackPoint[] => {
	const isReview = 'publishedAt' in source;
	const base =
		isReview ?
			{
				sourceKind: 'review' as const,
				review: source,
				city: source.venue.city,
				month: source.publishedAt.toISOString().slice(0, 7),
			}
		:	{
				sourceKind: 'mention' as const,
				mention: source as Mention,
				city: (source as Mention).post.city,
				month: (source as Mention).post.postedAt.toISOString().slice(0, 7),
			};
	const now = new Date();
	return feedbackRows(
		{ praise: [], complaints: [], dishes: [], ...answer },
		{ asked: opts.asked ?? true, aspects: opts.index ?? seedIndex() },
	).map(row => {
		const topicKey = row.dish ? opts.index?.dishTopic(row.dish) : undefined;
		const topicId = topicKey ? opts.index?.get(topicKey)?.id : undefined;
		return em.create(FeedbackPoint, {
			...base,
			sentiment: row.sentiment,
			topic: row.topic,
			theme: row.theme,
			aspect: row.aspectId ? em.getReference(Topic, row.aspectId) : null,
			detail: row.detail,
			dish: row.dish,
			dishKey: row.dishKey,
			foodTopic: topicId ? em.getReference(Topic, topicId) : null,
			amount: row.amount,
			unit: row.unit,
			dishCheckedAt: row.dishChecked ? now : null,
			amountCheckedAt: row.amountChecked ? now : null,
			change: row.change,
		});
	});
};
