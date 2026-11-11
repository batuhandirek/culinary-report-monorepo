import { FilterQuery, QueryOrder, wrap } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Controller, UseGuards } from '@nestjs/common';

import { TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import { tags } from 'typia';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';
import { STATEMENT_POPULATE } from 'src/modules/statements/util/statement-populate.js';

import {
	AdminBranchReviewOutputDto,
	AdminListReviewsInputDto,
	AdminListReviewsOutputDto,
	AdminReviewDetailOutputDto,
} from '../dto/admin-venue.output.dto.js';
import { Review, ReviewPlatformEnum } from '../entities/review.entity.js';
import { dayRange, monthRange } from '../util/month.js';

/** Reviews across a brand's branches (the brand page) or of one branch, and one review on its own page. */
@Controller('/admin/reviews')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminReviewsController {
	constructor(private readonly em: EntityManager) {}

	@TypedRoute.Get()
	async listReviews(@TypedQuery() query: AdminListReviewsInputDto): Promise<AdminListReviewsOutputDto> {
		const filters: FilterQuery<Review> = {};
		const venue: Record<string, unknown> = {};
		if (query.brandId) venue.brand = query.brandId;
		if (query.cityId) venue.city = query.cityId;
		if (Object.keys(venue).length) filters.venue = venue;
		if (query.venueId) filters.venue = { ...venue, id: query.venueId };
		if (query.month) {
			const { start, end } = monthRange(query.month);
			filters.publishedAt = { $gte: start, $lt: end };
		}
		const days = dayRange(query.from, query.to);
		if (days) filters.publishedAt = { ...(filters.publishedAt as object | undefined), ...days };
		if (query.stars) filters.stars = query.stars;
		if (query.platform) filters.platform = query.platform as ReviewPlatformEnum;
		if (query.needsReply) {
			Object.assign(filters, {
				stars: { $lte: 3 },
				ownerResponse: null,
				markedRepliedAt: null,
				$or: [{ text: { $ne: null } }, { textTranslated: { $ne: null } }],
			});
		}
		const [items, totalItems] = await this.em.findAndCount(Review, filters, {
			populate: ['venue', ...STATEMENT_POPULATE],
			orderBy: query.needsReply ? { stars: QueryOrder.ASC, publishedAt: QueryOrder.DESC } : { publishedAt: QueryOrder.DESC },
			offset: (query.page - 1) * query.size,
			limit: query.size,
		});
		return {
			items: items.map(review => this.branchReview(review)),
			totalItems,
			page: query.page,
			pageSize: query.size,
		};
	}

	/** One review with its branch, brand and city and every claim it made (`/admin/reviews/[id]`) */
	@TypedRoute.Get(':id')
	async getReview(@TypedParam('id') id: string & tags.Format<'uuid'>): Promise<AdminReviewDetailOutputDto> {
		const review = await this.em.findOneOrFail(
			Review,
			{ id },
			{ populate: ['venue', 'venue.brand', 'venue.city', ...STATEMENT_POPULATE] },
		);
		return {
			...this.branchReview(review),
			brand: { id: review.venue.brand.id, name: review.venue.brand.name },
			city: { id: review.venue.city.id, name: review.venue.city.name },
		};
	}

	/** A review as a row: its fields and claims, the branch it is about in place of its venue */
	private branchReview(review: Review): AdminBranchReviewOutputDto {
		const plain = wrap(review).serialize({
			skipNull: true,
			forceObject: true,
			populate: [...STATEMENT_POPULATE],
		}) as unknown as Omit<AdminBranchReviewOutputDto, 'branch'>;
		const { venue: _venue, ...rest } = plain as typeof plain & { venue?: unknown };
		return {
			...rest,
			branch: {
				id: review.venue.id,
				name: review.venue.name,
				...(review.venue.street && { street: review.venue.street }),
				...(review.venue.district && { district: review.venue.district }),
			},
		};
	}
}
