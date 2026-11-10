import { FilterQuery } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityNames } from 'src/modules/cities/util/city.js';
import { MentionTopicService } from 'src/modules/topics/services/mention-topic.service.js';
import { VenueTopicService } from 'src/modules/topics/services/venue-topic.service.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { brandKey, siteNamedAfter } from 'src/modules/venues/util/brands.js';
import {
	cityStopwords,
	hintNamesStreet,
	isFoodVenue,
	isInCity,
	nameSimilarity,
	normalizeVenueName,
	plain,
	venueAliases,
} from 'src/modules/venues/util/venue-names.js';

import { Mention, MentionMatchMethodEnum } from '../entities/mention.entity.js';
import { SocialPlatformEnum } from '../entities/social-post.entity.js';
import { normalizeAccountHandle, ownPostSql } from '../util/accounts.js';
import { profileSearchName } from '../util/profile-places.js';

import { HashtagService } from './hashtag.service.js';

// Accepted without asking the LLM
const AUTO_SCORE = 0.9;
// Below this a candidate is not worth showing to the LLM
const CANDIDATE_SCORE = 0.45;
// Candidates shown: one-branch namesakes ("City Chicken" ×5) must not crowd out the one meant
const MAX_CANDIDATES = 8;
// An admin's correction: matching never overwrites these
const ADMIN_METHODS = [MentionMatchMethodEnum.MANUAL, MentionMatchMethodEnum.IGNORED];
// How far a brand's best branch must score ahead of its next one to be the branch the post means
const BRANCH_LEAD = 0.05;
// A code pass's candidates serve the per-mention plans after it this long (a city's are thousands of venues)
const CANDIDATES_CACHE_MS = 10 * 60_000;

export interface MatchCandidate {
	id: string;
	name: string;
	category: string | null;
	district: string | null;
	street: string | null;
	aliases: string[];
	/** The brand it is a branch of */
	brandId: string;
	brandName: string;
	/** The brand's open branches in the city: more than one makes it a chain */
	branchCount: number;
	reviewsCount?: number | null;
	/** Name similarity alone */
	raw: number;
	/** With the location boosts */
	score: number;
	/**
	 * For a chain: whether the post means this branch (it scored clearly ahead of the chain's
	 * other branches); else it names the brand only. Always true for a one-branch brand.
	 */
	branchKnown: boolean;
	/** For a chain: how many of its branches were candidates */
	branches?: number;
}

export type CandidateVenue = Omit<MatchCandidate, 'raw' | 'score' | 'branchKnown' | 'branches'>;

/** A hint that says it is a guess ("implied", "inferred", "not stated") places nothing */
const GUESSED_HINT = /\b(implied|inferred|not stated|unclear|guess)/i;

/**
 * Whether where the post says the place is speaks against a brand: the hint names a district or a
 * street the city's venues are in, and none of the brand's branches is in one of them ("Velvet
 * Coffee, Schöneberg" and the Velvet bar in Neukölln). Never a verdict on its own ("near Rosenthaler
 * Platz" is a square a Torstraße branch is next to; Kreuzkölln is filed under Neukölln): it only
 * keeps a sure name match from being accepted in code, so the LLM, which knows the city, decides.
 * A hint naming nothing the venues know, or calling itself implied, speaks against nothing.
 */
export const hintElsewhere = (
	hint: string | null | undefined,
	venues: CandidateVenue[],
): ((brandId: string) => boolean) => {
	if (!hasHint(hint) || GUESSED_HINT.test(hint!)) return () => false;
	const words = ` ${plain(hint!).replace(/\s+/g, ' ')} `;
	const districts = new Set(
		_.uniq(venues.map(v => v.district).filter((d): d is string => !!d)).filter(d =>
			d
				.split('-')
				.some(part => plain(part).length >= 3 && words.includes(` ${plain(part)} `)),
		),
	);
	const streets = new Set(
		_.uniq(venues.map(v => v.street).filter((st): st is string => !!st)).filter(st =>
			hintNamesStreet(hint!, st),
		),
	);
	if (!districts.size && !streets.size) return () => false;
	const byBrand = _.groupBy(venues, v => v.brandId);
	return brandId => {
		const branches = (byBrand[brandId] ?? []).filter(v => v.district || v.street);
		return (
			branches.length > 0 &&
			!branches.some(
				v =>
					(!!v.district && districts.has(v.district)) ||
					(!!v.street && streets.has(v.street)),
			)
		);
	};
};

/**
 * The venues a mention could mean, best first: name similarity, plus a boost when the creator
 * tagged that exact place or the location hint names its district or street. `cityWords` are the
 * city's stopwords (`cityStopwords`), dropped from names on both sides. A chain's branches are
 * one candidate: the one branch the creator tagged, else the best-scored one. `branchKnown`
 * when one was tagged; when the post names more than the brand, when the closest name is
 * `BRANCH_LEAD` ahead of the next ("Burgermeister Kottbusser Tor"); when it names only the brand,
 * when a hint naming one branch's district or street puts it that far ahead (the name alone
 * would pick a branch called just like the brand). At most `MAX_CANDIDATES`.
 */
