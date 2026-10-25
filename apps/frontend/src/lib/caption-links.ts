/** A run of a caption: plain text, or a link (`external` opens a new tab). */
export type CaptionPart = { text: string; href?: string; external?: boolean };

// Web links (with or without a scheme for the social sites a blog article's text keeps,
// "instagram.com/kaffeebar"), @handles and #tags; a handle or tag never starts inside a word or a URL
const LINKS =
	/(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"]|(?<![\w.-])(?:www\.)?(?:instagram\.com\/[\w.]*\w|tiktok\.com\/@[\w.]*\w|x\.com\/\w+)|(?<![\w./@])@[\w.]*\w|(?<![\w/&#])#[\p{L}\p{N}_]+)/gu;

const profileUrl = (platform: string, handle: string): string =>
	platform === 'tiktok' ? `https://www.tiktok.com/@${handle}` : `https://www.instagram.com/${handle}/`;

/**
 * A post's caption with what it points at linked: web links, @handles to the profile on the
 * post's platform, #tags to the admin's posts carrying them. A blog article has neither handles
 * nor tags of a platform, so only its links are linked (a profile link keeps its address in the
 * text: "Kaffeebar (instagram.com/kaffeebar)").
 */
export const captionParts = (text: string, platform: string): CaptionPart[] => {
	const social = platform === 'instagram' || platform === 'tiktok';
	const parts: CaptionPart[] = [];
	let last = 0;
	for (const match of text.matchAll(LINKS)) {
		const token = match[0];
		let href: string | undefined;
		let external = true;
		if (token.startsWith('@')) {
			if (social) href = profileUrl(platform, token.slice(1));
		} else if (token.startsWith('#')) {
			if (social) {
				href = `/admin/posts?hashtag=${encodeURIComponent(token.slice(1).toLowerCase())}`;
				external = false;
			}
		} else {
			href = /^https?:\/\//.test(token) ? token : `https://${token}`;
		}
		if (!href) continue;
		if (match.index > last) parts.push({ text: text.slice(last, match.index) });
		parts.push({ text: token, href, external });
		last = match.index + token.length;
	}
	if (last < text.length) parts.push({ text: text.slice(last) });
	return parts;
};
