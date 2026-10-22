// Creators: which accounts are one person. Pure, tested in `social/tests/social-account.pglite.spec.ts`.

import { SocialPlatformEnum } from '../entities/social-post.entity.js';

/** How short a handle's letters may be to join another platform's account by them alone. */
export const CREATOR_KEY_MIN_LENGTH = 6;

/**
 * A handle's letters and digits, what one person's accounts on two platforms share
 * (`polina_iz_berlina` on TikTok, `polina.iz.berlina` on Instagram); null when too short to be
 * anyone's in particular. SQL mirrors it as `regexp_replace(handle, '[^a-z0-9]', '', 'g')`.
 */
export const creatorKey = (handle: string): string | null => {
	const key = handle.toLowerCase().replace(/[^a-z0-9]/g, '');
	return key.length >= CREATOR_KEY_MIN_LENGTH ? key : null;
};

/**
 * `creatorKey` of an account on its platform: a blog's host counts without its top-level domain,
 * so `berlinfoodstories.com` is the same creator as Instagram's `berlinfoodstories`. SQL mirrors
 * it as `CREATOR_KEY_SQL`.
 */
export const creatorKeyOf = (platform: SocialPlatformEnum, handle: string): string | null =>
	creatorKey(platform === SocialPlatformEnum.BLOG ? handle.replace(/\.[a-z0-9-]+$/, '') : handle);

/** `creatorKeyOf` of `social_accounts` row `a`, before the length check. */
export const CREATOR_KEY_SQL = (a: string): string =>
	`regexp_replace(case when ${a}.platform = '${SocialPlatformEnum.BLOG}' then regexp_replace(${a}.handle, '\\.[a-z0-9-]+$', '') else ${a}.handle end, '[^a-z0-9]', '', 'g')`;
