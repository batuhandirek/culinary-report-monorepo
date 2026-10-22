// The public month of a city, from rows the service reads. Pure: `CityHighlightService.build`
// feeds it the month's posts by others, the pipeline's top order and the trend tables.

import _ from 'lodash';

import { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';
import { accountUrl, normalizeAccountHandle } from 'src/modules/social/util/accounts.js';
import type { CityTrends } from 'src/modules/trends/interfaces/city-trends.interface.js';
import { isDenied } from 'src/modules/venues/services/brand-lead-score.service.js';

import type {
	CityHighlightBrand,
	CityHighlightCreator,
	CityHighlightData,
	CityHighlightPost,
} from '../interfaces/city-highlight.interface.js';

export const HIGHLIGHT_BRANDS = 10;
export const HIGHLIGHT_RISERS = 5;
export const HIGHLIGHT_CREATORS = 5;
export const HIGHLIGHT_DISHES = 5;
// A dish needs this many posts and reviews naming it before its rise is worth a line
const DISH_MIN_SOURCES = 3;

/**
 * One matched mention in a post by someone other than the brand it names, in the city's month
 * (own posts and other cities' mentions are already out: the query leaves them out).
 */
export interface HighlightMentionRow {
	postId: string;
	externalId: string;
	platform: SocialPlatformEnum;
	url: string;
	views: number;
	postedAt: Date;
	/** The post's account; null for a post without an author */
	handle: string | null;
	creatorId: string | null;
	/** The account is some brand's own (counted as others for the brands it is not) */
	accountIsBrand: boolean;
	brandId: string;
	brandName: string;
}

/** A brand's most reviewed open branch in the city: where the list places it. */
export interface HighlightBranch {
	district?: string;
	category?: string;
}

/** Who asked to be left out (`City.doNotListVenues` / `doNotListCreators`). */
export interface HighlightDoNotList {
	venues: readonly string[];
	creators: readonly string[];
}

/**
 * The platform's official embed of a post: TikTok's player by video id, Instagram's by the
 * shortcode in the post's URL. Null when the URL holds none (we never re-host a video), and for
 * a blog article, which has no embed.
 */
export const embedUrlOf = (platform: SocialPlatformEnum, externalId: string, url: string): string | null => {
	if (platform === SocialPlatformEnum.BLOG) return null;
	if (platform === SocialPlatformEnum.TIKTOK) {
		const id = url.match(/\/video\/(\d+)/)?.[1] ?? (/^\d+$/.test(externalId) ? externalId : null);
		return id ? `https://www.tiktok.com/embed/v2/${id}` : null;
	}
	const code = url.match(/instagram\.com\/(?:[\w.]+\/)?(?:p|reel|reels|tv)\/([\w-]+)/i)?.[1];
	return code ? `https://www.instagram.com/p/${code}/embed` : null;
};

/** A creator on the do-not-list, by any of their handles (with or without @, any case). */
export const isDeniedCreator = (handles: (string | null)[], denyList: readonly string[]): boolean => {
	const denied = new Set(denyList.map(h => normalizeAccountHandle(h)).filter(Boolean));
	return handles.some(h => !!h && denied.has(normalizeAccountHandle(h)));
};

/** A venue on the do-not-list, compared like the chain deny-list (`isDenied`). */
export const isDeniedVenue = (name: string, denyList: readonly string[]): boolean =>
	denyList.length > 0 && isDenied(name, denyList);

/**
 * The month's public lists. Every list leaves out the venues and creators on the do-not-list;
 * the totals count every post (a count names nobody). `order` is the pipeline's top list
 * (`topBrandIds`), longer than ten so denied brands leave room.
 */
export const computeHighlights = (input: {
	rows: HighlightMentionRow[];
	order: string[];
	branches: Map<string, HighlightBranch>;
	trends: Pick<CityTrends, 'risingBrands' | 'districts' | 'dishes'>;
	doNotList: HighlightDoNotList;
	/** The city's districts (`City.districts`); a district outside them is never the top one */
	districtNames?: readonly string[];
}): CityHighlightData => {
	const { rows, doNotList } = input;
	const deniedBrand = (name: string) => isDeniedVenue(name, doNotList.venues);

	const posts = _.uniqBy(rows, r => r.postId);
	const totals = {
		posts: posts.length,
		views: _.sumBy(posts, r => r.views),
		creators: new Set(posts.map(r => r.creatorId).filter(Boolean)).size,
		brands: new Set(rows.map(r => r.brandId)).size,
	};

	// Per brand: its posts once each, their views, the people behind them
	const byBrand = _.groupBy(rows, r => r.brandId);
	const brandRow = (brandId: string): Omit<CityHighlightBrand, 'rank'> | null => {
		const mentions = byBrand[brandId];
		if (!mentions?.length || deniedBrand(mentions[0].brandName)) return null;
		const own = _.uniqBy(mentions, r => r.postId);
		const branch = input.branches.get(brandId);
		return {
			brandId,
			name: mentions[0].brandName,
			...(branch?.district && { district: branch.district }),
			...(branch?.category && { category: branch.category }),
			posts: own.length,
			views: _.sumBy(own, r => r.views),
			creators: new Set(own.map(r => r.creatorId).filter(Boolean)).size,
		};
	};
	const brands = input.order
		.map(brandRow)
		.filter((b): b is Omit<CityHighlightBrand, 'rank'> => !!b)
		.slice(0, HIGHLIGHT_BRANDS)
		.map((b, i) => ({ rank: i + 1, ...b }));

	// Only the city's own places: a brand without an open branch there has no rows
	const inCity = new Set(rows.map(r => r.brandId));
	const risers = input.trends.risingBrands
		.filter(r => inCity.has(r.brandId) && !deniedBrand(r.name))
		.slice(0, HIGHLIGHT_RISERS)
		.map(r => ({
			brandId: r.brandId,
			name: r.name,
			...(r.district && { district: r.district }),
			rank: r.rank,
			...(r.prevRank !== undefined && { prevRank: r.prevRank }),
			posts: r.posts,
			prevPosts: r.prevPosts,
		}));

	// The most viewed post whose creator is not on the list, naming the places that are not
	let topPost: CityHighlightPost | undefined;
	const byPost = _.groupBy(rows, r => r.postId);
	for (const post of _.orderBy(posts, [r => r.views, r => r.postId], ['desc', 'asc'])) {
		if (!post.handle || isDeniedCreator([post.handle], doNotList.creators)) continue;
		const named = _.uniqBy(byPost[post.postId], r => r.brandId).filter(r => !deniedBrand(r.brandName));
		const embedUrl = embedUrlOf(post.platform, post.externalId, post.url);
		if (!named.length || !embedUrl) continue;
		topPost = {
			postId: post.postId,
			platform: post.platform,
			url: post.url,
			embedUrl,
			handle: post.handle,
			profileUrl: accountUrl(post.platform, post.handle),
			views: post.views,
			postedAt: post.postedAt.toISOString(),
			brands: named.map(r => ({ brandId: r.brandId, name: r.brandName })),
		};
		break;
	}

	// Creators are people; a creator who is only ever a brand's voice is not one
	const creators: CityHighlightCreator[] = [];
	const byCreator = _.groupBy(
		rows.filter(r => r.creatorId && r.handle),
		r => r.creatorId!,
	);
	const ranked = _.orderBy(
		Object.entries(byCreator).map(([creatorId, mentions]) => {
			const own = _.uniqBy(mentions, r => r.postId);
			return { creatorId, mentions, own, views: _.sumBy(own, r => r.views) };
		}),
		[c => c.views, c => c.own.length, c => c.creatorId],
		['desc', 'desc', 'asc'],
	);
	for (const c of ranked) {
		if (creators.length >= HIGHLIGHT_CREATORS) break;
		if (c.own.every(r => r.accountIsBrand)) continue;
		const handles = _.uniq(c.mentions.map(r => r.handle));
		if (isDeniedCreator(handles, doNotList.creators)) continue;
		// The account their views came from
		const main = _.maxBy(
			Object.values(_.groupBy(c.own, r => `${r.platform} ${r.handle}`)),
			group => _.sumBy(group, r => r.views),
		)![0];
		creators.push({
			creatorId: c.creatorId,
			handle: main.handle!,
			platform: main.platform,
			profileUrl: accountUrl(main.platform, main.handle!),
			posts: c.own.length,
			views: c.views,
			brands: new Set(c.mentions.map(r => r.brandId)).size,
		});
	}

	const known = new Set(input.districtNames ?? []);
	const top = input.trends.districts.find(d => !d.other && (!known.size || known.has(d.label)));
	const dishes = input.trends.dishes
		.filter(d => !d.other && d.delta > 0 && d.count >= DISH_MIN_SOURCES)
		.sort((a, b) => b.delta - a.delta || b.count - a.count)
		.slice(0, HIGHLIGHT_DISHES)
		.map(d => ({ label: d.label, share: d.share, delta: d.delta, count: d.count }));

	return {
		totals,
		brands,
		risers,
		...(topPost && { topPost }),
		creators,
		...(top && { district: { name: top.label, share: top.share, mentions: top.count } }),
		dishes,
	};
};
