import type { GooglePlaceItem } from '../../services/venue.service.js';

// Two `compass/crawler-google-places` items for one place. The list item is a real search
// result from 2026-10-15 (trimmed): a list scrape fills hours, the star distribution and only
// the Accessibility section, and sends empty placeholders for what only a detail page has. The
// detail item follows the actor's documented output (`scrapePlaceDetailPage: true`).

export const LIST_ITEM: GooglePlaceItem = {
	placeId: 'ChIJ22UKSoNJqEcRW1trPLR-beI',
	title: 'Pinoli Restaurant',
	city: 'Berlin',
	street: 'Alt-Rudow 39',
	postalCode: '12355',
	categoryName: 'Italian restaurant',
	categories: ['Italian restaurant'],
	location: { lat: 52.4153, lng: 13.4962 },
	url: 'https://www.google.com/maps/search/?api=1&query=Pinoli%20Restaurant',
	permanentlyClosed: false,
	temporarilyClosed: false,
	totalScore: 4.9,
	reviewsCount: 585,
	reviewsDistribution: { oneStar: 5, twoStar: 0, threeStar: 8, fourStar: 29, fiveStar: 543 },
	imagesCount: 667,
	openingHours: [
		{ day: 'Monday', hours: '5 to 11 PM' },
		{ day: 'Tuesday', hours: 'Closed' },
		{ day: 'Wednesday', hours: 'Closed' },
		{ day: 'Thursday', hours: '5 to 11 PM' },
		{ day: 'Friday', hours: '5 to 11 PM' },
		{ day: 'Saturday', hours: '5 to 11 PM' },
		{ day: 'Sunday', hours: '5 to 11 PM' },
	],
	additionalInfo: {
		Accessibility: [
			{ 'Assistive hearing loop': false },
			{ 'Wheelchair accessible entrance': false },
		],
	},
	reserveTableUrl: 'https://www.google.com/maps/reserve/v/dine/c/wdnhxWoagVE',
	popularTimesHistogram: {},
	popularTimesLiveText: null,
	popularTimesLivePercent: null,
	peopleAlsoSearch: [],
	menu: null,
	orderBy: null,
	placesTags: [],
};

const hours = (peak: number) =>
	[17, 18, 19, 20, 21, 22].map((hour, i) => ({
		hour,
		occupancyPercent: Math.round(peak * [0.3, 0.6, 0.9, 1, 0.7, 0.3][i]),
	}));

export const DETAIL_ITEM: GooglePlaceItem = {
	...LIST_ITEM,
	reviewsCount: 590,
	reviewsDistribution: { oneStar: 5, twoStar: 0, threeStar: 8, fourStar: 30, fiveStar: 547 },
	additionalInfo: {
		'Service options': [{ 'Outdoor seating': true }, { Takeout: true }, { Delivery: false }],
		Accessibility: [{ 'Wheelchair accessible entrance': true }],
		Planning: [{ 'Accepts reservations': true }],
		Payments: [{ 'Credit cards': true }, { 'NFC mobile payments': true }],
	},
	popularTimesHistogram: { Mo: hours(60), Th: hours(70), Fr: hours(95), Sa: hours(100), Su: [] },
	popularTimesLiveText: 'Usually not too busy',
	popularTimesLivePercent: 35,
	menu: 'https://pinoli-restaurant.de/speisekarte',
	orderBy: [{ name: 'Lieferando.de', url: 'https://www.lieferando.de/pinoli' }, { name: '' }],
	peopleAlsoSearch: [
		{
			category: 'People also search for',
			title: 'Trattoria da Rudow',
			totalScore: 4.6,
			reviewsCount: 812,
		},
		{ category: 'People also search for', title: 'Ristorante Il Ponte', totalScore: 4.4 },
	],
	// The detail page's "people often mention" (Döner Pro's, 2026-10-19)
	reviewsTags: [
		{ title: 'seitan', count: 6 },
		{ title: 'vegan meat', count: 12 },
		{ title: 'dürüm', count: 7 },
	],
};
