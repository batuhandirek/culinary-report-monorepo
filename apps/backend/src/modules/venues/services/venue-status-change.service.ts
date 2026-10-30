import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import _ from 'lodash';

import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { VenueTopicService } from 'src/modules/topics/services/venue-topic.service.js';

import {
	LEAD_NEW_PLACE_MAX_REVIEWS,
	LEAD_NEW_PLACE_MONTHS,
} from '../constants/lead-score.constant.js';
import {
	VenueScrapeSourceEnum,
	VenueStatusChangeKindEnum,
} from '../constants/venue-status.constant.js';
import { Venue } from '../entities/venue.entity.js';
import { monthRange } from '../util/month.js';
import { PostOpeningRow, postOpeningsSql } from '../util/post-openings.js';
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
	/** By the venue's main food topic (`VenueTopicService.tags`), else its Google category */
	byCategory: VenueStatusGroup[];
	/** Newest first; an opening a post flagged carries the source `posts` */
	changes: VenueStatusChangeRow[];
}

interface ChangeRow {
	venue_id: string;
	name: string;
	district: string | null;
	category: string | null;
	street: string | null;
	at: Date;
}

/**
 * Reads the venues' openings and closures: the `VenueStatusChange` rows a Google Maps scrape
 * wrote (only `VenueService.saveGooglePlace` does) and, as openings with the source `posts`, the
 * venues posts by others said had just opened (`Mention.isNewOpening`) with a second signal
 * agreeing (`postOpeningsSql`): dated the first such post, the venue open and under
 * `LEAD_NEW_PLACE_MAX_REVIEWS` reviews, no row written. The trends panel,
 * the report's neighbourhood line, the "new venues" filter and the lead score's new-place bonus
 * read it.
 */
@Injectable()
export class VenueStatusChangeService {
	constructor(
		private readonly em: EntityManager,
		private readonly topicService: TopicService,
		private readonly venueTopicService: VenueTopicService,
	) {}

	/**
	 * The city's changes in the three months ending with `month`, by district and by food. The
	 * scrapes' window is shifted a week (`quarterWindow`); the posts' is the calendar months, since
	 * a post is dated the day it was made. A venue a scrape saw open in the window is listed once.
	 */
	async quarter(cityId: string, month: string): Promise<VenueStatusSummary> {
		const { from } = quarterWindow(month);
		const changes = await this.window('v.city_id = ?', [cityId], month);
		const index = await this.topicService.index();
		const venues =
			changes.length ?
				await this.em.find(Venue, { id: { $in: _.uniq(changes.map(c => c.venueId)) } })
			:	[];
		const tags = await this.venueTopicService.tags(venues);
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

	/**
	 * The other venues' changes in a district of the city over the three months ending with
	 * `month`, newest first (the report's neighbourhood line): the scrapes' rows and the openings a
	 * post flagged, on the same windows and rules as `quarter`, a venue a scrape saw open listed once.
	 */
	async inDistrict(
		cityId: string,
		district: string,
		exceptVenueId: string,
		month: string,
	): Promise<VenueStatusChangeRow[]> {
		return this.window(
			'v.city_id = ? and v.district = ? and v.id <> ?',
			[cityId, district, exceptVenueId],
			month,
		);
	}

	/**
	 * Venues of the city (or every city) that are new: an `opened` change, or posts saying they
	 * just opened with a second signal agreeing (`postOpenings`), in the last
	 * `LEAD_NEW_PLACE_MONTHS` months.
	 */
	async newVenueIds(cityId?: string, now = new Date()): Promise<string[]> {
		const since = new Date(now);
		since.setUTCMonth(since.getUTCMonth() - LEAD_NEW_PLACE_MONTHS);
		const opened: { venue_id: string }[] = await this.em.getConnection().execute(
			`select distinct s.venue_id from venue_status_changes s join venues v on v.id = s.venue_id
				where s.kind = ? and s.at >= ?${cityId ? ' and v.city_id = ?' : ''}`,
			[VenueStatusChangeKindEnum.OPENED, since, ...(cityId ? [cityId] : [])],
		);
		const flagged = await this.postOpenings(
			cityId ? 'v.city_id = ?' : 'true',
			cityId ? [cityId] : [],
			since,
		);
		return _.uniq([...opened.map(r => r.venue_id), ...flagged.map(r => r.venueId)]);
	}

	/**
	 * Scrape rows over `quarterWindow(month)` and post-flagged openings over its calendar months,
	 * newest first; a venue with an `opened` row in the window is not listed again from posts.
	 */
	private async window(
		where: string,
		params: unknown[],
		month: string,
	): Promise<VenueStatusChangeRow[]> {
		const { from, start, end } = quarterWindow(month);
		const scraped = await this.rows(where, params, start, end);
		const flagged = await this.postOpenings(
			where,
			params,
			monthRange(from).start,
			monthRange(month).end,
		);
		const opened = new Set(
			scraped.filter(c => c.kind === VenueStatusChangeKindEnum.OPENED).map(c => c.venueId),
		);
		return _.orderBy(
			[...scraped, ...flagged.filter(c => !opened.has(c.venueId))],
			[c => c.at.getTime(), c => c.name],
			['desc', 'asc'],
		);
	}

	private async rows(
		where: string,
		params: unknown[],
		from: Date,
		to: Date,
	): Promise<VenueStatusChangeRow[]> {
		const rows: (ChangeRow & {
			kind: VenueStatusChangeKindEnum;
			source: VenueScrapeSourceEnum;
		})[] = await this.em.getConnection().execute(
			`select s.venue_id, v.name, v.district, v.category, v.street, s.kind, s.at, s.source
				from venue_status_changes s join venues v on v.id = s.venue_id
				where ${where} and s.at >= ? and s.at < ? and v.deleted_at is null
				order by s.at desc, v.name`,
			[...params, from, to],
		);
		return rows.map(r => ({ ...this.row(r), kind: r.kind, source: r.source }));
	}

	/**
	 * Open venues under `LEAD_NEW_PLACE_MAX_REVIEWS` reviews whose posts by others in the window
	 * (`to` open-ended when absent) said they just opened, with a second signal agreeing
	 * (`postOpeningsSql`), dated the first such post, newest first.
	 */
	private async postOpenings(
		where: string,
		params: unknown[],
		from: Date,
		to?: Date,
	): Promise<VenueStatusChangeRow[]> {
		const rows: PostOpeningRow[] = await this.em
			.getConnection()
			.execute(postOpeningsSql(where, !!to), [
				...params,
				from,
				...(to ? [to] : []),
				LEAD_NEW_PLACE_MAX_REVIEWS,
			]);
		return rows.map(r => ({
			...this.row(r),
			kind: VenueStatusChangeKindEnum.OPENED,
			source: 'posts' as const,
		}));
	}

	private row(r: ChangeRow): Omit<VenueStatusChangeRow, 'kind' | 'source'> {
		return {
			venueId: r.venue_id,
			name: r.name,
			district: r.district ?? undefined,
			category: r.category ?? undefined,
			street: r.street ?? undefined,
			at: new Date(r.at),
		};
	}
}