export const rankCandidates = (
	mention: Pick<Mention, 'venueName' | 'locationHint'>,
	taggedLocation: string | null | undefined,
	venues: CandidateVenue[],
	cityWords?: ReadonlySet<string>,
): MatchCandidate[] => {
	const name = normalizeVenueName(mention.venueName, cityWords);
	const tagged = taggedLocation ? normalizeVenueName(taggedLocation, cityWords) : null;
	const hint = normalizeVenueName(mention.locationHint ?? '', cityWords);
	const mentionKey = brandKey(mention.venueName, cityWords);
	const scored = venues
		.map(venue => {
			const raw = Math.max(...venue.aliases.map(alias => nameSimilarity(name, alias)));
			const isTagged = !!tagged && venue.aliases.includes(tagged);
			let total = raw;
			if (isTagged) total += 0.15;
			const named =
				(!!venue.district && !!hint && hint.includes(normalizeVenueName(venue.district))) ||
				(!!venue.street &&
					!!mention.locationHint &&
					hintNamesStreet(mention.locationHint, venue.street));
			if (named) total += 0.1;
			// `total` is uncapped, so a hint still tells two exact-named branches apart
			return { ...venue, raw, score: Math.min(total, 1), total, isTagged, branchKnown: true };
		})
		.filter(c => c.score >= CANDIDATE_SCORE)
		.sort((a, b) => b.total - a.total);

	// A chain is one candidate: the one tagged branch, else its best one, known when well ahead
	const out: MatchCandidate[] = [];
	const seen = new Set<string>();
	for (const c of scored) {
		if (c.branchCount <= 1) {
			out.push(strip(c));
			continue;
		}
		if (seen.has(c.brandId)) continue;
		seen.add(c.brandId);
		const branches = scored.filter(b => b.brandId === c.brandId);
		const tagged = branches.filter(b => b.isTagged);
		let pick = c;
		let known: boolean;
		if (tagged.length === 1) {
			pick = tagged[0];
			known = true;
		} else if (mentionKey.startsWith(`${brandKey(c.brandName, cityWords)} `)) {
			// The post names more than the brand ("Burgermeister Kottbusser Tor"): the closest name wins
			known = !branches[1] || c.total - branches[1].total >= BRANCH_LEAD;
		} else {
			// Only the brand: a bare-named branch would win on the name alone, so only a hint decides
			const boost = (b: (typeof branches)[number]) => b.total - b.raw;
			const [first, second] = _.orderBy(branches, [boost], ['desc']);
			known = boost(first) > 0 && boost(first) - (second ? boost(second) : 0) >= BRANCH_LEAD;
			if (known) pick = first;
		}
		out.push({ ...strip(pick), score: c.score, branchKnown: known, branches: branches.length });
	}
	return out.slice(0, MAX_CANDIDATES);
};

// Enough to tell whether a mention's address is one of a chain's
const MAX_BRANCH_LOCATIONS = 15;

/**
 * Where a brand's open branches in the city are: what lets the LLM rule out a namesake elsewhere,
 * and pick the branch a mention means by its id.
 */
const branchLocations = (venues: CandidateVenue[], brandId: string) =>
	_.orderBy(
		venues.filter(v => v.brandId === brandId),
		[v => v.reviewsCount ?? 0],
		['desc'],
	)
		.slice(0, MAX_BRANCH_LOCATIONS)
		.map(v => ({ id: v.id, district: v.district, street: v.street }));

/** Whether the hint names the streets of two or more of a brand's branches: then it means none of them. */
const namesSeveralBranches = (
	hint: string | null | undefined,
	venues: CandidateVenue[],
	brandId: string,
): boolean =>
	!!hint &&
	venues.filter(v => v.brandId === brandId && !!v.street && hintNamesStreet(hint, v.street))
		.length >= 2;

/** A location hint with words in it ("/", "." or a postcode alone place nothing). */
const hasHint = (hint: string | null | undefined): boolean =>
	!!hint && plain(hint).replace(/\d+/g, '').trim().length >= 3;

const strip = <T extends { total: number; isTagged: boolean }>({
	total: _t,
	isTagged: _i,
	...c
}: T) => c;

/** Accepted without the LLM: confident, and clearly ahead of the runner-up. */
export const autoMatch = (candidates: MatchCandidate[]): MatchCandidate | null => {
	const [best, second] = candidates;
	return best && best.score >= AUTO_SCORE && (!second || best.score - second.score >= 0.1) ?
			best
		:	null;
};

/** A city's venues (brand populated) as matching candidates: the open food venues, each with its brand's branch count */
export const toCandidateVenues = (
	venues: Venue[],
	words: ReadonlySet<string>,
): CandidateVenue[] => {
	const food = venues.filter(v => !v.closed && isFoodVenue(v.category));
	const branchCount = _.countBy(food, v => v.brand.id);
	return food.map(v => ({
		id: v.id,
		name: v.name,
		category: v.category ?? null,
		district: v.district ?? null,
		street: v.street ?? null,
		aliases: venueAliases(v.name, words),
		brandId: v.brand.id,
		brandName: v.brand.name,
		branchCount: branchCount[v.brand.id],
		reviewsCount: v.reviewsCount ?? null,
	}));
};

/** One place a post names, as matching reads it */
export interface MatchInput {
	venueName: string;
	locationHint: string | null;
	cuisine: string | null;
	/** The city the post says the place is in */
	city: string | null;
	/** The post's account: a venue posting about itself spells its own name right */
	author: string | null;
	taggedLocation: string | null;
	/** What the post says about it (a mention has no summary of its own): its first claims */
	said: string[];
	/**
	 * The brands' own accounts the post tags (Instagram's @-mentions, co-authors, photo tags), and
	 * the one the mention's name is when it is written as a handle (`taggedAccountsOf`)
	 */
	taggedAccounts?: readonly TaggedAccount[];
}

