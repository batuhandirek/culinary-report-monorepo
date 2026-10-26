import { BadRequestException } from '@nestjs/common';

import { describe, expect, it } from '@jest/globals';

import { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';

import {
	ReportCoverKpiEnum,
	ReportPlacePartEnum,
	ReportSectionKindEnum as Kind,
} from '../constants/report-section.constant.js';
import {
	AnalysisReportSection,
	CoverReportSection,
	MediaReportSection,
	PlacesReportSection,
	PostsReportSection,
} from '../entities/report-section.embeddable.js';
import type { ReportData } from '../interfaces/report-data.interface.js';
import {
	FULL_REPORT_SECTIONS,
	sectionsOutput,
	toSections,
	trimForSections,
} from '../util/report-sections.js';

describe('toSections', () => {
	it("makes each kind its own class, with the settings given and the kind's defaults for the rest", () => {
		const sections = toSections([
			{ kind: Kind.COVER, kpis: [ReportCoverKpiEnum.STARS, ReportCoverKpiEnum.VIEWS] },
			{ kind: Kind.POSTS, platforms: [SocialPlatformEnum.INSTAGRAM], nearby: false },
			{ kind: Kind.PLACES },
			{ kind: Kind.REVIEWS, limit: 3 },
		]);
		expect(sections[0]).toBeInstanceOf(CoverReportSection);
		expect(sections[1]).toBeInstanceOf(PostsReportSection);
		expect(sectionsOutput(sections)).toEqual([
			{ kind: Kind.COVER, kpis: ['stars', 'views'] },
			// `nearby` is a creators setting: ignored here
			{ kind: Kind.POSTS, platforms: ['instagram'], limit: 6 },
			{ kind: Kind.PLACES, parts: ['busyness', 'prices', 'neighbourhood', 'search_ranks'] },
			{ kind: Kind.REVIEWS },
		]);
	});

	it.each([
		['no cover', [{ kind: Kind.POSTS }]],
		['the cover not first', [{ kind: Kind.POSTS }, { kind: Kind.COVER }]],
		['a kind twice', [{ kind: Kind.COVER }, { kind: Kind.CITY }, { kind: Kind.CITY }]],
		['no cover figure', [{ kind: Kind.COVER, kpis: [] }]],
		[
			'a figure twice',
			[{ kind: Kind.COVER, kpis: [ReportCoverKpiEnum.VIEWS, ReportCoverKpiEnum.VIEWS] }],
		],
		['no place block', [{ kind: Kind.COVER }, { kind: Kind.PLACES, parts: [] }]],
		['too many posts', [{ kind: Kind.COVER }, { kind: Kind.POSTS, limit: 25 }]],
		['no posts', [{ kind: Kind.COVER }, { kind: Kind.POSTS, limit: 0 }]],
		['too many articles', [{ kind: Kind.COVER }, { kind: Kind.MEDIA, limit: 21 }]],
		['too many moves', [{ kind: Kind.COVER }, { kind: Kind.ANALYSIS, limit: 7 }]],
	])('refuses %s', (_, input) => {
		expect(() => toSections(input)).toThrow(BadRequestException);
	});

	it('makes media coverage its own class with its article limit', () => {
		const [, media] = toSections([{ kind: Kind.COVER }, { kind: Kind.MEDIA }]);
		expect(media).toBeInstanceOf(MediaReportSection);
		expect(sectionsOutput([media])).toEqual([{ kind: Kind.MEDIA, limit: 6 }]);
		const [, twelve] = toSections([{ kind: Kind.COVER }, { kind: Kind.MEDIA, limit: 12 }]);
		expect((twelve as MediaReportSection).limit).toBe(12);
	});

	it('makes the analysis section its own class with its limit, second in the full layout', () => {
		const [, analysis] = toSections([{ kind: Kind.COVER }, { kind: Kind.ANALYSIS }]);
		expect(analysis).toBeInstanceOf(AnalysisReportSection);
		expect(sectionsOutput([analysis])).toEqual([{ kind: Kind.ANALYSIS, limit: 3 }]);
		const [, five] = toSections([{ kind: Kind.COVER }, { kind: Kind.ANALYSIS, limit: 5 }]);
		expect((five as AnalysisReportSection).limit).toBe(5);
		expect(FULL_REPORT_SECTIONS().map(s => s.kind).slice(0, 3)).toEqual([Kind.COVER, Kind.ANALYSIS, Kind.STARS]);
	});

	it('allows posts of every platform (no platform picked)', () => {
		const [, posts] = toSections([{ kind: Kind.COVER }, { kind: Kind.POSTS, platforms: [] }]);
		expect((posts as PostsReportSection).platforms).toEqual([]);
	});
});

describe('trimForSections', () => {
	const post = (platform: 'tiktok' | 'instagram' | 'blog', postId: string) =>
		({ postId, platform, views: 1 }) as ReportData['posts'][number];
	const data = {
		posts: [post('tiktok', 't'), post('instagram', 'i'), post('blog', 'b')],
		ownPosts: [post('tiktok', 'own')],
		ownAccounts: [{ handle: 'own' }],
		dishes: [{ name: 'pho', count: 2, positive: 2, negative: 0 }],
		comments: { comments: 3 },
		press: { features: 1 },
		reviews: {
			critical: [{ text: 'cold', replied: false }],
			changes: [{ changes: ['new owner'] }],
			byPlatform: [],
		},
		creators: [{ author: 'a' }],
		creatorsNearby: [{ author: 'b' }],
		competitors: [{ name: 'Rival' }],
		correlations: { buzzToReviews: {} },
		city: { cityName: 'Berlin' },
		branches: [
			{
				busyness: {},
				demand: {},
				prices: {},
				neighbours: [{ name: 'Zola' }],
				neighbourhood: {},
				searchRanks: [{ query: 'pho mitte' }],
			},
		],
	} as unknown as ReportData;

	it('keeps everything for the full layout', () => {
		const { data: out, scope } = trimForSections(data, FULL_REPORT_SECTIONS());
		expect(out).toEqual(data);
		expect(scope).toEqual({ social: true, reviews: true, stars: true, branches: true, analysis: 3 });
	});

	it('leaves out what the sections leave out, on a copy', () => {
		const cover = new CoverReportSection();
		cover.kpis = [ReportCoverKpiEnum.STARS];
		const places = new PlacesReportSection();
		places.parts = [ReportPlacePartEnum.PRICES];
		const { data: out, scope } = trimForSections(data, [cover, places]);
		expect(out.posts).toEqual([]);
		expect(out.ownPosts).toEqual([]);
		expect(out.ownAccounts).toBeUndefined();
		expect(out.dishes).toEqual([]);
		expect(out.comments).toBeUndefined();
		expect(out.press).toBeUndefined();
		expect(out.reviews.critical).toEqual([]);
		expect(out.reviews.changes).toEqual([]);
		expect(out.creators).toEqual([]);
		expect(out.creatorsNearby).toEqual([]);
		expect(out.competitors).toEqual([]);
		expect(out.correlations).toBeUndefined();
		expect(out.city).toBeUndefined();
		expect(out.branches[0]).toEqual({ prices: {}, neighbours: [] });
		// A star tile keeps the review counts; no social tile, no posts section: no social figures
		expect(scope).toEqual({ social: false, reviews: true, stars: false, branches: false, analysis: false });
		// The stored data is untouched
		expect(data.posts).toHaveLength(3);
		expect(data.branches[0].busyness).toBeDefined();
	});

	it("keeps only the picked platforms' posts", () => {
		const posts = new PostsReportSection();
		posts.platforms = [SocialPlatformEnum.INSTAGRAM];
		const { data: out, scope } = trimForSections(data, [new CoverReportSection(), posts]);
		expect(out.posts.map(p => p.postId)).toEqual(['i']);
		expect(scope.social).toBe(true);
	});

	it('keeps the blog articles a media coverage section lists, without a posts section', () => {
		const { data: out, scope } = trimForSections(data, [
			new CoverReportSection(),
			new MediaReportSection(),
		]);
		expect(out.posts.map(p => p.postId)).toEqual(['b']);
		// The cover's default tiles still show social figures
		expect(scope.social).toBe(true);
	});

	it("adds the blog articles to a posts section's platforms", () => {
		const posts = new PostsReportSection();
		posts.platforms = [SocialPlatformEnum.INSTAGRAM];
		const { data: out } = trimForSections(data, [new CoverReportSection(), posts, new MediaReportSection()]);
		expect(out.posts.map(p => p.postId)).toEqual(['i', 'b']);
	});
});
