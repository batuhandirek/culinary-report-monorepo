import { FilterQuery, QueryOrder, wrap } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import { tags } from 'typia';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';
import { DishNameService } from 'src/modules/feedback/services/dish-name.service.js';

import { LEAD_PROSPECT_SCORE } from '../constants/lead-score.constant.js';
import { AdminUpdateVenueInputDto } from '../dto/admin-update-venue.input.dto.js';
import {
	AdminListVenueReviewsInputDto,
	AdminListVenueReviewsOutputDto,
	AdminListVenuesInputDto,
	AdminListVenuesOutputDto,
	AdminReviewOutputDto,
	AdminVenueListItemOutputDto,
	AdminVenueOutputDto,
} from '../dto/admin-venue.output.dto.js';
import { AdminVenueDemandOutputDto } from '../dto/admin-venue-demand.output.dto.js';
import { Review } from '../entities/review.entity.js';
import { Venue } from '../entities/venue.entity.js';
import { VenueBusynessService } from '../services/venue-busyness.service.js';
import { VenueDeliveryService } from '../services/venue-delivery.service.js';
import { VenueReservationService } from '../services/venue-reservation.service.js';
import { VenueStatusChangeService } from '../services/venue-status-change.service.js';
import { monthRange } from '../util/month.js';

@Controller('/admin/venues')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminVenuesController {
	constructor(
		private readonly em: EntityManager,
		private readonly venueStatusChangeService: VenueStatusChangeService,
		private readonly venueBusynessService: VenueBusynessService,
		private readonly venueReservationService: VenueReservationService,
		private readonly venueDeliveryService: VenueDeliveryService,
		private readonly dishNameService: DishNameService,
	) {}

	@TypedRoute.Get('/')
	async listVenues(
		@TypedQuery() query: AdminListVenuesInputDto,
	): Promise<AdminListVenuesOutputDto> {
		const filters: FilterQuery<Venue> = {};
		if (query.q) {
			filters.$or = [
				{ name: { $ilike: `%${query.q}%` } },
				{ street: { $ilike: `%${query.q}%` } },
				{ category: { $ilike: `%${query.q}%` } },
			];
		}
		if (query.cityId) filters.city = query.cityId;
		if (query.district) filters.district = query.district;
		if (query.prospectsOnly) filters.brand = { leadScore: { $gte: LEAD_PROSPECT_SCORE } };
		if (query.newOnly) {
			filters.$and = [
				...(filters.$and ?? []),
				{ id: { $in: await this.venueStatusChangeService.newVenueIds(query.cityId) } },
			];
		}
		if (query.mentionedOnly) {
			const rows: { venue_id: string }[] = await this.em
				.getConnection()
				.execute('select distinct venue_id from mentions where venue_id is not null');
			filters.id = { $in: rows.map(r => r.venue_id) };
		}

		const [field, order] = (query.sort ?? 'mentionCount:desc').split(':') as [
			keyof Venue | 'leadScore',
			'asc' | 'desc',
		];
		const direction = order === 'asc' ? QueryOrder.ASC_NULLS_LAST : QueryOrder.DESC_NULLS_LAST;
		const [items, totalItems] = await this.em.findAndCount(Venue, filters, {
			populate: ['mentionCount', 'favicon', 'brand'],
			// The lead score is the brand's
			orderBy: field === 'leadScore' ? { brand: { leadScore: direction }, name: QueryOrder.ASC } : { [field]: direction, name: QueryOrder.ASC },
			offset: (query.page - 1) * query.size,
			limit: query.size,
		});

		return {
			items: items.map(venue => ({
				...(wrap(venue).serialize({
					skipNull: true,
					forceObject: true,
					populate: ['favicon', 'brand'],
				}) as unknown as Omit<AdminVenueListItemOutputDto, 'mentionCount'>),
				mentionCount: venue.mentionCount ?? 0,
			})),
			totalItems,
			page: query.page,
			pageSize: query.size,
		};
	}

	@TypedRoute.Get('/:id')
	async getVenue(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
	): Promise<AdminVenueOutputDto> {
		const venue = await this.em.findOneOrFail(
			Venue,
			{ id },
			{
				populate: ['mentionCount', 'snapshots', 'city', 'favicon', 'brand'],
				populateOrderBy: { snapshots: { snapshotDate: QueryOrder.ASC } },
			},
		);
		const [branches, topics] = await Promise.all([
			this.em.count(Venue, { brand: venue.brand }),
			this.dishNameService.reviewTagTopics((venue.details?.reviewsTags ?? []).map(t => t.title)),
		]);
		const serialized = wrap(venue).serialize({
			skipNull: true,
			forceObject: true,
			populate: ['snapshots', 'city', 'favicon', 'brand'],
		}) as unknown as Omit<AdminVenueOutputDto, 'mentionCount'>;
		return {
			...serialized,
			brand: { ...serialized.brand, branches },
			mentionCount: venue.mentionCount ?? 0,
			reviewTagTopics: [...topics].map(([title, topic]) => ({ title, ...topic })),
		};
	}

	/** Edits the fields an admin sets by hand (today the booking-platform link). */
	@TypedRoute.Patch('/:id')
	async updateVenue(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedBody() body: AdminUpdateVenueInputDto,
	): Promise<AdminVenueOutputDto> {
		if (body.bookingUrl !== undefined)
			await this.venueReservationService.setBookingUrl(id, body.bookingUrl);
		return this.getVenue(id);
	}

	@TypedRoute.Get('/:id/reviews')
	async listVenueReviews(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedQuery() query: AdminListVenueReviewsInputDto,
	): Promise<AdminListVenueReviewsOutputDto> {
		const filters: FilterQuery<Review> = { venue: id };
		if (query.month) {
			const { start, end } = monthRange(query.month);
			filters.publishedAt = { $gte: start, $lt: end };
		}
		const [items, totalItems] = await this.em.findAndCount(Review, filters, {
			populate: ['feedback', 'feedback.foodTopic', 'feedback.aspect', 'feedback.aspect.parent'],
			orderBy: { publishedAt: QueryOrder.DESC },
			offset: (query.page - 1) * query.size,
			limit: query.size,
		});
		return {
			items: items.map(
				review =>
					wrap(review).serialize({
						skipNull: true,
						forceObject: true,
						populate: ['feedback', 'feedback.foodTopic', 'feedback.aspect', 'feedback.aspect.parent'],
					}) as unknown as AdminReviewOutputDto,
			),
			totalItems,
			page: query.page,
			pageSize: query.size,
		};
	}

	/** The venue's busyness samples, open-table samples and delivery listings, newest first. */
	@TypedRoute.Get('/:id/demand')
	async getVenueDemand(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
	): Promise<AdminVenueDemandOutputDto> {
		const [busyness, reservations] = [
			await this.venueBusynessService.latest(id, 12),
			await this.venueReservationService.latest(id, 16),
		];
		const menus = await this.venueDeliveryService.menus([id], '9999-12');
		const plain = <T extends object>(entity: T) =>
			wrap(entity).serialize({ skipNull: true, forceObject: true });
		return {
			busyness: busyness.map(plain) as AdminVenueDemandOutputDto['busyness'],
			reservations: reservations.map(plain) as AdminVenueDemandOutputDto['reservations'],
			delivery: menus.map(m => ({
				...(plain(m.listing) as Omit<
					AdminVenueDemandOutputDto['delivery'][number],
					'menuItems' | 'menuMonth'
				>),
				...(m.month && { menuMonth: m.month }),
				menuItems: m.items.length,
			})),
		};
	}
}
