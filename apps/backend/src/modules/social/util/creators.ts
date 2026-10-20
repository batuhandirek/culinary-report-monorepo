// Creators: which accounts are one person. Pure, tested in `social/tests/social-account.pglite.spec.ts`.

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