/** A brand's own account (`SocialAccount.brand`, a branch's own with `branchId`), as matching reads it. */
export interface TaggedAccount {
	handle: string;
	brandId: string;
	branchId: string | null;
}

/**
 * The place a mention is when the post tags the brand's own account named after it (the mention
 * "lucys.berlin" or "Lucy's" and the tag @lucys.berlin, linked to Lucy's): the brand calls itself
 * that, so no name similarity is needed and two look-alike places are told apart. The account's
 * handle is the mention's name written as a handle, or named after it (`siteNamedAfter`); tags
 * pointing at two brands decide nothing. The branch: the account's own branch, a one-branch
 * brand's place, or the one branch the location hint names; else the brand alone. Only a brand
 * with an open food venue in the city.
 */
export const taggedAccountPick = (
	mention: Pick<MatchInput, 'venueName' | 'locationHint' | 'taggedAccounts'>,
	venues: CandidateVenue[],
	words: ReadonlySet<string>,
): MatchDecision | null => {
	if (!mention.taggedAccounts?.length) return null;
	const asHandle = normalizeAccountHandle(mention.venueName);
	const picks = mention.taggedAccounts.filter(
		a =>
			(a.handle === asHandle || siteNamedAfter(a.handle, mention.venueName, words)) &&
			venues.some(v => v.brandId === a.brandId),
	);
	const brandIds = _.uniq(picks.map(p => p.brandId));
	if (brandIds.length !== 1) return null;
	const branches = venues.filter(v => v.brandId === brandIds[0]);
	const own = picks.find(p => p.branchId && branches.some(b => b.id === p.branchId));
	const hint = mention.locationHint;
	const hinted =
		hasHint(hint) && !GUESSED_HINT.test(hint!) ?
			branches.filter(
				b =>
					(!!b.street && hintNamesStreet(hint!, b.street)) ||
					(!!b.district && ` ${plain(hint!)} `.includes(` ${plain(b.district)} `)),
			)
		:	[];
	const venueId =
		own?.branchId ??
		(branches.length === 1 ? branches[0].id
		: hinted.length === 1 ? hinted[0].id
		: null);
	return { method: MentionMatchMethodEnum.ACCOUNT, brandId: brandIds[0], venueId, score: 1 };
};

/**
 * The tagged accounts of one mention: the post's tagged handles (Instagram only: TikTok's are
 * display names, not handles), and the mention's name when it is written as a handle ("@x", or
 * with a dot or an underscore), each that is a brand's own account (`accounts`, by
 * `platform:handle`).
 */
export const taggedAccountsOf = (
	post: { platform: SocialPlatformEnum; taggedHandles?: string[] | null },
	venueName: string,
	accounts: ReadonlyMap<string, TaggedAccount>,
): TaggedAccount[] => {
	const handles = new Set<string>();
	if (post.platform === SocialPlatformEnum.INSTAGRAM)
		for (const tag of post.taggedHandles ?? []) {
			const handle = normalizeAccountHandle(tag);
			if (handle) handles.add(handle);
		}
	const name = venueName.trim();
	if (/^@/.test(name) || /^[\w]+[._][\w.]+$/.test(name)) {
		const handle = normalizeAccountHandle(name);
		if (handle) handles.add(handle);
	}
	return [...handles]
		.map(h => accounts.get(`${post.platform}:${h}`))
		.filter((a): a is TaggedAccount => !!a);
};

export interface MatchDecision {
	method: MentionMatchMethodEnum;
	brandId: string | null;
	/** The branch, only when the post says which */
	venueId: string | null;
	score: number | null;
}

/** `VenueMatchAgent`'s answer */
export interface MatchAnswer {
	venueId: string | null;
	branchId: string | null;
}

/** One `VenueMatchAgent` call: the input message in, its answer out */
export type MatchAsk = (message: string) => Promise<MatchAnswer>;

/** A candidate the agent is offered, with what reading its answer needs */
export interface OfferedCandidate {
	id: string;
	brandId: string;
	score: number;
	branchKnown: boolean;
	/** A chain whose branch is unknown: its branches in the city (an answer naming one is the chain) */
	branchIds: string[];
	/** The hint names the streets of two or more of its branches: then no branch is taken */
	severalBranches: boolean;
}

/**
 * What matching asks `VenueMatchAgent` about one place: the message, and what reading the answer
 * needs, as plain data (a mention's own run keeps it between its plan and its save). `pick`: the
 * close calls, one of them or none; `branch`: a sure chain's branch, or none of its branches
 * (another place of the same name).
 */
export interface MatchQuestion {
	kind: 'pick' | 'branch';
	message: string;
	offered: OfferedCandidate[];
	/** The sure pick's method, which a branch question keeps (exact or fuzzy) */
	method: MentionMatchMethodEnum;
	/** The best candidate's score: the decision's when nothing is picked */
	topScore: number | null;
}

/** What matching decides for one place in code, or the one question it must ask first */
export type MatchPlan = { decision: MatchDecision } | { question: MatchQuestion };

/**
 * What matching decides for one place without the LLM (`decideMatch` is the whole of it): another
 * city's is `other_city`; else a tagged own account, else the ranked candidates, a sure name match
 * accepted in code, the close calls a question for the LLM, and a sure chain whose hint the code
 * couldn't place a question for the branch alone.
 */
