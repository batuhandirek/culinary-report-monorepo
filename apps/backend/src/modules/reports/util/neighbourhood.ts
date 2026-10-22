import { VenueStatusChangeKindEnum } from 'src/modules/venues/constants/venue-status.constant.js';
import { streetName, VenueStatusChangeRow } from 'src/modules/venues/util/venue-status.js';

import type { ReportNeighbourhoodChanges } from '../interfaces/report-data.interface.js';

const LISTED = 12;

const counts = (rows: VenueStatusChangeRow[]) => {
	const fromPosts = rows.filter(r => r.source === 'posts').length;
	return {
		opened: rows.filter(r => r.kind === VenueStatusChangeKindEnum.OPENED).length,
		closed: rows.filter(
			r =>
				r.kind === VenueStatusChangeKindEnum.TEMPORARILY_CLOSED ||
				r.kind === VenueStatusChangeKindEnum.PERMANENTLY_CLOSED,
		).length,
		reopened: rows.filter(r => r.kind === VenueStatusChangeKindEnum.REOPENED).length,
		...(fromPosts ? { openedFromPosts: fromPosts } : {}),
	};
};

/**
 * The district's openings and closures for the report: counts for the district and for the
 * venue's street, and the venues, the street's first. `rows` are the other venues' changes in
 * the window, newest first: the scrapes' and the openings a post flagged (source `posts`, an
 * opening only), which `opened` counts and `openedFromPosts` names.
 */
export const neighbourhoodChanges = (
	venue: { district: string; street?: string | null },
	window: { from: string; to: string },
	rows: VenueStatusChangeRow[],
): ReportNeighbourhoodChanges => {
	const street = streetName(venue.street);
	const onStreet = (r: VenueStatusChangeRow) => !!street && streetName(r.street) === street;
	const ordered = [...rows.filter(onStreet), ...rows.filter(r => !onStreet(r))];
	return {
		from: window.from,
		to: window.to,
		district: venue.district,
		...counts(rows),
		street:
			street ?
				{
					name: venue.street!.replace(/\s+\d.*$/, '').trim(),
					...counts(rows.filter(onStreet)),
				}
			:	undefined,
		venues: ordered.slice(0, LISTED).map(r => ({
			venueId: r.venueId,
			name: r.name,
			category: r.category,
			street: r.street,
			kind: r.kind,
			date: r.at.toISOString().slice(0, 10),
			sameStreet: onStreet(r),
			...(r.source === 'posts' ? { source: 'posts' as const } : {}),
		})),
	};
};
