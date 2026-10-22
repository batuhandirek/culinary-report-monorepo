import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import type { City } from 'src/modules/cities/entities/city.entity.js';

import { OsmPlace } from '../entities/osm-place.entity.js';
import { Venue } from '../entities/venue.entity.js';
import {
	matchOsmPlace,
	osmLookupOrder,
	osmPlaceFields,
	osmSearchString,
	VenueGrid,
} from '../util/osm-places.js';
import { cityStopwords } from '../util/venue-names.js';

import { OverpassService } from './overpass.service.js';
import { VenueScrapeService } from './venue-scrape.service.js';

// What a Google Maps list result costs on Apify's Free plan (Berlin lookups, 2026-10-18/19)
export const PLACE_RESULT_USD = 0.004;
// Of the budget, what the searches are planned on: Apify stops a run at its cap, and a place
// whose search the cap cut would still count as looked up
const BUDGET_HEADROOM = 0.8;
// Rows written per flush
const FLUSH_EVERY = 1000;

export interface OsmCoverage {
	/** Places the last sync listed */
	listed: number;
	/** Of those, the ones linked to a venue */
	matched: number;
	/** Not linked and searched on Google Maps already: Google had nothing that close and alike */
	notFound: number;
	/** Not linked and never searched: what `lookup` spends on */
	toLookUp: number;
}

/**
 * OpenStreetMap's food places as a checklist for the venue list: the one writer of `OsmPlace`.
 * `sync` lists the city's places (free), links each to the venue it is, and `lookup` searches
 * Google Maps for the ones no venue is, so the venue list fills from Google, place by place.
 */
@Injectable()
export class OsmPlaceService {
	private readonly logger = new Logger(OsmPlaceService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly overpassService: OverpassService,
		private readonly venueScrapeService: VenueScrapeService,
	) {}

	/**
	 * Stores every food place OSM lists inside the city's boundary (`City.osmRelationId`),
	 * updating the ones it had, then links the unlinked ones to venues (`match`). A place OSM no
	 * longer lists keeps its row with its old `seenAt`. Flushes.
	 */
	async sync(
		city: City,
		now = new Date(),
	): Promise<{ added: number; updated: number; gone: number } & OsmCoverage> {
		if (!city.osmRelationId)
			throw new Error(
				`${city.name} has no OpenStreetMap relation id: set it on the city page`,
			);
		const fields = (await this.overpassService.foodPlaces(city.osmRelationId))
			.map(osmPlaceFields)
			.filter(f => f !== null);
		// Overpass can list one element twice (a node inside two matching groups)
		const byKey = new Map(fields.map(f => [f.osmKey, f]));

		const existing = new Map(
			(await this.em.find(OsmPlace, { city })).map(p => [p.osmKey, p] as const),
		);
		let added = 0;
		let updated = 0;
		for (const f of byKey.values()) {
			const place = existing.get(f.osmKey);
			if (place) {
				this.em.assign(place, { ...f, seenAt: now });
				updated++;
			} else {
				this.em.create(OsmPlace, { ...f, city, seenAt: now });
				added++;
			}
			if ((added + updated) % FLUSH_EVERY === 0) await this.em.flush();
		}
		city.osmPlacesSyncedAt = now;
		await this.em.flush();

		const gone = [...existing.keys()].filter(k => !byKey.has(k)).length;
		await this.match(city);
		const coverage = await this.coverage(city);
		this.logger.log(
			`OSM ${city.name}: ${byKey.size} places (${added} new, ${gone} gone), ${coverage.matched} matched, ${coverage.toLookUp} to look up`,
		);
		return { added, updated, gone, ...coverage };
	}

	/**
	 * Links each of the last sync's unlinked places to the venue it is (`matchOsmPlace`: close
	 * and named alike), among every venue of the city with a position, closed ones too (a known
	 * place needs no search). A link, once made, stays. Flushes.
	 */
	async match(city: City): Promise<{ matched: number }> {
		const places = await this.em.find(OsmPlace, { ...this.listed(city), venue: null });
		if (places.length === 0) return { matched: 0 };
		const venues = await this.em.find(
			Venue,
			{ city, lat: { $ne: null }, lng: { $ne: null } },
			{ fields: ['id', 'name', 'lat', 'lng'] },
		);
		const grid = new VenueGrid(
			venues.map(v => ({ id: v.id, name: v.name, lat: v.lat!, lng: v.lng! })),
		);
		const words = cityStopwords(city.nameStopwords);
		let matched = 0;
		for (const place of places) {
			const venueId = matchOsmPlace(place, grid, words);
			if (!venueId) continue;
			place.venue = this.em.getReference(Venue, venueId);
			matched++;
		}
		await this.em.flush();
		return { matched };
	}

	/**
	 * Searches Google Maps for the last sync's places no venue is and that were never searched
	 * (`osmLookupOrder`, as many as `budgetUsd` covers at one result each: their name and
	 * address, `osmSearchString`), saves what Google returns (`searchPlaces`), stamps
	 * `lookedUpAt` and links them (`match`). Flushes.
	 */
	async lookup(
		city: City,
		budgetUsd: number,
		now = new Date(),
	): Promise<{ searched: number; found: number; saved: number; linked: number } & OsmCoverage> {
		const room = Math.floor((budgetUsd * BUDGET_HEADROOM) / PLACE_RESULT_USD);
		const due = osmLookupOrder(
			await this.em.find(OsmPlace, { ...this.listed(city), venue: null, lookedUpAt: null }),
		).slice(0, room);

		let found = 0;
		let saved = 0;
		let linked = 0;
		if (due.length) {
			const searches = [...new Set(due.map(p => osmSearchString(p, city.name)))];
			const result = await this.venueScrapeService.searchPlaces(
				city,
				searches,
				1,
				budgetUsd,
				`google-places OSM gaps ${city.name}: ${searches.length} places`,
			);
			found = result.items.length;
			saved = result.saved;
			for (const place of due) place.lookedUpAt = now;
			await this.em.flush();
			linked = (await this.match(city)).matched;
		}
		const coverage = await this.coverage(city);
		this.logger.log(
			`OSM lookups ${city.name}: ${due.length} searched, ${linked} now matched, ${coverage.toLookUp} left`,
		);
		return { searched: due.length, found, saved, linked, ...coverage };
	}

	/** How much of what OSM lists the venue list has: the last sync's places by state. */
	async coverage(city: City): Promise<OsmCoverage> {
		const where = this.listed(city);
		const listed = await this.em.count(OsmPlace, where);
		const matched = await this.em.count(OsmPlace, { ...where, venue: { $ne: null } });
		const notFound = await this.em.count(OsmPlace, {
			...where,
			venue: null,
			lookedUpAt: { $ne: null },
		});
		return { listed, matched, notFound, toLookUp: listed - matched - notFound };
	}

	// The places the city's last sync listed: the ones OSM still has
	private listed(city: City) {
		return {
			city,
			...(city.osmPlacesSyncedAt && { seenAt: { $gte: city.osmPlacesSyncedAt } }),
		};
	}
}
