import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import _ from 'lodash';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { OwnAccountService } from 'src/modules/social/services/own-account.service.js';
import { PostCommentService } from 'src/modules/social/services/post-comment.service.js';
import { Review, ReviewPlatformEnum } from 'src/modules/venues/entities/review.entity.js';
import type { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { WebMentionService } from 'src/modules/venues/services/web-mention.service.js';
import { monthRange } from 'src/modules/venues/util/month.js';

import type { ReportData } from '../interfaces/report-data.interface.js';
import { ownAccountsSection, pressSection, reviewPlatforms, summarizeComments } from '../util/reach.js';

/**
 * The report's reach and press sections from what the pipeline stored: own-account snapshots,
 * classified comments, press mentions, and the review platforms side by side. No LLM call, no
 * scrape.
 */
@Injectable()
export class ReportReachService {
	constructor(
		private readonly em: EntityManager,
		private readonly ownAccountService: OwnAccountService,
		private readonly postCommentService: PostCommentService,
		private readonly webMentionService: WebMentionService,
	) {}

	/**
	 * The brand's sections over `branches` (the absent ones left out): its own accounts, the
	 * comments under its top posts, its press. Also splits `data.reviews` by platform and marks
	 * the appendix's TripAdvisor reviews, in place.
	 */
	async sections(
		branches: Venue[],
		month: string,
		data: Pick<ReportData, 'posts' | 'reviews'>,
		// The report's city; null across all the brand's cities
		city: Pick<City, 'id'> | null,
	): Promise<Pick<ReportData, 'ownAccounts' | 'comments' | 'press'>> {
		const cityId = city?.id ?? null;
		const brandId = branches[0].brand.id;
		const accounts = ownAccountsSection(
			await this.ownAccountService.forReport(brandId, cityId, month),
			data.posts,
		);
		const comments = summarizeComments(await this.postCommentService.forReport(brandId, cityId, month));
		const press = pressSection(await this.webMentionService.forReport(brandId, cityId, month));

		const { start, end } = monthRange(month);
		const reviews = await this.em.find(
			Review,
			{ venue: { $in: branches.map(b => b.id) }, publishedAt: { $gte: start, $lt: end } },
			{ populate: ['feedback'] },
		);
		const platforms = reviewPlatforms(
			reviews.map(r => ({
				platform: r.platform,
				stars: r.stars,
				text: r.text,
				textTranslated: r.textTranslated,
				ownerResponse: r.ownerResponse,
				feedback: r.feedback.getItems(),
			})),
			brandRatings(branches),
		);
		if (platforms) Object.assign(data.reviews, platforms);
		const tripadvisorIds = new Set(
			reviews.filter(r => r.platform === ReviewPlatformEnum.TRIPADVISOR).map(r => r.reviewId),
		);
		for (const item of data.reviews.list ?? [])
			if (tripadvisorIds.has(item.reviewId)) item.platform = 'tripadvisor';

		return {
			...(accounts.length && { ownAccounts: accounts }),
			...(comments && { comments }),
			...(press && { press }),
		};
	}
}

const weighted = (pairs: [number | null | undefined, number | null | undefined][]) => {
	const known = pairs.filter((p): p is [number, number] => p[0] != null && p[1] != null && p[1] > 0);
	const count = _.sumBy(known, p => p[1]);
	return count ? { rating: Math.round((_.sumBy(known, p => p[0] * p[1]) / count) * 10) / 10, count } : null;
};

/**
 * The brand's all-time ratings on Google and TripAdvisor: a one-branch brand's own, a chain's
 * as all its branches' stars over all their reviews (what one rating over every review would be).
 */
export const brandRatings = (
	branches: Pick<Venue, 'rating' | 'reviewsCount' | 'tripadvisorRating' | 'tripadvisorReviewsCount'>[],
) => {
	if (branches.length === 1) return branches[0];
	const google = weighted(branches.map(b => [b.rating, b.reviewsCount]));
	const tripadvisor = weighted(branches.map(b => [b.tripadvisorRating, b.tripadvisorReviewsCount]));
	return {
		rating: google?.rating,
		reviewsCount: google?.count,
		tripadvisorRating: tripadvisor?.rating,
		tripadvisorReviewsCount: tripadvisor?.count,
	};
};
