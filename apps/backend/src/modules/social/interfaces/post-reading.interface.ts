import type { PostClaim } from 'src/modules/statements/services/statement.service.js';

import type { PostSkipReasonEnum, SocialPlatformEnum } from '../entities/social-post.entity.js';

/**
 * One stored post as the reading sees it, as plain data (a workflow stores it): what the gate and
 * agent A are shown is built from it in the pipeline (`read-posts`)
 */
export interface PostForReading {
	postId: string;
	externalId: string;
	cityId: string;
	cityName: string;
	platform: SocialPlatformEnum;
	/** A blog article's host; a post's handle */
	author: string | null;
	locationName: string | null;
	hashtags: string[];
	taggedHandles: string[];
	text: string | null;
	subtitles: string | null;
	subtitlesLanguage: string | null;
	/** The brand whose own account posted it (`SocialAccount.brand`) */
	ownBrand: string | null;
}

/** The gate's verdict on a post; `null` where a verdict is asked for means nothing to read (`no_content`) */
export interface GateVerdict {
	digest: boolean;
	reason: PostSkipReasonEnum | null;
}

/** One place a post talks about, as agent A answered it: a mention's fields */
export interface ReadPlace {
	venueName: string;
	locationHint: string | null;
	cuisine: string | null;
	city: string | null;
	visited: boolean;
	isNewOpening: boolean;
}

/** Agent A's reading of a whole post (parts merged): its places, its claims (each on a place by index), its tokens */
export interface PostReadingAnswer {
	isPromotional: boolean;
	places: ReadPlace[];
	claims: PostClaim[];
	tokens: number;
}