export const planMatch = (
	mention: MatchInput,
	venues: CandidateVenue[],
	names: string[],
	words: ReadonlySet<string>,
): MatchPlan => {
	if (!isInCity(mention.city, names))
		return {
			decision: {
				method: MentionMatchMethodEnum.OTHER_CITY,
				brandId: null,
				venueId: null,
				score: null,
			},
		};

	// The brand's own account, tagged and named after the place: what the brand calls itself
	const tagged = taggedAccountPick(mention, venues, words);
	if (tagged) return { decision: tagged };

	const candidates = rankCandidates(mention, mention.taggedLocation, venues, words);
	// A sure name the hint places elsewhere is the LLM's call, never the code's
	const elsewhere = hintElsewhere(mention.locationHint, venues);
	let picked = autoMatch(candidates);
	if (picked && elsewhere(picked.brandId)) picked = null;
	const method =
		picked ?
			picked.raw === 1 ?
				MentionMatchMethodEnum.EXACT
			:	MentionMatchMethodEnum.FUZZY
		:	MentionMatchMethodEnum.NONE;
	const topScore = candidates[0]?.score ?? null;

	const question = (kind: MatchQuestion['kind'], offered: MatchCandidate[]): MatchQuestion => ({
		kind,
		message: JSON.stringify({
			mention: {
				name: mention.venueName,
				author: mention.author,
				locationHint: mention.locationHint,
				cuisine: mention.cuisine,
				said: mention.said.slice(0, 5),
				taggedLocation: mention.taggedLocation,
			},
			// A chain whose branch is unknown is offered as the brand, with where its branches are
			candidates: offered.map(c => ({
				id: c.id,
				name: !c.branchKnown ? c.brandName : c.name,
				category: c.category,
				...(!c.branchKnown ?
					{ branches: c.branches, locations: branchLocations(venues, c.brandId) }
				:	{ district: c.district, street: c.street }),
			})),
		}),
		offered: offered.map(c => ({
			id: c.id,
			brandId: c.brandId,
			score: c.score,
			branchKnown: c.branchKnown,
			branchIds:
				c.branchKnown ? [] : venues.filter(v => v.brandId === c.brandId).map(v => v.id),
			severalBranches:
				!c.branchKnown && namesSeveralBranches(mention.locationHint, venues, c.brandId),
		})),
		method,
		topScore,
	});

	if (!picked && candidates.length > 0) return { question: question('pick', candidates) };
	if (
		picked &&
		!picked.branchKnown &&
		hasHint(mention.locationHint) &&
		!names.some(n => plain(n).trim() === plain(mention.locationHint!).trim()) &&
		!namesSeveralBranches(mention.locationHint, venues, picked.brandId)
	)
		// The chain is sure but the code couldn't place the hint ("near Rosenthaler Platz",
		// "Prenzlauer Berg"): the LLM picks the branch, or none
		return { question: question('branch', [picked]) };

	// A chain's branch only when the post says which: else the brand alone
	return {
		decision: {
			method,
			brandId: picked?.brandId ?? null,
			venueId: picked?.branchKnown ? picked.id : null,
			score: picked?.score ?? topScore,
		},
	};
};

/** The decision a question's answer gives: pure, from the question alone */
export const settleMatch = (question: MatchQuestion, answer: MatchAnswer): MatchDecision => {
	const { offered } = question;
	// A chain is offered by one branch's id; a model may answer with another of its branches' ids:
	// still the chain (the branch only from `branchId`, never a guess)
	const chosen =
		offered.find(c => c.id === answer.venueId) ??
		offered.find(
			c => !c.branchKnown && !!answer.venueId && c.branchIds.includes(answer.venueId),
		) ??
		null;
	// The model sometimes picks one of several branches a post lists: the streets decide that
	const branchId =
		(
			chosen &&
			!chosen.branchKnown &&
			answer.branchId &&
			!chosen.severalBranches &&
			chosen.branchIds.includes(answer.branchId)
		) ?
			answer.branchId
		:	null;
	if (question.kind === 'branch')
		// None of the chain's branches is where the post says: another place of the same name
		return chosen ?
				{
					method: question.method,
					brandId: chosen.brandId,
					venueId: branchId,
					score: chosen.score,
				}
			:	{
					method: MentionMatchMethodEnum.NONE,
					brandId: null,
					venueId: null,
					score: question.topScore,
				};
	return {
		method: chosen ? MentionMatchMethodEnum.LLM : MentionMatchMethodEnum.NONE,
		brandId: chosen?.brandId ?? null,
		venueId: chosen?.branchKnown ? chosen.id : branchId,
		score: chosen?.score ?? question.topScore,
	};
};

/**
 * What matching decides for one place (`MentionMatchingService` writes it on the mention, the eval
 * scores it): `planMatch`, then, when it has a question, the agent's answer read by `settleMatch`.
 */
export const decideMatch = async (
	mention: MatchInput,
	venues: CandidateVenue[],
	names: string[],
	words: ReadonlySet<string>,
	askAgent: MatchAsk,
): Promise<MatchDecision> => {
	const plan = planMatch(mention, venues, names, words);
	if ('decision' in plan) return plan.decision;
	return settleMatch(plan.question, await askAgent(plan.question.message));
};

