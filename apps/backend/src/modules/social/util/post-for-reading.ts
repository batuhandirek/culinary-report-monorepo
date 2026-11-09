import type { SocialPost } from '../entities/social-post.entity.js';
import type { PostForReading } from '../interfaces/post-reading.interface.js';

/** A stored post as the reading sees it (`city`, `hashtagLinks.hashtag` and `account.brand` populated) */
export const postForReadingOf = (post: SocialPost): PostForReading => ({
	postId: post.id,
	externalId: post.externalId,
	cityId: post.city.id,
	cityName: post.city.name,
	platform: post.platform,
	author: post.author ?? null,
	locationName: post.locationName ?? null,
	hashtags: post.hashtagLinks.getItems().map(link => link.hashtag.tag),
	taggedHandles: post.taggedHandles ?? [],
	text: post.text ?? null,
	subtitles: post.subtitles ?? null,
	subtitlesLanguage: post.subtitlesLanguage ?? null,
	ownBrand: post.account?.brand?.name ?? null,
});
