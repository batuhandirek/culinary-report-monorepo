import { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';
import { normalizeAccountHandle } from 'src/modules/social/util/accounts.js';
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

/**
 * A source as stored: hashtags without `#`, lowercased; searches trimmed; blogs as URLs; accounts
 * as handles (`@Name`, a profile URL → `name`; empty for anything that is no handle).
 */
export const normalizeSourceValue = (kind: CitySourceKindEnum, value: string): string => {
	if (kind === CitySourceKindEnum.BLOG) return normalizeBlogUrl(value);
	if (isAccountKind(kind)) return normalizeAccountHandle(value) ?? '';
	const trimmed = value.trim().replace(/\s+/g, ' ');
	return kind === CitySourceKindEnum.TIKTOK_SEARCH ? trimmed : trimmed.replace(/^#+/, '').toLowerCase();
};

/** The platform a source's posts are on. */
export const sourcePlatform = (kind: CitySourceKindEnum): SocialPlatformEnum => {
	switch (kind) {
		case CitySourceKindEnum.TIKTOK_HASHTAG:
		case CitySourceKindEnum.TIKTOK_SEARCH:
		case CitySourceKindEnum.TIKTOK_ACCOUNT:
			return SocialPlatformEnum.TIKTOK;
		case CitySourceKindEnum.INSTAGRAM_HASHTAG:
		case CitySourceKindEnum.INSTAGRAM_ACCOUNT:
			return SocialPlatformEnum.INSTAGRAM;
		case CitySourceKindEnum.BLOG:
			return SocialPlatformEnum.BLOG;
	}
};

/** A hashtag source, which points at its `Hashtag`. */
export const isHashtagKind = (kind: CitySourceKindEnum): boolean =>
	kind === CitySourceKindEnum.TIKTOK_HASHTAG || kind === CitySourceKindEnum.INSTAGRAM_HASHTAG;

/** An account source: one creator's profile, `value` its handle. */
export const isAccountKind = (kind: CitySourceKindEnum): boolean =>
	kind === CitySourceKindEnum.TIKTOK_ACCOUNT || kind === CitySourceKindEnum.INSTAGRAM_ACCOUNT;

/** The account source kind of a profile platform. */
export const accountSourceKind = (platform: SocialPlatformEnum): CitySourceKindEnum | null =>
	platform === SocialPlatformEnum.TIKTOK ? CitySourceKindEnum.TIKTOK_ACCOUNT
	: platform === SocialPlatformEnum.INSTAGRAM ? CitySourceKindEnum.INSTAGRAM_ACCOUNT
	: null;
