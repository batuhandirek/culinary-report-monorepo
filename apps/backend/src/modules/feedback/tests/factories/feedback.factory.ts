import type { EntityManager } from '@mikro-orm/postgresql';

import { FoodTopic } from 'src/modules/food-topics/entities/food-topic.entity.js';
import type { FoodTopicIndex } from 'src/modules/food-topics/util/food-topics.js';
import type { Mention } from 'src/modules/social/entities/mention.entity.js';
import type { Review } from 'src/modules/venues/entities/review.entity.js';

import { FeedbackPoint } from '../../entities/feedback-point.entity.js';
import { type FeedbackAnswer, feedbackRows } from '../../util/feedback-rows.js';

/**
 * Gives a review or a mention its feedback rows, as an extraction would (`feedbackRows` with the
 * agent asked): `{ praise: [{ topic: 'price', theme: 'price_increase', detail: 'prices went up' }] }`.
 * The review needs its venue (with a city), the mention its post. With `index`, dishes get their
 * food topic. Persisted with the next flush.
 */
export const addFeedback = (
	em: EntityManager,
	source: Review | Mention,
	answer: Partial<FeedbackAnswer>,
	opts: { index?: FoodTopicIndex; asked?: boolean } = {},
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
		{ asked: opts.asked ?? true },
	).map(row => {
		const topicKey = row.dish ? opts.index?.dishTopic(row.dish) : undefined;
		const topicId = topicKey ? opts.index?.get(topicKey)?.id : undefined;
		return em.create(FeedbackPoint, {
			...base,
			sentiment: row.sentiment,
			topic: row.topic,
			theme: row.theme,
			detail: row.detail,
			dish: row.dish,
			dishKey: row.dishKey,
			foodTopic: topicId ? em.getReference(FoodTopic, topicId) : null,
			amount: row.amount,
			unit: row.unit,
			dishCheckedAt: row.dishChecked ? now : null,
			amountCheckedAt: row.amountChecked ? now : null,
			change: row.change,
		});
	});
};
