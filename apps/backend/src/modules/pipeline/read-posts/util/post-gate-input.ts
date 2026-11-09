import { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';
import type { PostForReading } from 'src/modules/social/interfaces/post-reading.interface.js';

import type { PostGateInput } from '../agents/post-gate.agent.js';

// The gate reads the start of a post: enough to tell what it is about
const GATE_TEXT_CHARS = 600;
const GATE_TRANSCRIPT_CHARS = 400;

/**
 * Whether a post has anything worth judging: an article, a transcript, a tagged place, or a caption
 * with a word beyond its hashtags and handles ("📍Giri, berlin #jazzbar" names a bar; "#dublin
 * #dublinfood" alone goes nowhere). The gate judges the rest: a short caption may still be a
 * venue's own post.
 */
export const hasContent = (
	post: Pick<PostForReading, 'platform' | 'text' | 'subtitles' | 'locationName'>,
): boolean =>
	post.platform === SocialPlatformEnum.BLOG ?
		!!post.text?.trim()
	:	!!post.subtitles?.trim() ||
		!!post.locationName?.trim() ||
		(post.text ?? '').replace(/[#@][\p{L}\p{N}_.]+/gu, '').replace(/[^\p{L}]/gu, '').length >=
			3;

/** What the gate is shown of a post: the start of its caption or article and of its transcript */
export const gateInput = (post: PostForReading): PostGateInput => ({
	platform:
		post.platform === SocialPlatformEnum.BLOG ?
			`blog article on ${post.author ?? 'a food blog'}`
		:	post.platform,
	...(post.ownBrand && { ownBrand: post.ownBrand }),
	...(post.locationName && { location: post.locationName }),
	text: (post.text ?? '').slice(0, GATE_TEXT_CHARS),
	...(post.subtitles && { transcript: post.subtitles.slice(0, GATE_TRANSCRIPT_CHARS) }),
});
