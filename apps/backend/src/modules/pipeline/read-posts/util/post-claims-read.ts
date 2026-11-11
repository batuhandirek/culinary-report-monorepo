import type { LlmModelChoice, LlmModelId } from 'src/modules/llm/constants/llm-models.constant.js';
import {
	nameSimilarity,
	namesSameHead,
	normalizeVenueName,
} from 'src/modules/venues/util/venue-names.js';

import type { PostClaimsAnswer } from '../agents/post-claims.agent.js';

import { postClaimsPlan, type PostClaimsSource } from './post-claims-input.js';

/** Names at least this alike are one place when the parts of a long post are merged */
const SAME_PLACE_SIMILARITY = 0.85;

type Place = PostClaimsAnswer['places'][number];

/** A claim of a post's answer: agent A's, or the one-call reader's with B's parts beside it */
type AnswerClaim = PostClaimsAnswer['claims'][number];

/** One answer for a post (or a part of one): its places and claims, each claim naming its place */
interface PostAnswer<C extends AnswerClaim> {
	isPromotional: boolean;
	places: Place[];
	claims: C[];
}

/** An answer as the pipeline stores it: each claim's place by its index in places */
export type PostReadingOf<C extends AnswerClaim = AnswerClaim> = Omit<PostAnswer<C>, 'claims'> & {
	claims: (Omit<C, 'place'> & { place: number | null })[];
};

/** A post as a reader read it, in one call or in parts: what `MentionExtractionService` and the eval store */
export interface PostClaimsRead<C extends AnswerClaim = AnswerClaim> {
	object: PostReadingOf<C>;
	usage: { totalTokens: number; cachedInputTokens: number };
	/** The model of the first call (every call runs on the same choice) */
	model: LlmModelId;
	calls: number;
}

/** One reader's answer to one call */
interface ReaderAnswer<C extends AnswerClaim> {
	object: PostAnswer<C>;
	usage?: { totalTokens?: number; cachedInputTokens?: number };
	model: LlmModelId;
}

/**
 * What reads a post: agent A (`PostClaimsAgent`) or the one-call reader (`PostReaderAgent`). A
 * reader whose calls are child workflows (`DurableLlmService`) gives `start` too: a long post's
 * parts are then started one after the other and their answers awaited in order, since DBOS
 * replays a workflow's operations by position and `Promise.all` over them would race.
 */
export interface PostClaimsReader<C extends AnswerClaim, Context> {
	generate(
		input: string,
		context: Context,
		options?: { model?: LlmModelChoice },
	): Promise<ReaderAnswer<C>>;
	start?(
		input: string,
		context: Context,
		options?: { model?: LlmModelChoice },
	): Promise<{ getResult(): Promise<ReaderAnswer<C>> }>;
}

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
const claimsOn = <C extends AnswerClaim>(
	claims: C[],
	places: Pick<Place, 'venueName'>[],
): PostReadingOf<C>['claims'] =>
	claims.map(c => {
		const i = c.subject === 'place' && c.place ? placeIndex(places, c.place) : -1;
		return { ...c, place: i >= 0 ? i : null };
	});

/** One answer as the pipeline stores it: each claim's place by its index */
export const resolvePlaces = <C extends AnswerClaim>(answer: PostAnswer<C>): PostReadingOf<C> => ({
	...answer,
	claims: claimsOn(answer.claims, answer.places),
});

/**
 * The answers to a long post's parts as one: the places of the first pass, then each part's places
 * not on it yet (`placeIndex`), each part's claims on the place they name; a known place gains a
 * hint or a city a later part gives, and keeps the first pass's call on whether it is a new
 * opening (it read the whole text; every part re-lists every place, so a part's call would be one
 * more chance of a false one), as the post keeps it on whether it is promotional.
 */
export const mergePostParts = <C extends AnswerClaim>(
	first: PostAnswer<AnswerClaim>,
	parts: PostAnswer<C>[],
): PostReadingOf<C> => {
	const places: Place[] = first.places.map(p => ({ ...p }));
	const claims: PostReadingOf<C>['claims'] = [];
	for (const part of parts) {
		for (const p of part.places) {
			const i = placeIndex(places, p.venueName);
			if (i < 0) places.push({ ...p });
			else {
				const known = places[i];
				known.locationHint ??= p.locationHint;
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
 * A reader on one post or article: one call for a short one; for a long one (`postClaimsPlan`) its
 * places first, then its parts side by side with that list, merged (`mergePostParts`). The one
 * way a post is read, in production and in the eval, by agent A or by the one-call reader (which
 * takes the city in the message, `cityName`, and may be put on a model, `model`).
 */
export const readPostClaims = async <C extends AnswerClaim, Context>(
	agent: PostClaimsReader<C, Context>,
	source: PostClaimsSource,
	context: Context,
	opts: { cityName?: string; model?: LlmModelChoice } = {},
): Promise<PostClaimsRead<C>> => {
	const plan = postClaimsPlan(source, opts.cityName);
	const options = opts.model ? { model: opts.model } : undefined;
	// Promotional is about someone else paid or invited by a venue: a venue's own post never is
	const own = (reading: PostReadingOf<C>): PostReadingOf<C> =>
		source.ownBrand ? { ...reading, isPromotional: false } : reading;
	const usageOf = (
		answers: { usage?: { totalTokens?: number; cachedInputTokens?: number } }[],
	) => ({
		totalTokens: answers.reduce((n, a) => n + (a.usage?.totalTokens ?? 0), 0),
		cachedInputTokens: answers.reduce((n, a) => n + (a.usage?.cachedInputTokens ?? 0), 0),
	});
	if ('single' in plan) {
		const res = await agent.generate(plan.single, context, options);
		return {
			object: own(resolvePlaces(res.object)),
			usage: usageOf([res]),
			model: res.model,
			calls: 1,
		};
	}
	const first = await agent.generate(plan.places, context, options);
	const parts = plan.parts(first.object.places.map(p => p.venueName));
	let answers: ReaderAnswer<C>[];
	if (agent.start) {
		const handles: { getResult(): Promise<ReaderAnswer<C>> }[] = [];
		for (const m of parts) handles.push(await agent.start(m, context, options));
		answers = [];
		for (const handle of handles) answers.push(await handle.getResult());
	} else answers = await Promise.all(parts.map(m => agent.generate(m, context, options)));
	return {
		object: own(
			mergePostParts(
				first.object,
				answers.map(a => a.object),
			),
		),
		usage: usageOf([first, ...answers]),
		model: first.model,
		calls: 1 + answers.length,
	};
};