/** What a pass of matching in code did: the methods it settled, and the mentions only the agent can */
export interface MatchPass {
	counts: Record<MentionMatchMethodEnum, number>;
	/** The close calls: each its own run (`match-mentions.mention`), the agent asked there */
	asks: number[];
}

/** One mention's plan for its own run, with its city (the ledger files the agent's call under it) */
export type MentionMatchPlan = { cityId: string } & MatchPlan;

const emptyCounts = () =>
	Object.fromEntries(Object.values(MentionMatchMethodEnum).map(m => [m, 0])) as Record<
		MentionMatchMethodEnum,
		number
	>;

const isCorrected = (mention: Mention) =>
	!!mention.matchMethod && ADMIN_METHODS.includes(mention.matchMethod);

@Injectable()
export class MentionMatchingService {
	private readonly logger = new Logger(MentionMatchingService.name);

	/** Each city's candidates as the last code pass loaded them, for the mentions' own plans after it */
	private readonly candidatesCache = new Map<
		string,
		{ at: number; venues: Promise<CandidateVenue[]> }
	>();
	private accountsCache: { at: number; accounts: Promise<Map<string, TaggedAccount>> } | null =
		null;

	constructor(
		private readonly em: EntityManager,
		private readonly cityService: CityService,
		private readonly mentionTopicService: MentionTopicService,
		private readonly venueTopicService: VenueTopicService,
		private readonly hashtagService: HashtagService,
	) {}

	/**
	 * A match moves what a mention is about when its cuisine named nothing (its venue's category),
	 * and what its venue's tags read: the mentions' topics now, their cities' venue tags by job.
	 */
	private async relinkFood(mentions: Mention[]): Promise<void> {
		if (!mentions.length) return;
		await this.mentionTopicService.relink({ mentionIds: mentions.map(m => m.id) });
		await this.venueTopicService.queueCityRefresh(_.uniq(mentions.map(m => m.post.city.id)));
	}

	/**
	 * Links mentions to venues of the post's city (of one city, or of every city without
	 * `cityId`), in code: what it settles is saved (`decideInCode`), and the close calls, which only
	 * `VenueMatchAgent` can settle, are left as they were and listed in `asks` for their own runs
	 * (`match-mentions.mention`: `planMention`, the agent, `saveMatch`). Unmatched ones are only
	 * retried when the city got venues since their last attempt (a Google Maps lookup); `rematch`
	 * redoes every mention except the ones an admin corrected (`MANUAL`, `IGNORED`), which are
	 * never touched.
	 */
	async match(opts: { cityId?: string; rematch?: boolean } = {}): Promise<MatchPass> {
		const pass: MatchPass = { counts: emptyCounts(), asks: [] };
		const cities =
			opts.cityId ?
				[await this.cityService.getById(opts.cityId)]
			:	await this.cityService.list();
		for (const city of cities) await this.matchCity(city, !!opts.rematch, pass);
		return pass;
	}

	/**
	 * These mentions matched in code, the ones never matched and not corrected: one post's places
	 * right after its reading (`read-posts.post`). What is sure is saved and its food topics relinked;
	 * the close calls are listed in `asks` for their own runs. Against the last pass's venues and
	 * accounts (cached): a post is no city-wide pass, so the tags' brands are left to the city's run
	 * (`HashtagService.relink` reads every tag).
	 */
	async matchMentions(mentionIds: number[]): Promise<MatchPass> {
		const pass: MatchPass = { counts: emptyCounts(), asks: [] };
		if (!mentionIds.length) return pass;
		const mentions = await this.em.find(
			Mention,
			{
				$and: [
					{ id: { $in: mentionIds } },
					{ matchedAt: null },
					{ $or: [{ matchMethod: null }, { matchMethod: { $nin: ADMIN_METHODS } }] },
				],
			},
			{ populate: ['post', 'post.city', 'statements'] },
		);
		if (!mentions.length) return pass;
		const accounts = await this.brandAccounts();
		for (const group of Object.values(_.groupBy(mentions, m => m.post.city.id))) {
			const city = group[0].post.city;
			const words = cityStopwords(city.nameStopwords);
			await this.decideInCode(
				group,
				await this.candidateVenues(city, words),
				cityNames(city),
				words,
				accounts,
				pass,
				{ relinkTags: false },
			);
		}
		return pass;
	}

	private async matchCity(city: City, rematch: boolean, pass: MatchPass): Promise<void> {
		const words = cityStopwords(city.nameStopwords);
		const venues = await this.candidateVenues(city, words, { fresh: true });
		const mentions = await this.em.find(Mention, await this.toMatch(city, rematch), {
			populate: ['post', 'statements'],
		});
		this.logger.log(
			`Matching ${mentions.length} mentions against ${venues.length} venues of ${city.name}`,
		);

		const names = cityNames(city);
		const accounts = await this.brandAccounts({ fresh: true });
		await this.decideInCode(mentions, venues, names, words, accounts, pass);
		await this.sweepTags(city, venues, words, accounts, pass.counts);
	}

	/**
	 * Every brand's own account on Instagram and TikTok, by `platform:handle`: what a post's tags can
	 * point at. A code pass reads them fresh; a mention's own plan takes the last pass's.
	 */
	private brandAccounts({ fresh = false } = {}): Promise<Map<string, TaggedAccount>> {
		if (
			!fresh &&
			this.accountsCache &&
			Date.now() - this.accountsCache.at < CANDIDATES_CACHE_MS
		)
			return this.accountsCache.accounts;
		const accounts = this.readBrandAccounts();
		this.accountsCache = { at: Date.now(), accounts };
		accounts.catch(() => (this.accountsCache = null));
		return accounts;
	}

