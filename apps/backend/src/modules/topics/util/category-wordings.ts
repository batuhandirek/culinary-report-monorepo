// Pure: the Google categories that are wordings of their own (`Term`), read whole.

import { normalizeCuisine } from 'src/modules/venues/util/cuisine.js';
import { termKey } from 'src/modules/venues/util/dishes.js';
import { isFoodVenue } from 'src/modules/venues/util/venue-names.js';

/** Every category the venues carry, main or other, with its venues, most carried first */
export const CATEGORY_ROWS_SQL = `select c as category, count(distinct v.id)::int as venues from venues v,
	lateral (select v.category as c union select jsonb_array_elements_text(coalesce(v.categories, '[]'::jsonb))) x
	where c is not null group by c order by 2 desc, 1`;

export interface CategoryWording {
	key: string;
	/** As Google writes it (the most carried spelling of its key) */
	name: string;
	venues: number;
}

/**
 * The categories that name food or drink, once per `termKey`, most carried first: a hotel or a
 * dance school a scrape found is no kind of food (`isFoodVenue`), and "Restaurant" alone says
 * nothing (`normalizeCuisine` keeps nothing of it).
 */
export const categoryWordingsOf = (rows: { category: string; venues: number }[]): CategoryWording[] => {
	const out = new Map<string, CategoryWording>();
	for (const { category, venues } of rows) {
		if (!isFoodVenue(category) || !normalizeCuisine(category)) continue;
		const key = termKey(category);
		if (!key) continue;
		const known = out.get(key);
		if (known) known.venues += venues;
		else out.set(key, { key, name: category.trim(), venues });
	}
	return [...out.values()].sort((a, b) => b.venues - a.venues || a.key.localeCompare(b.key));
};
