import { EntityManager } from '@mikro-orm/postgresql';

import type { TestingModule } from '@nestjs/testing';

import { StatementPartsService } from 'src/modules/statements/services/statement-parts.service.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { ReviewService } from 'src/modules/venues/services/review.service.js';
import { monthRange } from 'src/modules/venues/util/month.js';

import { ReviewClaimsAgent } from '../../agents/review-claims.agent.js';
import { reviewClaimsMessage } from '../../util/review-claims-input.js';

/**
 * The unread written reviews (of a month, or all) read the way `ReadReviewsWorkflow.readReview`
 * reads one, its steps run plainly with the suite's `ReviewClaimsAgent`, for PGlite suites (DBOS
 * can't run on PGlite). A labeller failure is thrown, as the step's would fail the run.
 */
export const readReviewsPlainly = async (
	moduleRef: TestingModule,
	opts: { month?: string } = {},
): Promise<{ analysed: number }> => {
	const reviews = moduleRef.get(ReviewService);
	const agent = moduleRef.get(ReviewClaimsAgent);
	const statementParts = moduleRef.get(StatementPartsService);
	const range = opts.month ? monthRange(opts.month) : null;
	const ids = (
		await moduleRef
			.get(EntityManager)
			.fork()
			.find(
				Review,
				{
					analysedAt: null,
					...(range && { publishedAt: { $gte: range.start, $lt: range.end } }),
				},
				{ orderBy: { publishedAt: 'desc', id: 'asc' }, fields: ['id'] },
			)
	).map(r => r.id);
	let analysed = 0;
	for (const id of ids) {
		const review = await reviews.reviewForReading(id);
		if (!review) continue;
		const answer = await agent.generate(reviewClaimsMessage(review));
		const claimIds = await reviews.saveReviewReading(review.id, answer.object.claims);
		if (claimIds.length) await statementParts.read({ ids: claimIds });
		analysed++;
	}
	return { analysed };
};
