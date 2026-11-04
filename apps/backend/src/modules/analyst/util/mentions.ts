import type { AnalystMentionType } from 'sdk';

/** What an admin may write after `@`, and the type each names */
export const MENTION_TYPES: Record<string, AnalystMentionType> = {
	venue: 'venue',
	branch: 'venue',
	brand: 'brand',
	aspect: 'aspect',
	topic: 'topic',
	food: 'topic',
	term: 'term',
	wording: 'term',
	city: 'city',
	creator: 'creator',
	post: 'post',
};

/** `@Venue:9b1c…`, `@Aspect:wait_for_food`, `@Topic:ramen`: a type, a colon, an id or a key */
const MENTION_PATTERN = /@([A-Za-z]+):([A-Za-z0-9_-]+)/g;

export interface MentionRef {
	type: AnalystMentionType;
	ref: string;
	/** As written, to find it in the text */
	token: string;
}

/** Every distinct mention in a question, in the order written; unknown types are plain text */
export const parseMentions = (text: string): MentionRef[] => {
	const seen = new Set<string>();
	const refs: MentionRef[] = [];
	for (const match of text.matchAll(MENTION_PATTERN)) {
		const type = MENTION_TYPES[match[1].toLowerCase()];
		if (!type) continue;
		// A trailing hyphen is the sentence's, never an id's
		const ref = match[2].replace(/-+$/, '');
		const key = `${type}:${ref}`;
		if (seen.has(key)) continue;
		seen.add(key);
		refs.push({ type, ref, token: match[0] });
	}
	return refs;
};

/** The token the page inserts for a picked entity */
export const mentionToken = (type: AnalystMentionType, ref: string): string =>
	`@${type[0].toUpperCase()}${type.slice(1)}:${ref}`;
