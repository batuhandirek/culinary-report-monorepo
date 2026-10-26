// Whether a profile is a brand's own, from what the profile itself says: its link, its bio, its
// name. Pure, tested in `social/tests/own-account-finding.spec.ts` on items the profile actors returned.

import { registrableDomain, siteNamedAfter } from 'src/modules/venues/util/brands.js';
import { faviconSite } from 'src/modules/venues/util/favicon.js';
import { hintNamesStreet } from 'src/modules/venues/util/venue-names.js';
import { hostOf } from 'src/modules/venues/util/web-mentions.js';

import { SocialPlatformEnum } from '../entities/social-post.entity.js';

import {
	type LinkedProfile,
	normalizeAccountHandle,
	profileLinks,
	type ProfilePlatform,
} from './accounts.js';

/** What a profile scrape says about one profile. */
export interface ProfileFacts {
	platform: ProfilePlatform;
	handle: string;
	/** False when the platform says no such profile */
	exists: boolean;
	displayName?: string | null;
	followers?: number | null;
	following?: number | null;
	bio?: string | null;
	/** Its website link(s) */
	links: string[];
}

/**
 * One `apify/instagram-profile-scraper` item: `externalUrl(s)`, `biography`, `fullName`; a
 * missing profile is `{ username, error: 'not_found' }`. Null for an item naming no profile.
 */
export const instagramProfileFacts = (item: any): ProfileFacts | null => {
	const handle = normalizeAccountHandle(item?.username ?? item?.url);
	if (!handle) return null;
	if (item.error)
		return { platform: SocialPlatformEnum.INSTAGRAM, handle, exists: false, links: [] };
	const links = [
		item.externalUrl,
		...((Array.isArray(item.externalUrls) ? item.externalUrls : []) as any[]).map(u => u?.url),
	].filter((u): u is string => typeof u === 'string' && !!u.trim());
	return {
		platform: SocialPlatformEnum.INSTAGRAM,
		handle,
		exists: true,
		displayName: item.fullName || null,
		followers: typeof item.followersCount === 'number' ? item.followersCount : null,
		following: typeof item.followsCount === 'number' ? item.followsCount : null,
		bio: item.biography || null,
		links: [...new Set(links.map(decodeLink))],
	};
};

/**
 * One `clockworks/tiktok-profile-scraper` item: a video carrying the profile in `authorMeta`
 * (`signature` the bio, `bioLink` its link, `nickName`); a missing profile is
 * `{ input, errorCode: 'NOT_FOUND' }`. Null for an item naming no profile.
 */
export const tiktokProfileFacts = (item: any): ProfileFacts | null => {
	const author = item?.authorMeta;
	const handle = normalizeAccountHandle(author?.name ?? item?.input);
	if (!handle) return null;
	if (!author || item.errorCode || item.error)
		return { platform: SocialPlatformEnum.TIKTOK, handle, exists: false, links: [] };
	const bioLink = typeof author.bioLink === 'string' ? author.bioLink : author.bioLink?.link;
	return {
		platform: SocialPlatformEnum.TIKTOK,
		handle,
		exists: true,
		displayName: author.nickName || null,
		followers: typeof author.fans === 'number' ? author.fans : null,
		following: typeof author.following === 'number' ? author.following : null,
		bio: author.signature || null,
		links: typeof bioLink === 'string' && bioLink.trim() ? [decodeLink(bioLink)] : [],
	};
};

// Instagram percent-encodes a link's fragment ("…/home%23ordernow")
const decodeLink = (url: string): string => {
	try {
		return decodeURIComponent(url.trim());
	} catch {
		return url.trim();
	}
};

/** The brand a profile may be the own account of. */
export interface ProofBrand {
	name: string;
	/** Its branches' websites: their registrable domains are its sites */
	websites: readonly (string | null | undefined)[];
	/** Its branches' streets */
	streets: readonly (string | null | undefined)[];
	/** The brand's account on the other platform, whose handle was looked up here */
	account: LinkedProfile;
}

/** Why a profile is the brand's own; null when it doesn't say. */
export type ProfileProof = 'site' | 'street' | 'account';

// A domain written out in a bio ("eatmunchies.de", "www.cafe-paula.berlin")
const BIO_DOMAINS = /(?<![@\w.-])(?:https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,})(?![\w-])/gi;

/**
 * Whether the profile proves itself the brand's own: its website link, or a domain in its bio,
 * is on one of the brand's sites (`site`); its bio names a branch's street (`street`); or it
 * links the brand's account on the other platform, or names it after "IG" / "TikTok"
 * (`account`).
 */
export const profileProof = (facts: ProfileFacts, brand: ProofBrand): ProfileProof | null => {
	if (!facts.exists) return null;
	const domains = new Set(
		brand.websites
			.map(w => faviconSite(w))
			.map(url => url && hostOf(url.href))
			.filter((h): h is string => !!h)
			.map(registrableDomain),
	);
	const bio = facts.bio ?? '';
	const written = [...bio.matchAll(BIO_DOMAINS)].map(m => m[1]);
	for (const link of [...facts.links, ...written]) {
		const host = hostOf(/^https?:\/\//i.test(link) ? link : `https://${link}`);
		if (host && domains.has(registrableDomain(host))) return 'site';
	}
	if (bio && brand.streets.some(street => street && hintNamesStreet(bio, street)))
		return 'street';
	const other = brand.account;
	if (
		profileLinks([...facts.links, bio].join(' ')).some(
			p => p.platform === other.platform && p.handle === other.handle,
		)
	)
		return 'account';
	const label =
		other.platform === SocialPlatformEnum.INSTAGRAM ?
			'instagram|insta|ig'
		:	'tiktok|tik tok|tt';
	const handle = other.handle.replace(/[.]/g, '\\.');
	if (new RegExp(`(?:${label})\\W{0,4}@?${handle}(?![\\w.])`, 'i').test(bio)) return 'account';
	return null;
};

/** Whether the profile's handle or name is the brand's: no proof, but worth an admin's look. */
export const profileNamedAfter = (
	facts: ProfileFacts,
	brandName: string,
	cityWords: ReadonlySet<string>,
): boolean =>
	facts.exists &&
	(siteNamedAfter(facts.handle, brandName, cityWords) ||
		(!!facts.displayName &&
			siteNamedAfter(facts.displayName.replace(/\s+/g, ''), brandName, cityWords)));
