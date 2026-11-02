import type { LlmModelId } from 'src/modules/llm/constants/llm-models.constant.js';
import {
	nameSimilarity,
	namesSameHead,
	normalizeVenueName,
} from 'src/modules/venues/util/venue-names.js';

import type {
	PostClaimsAgent,
	PostClaimsAnswer,
	PostClaimsContext,
	PostClaimsReading,
} from '../agents/post-claims.agent.js';

import { type PostClaimsSource, postClaimsPlan } from './post-claims-input.js';

/** Names at least this alike are one place when the parts of a long post are merged */
const SAME_PLACE_SIMILARITY = 0.85;

/** A post as agent A read it, in one call or in parts: what `MentionExtractionService` and the eval store */
export interface PostClaimsRead {
	object: PostClaimsReading;
	usage: { totalTokens: number };
	/** The model of the first call (every call runs on the same tier) */
	model: LlmModelId;
	calls: number;
}

type Place = PostClaimsAnswer['places'][number];

/**
 * Where a name is in a list of places: the same name, one heading the other (`namesSameHead`), or
 * the most alike at `SAME_PLACE_SIMILARITY` or more; -1 when none
 */
export const placeIndex = (places: Pick<Place, 'venueName'>[], name: string): number => {
	const key = (n: string) => normalizeVenueName(n) || n.trim().toLowerCase();
	const exact = places.findIndex(p => key(p.venueName) === key(name));
	if (exact >= 0) return exact;
	const head = places.findIndex(p => namesSameHead(key(p.venueName), key(name)));
	if (head >= 0) return head;
	let best = -1;
	let score = SAME_PLACE_SIMILARITY;
	places.forEach((p, i) => {
		const s = nameSimilarity(key(p.venueName), key(name));
		if (s >= score) {
			best = i;
			score = s;
		}
	});
	return best;
};

/** A claim's place named → its index in `places`; a name on no place is no place */
const claimsOn = (claims: PostClaimsAnswer['claims'], places: Pick<Place, 'venueName'>[]) =>
	claims.map(c => {
		const i = c.subject === 'place' && c.place ? placeIndex(places, c.place) : -1;
		return { ...c, place: i >= 0 ? i : null };
	});

/** One answer as the pipeline stores it: each claim's place by its index */
export const resolvePlaces = (answer: PostClaimsAnswer): PostClaimsReading => ({
	...answer,
	claims: claimsOn(answer.claims, answer.places),
});

/**
 * The answers to a long post's parts as one: the places of the first pass, then each part's places
 * not on it yet (`placeIndex`), each part's claims on the place they name; a known place gains a
 * hint or a cuisine a later part gives, and keeps the first pass's call on whether it is a new
 * opening (it read the whole text; every part re-lists every place, so a part's call would be one
 * more chance of a false one), as the post keeps it on whether it is promotional.
 */
export const mergePostParts = (
	first: PostClaimsAnswer,
	parts: PostClaimsAnswer[],
): PostClaimsReading => {
	const places: Place[] = first.places.map(p => ({ ...p }));
	const claims: PostClaimsReading['claims'] = [];
	for (const part of parts) {
		for (const p of part.places) {
			const i = placeIndex(places, p.venueName);
			if (i < 0) places.push({ ...p });
			else {
				const known = places[i];
				known.locationHint ??= p.locationHint;
				known.cuisine ??= p.cuisine;
				known.city ??= p.city;
			}
		}
		claims.push(...claimsOn(part.claims, places));
	}
	return {
		// Whether the whole text is promotional is the first pass's call: one part's wording is not the article's
		isPromotional: first.isPromotional,
		places,
		claims,
	};
};

/**
 * Agent A on one post or article: one call for a short one; for a long one (`postClaimsPlan`) its
 * places first, then its parts side by side with that list, merged (`mergePostParts`). The one
 * way a post is read, in production and in the eval.
 */
export const readPostClaims = async (
	agent: Pick<PostClaimsAgent, 'generate'>,
	source: PostClaimsSource,
	context: PostClaimsContext,
): Promise<PostClaimsRead> => {
	const plan = postClaimsPlan(source);
	if ('single' in plan) {
		const res = await agent.generate(plan.single, context);
		return {
			object: resolvePlaces(res.object),
			usage: { totalTokens: res.usage?.totalTokens ?? 0 },
			model: res.model,
			calls: 1,
		};
	}
	const first = await agent.generate(plan.places, context);
	const answers = await Promise.all(
		plan.parts(first.object.places.map(p => p.venueName)).map(m => agent.generate(m, context)),
	);
	return {
		object: mergePostParts(
			first.object,
			answers.map(a => a.object),
		),
		usage: {
			totalTokens: [first, ...answers].reduce((n, a) => n + (a.usage?.totalTokens ?? 0), 0),
		},
		model: first.model,
		calls: 1 + answers.length,
	};
};
