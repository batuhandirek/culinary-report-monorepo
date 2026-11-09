// Items in the shape `apify/instagram-scraper` returns for tag URLs (run L64v2IAwR17ltt37c):
// a carousel under one tag (and again under a second), a post with hidden likes, an old pinned post
// that passes the actor's date filter, an empty tag's charged error item, and a reel.

export const tagUrl = (tag: string) => `https://www.instagram.com/explore/tags/${tag}/`;

export const post = {
	inputUrl: tagUrl('berlinbrunch'),
	id: '3990457345116769680',
	type: 'Sidecar',
	productType: 'carousel_container',
	shortCode: 'Ddg89AjCI2Q',
	url: 'https://www.instagram.com/p/Ddg89AjCI2Q/',
	timestamp: '2026-09-14T09:12:00.000Z',
	caption:
		'Sunday brunch at @cafe.yohaku 🥞 the matcha pancakes are unreal #berlinbrunch #berlinfoodie',
	hashtags: ['berlinbrunch', 'berlinfoodie'],
	mentions: ['cafe.yohaku'],
	likesCount: 812,
	commentsCount: 37,
	ownerUsername: 'brunchgirl.berlin',
	ownerFullName: 'Brunch Girl',
	ownerId: '51234567',
	paidPartnership: false,
	isPinned: false,
	locationName: 'Café YOHAKU ',
	locationId: '1234',
	coauthorProducers: [
		{ id: '777', username: 'cafe.yohaku', full_name: 'Café YOHAKU', is_verified: false },
	],
};
export const hiddenLikes = {
	...post,
	id: '3991000000000000001',
	type: 'Image',
	productType: 'feed',
	shortCode: 'DdhAAAAAAAA',
	url: 'https://www.instagram.com/p/DdhAAAAAAAA/',
	timestamp: '2026-09-20T18:00:00.000Z',
	caption: 'Invited by @zimtschnecke.berlin #ad',
	hashtags: ['ad'],
	mentions: ['zimtschnecke.berlin'],
	likesCount: -1,
	paidPartnership: true,
	locationName: undefined,
	locationId: undefined,
	coauthorProducers: undefined,
};
// A pinned post passes the actor's date filter
export const oldPinned = {
	...post,
	id: '3800000000000000000',
	url: 'https://www.instagram.com/p/OLD/',
	timestamp: '2026-05-01T00:00:00.000Z',
	isPinned: true,
};
// A tag with nothing to show returns one (charged) error item
export const emptyTag = {
	inputUrl: tagUrl('berlincafe'),
	error: 'no_items',
	errorDescription: 'Empty or private data for provided input',
};
// The reels run (resultsType "reels"): the tag's top reels, none of them in the feed
export const reel = {
	inputUrl: tagUrl('brunchberlin'),
	id: '3992000000000000002',
	type: 'Video',
	productType: 'clips',
	shortCode: 'DdiREEL0000',
	url: 'https://www.instagram.com/p/DdiREEL0000/',
	timestamp: '2026-09-22T11:00:00.000Z',
	caption: 'Best cardamom bun in town',
	hashtags: [],
	mentions: [],
	likesCount: 2400,
	commentsCount: 51,
	videoPlayCount: 116556,
	igPlayCount: 116556,
	ownerUsername: 'jounisto',
	paidPartnership: false,
	isPinned: false,
	taggedUsers: [{ id: '9', username: 'zeitundraum.berlin', full_name: 'Zeit und Raum' }],
};

// The city's Instagram hashtags: one is turned off
export const INSTAGRAM_HASHTAGS = ['berlinbrunch', 'brunchberlin', 'berlincafe', 'berlinbakery'];
