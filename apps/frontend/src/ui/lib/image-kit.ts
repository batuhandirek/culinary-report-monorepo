/**
 * Appends an ImageKit transformation (`w-200`, `w-600,h-750,c-at_least`, …) to an image URL.
 *
 * Stored URLs already carry a query (`?updatedAt=…`), so a hand-written `${url}?tr=…`
 * becomes part of that value: ImageKit ignores the transform and serves the full original.
 */
export const imageKitUrl = (url: string | null | undefined, transformation: string) => {
	if (!url) return '';
	return `${url}${url.includes('?') ? '&' : '?'}tr=${transformation}`;
};

/**
 * A still of an ImageKit-hosted video (`<video url>/ik-thumbnail.jpg`), for a tile or a
 * `poster`. The stored URL's query has to stay behind the added path segment.
 */
export const videoPosterUrl = (url: string | null | undefined, transformation: string) => {
	if (!url) return '';
	const [base, query] = url.split('?');
	return imageKitUrl(`${base}/ik-thumbnail.jpg${query ? `?${query}` : ''}`, transformation);
};

/** Whether a media slot (a listing's proof of working) holds a video rather than a photo. */
export const isVideoMedia = (media: { mediaType: string }) => media.mediaType === 'VIDEO';
