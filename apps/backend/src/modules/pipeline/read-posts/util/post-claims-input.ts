import { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';
import type { PostForReading } from 'src/modules/social/interfaces/post-reading.interface.js';

/** What agent A (`PostClaimsAgent`) is shown of a post or article: plain, so the eval sends the very same */
export interface PostClaimsSource {
	platform: SocialPlatformEnum;
	/** A blog article's host; a post's handle */
	author: string | null;
	locationName: string | null;
	hashtags: string[];
	taggedHandles: string[];
	text: string | null;
	subtitles: string | null;
	subtitlesLanguage: string | null;
	/** The brand whose own account posted it (`SocialAccount.brand`): the post is about that place even when it never names itself */
	ownBrand?: string | null;
}

/** A stored post as agent A reads it */
export const postClaimsSource = (post: PostForReading): PostClaimsSource => ({
	platform: post.platform,
	author: post.author,
	locationName: post.locationName,
	hashtags: post.hashtags,
	taggedHandles: post.taggedHandles,
	text: post.text,
	subtitles: post.subtitles,
	subtitlesLanguage: post.subtitlesLanguage,
	ownBrand: post.ownBrand,
});

/**
 * Agent A's input message for one post or article. `cityName` starts it for a reader whose
 * instructions name no city (the one-call `PostReaderAgent`); agent A has its city in its instructions.
 */
export const postClaimsPrompt = (post: PostClaimsSource, cityName?: string): string => {
	const city = cityName ? [`City: ${cityName}`] : [];
	if (post.platform === SocialPlatformEnum.BLOG)
		return [
			...city,
			`Platform: blog article on ${post.author ?? 'a food blog'}`,
			`Article:\n${post.text ?? ''}`,
		].join('\n\n');
	return [
		...city,
		`Platform: ${post.platform}`,
		// In the message, not the instructions: what differs per post never breaks the cached instructions
		...(post.ownBrand ? [`Posted by the venue's own account: ${post.ownBrand}`] : []),
		`Tagged location: ${post.locationName ?? 'none'}`,
		`Hashtags: ${post.hashtags.join(', ') || 'none'}`,
		`Mentioned accounts: ${post.taggedHandles.join(', ') || 'none'}`,
		`Caption:\n${post.text ?? ''}`,
		post.subtitles ?
			`Transcript (${post.subtitlesLanguage}):\n${post.subtitles}`
		:	'Transcript: not available',
	].join('\n\n');
};

/** A text longer than this (characters, caption and transcript or article) is read in parts */
export const POST_SPLIT_ABOVE = 2_000;
/** About how long one part is: the agent reads every claim of ~1,000 characters, and fewer the longer a text gets */
export const POST_PART_CHARS = 1_500;

/**
 * A long text cut into parts of about `max` characters, at paragraph breaks, else line breaks,
 * else sentence ends, else spaces: a part never cuts a sentence it can keep whole, and the pieces
 * of a part are joined back with what they were split at (a transcript's lines stay lines).
 */
export const splitText = (text: string, max = POST_PART_CHARS): string[] => {
	const separators: [RegExp, string][] = [
		[/\n\s*\n/, '\n\n'],
		[/\n/, '\n'],
		[/(?<=[.!?…])\s+/, ' '],
		[/\s+/, ' '],
	];
	// Each piece with the separator it followed
	const pieces = (t: string, level: number, joint: string): { text: string; joint: string }[] => {
		if (t.length <= max || level >= separators.length) return [{ text: t, joint }];
		const [pattern, glue] = separators[level];
		return t.split(pattern).flatMap((p, k) => pieces(p, level + 1, k === 0 ? joint : glue));
	};
	const parts: string[] = [];
	let current = '';
	for (const piece of pieces(text.trim(), 0, '')) {
		const t = piece.text.trim();
		if (!t) continue;
		const joined = current ? `${current}${piece.joint || '\n\n'}${t}` : t;
		if (current && joined.length > max) {
			parts.push(current);
			current = t;
		} else current = joined;
	}
	if (current) parts.push(current);
	return parts;
};

/** Characters of the part before that a part is shown, so it knows which place it goes on about */
export const POST_PART_CONTEXT_CHARS = 400;
/** Characters of the field a part is not about that it is shown, for names and spellings */
export const POST_CONTEXT_FIELD_CHARS = 1_000;

// The end of a part, `POST_PART_CONTEXT_CHARS` at most
const tail = (chunk: string) =>
	chunk.length <= POST_PART_CONTEXT_CHARS ? chunk : `…${chunk.slice(-POST_PART_CONTEXT_CHARS)}`;

/** The fields a post's claims are read from: an article's text; a post's caption, then its transcript */
const bodyFields = (post: PostClaimsSource): ('text' | 'subtitles')[] =>
	post.platform === SocialPlatformEnum.BLOG ? ['text'] : ['text', 'subtitles'];

/**
 * How agent A reads a post: one message for a short one; for a long one (`POST_SPLIT_ABOVE`) a
 * first message for its places only, then one message per part, each field cut on its own (an
 * article's text; a post's caption, then its transcript), every piece of text read for claims
 * exactly once: a part shows the post's other field only as context, marked so
 * (`readPostClaims` sends them and merges the answers).
 */
export const postClaimsPlan = (
	post: PostClaimsSource,
	cityName?: string,
): { single: string } | { places: string; parts: (places: string[]) => string[] } => {
	const length = (post.text?.length ?? 0) + (post.subtitles?.length ?? 0);
	if (length <= POST_SPLIT_ABOVE) return { single: postClaimsPrompt(post, cityName) };
	const fields = bodyFields(post);
	const chunks = fields.flatMap(field =>
		post[field]?.trim() ? splitText(post[field]!).map(text => ({ field, text })) : [],
	);
	if (chunks.length < 2) return { single: postClaimsPrompt(post, cityName) };
	const what = (field: 'text' | 'subtitles') =>
		post.platform === SocialPlatformEnum.BLOG ? 'article'
		: field === 'subtitles' ? 'transcript'
		: 'caption';
	const context = (field: 'text' | 'subtitles') => {
		const value = post[field];
		if (!value?.trim()) return value;
		const shown =
			value.length > POST_CONTEXT_FIELD_CHARS ?
				`${value.slice(0, POST_CONTEXT_FIELD_CHARS)}…`
			:	value;
		return `[context only: its claims are read in other parts]\n${shown}`;
	};
	return {
		places:
			postClaimsPrompt(post, cityName) +
			'\n\nThis text is long and its claims are read in parts after this: for now give every place it talks ' +
			'about, in the order it first names them, and whether it is promotional; give no claims.',
		parts: places =>
			chunks.map(({ field, text }, k) => {
				const before = k > 0 && chunks[k - 1].field === field ? chunks[k - 1].text : null;
				const other = fields.find(f => f !== field);
				const ofField = chunks.filter(c => c.field === field);
				return (
					postClaimsPrompt(
						{
							...post,
							[field]: text,
							...(other && { [other]: context(other) }),
						},
						cityName,
					) +
					`\n\nThis is part ${ofField.indexOf(chunks[k]) + 1} of ${ofField.length} of the ${what(field)}; the ` +
					'other parts are read apart. ' +
					(before ?
						`The text just before this part ends: «${tail(before)}»; this part may go on about the place it was ` +
						'about (its claims are read with that part, never give them here). '
					:	'') +
					`The places of the whole text: ${places.join('; ') || 'none'}. ` +
					'Give the claims of this part only, each about the place it is about even when this part does not repeat ' +
					'its name. As places give that list, then any place this part talks about that is not on it; a claim ' +
					'about a place names it as on that list.'
				);
			}),
	};
};
