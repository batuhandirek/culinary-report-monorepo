// Items in the shape `novi/advanced-search-tiktok-api` returns (TikTok's own video object;
// runs esT7dJSU1VGEZB9fw, PXHahUnBDAkxcs1fD)
export const searchVideo = {
	aweme_id: '7551000000000000001',
	desc: 'Bestes Schnitzel in Wien mit @figlmueller.wien #wienfood #schnitzel',
	create_time: Date.parse('2026-09-12T19:00:00.000Z') / 1000,
	author: {
		unique_id: 'schnitzeljaeger',
		nickname: 'Schnitzeljäger',
		follower_count: 8800,
		uid: '42',
	},
	statistics: {
		play_count: 48000,
		digg_count: 2100,
		share_count: 90,
		comment_count: 64,
		collect_count: 300,
	},
	is_ads: false,
	commerce_info: { branded_content_type: 0 },
	text_extra: [
		{ type: 0, user_id: '43', sec_uid: 'MS4w', start: 28, end: 45 },
		{ type: 1, hashtag_name: 'wienfood' },
		{ type: 1, hashtag_name: 'schnitzel' },
	],
	anchors: [
		{
			component_key: 'anchor_ucg_template',
			type: '65',
			keyword: 'TikTok-Vorlage ausprobieren',
		},
		{ component_key: 'anchor_poi', type: '45', keyword: 'Figlmüller Wollzeile', id: '4220' },
	],
	video: {
		cla_info: {
			caption_infos: [
				{
					lang: 'eng-US',
					url: 'https://cla.example/mt.vtt',
					is_original_caption: false,
					caption_format: 'webvtt',
				},
				{
					lang: 'deu-DE',
					url: 'https://cla.example/orig.vtt',
					is_original_caption: true,
					caption_format: 'webvtt',
				},
			],
		},
	},
	__search_terms: {
		keyword: 'wien restaurant',
		sort_type: 'Relevance',
		publish_time: 'THREE_MONTH',
		region: 'AT',
	},
};
// A hashtag's word searched: the find keeps the hashtag's kind
export const hashtagWordVideo = {
	...searchVideo,
	aweme_id: '7551000000000000003',
	video: {},
	__search_terms: { ...searchVideo.__search_terms, keyword: 'wienfood' },
};
// Inside the three months searched, before the month scraped
export const julySearchVideo = {
	...searchVideo,
	aweme_id: '7551000000000000002',
	create_time: Date.parse('2026-07-20T12:00:00.000Z') / 1000,
	video: {},
};
