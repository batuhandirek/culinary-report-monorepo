// Items as the actors returned them for post URLs on 2026-10-25 (trimmed to the fields read):
// `clockworks/tiktok-scraper` with `postURLs`, `apify/instagram-scraper` with `directUrls` of
// posts and `resultsType: 'posts'`. A deleted or private post comes back as an error item naming
// its URL, charged like the others.

export const tiktokPostItem = {
	id: '7695809602486603030',
	webVideoUrl: 'https://www.tiktok.com/@borasburger/video/7695809602486603030',
	submittedVideoUrl: 'https://www.tiktok.com/@borasburger/video/7695809602486603030',
	createTimeISO: '2026-10-12T15:00:00.000Z',
	authorMeta: { name: 'borasburger' },
	playCount: 6055,
	diggCount: 126,
	shareCount: 91,
	commentCount: 17,
	collectCount: 66,
	repostCount: 0,
	isAd: false,
	isSponsored: false,
};

export const tiktokGoneItem = {
	error: 'Post not found or private.',
	errorCode: 'POST_NOT_FOUND_OR_PRIVATE',
	url: 'https://www.tiktok.com/@nobody/video/7000000000000000000',
};

// A photo: no views at all, likes and comments only
export const instagramPhotoItem = {
	inputUrl: 'https://www.instagram.com/p/Deb9dQ8lA8I/',
	id: '4007066585374396168',
	type: 'Image',
	productType: 'feed',
	shortCode: 'Deb9dQ8lA8I',
	url: 'https://www.instagram.com/p/Deb9dQ8lA8I/',
	likesCount: 16,
	commentsCount: 3,
	videoViewCount: null,
	timestamp: '2026-10-13T13:53:18.000Z',
};

export const instagramReelItem = {
	inputUrl: 'https://www.instagram.com/p/DeJXD3MKitp/',
	id: '4001831164383472489',
	type: 'Video',
	productType: 'clips',
	shortCode: 'DeJXD3MKitp',
	url: 'https://www.instagram.com/p/DeJXD3MKitp/',
	likesCount: 1123,
	commentsCount: 16,
	videoPlayCount: 51211,
	videoViewCount: null,
	timestamp: '2026-10-06T08:32:52.000Z',
};

export const instagramGoneItem = {
	url: 'https://www.instagram.com/p/AAAAAAAAAAA/',
	error: 'not_found',
	errorDescription: 'Post does not exist',
};
