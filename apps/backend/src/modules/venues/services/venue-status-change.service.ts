import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import _ from 'lodash';

import { FoodTopicService } from 'src/modules/food-topics/services/food-topic.service.js';
import { VenueFoodTopicService } from 'src/modules/food-topics/services/venue-food-topic.service.js';

import { LEAD_NEW_PLACE_MONTHS } from '../constants/lead-score.constant.js';
import { VenueStatusChangeKindEnum } from '../constants/venue-status.constant.js';
import { Venue } from '../entities/venue.entity.js';
import {
	countStatusChanges,
	groupStatusChanges,
	quarterWindow,
	VenueStatusChangeRow,
	VenueStatusCounts,
	VenueStatusGroup,
} from '../util/venue-status.js';

/** A city's openings and closures over the three months ending with `month`. */
export interface VenueStatusSummary {
	/** First and last month of the window, `YYYY-MM` */
	from: string;
	to: string;
	totals: VenueStatusCounts;
	byDistrict: VenueStatusGroup[];
	/** By the venue's main food topic (`VenueFoodTopicService.tags`), else its Google category */
	byCategory: VenueStatusGroup[];
	/** Newest first */
	changes: VenueStatusChangeRow[];
}

/**
 * Reads the venues' openings and closures (`VenueStatusChange`, written only by
 * `VenueService.saveGooglePlace`): the trends panel, the report's neighbourhood line, the
 * "new venues" filter and the lead score's new-place bonus.
 */
@Injectable()
export class VenueStatusChangeService {
	constructor(
		private readonly em: EntityManager,
		private readonly foodTopicService: FoodTopicService,
		private readonly venueFoodTopicService: VenueFoodTopicService,
	) {}

	/** The city's changes in the three months ending with `month`, by district and by food. */
	async quarter(cityId: string, month: string): Promise<VenueStatusSummary> {
		const { from, start, end } = quarterWindow(month);
		const changes = await this.rows('v.city_id = ?', [cityId], start, end);
		const index = await this.foodTopicService.index();
		const venues =
			changes.length ?
				await this.em.find(Venue, { id: { $in: _.uniq(changes.map(c => c.venueId)) } })
			:	[];
		const tags = await this.venueFoodTopicService.tags(venues, index);
		const food = (venueId: string) => {
			const primary = tags.get(venueId)?.find(t => t.primary);
			return primary ? index.get(primary.key)?.label : undefined;
		};
		return {
			from,
			to: month,
			totals: countStatusChanges(changes),
			byDistrict: groupStatusChanges(changes, r => r.district),
			byCategory: groupStatusChanges(changes, r => food(r.venueId) ?? r.category),
			changes,
		};
	}

	/** Changes of the other venues in a district of the city over the window, newest first. */
	async inDistrict(
		cityId: string,
		district: string,
		exceptVenueId: string,
		from: Date,
		to: Date,
	): Promise<VenueStatusChangeRow[]> {
		return this.rows(
			'v.city_id = ? and v.district = ? and v.id <> ?',
			[cityId, district, exceptVenueId],
			from,
			to,
		);
	}

	/** Venues of the city (or every city) that opened in the last `LEAD_NEW_PLACE_MONTHS` months. */
	async newVenueIds(cityId?: string, now = new Date()): Promise<string[]> {
		const since = new Date(now);
		since.setUTCMonth(since.getUTCMonth() - LEAD_NEW_PLACE_MONTHS);
		const rows: { venue_id: string }[] = await this.em.getConnection().execute(
			`select distinct s.venue_id from venue_status_changes s join venues v on v.id = s.venue_id
				where s.kind = ? and s.at >= ?${cityId ? ' and v.city_id = ?' : ''}`,
			[VenueStatusChangeKindEnum.OPENED, since, ...(cityId ? [cityId] : [])],
		);
		return rows.map(r => r.venue_id);
	}

	private async rows(
		where: string,
		params: unknown[],
		from: Date,
		to: Date,
	): Promise<VenueStatusChangeRow[]> {
		const rows: {
			venue_id: string;
			name: string;
			district: string | null;
			category: string | null;
			street: string | null;
			kind: VenueStatusChangeKindEnum;
			at: Date;
		}[] = await this.em.getConnection().execute(
			`select s.venue_id, v.name, v.district, v.category, v.street, s.kind, s.at
				from venue_status_changes s join venues v on v.id = s.venue_id
				where ${where} and s.at >= ? and s.at < ? and v.deleted_at is null
				order by s.at desc, v.name`,
			[...params, from, to],
		);
		return rows.map(r => ({
			venueId: r.venue_id,
			name: r.name,
			district: r.district ?? undefined,
			category: r.category ?? undefined,
			street: r.street ?? undefined,
			kind: r.kind,
			at: new Date(r.at),
		}));
	}
}
