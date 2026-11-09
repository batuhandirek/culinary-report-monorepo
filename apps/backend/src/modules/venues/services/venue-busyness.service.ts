import { QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import type { GooglePlaceItem } from 'src/modules/apify/actors/google-places.actor.js';
import { ApifyService } from 'src/modules/apify/services/apify.service.js';

import { Venue } from '../entities/venue.entity.js';
import { VenueBusyness } from '../entities/venue-busyness.entity.js';
import { busynessIndex } from '../util/busyness.js';
import { venueDetailsFromItem } from '../util/venue-details.js';

/** The one writer of `VenueBusyness`: Google popular times sampled twice a week. */
@Injectable()
export class VenueBusynessService {
	constructor(
		private readonly em: EntityManager,
		private readonly apifyService: ApifyService,
	) {}

	/**
	 * The sample of a detail-page run (`places.run`, which refreshed `Venue.details` and the day's
	 * rating snapshot as it saved): its items read from the run's row, one row per venue the run
	 * returned with the histogram, its index and the live percent, or a null histogram when Google
	 * showed no popular times. The save step of `sample-busyness`. Flushes.
	 */
	async saveSample(
		venues: Pick<Venue, 'id' | 'placeId'>[],
		recordId: string,
		now = new Date(),
	): Promise<{ requested: number; sampled: number; withPopularTimes: number; withLive: number }> {
		const byPlace = new Map(venues.map(venue => [venue.placeId, venue.id]));
		if (byPlace.size === 0)
			return { requested: 0, sampled: 0, withPopularTimes: 0, withLive: 0 };
		const items = await this.apifyService.storedItems<GooglePlaceItem>(recordId);

		let sampled = 0;
		let withPopularTimes = 0;
		let withLive = 0;
		const seen = new Set<string>();
		for (const item of items) {
			const venueId = item.placeId && byPlace.get(item.placeId);
			if (!venueId || seen.has(venueId)) continue;
			seen.add(venueId);
			const histogram = venueDetailsFromItem(item).popularTimesHistogram ?? null;
			const livePercent = item.popularTimesLivePercent ?? null;
			this.em.create(VenueBusyness, {
				venue: this.em.getReference(Venue, venueId),
				sampledAt: now,
				histogram,
				busynessIndex: busynessIndex(histogram),
				livePercent,
				liveText: item.popularTimesLiveText || null,
			});
			sampled++;
			if (histogram) withPopularTimes++;
			if (livePercent !== null) withLive++;
		}
		await this.em.flush();
		return { requested: byPlace.size, sampled, withPopularTimes, withLive };
	}

	/** A venue's (or several venues') samples in `[from, to)`, oldest first. */
	async between(venueIds: string | string[], from: Date, to: Date): Promise<VenueBusyness[]> {
		if (Array.isArray(venueIds) && venueIds.length === 0) return [];
		return this.em.find(
			VenueBusyness,
			{
				venue: Array.isArray(venueIds) ? { $in: venueIds } : venueIds,
				sampledAt: { $gte: from, $lt: to },
			},
			{ orderBy: { sampledAt: QueryOrder.ASC } },
		);
	}

	/** A venue's latest samples, newest first. */
	async latest(venueId: string, limit = 12): Promise<VenueBusyness[]> {
		return this.em.find(
			VenueBusyness,
			{ venue: venueId },
			{ orderBy: { sampledAt: QueryOrder.DESC }, limit },
		);
	}
}
