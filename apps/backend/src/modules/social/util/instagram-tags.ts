// Instagram hashtag pages: the URL the hashtag actor takes, and the hashtag back from an item.

/** The tag page of a hashtag stored without `#`. */
export const instagramTagUrl = (hashtag: string): string =>
	`https://www.instagram.com/explore/tags/${encodeURIComponent(hashtag)}/`;

/** The hashtag of a tag page URL (an item's `inputUrl`), or null for any other URL. */
export const hashtagOfTagUrl = (url: unknown): string | null => {
	if (typeof url !== 'string') return null;
	const match = url.match(/\/explore\/tags\/([^/?#]+)/);
	return match ? decodeURIComponent(match[1]) : null;
};
