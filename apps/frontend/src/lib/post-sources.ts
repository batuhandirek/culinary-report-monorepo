import { AdminPostFindOutputDtoKindEnum as Kind } from 'client';

/** One find of a post, as the admin reads it: a tag with its #, a query, a blog's host, a venue's search or place page. */
export const findLabel = (find: { kind: unknown; value: string; venue?: { name: string } }): string => {
	switch (`${find.kind}`) {
		case Kind.TiktokHashtag:
			return `#${find.value}`;
		case Kind.InstagramHashtag:
			return `#${find.value} (Instagram)`;
		case Kind.TiktokSearch:
			return `search: ${find.value}`;
		case Kind.Blog:
			try {
				return new URL(find.value).host;
			} catch {
				return find.value;
			}
		case Kind.VenueSearch:
			return `${find.venue?.name ?? find.value} (venue search)`;
		case Kind.VenuePlace:
			return `${find.venue?.name ?? find.value} (place page)`;
		default:
			return find.value;
	}
};

/** Where a find leads: the city's Sources tab for one of its sources, the venue for a venue's search or place page. */
export const findHref = (
	find: { kind: unknown; source?: { id: string }; venue?: { id: string } },
	cityId: string
): string | undefined => {
	if (find.source) return `/admin/cities/${cityId}?tab=sources`;
	if (find.venue && (`${find.kind}` === Kind.VenueSearch || `${find.kind}` === Kind.VenuePlace))
		return `/admin/venues/${find.venue.id}`;
	return undefined;
};

