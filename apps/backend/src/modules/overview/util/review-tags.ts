// Pure: Google's "people often mention" tags of a brand's places, summed.

import _ from 'lodash';

import type { Venue } from 'src/modules/venues/entities/venue.entity.js';

/** Google's review tags of these places, summed by title (case and accents aside), most first. */
export const reviewTags = (venues: Pick<Venue, 'details'>[], limit = 12): { title: string; count: number }[] => {
	const byKey = new Map<string, { title: string; count: number }>();
	for (const venue of venues) {
		for (const tag of venue.details?.reviewsTags ?? []) {
			const key = tag.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
			const entry = byKey.get(key) ?? { title: tag.title, count: 0 };
			entry.count += tag.count;
			byKey.set(key, entry);
		}
	}
	return _.orderBy([...byKey.values()], ['count', 'title'], ['desc', 'asc']).slice(0, limit);
};
