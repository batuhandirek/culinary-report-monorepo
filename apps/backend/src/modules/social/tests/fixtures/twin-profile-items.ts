// Items as the profile actors returned them on 2026-10-25 for a handle that exists on both
// platforms and one that exists on neither (trimmed: pictures, posts and tracking links dropped):
// `apify/instagram-profile-scraper` and `clockworks/tiktok-profile-scraper` with `resultsPerPage: 1`.

export const TWIN_INSTAGRAM_ITEMS = [
	{
		"inputUrl": "https://www.instagram.com/munchiesde",
		"id": "48168868100",
		"username": "munchiesde",
		"url": "https://www.instagram.com/munchiesde",
		"fullName": "Munchies",
		"biography": "100% Halal-Certified \n📍Bergmannstraße 19, 10961 Berlin\n📍Karl-Liebknecht-Str. 14, 10178 Berlin\n📍 Kantstraße 107, 10627 Berlin\n🛵 Order Online 👇",
		"externalUrls": [
			{
				"title": "",
				"url": "https://www.eatmunchies.de/home%23ordernow",
				"link_type": "external"
			}
		],
		"externalUrl": "https://www.eatmunchies.de/home%23ordernow",
		"followersCount": 16740,
		"followsCount": 279,
		"isBusinessAccount": false,
		"businessCategoryName": "Restaurant",
		"private": false,
		"verified": false,
		"postsCount": 330,
		"latestPosts": []
	},
	{
		"url": "https://www.instagram.com/munchiesde_no_such_profile_x1",
		"username": "munchiesde_no_such_profile_x1",
		"error": "not_found",
		"errorDescription": "Profile does not exist"
	}
];

export const TWIN_TIKTOK_ITEMS = [
	{
		"error": "This profile/hashtag does not exist.",
		"errorCode": "NOT_FOUND",
		"url": "https://www.tiktok.com/@munchiesde_no_such_profile_x1",
		"input": "munchiesde_no_such_profile_x1"
	},
	{
		"id": "7699537184747048224",
		"text": "This is REAL Hot Honey Chicken🍯🌶️\n\n#munchies #berlin #foodspot #hothoneychicken ",
		"createTimeISO": "2026-10-22T16:56:42.000Z",
		"webVideoUrl": "https://www.tiktok.com/@munchiesde/video/7699537184747048224",
		"input": "munchiesde",
		"authorMeta": {
			"id": "7145908602942620678",
			"name": "munchiesde",
			"profileUrl": "https://www.tiktok.com/@munchiesde",
			"nickName": "munchiesde",
			"verified": false,
			"signature": "Kantstraße 107\nBergmannstraße 19\nKarl-Liebknecht-Str. 14\n📍Berlin \n100% Halal ✅",
			"bioLink": null,
			"privateAccount": false,
			"fans": 18500,
			"heart": 772800,
			"video": 487
		}
	}
];
