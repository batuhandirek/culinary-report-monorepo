import type { EntityManager } from '@mikro-orm/postgresql';

import { PostSourceKindEnum } from '../entities/post-source.entity.js';
import { SocialPlatformEnum } from '../entities/social-post.entity.js';

/**
 * The day every source that finds a post started being recorded (YYYY-MM-DD). Before it a post
 * kept only its first source, so a window starting earlier undercounts what two sources share.
 */
export const ALL_FINDS_SINCE = '2026-10-23';

/** One thing that found a post, as a scrape saw it. */
export interface PostFind {
	kind: PostSourceKindEnum;
	/** A tag without `#`, a query, a blog's URL, or the venue's name for a venue find */
	value: string;
	/** The venue a venue find was for */
	venueId?: string;
}

/** The `PostSource` kinds that are a `CitySourceKindEnum` of the same name. */
export const CITY_SOURCE_KINDS = [
	PostSourceKindEnum.TIKTOK_HASHTAG,
	PostSourceKindEnum.TIKTOK_SEARCH,
	PostSourceKindEnum.INSTAGRAM_HASHTAG,
	PostSourceKindEnum.BLOG,
	PostSourceKindEnum.TIKTOK_ACCOUNT,
	PostSourceKindEnum.INSTAGRAM_ACCOUNT,
] as const;

/** A post found on its author's own profile: linked to the city's account source when it has one. */
export const accountFind = (platform: SocialPlatformEnum, handle: string): PostFind => ({
	kind: platform === SocialPlatformEnum.TIKTOK ? PostSourceKindEnum.TIKTOK_ACCOUNT : PostSourceKindEnum.INSTAGRAM_ACCOUNT,
	value: handle,
});

/**
 * Points finds at the city source they are (`PostSource.source`): the post's city, the same kind,
 * the same value (searches compared case-insensitively, as sources are). Run after posts are
 * flushed and when a city gains a source, so a source added again gets its history back. Raw SQL,
 * so cities can run it too.
 */
export const linkPostSources = async (em: EntityManager, cityId?: string): Promise<number> => {
	const res = await em.getConnection().execute(
		`update post_sources ps set source_id = cs.id
		from social_posts p, city_sources cs
		where ps.source_id is null and p.id = ps.post_id and cs.city_id = p.city_id
		and cs.kind::text = ps.kind::text and lower(cs.value) = lower(ps.value)
		${cityId ? 'and p.city_id = ?' : ''}`,
		cityId ? [cityId] : [],
		'run',
	);
	return (res as { affectedRows?: number }).affectedRows ?? 0;
};
