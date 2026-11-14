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

// What a Google Maps list result costs on Apify's Free plan (Berlin lookups, 2026-10-18/19)
export const PLACE_RESULT_USD = 0.004;
// Of the budget, what the searches are planned on: Apify stops a run at its cap, and a place
// whose search the cap cut would still count as looked up
const BUDGET_HEADROOM = 0.8;
// Rows written per flush
const FLUSH_EVERY = 1000;
// Of the places the last sync listed, the share a new answer must hold: a city's food places do
// not halve in a month, so a shorter list is an answer cut short, never the city
const MIN_LISTED_SHARE = 0.5;

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
 * `sync` lists the city's places (free), links each to the venue it is, and the `osm-places`
 * operation searches Google Maps for the ones no venue is (`planLookups`, the `places` atom,
 * `saveLookups`), so the venue list fills from Google, place by place.
 */
@Injectable()
export class OsmPlaceService {
	private readonly logger = new Logger(OsmPlaceService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly overpassService: OverpassService,
	) {}

	/**
	 * Stores every food place OSM lists inside the city's boundary (`City.osmRelationId`),
	 * updating the ones it had, then links the unlinked ones to venues (`match`). A place OSM no
	 * longer lists keeps its row with its old `seenAt`. Throws, with nothing written, when
	 * Overpass lists no place or under `MIN_LISTED_SHARE` of the last sync's. Flushes.
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

		// Stored, an empty or cut-short answer would stamp the city synced with its places unseen:
		// they would count as gone, and none would be linked or looked up until a sync lists them
		const before = await this.em.count(OsmPlace, this.listed(city));
		if (byKey.size === 0 || byKey.size < before * MIN_LISTED_SHARE)
			throw new Error(
				`Overpass listed ${byKey.size} food places for ${city.name} against ${before} at the last sync: nothing stored, the checklist stays as it was`,
			);

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
	 * The last sync's places no venue is and that were never searched (`osmLookupOrder`, as many
	 * as `budgetUsd` covers at one result each), each as its Google Maps search (its name and
	 * address, `osmSearchString`): the plan step of `osm-places`, before the `places.run` child
	 * (typed searches, one place each); `saveLookups` the step after it.
	 */
	async planLookups(
		city: City,
		budgetUsd: number,
	): Promise<{ osmPlaceIds: string[]; queries: string[] }> {
		const room = Math.floor((budgetUsd * BUDGET_HEADROOM) / PLACE_RESULT_USD);
		const due = osmLookupOrder(
			await this.em.find(OsmPlace, { ...this.listed(city), venue: null, lookedUpAt: null }),
		).slice(0, room);
		return {
			osmPlaceIds: due.map(p => p.id),
			queries: [...new Set(due.map(p => osmSearchString(p, city.name)))],
		};
	}

	/**
	 * The searched places stamped `lookedUpAt` (never searched twice, even when Google had nothing
	 * that close) and linked again (`match`) now that what Google returned is saved. Flushes.
	 */
	async saveLookups(
		city: City,
		osmPlaceIds: string[],
		result: { found: number; saved: number },
		now = new Date(),
	): Promise<{ searched: number; found: number; saved: number; linked: number } & OsmCoverage> {
		let linked = 0;
		if (osmPlaceIds.length) {
			for (const place of await this.em.find(OsmPlace, { id: { $in: osmPlaceIds } }))
				place.lookedUpAt = now;
			await this.em.flush();
			linked = (await this.match(city)).matched;
		}
		const coverage = await this.coverage(city);
		this.logger.log(
			`OSM lookups ${city.name}: ${osmPlaceIds.length} searched, ${linked} now matched, ${coverage.toLookUp} left`,
		);
		return {
			searched: osmPlaceIds.length,
			found: result.found,
			saved: result.saved,
			linked,
			...coverage,
		};
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
