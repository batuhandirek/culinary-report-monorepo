import type { EntityManager } from '@mikro-orm/postgresql';

import _ from 'lodash';

import type { TopicIndex } from 'src/modules/topics/util/topics.js';
import { plain } from 'src/modules/venues/util/venue-names.js';

/** A hashtag as `Hashtag.tag` stores it: no `#`, lowercased, Unicode letters kept; '' for none. */
export const normalizeHashtag = (tag: string | null | undefined): string =>
	(tag ?? '').trim().replace(/^#+/, '').toLowerCase();

/** The hashtags of a caption, in its order, once each. */
export const captionHashtags = (caption: string | null | undefined): string[] =>
	_.uniq((caption?.match(/#[\p{L}\p{N}_]+/gu) ?? []).map(h => h.slice(1)));

/**
 * Letters and digits only, accents dropped: what a tag and a brand's name or handle are compared
 * on ("Döner Pro" and #donerpro, @burger.bros and #burgerbros).
 */
export const hashtagKey = (s: string): string => plain(s).replaceAll(' ', '');

/** A brand is linked to a tag of at least this many characters, so #bar is never a brand */
export const HASHTAG_BRAND_MIN_CHARS = 4;

const CHUNK = 500;

/**
 * The `Hashtag` ids of these tags (normalized, blanks dropped), inserting the ones not stored yet.
 * Written at once, outside the unit of work, so posts flushed later can point at them and two
 * scrapes saving the same new tag don't collide.
 */
export const ensureHashtags = async (em: EntityManager, tags: string[]): Promise<Map<string, number>> => {
	const wanted = _.uniq(tags.map(normalizeHashtag).filter(Boolean));
	const ids = new Map<string, number>();
	const conn = em.getConnection();
	for (const chunk of _.chunk(wanted, CHUNK)) {
		const marks = chunk.map(() => '(?)').join(', ');
		await conn.execute(`insert into hashtags (tag) values ${marks} on conflict (tag) do nothing`, chunk);
		const rows: { id: number; tag: string }[] = await conn.execute(
			`select id, tag from hashtags where tag in (${chunk.map(() => '?').join(', ')})`,
			chunk,
		);
		for (const r of rows) ids.set(r.tag, r.id);
	}
	return ids;
};

/**
 * Tag keys (`hashtagKey`) to the brand whose name or own account handle they are; a key two brands
 * share maps to null, so it links to neither.
 */
export const hashtagBrandIndex = (
	brands: { id: string; name: string }[],
	handles: { brandId: string; handle: string }[],
): Map<string, string | null> => {
	const index = new Map<string, string | null>();
	const add = (key: string, brandId: string) => {
		if (key.length < HASHTAG_BRAND_MIN_CHARS) return;
		const current = index.get(key);
		index.set(key, current === undefined || current === brandId ? brandId : null);
	};
	for (const b of brands) add(hashtagKey(b.name), b.id);
	for (const h of handles) add(hashtagKey(h.handle), h.brandId);
	return index;
};

/**
 * What a tag names: the food topic it is as a whole (`TopicIndex.exact`: #smashburger is
 * burgers), else the one brand whose name or own account handle it is, letters and digits only
 * (#burgerbros), and only once a post carrying it mentions that brand or is by its own account
 * (so #restaurant is not a venue called "Restaurant"). A city's name or alias is neither (#berlin
 * is no German food).
 */
export const hashtagLinks = (
	tag: { id: number; tag: string },
	ctx: {
		index: TopicIndex;
		brandOf: Map<string, string | null>;
		cityKeys: ReadonlySet<string>;
		seenWith: ReadonlySet<string>;
	},
): { topicId: string | null; brandId: string | null } => {
	const key = hashtagKey(tag.tag);
	if (!key || ctx.cityKeys.has(key)) return { topicId: null, brandId: null };
	const topicKey = ctx.index.exact(tag.tag);
	// A tag that names a kind of food is never a brand (#smashburger, even with a place of that name)
	if (topicKey) return { topicId: ctx.index.get(topicKey)?.id || null, brandId: null };
	const brandId = ctx.brandOf.get(key) ?? null;
	return { topicId: null, brandId: brandId && ctx.seenWith.has(`${tag.id} ${brandId}`) ? brandId : null };
};
