import { Injectable, Logger } from '@nestjs/common';

import { OverpassElement, overpassFoodQuery } from '../util/osm-places.js';

// Public Overpass instances, tried in turn: the main one is often at capacity (a 502 or 504)
const OVERPASS_URLS = [
	'https://overpass-api.de/api/interpreter',
	'https://overpass.private.coffee/api/interpreter',
];
// Berlin's ~14,000 places take about a minute; Overpass' own timeout is in the query
const TIMEOUT_MS = 240_000;
const QUERY_TIMEOUT_SECONDS = 180;
// Overpass asks for retries with a doubling wait when it is busy
const ATTEMPTS = 5;
const FIRST_WAIT_MS = 10_000;
const BUSY_STATUSES = new Set([429, 502, 503, 504]);

/**
 * OpenStreetMap's Overpass API: free, no key, one query per sync. Only `OsmPlaceService` calls
 * it; tests mock it.
 */
@Injectable()
export class OverpassService {
	private readonly logger = new Logger(OverpassService.name);

	/**
	 * Every food and drink place inside an OSM relation (`overpassFoodQuery`). A busy server or a
	 * dropped connection is retried on the next instance, waiting longer each time.
	 */
	async foodPlaces(relationId: number, waitMs = FIRST_WAIT_MS): Promise<OverpassElement[]> {
		const body = new URLSearchParams({
			data: overpassFoodQuery(relationId, QUERY_TIMEOUT_SECONDS),
		});
		let wait = waitMs;
		for (let attempt = 1; ; attempt++) {
			const url = OVERPASS_URLS[(attempt - 1) % OVERPASS_URLS.length];
			try {
				return await this.query(url, body);
			} catch (error) {
				if (!(error instanceof BusyError) || attempt >= ATTEMPTS) throw error;
				this.logger.warn(`${error.message}; trying again in ${wait / 1000} s`);
				await new Promise(resolve => setTimeout(resolve, wait));
				wait *= 2;
			}
		}
	}

	private async query(url: string, body: URLSearchParams): Promise<OverpassElement[]> {
		let res: Response;
		try {
			res = await fetch(url, {
				method: 'POST',
				headers: {
					'content-type': 'application/x-www-form-urlencoded',
					// Overpass asks clients to say who they are
					'user-agent': 'culinary-report/1.0 (venue checklist)',
				},
				body,
				signal: AbortSignal.timeout(TIMEOUT_MS),
			});
		} catch (error) {
			throw new BusyError(`${new URL(url).host}: ${(error as Error).message}`);
		}
		if (BUSY_STATUSES.has(res.status))
			throw new BusyError(`${new URL(url).host} answered ${res.status}`);
		if (!res.ok)
			throw new Error(`Overpass answered ${res.status}: ${(await res.text()).slice(0, 300)}`);
		const json = (await res.json()) as { elements?: OverpassElement[]; remark?: string };
		// A query Overpass cut short (its timeout, its memory) still answers 200, with a remark
		if (json.remark) throw new BusyError(`${new URL(url).host}: ${json.remark}`);
		return json.elements ?? [];
	}
}

class BusyError extends Error {}
