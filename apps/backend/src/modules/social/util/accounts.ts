// TikTok and Instagram accounts: handles and the profile scrapers' item shapes. Pure functions,
// tested in `social/tests/own-account.pglite.spec.ts`.

import { SocialPlatformEnum } from '../entities/social-post.entity.js';

import { blogHandle } from './blog-feed.js';

/** How many of the latest posts the averages cover. */
export const ACCOUNT_RECENT_POSTS = 10;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * `@Chen_Che.Berlin ` or a profile URL → `chen_che.berlin`; null for nothing usable. Neither
 * platform lets a handle end in a dot, so one there is a caption's full stop ("@sotamesa.").
 */
export const normalizeAccountHandle = (input: string | null | undefined): string | null => {
	if (!input) return null;
	const fromUrl = input.trim().match(/(?:instagram\.com|tiktok\.com)\/@?([\w.]+)/i)?.[1];
	const handle = (fromUrl ?? input).trim().replace(/^@/, '').replace(/\/+$/, '').replace(/\.+$/, '').toLowerCase();
	return /^[\w.]{1,40}$/.test(handle) ? handle : null;
};

/** A platform whose accounts are profiles a brand can own and we can scrape: never a blog. */
export type ProfilePlatform = SocialPlatformEnum.INSTAGRAM | SocialPlatformEnum.TIKTOK;

/** A handle on its platform: a blog's is its host (`blogHandle`), the others' `normalizeAccountHandle`. */
export const normalizeHandle = (platform: SocialPlatformEnum, input: string | null | undefined): string | null =>
	platform === SocialPlatformEnum.BLOG ? (input ? blogHandle(input) : null) : normalizeAccountHandle(input);

// Instagram and TikTok paths that are not a profile: posts, embeds, the CDN's `/o1/v/…`, the
// apps' own pages
const NOT_PROFILES = new Set([
	'p',
	'reel',
	'reels',
	'tv',
	'explore',
	'stories',
	'accounts',
	'tags',
	'video',
	'discover',
	'share',
	'embed',
	'embed.js',
	'o1',
	'v',
	'direct',
	'developer',
	'about',
	'legal',
	'privacy',
	'web',
	'static',
	'oauth',
	'login',
	'music',
	'tag',
	'foryou',
	'channel',
	'business',
	'creators',
]);

// What a site template leaves in place of the venue's handle ("instagram.com/deinprofil")
const PLACEHOLDER_HANDLES = new Set([
	'deinprofil',
	'deinname',
	'dein.profil',
	'profil',
	'profile',
	'yourprofile',
	'your.profile',
	'yourusername',
	'yourname',
	'yourpage',
	'username',
	'user',
	'example',
	'instagram',
	'tiktok',
	'meta',
	'facebook',
]);

/**
 * The profile a link points at ("https://www.instagram.com/cafepaula/?hl=de" → Instagram
 * `cafepaula`), or null for another site, a post or a page that is no profile.
 */
export const profileOf = (
	url: string | null | undefined,
): { platform: SocialPlatformEnum; handle: string } | null => {
	const match = url?.trim().match(/^(?:https?:\/\/)?(?:www\.|m\.)?(instagram\.com|tiktok\.com)\/(@?)([\w.]+)/i);
	if (!match) return null;
	const platform = match[1].toLowerCase() === 'tiktok.com' ? SocialPlatformEnum.TIKTOK : SocialPlatformEnum.INSTAGRAM;
	// A TikTok profile is `/@handle`; without the @ it is some other page
	if (platform === SocialPlatformEnum.TIKTOK && !match[2]) return null;
	const handle = normalizeAccountHandle(match[3]);
	return handle && !NOT_PROFILES.has(handle) && !PLACEHOLDER_HANDLES.has(handle) ? { platform, handle } : null;
};

/** A profile a website links: Instagram or TikTok, never a blog. */
export interface LinkedProfile {
	platform: ProfilePlatform;
	handle: string;
}

/**
 * Every Instagram and TikTok profile a page's HTML points at, in page order, each once: links,
 * and addresses written out in its text or scripts ("instagram.com/cafepaula"). Posts, embeds
 * and template placeholders are no profile (`profileOf`).
 */