	private async readBrandAccounts(): Promise<Map<string, TaggedAccount>> {
		const rows: {
			platform: string;
			handle: string;
			brand_id: string;
			branch_id: string | null;
		}[] = await this.em.getConnection().execute(
			`select platform, handle, brand_id, branch_id from social_accounts
				where brand_id is not null and handle_lost_at is null and platform in (?, ?)`,
			[SocialPlatformEnum.INSTAGRAM, SocialPlatformEnum.TIKTOK],
		);
		return new Map(
			rows.map(r => [
				`${r.platform}:${r.handle}`,
				{ handle: r.handle, brandId: r.brand_id, branchId: r.branch_id },
			]),
		);
	}

	/**
	 * The city's unmatched mentions (`none`) a tagged own account now places (`taggedAccountPick`),
	 * matched in code with no LLM: an account linked since their last attempt (a profile read, a
	 * site, an admin) settles them, though no venue was added. Flushes.
	 */
	private async sweepTags(
		city: City,
		venues: CandidateVenue[],
		words: ReadonlySet<string>,
		accounts: ReadonlyMap<string, TaggedAccount>,
		counts: Record<MentionMatchMethodEnum, number>,
	): Promise<void> {
		const rows: { id: number }[] = await this.em.getConnection().execute(
			`select m.id from mentions m join social_posts p on p.id = m.post_id
			where p.city_id = ? and m.match_method = ?
			and ((p.platform = ? and jsonb_array_length(coalesce(p.tagged_handles, '[]'::jsonb)) > 0) or m.venue_name ~ '^@|^\\w+[._]')`,
			[city.id, MentionMatchMethodEnum.NONE, SocialPlatformEnum.INSTAGRAM],
		);
		if (!rows.length || !accounts.size) return;
		const matched: Mention[] = [];
		for (const ids of _.chunk(
			rows.map(r => r.id),
			1000,
		)) {
			for (const mention of await this.em.find(
				Mention,
				{ id: { $in: ids } },
				{ populate: ['post'] },
			)) {
				const decision = taggedAccountPick(
					{
						venueName: mention.venueName,
						locationHint: mention.locationHint ?? null,
						taggedAccounts: taggedAccountsOf(mention.post, mention.venueName, accounts),
					},
					venues,
					words,
				);
				if (!decision) continue;
				Object.assign(mention, {
					brand: this.em.getReference(Brand, decision.brandId!),
					venue: decision.venueId ? this.em.getReference(Venue, decision.venueId) : null,
					matchMethod: decision.method,
					matchScore: decision.score,
					matchedAt: new Date(),
				});
				counts[decision.method]++;
				matched.push(mention);
			}
		}
		if (!matched.length) return;
		await this.em.flush();
		this.logger.log(
			`Matched ${matched.length} unmatched mentions of ${city.name} by their tagged own accounts`,
		);
		await this.relinkFood(matched);
		await this.hashtagService.relink();
	}

	/**
	 * The city's unmatched mentions a tagged own account places, matched with no LLM
	 * (`sweepTags`): after the account matcher linked accounts from their profiles. Every `match`
	 * runs it too.
	 */
	async matchByTags(cityId: string): Promise<Record<MentionMatchMethodEnum, number>> {
		const counts = emptyCounts();
		const city = await this.cityService.getById(cityId);
		const words = cityStopwords(city.nameStopwords);
		// Fresh: the account matcher may have linked accounts since the city's code pass
		await this.sweepTags(
			city,
			await this.candidateVenues(city, words, { fresh: true }),
			words,
			await this.brandAccounts({ fresh: true }),
			counts,
		);
		return counts;
	}

	/**
	 * The city's mentions a `match` would take: never matched, or unmatched since before the
	 * city's newest venue (a lookup may have added theirs); with `rematch` every one an admin
	 * didn't correct.
	 */
	private async toMatch(city: City, rematch: boolean): Promise<FilterQuery<Mention>> {
		// `not in` drops nulls, so a never-matched mention needs its own branch
		const notCorrected: FilterQuery<Mention> = {
			$or: [{ matchMethod: null }, { matchMethod: { $nin: ADMIN_METHODS } }],
		};
		if (rematch) return { $and: [notCorrected, { post: { city } }] };
		const [newestVenue] = await this.em.find(
			Venue,
			{ city },
			{ orderBy: { createdAt: 'desc' }, limit: 1 },
		);
		return {
			$and: [
				notCorrected,
				{ post: { city } },
				{
					$or: [
						{ matchedAt: null },
						{
							brand: null,
							matchMethod: { $ne: MentionMatchMethodEnum.OTHER_CITY },
							matchedAt: { $lt: newestVenue?.createdAt ?? new Date(0) },
						},
					],
				},
			],
		};
	}

	/** How many of the city's mentions the next `match` would take: the reading's "caught up" check */
	async pendingCount(cityId: string): Promise<number> {
		return this.em.count(
			Mention,
			await this.toMatch(await this.cityService.getById(cityId), false),
		);
	}

