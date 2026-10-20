#!/usr/bin/env node
/**
 * One-off: fills `venues.details` from Google Maps items the old scripts repo saved as JSON
 * (`compass/crawler-google-places` datasets), so hours, amenities and star distributions show
 * without paying for a scrape. These are list-scrape items: no popular times, menu, delivery
 * platforms or "people also search" — the monthly REFRESH_VENUE_DETAILS step adds those.
 *
 *     node bin/backfill-venue-details.mjs ../culinary-report/datasets/google-places/*.json ../culinary-report/datasets/google-places-lookup/*.json
 *
 * Uses the backend's own `venueDetailsFromItem` / `mergeVenueDetails` (build the backend first),
 * merges each place's items oldest first, and only fills venues whose details are still empty,
 * so it never overwrites what a scrape stored. Pipes into the dev database container.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import {
	mergeVenueDetails,
	venueDetailsFromItem,
} from '../apps/backend/dist/modules/venues/util/venue-details.js';

const CONTAINER = 'culinary-report-dev-db';
const PSQL = ['exec', '-i', CONTAINER, 'psql', '-U', 'postgres', '-d', 'culinary_report', '-v', 'ON_ERROR_STOP=1', '-qtA'];

const files = process.argv.slice(2);
if (files.length === 0) {
	console.error('usage: node bin/backfill-venue-details.mjs <dataset.json>…');
	process.exit(1);
}

const items = files
	.flatMap(file => JSON.parse(readFileSync(file, 'utf8')))
	.filter(item => item?.placeId)
	.sort((a, b) => String(a.scrapedAt ?? '').localeCompare(String(b.scrapedAt ?? '')));

const byPlace = new Map();
for (const item of items) {
	const current = byPlace.get(item.placeId);
	const details = mergeVenueDetails(current?.details, venueDetailsFromItem(item));
	if (details) byPlace.set(item.placeId, { details, at: item.scrapedAt ?? new Date().toISOString() });
}

const csv = value => `"${String(value).replaceAll('"', '""')}"`;
const rows = [...byPlace].map(([placeId, { details, at }]) =>
	[placeId, JSON.stringify(details), at].map(csv).join(','),
);
const sql = `
create temp table backfill (place_id text, details jsonb, details_at timestamptz);
copy backfill from stdin with (format csv);
${rows.join('\n')}
\\.
with filled as (
	update venues set details = backfill.details, details_at = backfill.details_at
	from backfill
	where backfill.place_id = venues.place_id and venues.details is null
	returning 1
)
select count(*) from filled;
`;
const filled = execFileSync('docker', PSQL, { input: sql, encoding: 'utf8' }).trim();
console.log(`${items.length} items, ${byPlace.size} places with details, ${filled} venues filled`);
