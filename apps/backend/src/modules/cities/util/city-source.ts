import { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';
import { isPublicWebUrl } from 'src/shared/util/public-fetch.js';

import { CitySourceKindEnum } from '../entities/city-source.entity.js';

/**
 * A blog's URL as stored: https assumed when no scheme is given, the host lowercased, the
 * fragment and a bare `/` path dropped ("www.BerlinFoodStories.com/" →
 * "https://www.berlinfoodstories.com"); empty for anything that is not a public web address.
 */
const normalizeBlogUrl = (value: string): string => {
	const trimmed = value.trim();
	if (!trimmed) return '';
	let url: URL;
	try {
		url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
	} catch {
		return '';
	}
	if (!isPublicWebUrl(url)) return '';
	url.hash = '';
	const href = url.href;
	return url.pathname === '/' && !url.search ? href.replace(/\/$/, '') : href;
};

/** A source as stored: hashtags without `#`, lowercased; searches trimmed; blogs as URLs. */
export const normalizeSourceValue = (kind: CitySourceKindEnum, value: string): string => {
	if (kind === CitySourceKindEnum.BLOG) return normalizeBlogUrl(value);
	const trimmed = value.trim().replace(/\s+/g, ' ');
	return kind === CitySourceKindEnum.TIKTOK_SEARCH ? trimmed : trimmed.replace(/^#+/, '').toLowerCase();
};

/** The platform and `SocialPost.source` a source's posts carry. */
export const sourcePost = (
	kind: CitySourceKindEnum,
	value: string,
): { platform: SocialPlatformEnum; source: string } => {
	switch (kind) {
		case CitySourceKindEnum.TIKTOK_HASHTAG:
			return { platform: SocialPlatformEnum.TIKTOK, source: `#${value}` };
		case CitySourceKindEnum.TIKTOK_SEARCH:
			return { platform: SocialPlatformEnum.TIKTOK, source: `search:${value}` };
		case CitySourceKindEnum.INSTAGRAM_HASHTAG:
			return { platform: SocialPlatformEnum.INSTAGRAM, source: `#${value}` };
		case CitySourceKindEnum.BLOG:
			return { platform: SocialPlatformEnum.BLOG, source: `blog:${value}` };
	}
};
