import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

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
	 * The sections this venue has data for (the absent ones left out). Also splits
	 * `data.reviews` by platform and marks the appendix's TripAdvisor reviews, in place.
	 */
	async sections(
		venue: Venue,
		month: string,
		data: Pick<ReportData, 'posts' | 'reviews'>,
		// The report's city; null across all the brand's cities
		city: Pick<City, 'id'> | null = venue.city,
	): Promise<Pick<ReportData, 'ownAccounts' | 'comments' | 'press'>> {
		const cityId = city?.id ?? null;
		const accounts = ownAccountsSection(
			await this.ownAccountService.forReport(venue.brand.id, cityId, month),
			data.posts,
		);
		const comments = summarizeComments(
			await this.postCommentService.forReport(venue.brand.id, cityId, month),
		);
		const press = pressSection(await this.webMentionService.forReport(venue.id, month));

		const { start, end } = monthRange(month);
		const reviews = await this.em.find(Review, { venue, publishedAt: { $gte: start, $lt: end } });
		const platforms = reviewPlatforms(reviews, venue);
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