	/**
	 * Decides each mention in code and saves what that settles (flushed; their food topics and the
	 * tags relinked). A close call is left as it was, `matchedAt` too, so the next pass takes it
	 * again until its own run settles it, and listed in `asks`; with `markDue` its `matchedAt` is
	 * cleared, so the city's next matching run takes it (a rematch outside a city's run). Without
	 * `relinkTags` the tags' brands wait for the city's run.
	 */
	private async decideInCode(
		mentions: Mention[],
		venues: CandidateVenue[],
		names: string[],
		words: ReadonlySet<string>,
		accounts: ReadonlyMap<string, TaggedAccount>,
		pass: MatchPass,
		{ markDue = false, relinkTags = true } = {},
	): Promise<void> {
		const decided: Mention[] = [];
		for (const mention of mentions) {
			const plan = planMatch(this.matchInput(mention, accounts), venues, names, words);
			if ('question' in plan) {
				pass.asks.push(mention.id);
				if (markDue) mention.matchedAt = null;
				continue;
			}
			this.apply(mention, plan.decision);
			pass.counts[plan.decision.method]++;
			decided.push(mention);
		}
		await this.em.flush();
		await this.relinkFood(decided);
		// A tag names a brand once a post carrying it is matched to it
		if (relinkTags && decided.length) await this.hashtagService.relink();
	}

	/**
	 * Matches again, in code, the mentions linked to these brands or their branches (brands before
	 * and after an admin merged or split them), except the ones an admin corrected. A close call
	 * keeps its match until the agent decides it: its `matchedAt` is cleared, so the city's next
	 * matching run asks (`match-mentions.mention`).
	 */
	async rematchBrands(brandIds: string[]): Promise<MatchPass> {
		const pass: MatchPass = { counts: emptyCounts(), asks: [] };
		if (brandIds.length === 0) return pass;
		const mentions = await this.em.find(
			Mention,
			{
				$and: [
					{
						$or: [
							{ brand: { $in: brandIds } },
							{ venue: { brand: { $in: brandIds } } },
						],
					},
					{ $or: [{ matchMethod: null }, { matchMethod: { $nin: ADMIN_METHODS } }] },
				],
			},
			// The agent's question carries what each mention said
			{ populate: ['post', 'post.city', 'statements'] },
		);
		const accounts = await this.brandAccounts({ fresh: true });
		for (const [, cityMentions] of Object.entries(_.groupBy(mentions, m => m.post.city.id))) {
			const city = cityMentions[0].post.city;
			const words = cityStopwords(city.nameStopwords);
			const venues = await this.candidateVenues(city, words, { fresh: true });
			await this.decideInCode(cityMentions, venues, cityNames(city), words, accounts, pass, {
				markDue: true,
			});
		}
		this.logger.log(
			`Rematched ${mentions.length} mentions of ${brandIds.length} brands, ${pass.asks.length} left for the agent`,
		);
		return pass;
	}

	/**
	 * The city's open food venues as matching candidates. A code pass reads them fresh; a mention's
	 * own plan takes the last pass's (`CANDIDATES_CACHE_MS`), so a hundred close calls don't read a
	 * city's thousands of venues a hundred times.
	 */
	private candidateVenues(
		city: City,
		words: ReadonlySet<string>,
		{ fresh = false } = {},
	): Promise<CandidateVenue[]> {
		const cached = this.candidatesCache.get(city.id);
		if (!fresh && cached && Date.now() - cached.at < CANDIDATES_CACHE_MS) return cached.venues;
		const venues = this.em
			.find(Venue, { city, closed: false }, { populate: ['brand'] })
			.then(rows => toCandidateVenues(rows, words));
		this.candidatesCache.set(city.id, { at: Date.now(), venues });
		venues.catch(() => this.candidatesCache.delete(city.id));
		return venues;
	}

	/** One mention as matching reads it (its post and statements populated) */
	private matchInput(mention: Mention, accounts: ReadonlyMap<string, TaggedAccount>): MatchInput {
		return {
			venueName: mention.venueName,
			locationHint: mention.locationHint ?? null,
			cuisine: mention.cuisine ?? null,
			city: mention.city ?? null,
			author: mention.post.author ?? null,
			taggedLocation: mention.post.locationName ?? null,
			taggedAccounts: taggedAccountsOf(mention.post, mention.venueName, accounts),
			said: mention.statements
				.getItems()
				.map(s => s.text)
				.filter((t): t is string => !!t),
		};
	}

	private apply(mention: Mention, decision: MatchDecision): void {
		mention.brand = decision.brandId ? this.em.getReference(Brand, decision.brandId) : null;
		mention.venue = decision.venueId ? this.em.getReference(Venue, decision.venueId) : null;
		mention.matchMethod = decision.method;
		mention.matchScore = decision.score;
		mention.matchedAt = new Date();
	}

	/**
	 * One close call's plan, for its own run (`match-mentions.mention`): its decision in code, when
	 * the venues changed since the pass that listed it, or the question for the agent. Null when the
	 * mention is gone or an admin corrected it meanwhile. Writes nothing.
	 */
	async planMention(mentionId: number): Promise<MentionMatchPlan | null> {
		const mention = await this.em.findOne(
			Mention,
			{ id: mentionId },
			{ populate: ['post', 'post.city', 'statements'] },
		);
		if (!mention || isCorrected(mention)) return null;
		const city = mention.post.city;
		const words = cityStopwords(city.nameStopwords);
		const plan = planMatch(
			this.matchInput(mention, await this.brandAccounts()),
			await this.candidateVenues(city, words),
			cityNames(city),
			words,
		);
		return { cityId: city.id, ...plan };
	}

