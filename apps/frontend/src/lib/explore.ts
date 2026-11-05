// The Explore page's view ("who talked about X"): everything it shows is in the URL, so a view is
// a link (from a theme row, a claim's aspect, a brand page). Defaults stay out of the URL.

/** A topic's key, or `term:<key>` for a wording */
export type ExploreRef = string;

export const EXPLORE_SIDES = ['praise', 'complaints', 'noted', 'changes', 'unread'] as const;
export type ExploreSide = (typeof EXPLORE_SIDES)[number];

export const EXPLORE_DIMENSIONS = ['brand', 'venue', 'place', 'food', 'aspect', 'district', 'source', 'term', 'month', 'kind', 'subject', 'side'] as const;
export type ExploreDimension = (typeof EXPLORE_DIMENSIONS)[number];

/** One view: the scope, the node, the further nodes and the filters */
export interface ExploreView {
	cityId?: string;
	brandId?: string;
	venueId?: string;
	district?: string;
	/** The brands of one kind of place (their main food), a topic's key */
	place?: string;
	from?: string;
	to?: string;
	node?: ExploreRef;
	with?: ExploreRef[];
	side?: ExploreSide;
	kind?: string;
	source?: string;
	subject?: string;
}

/** The view's fields in the order the URL lists them; `with` is comma-separated */
const KEYS = ['node', 'with', 'cityId', 'brandId', 'venueId', 'district', 'place', 'from', 'to', 'side', 'kind', 'source', 'subject'] as const;

export const viewOf = (params: Pick<URLSearchParams, 'get'>): ExploreView => {
	const get = (key: string) => params.get(key) || undefined;
	const side = get('side');
	return {
		cityId: get('cityId'),
		brandId: get('brandId'),
		venueId: get('venueId'),
		district: get('district'),
		place: get('place'),
		from: get('from'),
		to: get('to'),
		node: get('node'),
		with: get('with')?.split(',').filter(Boolean),
		side: EXPLORE_SIDES.find((s) => s === side),
		kind: get('kind'),
		source: get('source'),
		subject: get('subject')
	};
};

/** `/admin/explore?…` for a view; empty fields left out */
export const exploreHref = (view: ExploreView): string => {
	const params = new URLSearchParams();
	for (const key of KEYS) {
		const value = view[key];
		if (Array.isArray(value)) {
			if (value.length) params.set(key, value.join(','));
		} else if (value) params.set(key, value);
	}
	const query = params.toString();
	return `/admin/explore${query ? `?${query}` : ''}`;
};

/**
 * Explore opened on one topic (an aspect, a kind of food) for a city and a month, on one side:
 * what a claim's aspect, a theme row or a topic page links to
 */
export const exploreTopicHref = (
	ref: ExploreRef,
	at: { cityId?: string; month?: string; side?: ExploreSide; brandId?: string; venueId?: string } = {}
) =>
	exploreHref({
		node: ref,
		cityId: at.cityId,
		brandId: at.brandId,
		venueId: at.venueId,
		...(at.month && { from: at.month, to: at.month }),
		side: at.side
	});

export const isTermRef = (ref: string) => ref.startsWith('term:');

export const SIDE_LABELS: Record<ExploreSide, string> = {
	praise: 'Praise',
	complaints: 'Complaints',
	noted: 'Noted',
	changes: 'Changes',
	unread: 'Not read yet'
};

export const SOURCE_LABELS: Record<string, string> = {
	review: 'Reviews',
	post: 'Posts',
	google_review: 'Google reviews',
	tripadvisor_review: 'TripAdvisor reviews',
	tiktok: 'TikTok',
	instagram: 'Instagram',
	blog: 'Blog articles',
	comment: 'Comments',
	press: 'Press'
};

export const SUBJECT_LABELS: Record<string, string> = { place: 'About a place', city: 'About the city', none: 'About nothing in particular' };