export const profileLinks = (html: string): LinkedProfile[] => {
	const out = new Map<string, LinkedProfile>();
	// Escaped slashes in inline JSON ("instagram.com\/cafepaula") read like plain ones, and the
	// app's deep link "instagram.com/_u/cafepaula" like the profile
	const text = html.replace(/\\\//g, '/').replace(/instagram\.com\/_u\//gi, 'instagram.com/');
	// Not inside another host's name ("notinstagram.com")
	const links = /(?<![\w-])(?:https?:\/\/)?(?:www\.|m\.)?(?:instagram\.com|tiktok\.com)\/@?[\w.]+/gi;
	for (const [url] of text.matchAll(links)) {
		const profile = profileOf(url.replace(/\.+$/, ''));
		if (!profile || profile.platform === SocialPlatformEnum.BLOG) continue;
		const key = `${profile.platform}:${profile.handle}`;
		if (!out.has(key)) out.set(key, { platform: profile.platform as ProfilePlatform, handle: profile.handle });
	}
	return [...out.values()];
};

export const accountUrl = (platform: SocialPlatformEnum, handle: string): string =>
	platform === SocialPlatformEnum.TIKTOK ? `https://www.tiktok.com/@${handle}`
	: platform === SocialPlatformEnum.BLOG ? `https://${handle}/`
	: `https://www.instagram.com/${handle}/`;

/** What one profile scrape gives a `SocialAccountSnapshot`. */
export interface AccountFigures {
	followers: number | null;
	posts: number | null;
	avgViews: number | null;
	avgLikes: number | null;
	postsLast30Days: number | null;
}

const count = (n: unknown): number | null => (typeof n === 'number' && n >= 0 ? n : null);

const mean = (values: (number | null)[]): number | null => {
	const known = values.filter((v): v is number => v !== null);
	return known.length ? Math.round(known.reduce((a, b) => a + b, 0) / known.length) : null;
};

const recentFigures = (
	posts: { at: Date | null; views: number | null; likes: number | null }[],
	now: Date,
): Pick<AccountFigures, 'avgViews' | 'avgLikes' | 'postsLast30Days'> => {
	const recent = posts
		.filter(p => p.at)
		.sort((a, b) => b.at!.getTime() - a.at!.getTime())
		.slice(0, ACCOUNT_RECENT_POSTS);
	return {
		avgViews: mean(recent.map(p => p.views)),
		avgLikes: mean(recent.map(p => p.likes)),
		postsLast30Days: recent.filter(p => now.getTime() - p.at!.getTime() <= 30 * DAY_MS).length,
	};
};

/**
 * One item of `apify/instagram-profile-scraper`: the profile with its `latestPosts` (about
 * twelve). Views exist for videos only; hidden like counts come back as -1. Pinned posts are
 * old, so they stay out of the averages.
 */
export const instagramProfileFigures = (item: any, now: Date): AccountFigures | null => {
	if (!item?.username || item.error) return null;
	const posts = ((item.latestPosts ?? []) as any[])
		.filter(p => p && !p.isPinned)
		.map(p => ({
			at: p.timestamp ? new Date(p.timestamp) : null,
			views: count(p.videoViewCount ?? p.videoPlayCount),
			likes: count(p.likesCount),
		}));
	return {
		followers: count(item.followersCount),
		posts: count(item.postsCount),
		...recentFigures(posts, now),
	};
};

/**
 * One profile's items of `clockworks/tiktok-profile-scraper`: one item per video, the profile
 * repeated in `authorMeta` (`fans`, `video` = its video count).
 */
export const tiktokProfileFigures = (items: any[], now: Date): AccountFigures | null => {
	const videos = items.filter(i => i && !i.error && i.authorMeta);
	if (!videos.length) return null;
	const author = videos[0].authorMeta;
	return {
		followers: count(author.fans),
		posts: count(author.video),
		...recentFigures(
			videos
				.filter(v => !v.isPinned)
				.map(v => ({
					at: v.createTimeISO ? new Date(v.createTimeISO) : null,
					views: count(v.playCount),
					likes: count(v.diggCount),
				})),
			now,
		),
	};
};

/**
 * SQL: post `post` is by an own account of the brand in `brand` (a column or a placeholder), as
 * stored on its account (`SocialAccount.brand`). Every "posts by others" count reads this, so an
 * admin's correction on `/admin/accounts` moves them all.
 */
export const ownPostSql = (post: string, brand: string): string =>
	`exists (select 1 from social_accounts own_account where own_account.id = ${post}.account_id and own_account.brand_id = ${brand})`;