	/**
	 * A close call's decision on its mention, flushed; null, with nothing written, when the mention
	 * is gone or an admin corrected it meanwhile. Its run relinks its food topics after
	 * (`relinkMatched`); the tags' brands wait for the city's run (`relinkTags`).
	 */
	async saveMatch(
		mentionId: number,
		decision: MatchDecision,
	): Promise<MentionMatchMethodEnum | null> {
		const mention = await this.em.findOne(Mention, { id: mentionId });
		if (!mention || isCorrected(mention)) return null;
		this.apply(mention, decision);
		await this.em.flush();
		return decision.method;
	}

	/** After close calls were saved: their food topics and their cities' venue tags */
	async relinkMatched(mentionIds: number[]): Promise<void> {
		if (!mentionIds.length) return;
		const mentions = await this.em.find(
			Mention,
			{ id: { $in: mentionIds } },
			{ populate: ['post'] },
		);
		await this.relinkFood(mentions);
	}

	/**
	 * Every tag's brand again (`HashtagService.relink`, over every tag): once a city's run, as a tag
	 * names a brand once a post carrying it is matched to it, and the posts' own matches and the
	 * close calls skip it
	 */
	async relinkTags(): Promise<void> {
		await this.hashtagService.relink();
	}

	/**
	 * An admin's correction, which matching never overwrites: link to a venue (`MANUAL`, its
	 * brand too), to a brand without a branch (`MANUAL`, `brandId` only), unlink (`MANUAL`
	 * without either) or mark as not a venue (`IGNORED`, never with one). Flushed.
	 */
	async correct(
		id: number,
		input: {
			venueId: string | null;
			brandId?: string | null;
			ignored?: boolean;
			note?: string;
		},
	): Promise<Mention> {
		const mention = await this.em.findOneOrFail(Mention, { id });
		const venue =
			input.venueId && !input.ignored ?
				await this.em.findOneOrFail(Venue, { id: input.venueId })
			:	null;
		const brand =
			venue?.brand ??
			(input.brandId && !input.ignored ?
				await this.em.findOneOrFail(Brand, { id: input.brandId })
			:	null);
		mention.venue = venue;
		mention.brand = brand;
		mention.matchMethod =
			input.ignored ? MentionMatchMethodEnum.IGNORED : MentionMatchMethodEnum.MANUAL;
		mention.matchScore = null;
		mention.matchedAt = new Date();
		mention.matchNote = input.note?.trim() || null;
		// An admin's word confirms it, whatever a re-read said
		mention.unconfirmedAt = null;
		await this.em.flush();
		await this.em.populate(mention, ['venue', 'brand', 'post']);
		await this.relinkFood([mention]);
		return mention;
	}

	/**
	 * Every name the city's mentions gave that nothing matched yet, most posted first, then by
	 * views, then likes (Instagram posts carry no views): what to look up. A name that is a
	 * business profile's handle we read ("selocoffeeberlin") is searched as that profile's name and
	 * the address its bio writes out ("SELO COFFEE Tempelhofer Damm 212, 12099",
	 * `profileSearchName`), which Google Maps finds where the handle finds nothing. No limit here,
	 * since `VenueScrapeService.planLookups` drops the names searched lately before it caps the run.
	 */
	async unmatchedNames(cityId: string): Promise<string[]> {
		const rows: {
			venue_name: string;
			handle: string | null;
			display_name: string | null;
			bio: string | null;
		}[] = await this.em.getConnection().execute(
			`select n.venue_name, a.handle, a.display_name, a.bio
			from (
				select m.venue_name, p.platform, count(distinct p.id) posts, sum(p.views) views, sum(p.likes) likes
				from mentions m join social_posts p on p.id = m.post_id
				where m.match_method = ? and p.city_id = ?
				group by m.venue_name, p.platform
			) n
			left join social_accounts a on a.platform = n.platform
				and a.handle = rtrim(ltrim(lower(n.venue_name), '@'), '.')
				and a.is_business and a.brand_id is null and a.profile_read_at is not null
			order by n.posts desc, n.views desc nulls last, n.likes desc, n.venue_name`,
			[MentionMatchMethodEnum.NONE, cityId],
		);
		return _.uniq(
			rows.map(r =>
				r.handle ?
					profileSearchName({ handle: r.handle, displayName: r.display_name, bio: r.bio })
				:	r.venue_name,
			),
		);
	}

	/**
	 * The city's brands talked about most in a month: the ones that get reviews and reports. Posts
	 * by the brand's own accounts don't count (`ownPostSql`), and a post naming two branches counts
	 * once. Only brands with an open branch in the city.
	 */
	async topBrandIds(month: string, limit: number, cityId: string): Promise<string[]> {
		const rows: { brand_id: string }[] = await this.em.getConnection().execute(
			`select x.brand_id
			from (select distinct m.brand_id, m.post_id from mentions m where m.brand_id is not null) x
			join social_posts p on p.id = x.post_id
			where p.city_id = ? and to_char(p.posted_at at time zone 'UTC', 'YYYY-MM') = ?
				and exists (select 1 from venues v where v.brand_id = x.brand_id and v.city_id = ? and not v.closed)
				and not ${ownPostSql('p', 'x.brand_id')}
			group by x.brand_id
			order by count(*) desc, sum(p.views) desc, x.brand_id
			limit ?`,
			[cityId, month, cityId, limit],
		);
		return rows.map(r => r.brand_id);
	}
}
