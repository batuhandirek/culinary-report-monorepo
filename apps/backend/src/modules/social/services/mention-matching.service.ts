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
import { isFatalProviderError, runPool } from 'src/shared/util/pool.js';

import { VenueMatchAgent } from '../agents/venue-match.agent.js';
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
	return [...handles].map(h => accounts.get(`${post.platform}:${h}`)).filter((a): a is TaggedAccount => !!a);
};

export interface MatchDecision {
	method: MentionMatchMethodEnum;
	brandId: string | null;
	/** The branch, only when the post says which */
	venueId: string | null;
	score: number | null;
}

/** One `VenueMatchAgent` call: the input message in, its answer out */
export type MatchAsk = (
	message: string,
) => Promise<{ venueId: string | null; branchId: string | null }>;

/**
 * What matching decides for one place (`MentionMatchingService` writes it on the mention, the eval
 * scores it): another city's is `other_city`; else the ranked candidates, a sure name match
 * accepted in code, the close calls asked of the LLM, and a sure chain whose hint the code
 * couldn't place asked for the branch alone (no branch fits: no match).
 */
export const decideMatch = async (
	mention: MatchInput,
	venues: CandidateVenue[],
	names: string[],
	words: ReadonlySet<string>,
	askAgent: MatchAsk,
): Promise<MatchDecision> => {
	if (!isInCity(mention.city, names))
		return {
			method: MentionMatchMethodEnum.OTHER_CITY,
			brandId: null,
			venueId: null,
			score: null,
		};

	// The brand's own account, tagged and named after the place: what the brand calls itself
	const tagged = taggedAccountPick(mention, venues, words);
	if (tagged) return tagged;

	const candidates = rankCandidates(mention, mention.taggedLocation, venues, words);
	// A sure name the hint places elsewhere is the LLM's call, never the code's
	const elsewhere = hintElsewhere(mention.locationHint, venues);
	let picked = autoMatch(candidates);
	if (picked && elsewhere(picked.brandId)) picked = null;
	let method =
		picked ?
			picked.raw === 1 ?
				MentionMatchMethodEnum.EXACT
			:	MentionMatchMethodEnum.FUZZY
		:	MentionMatchMethodEnum.NONE;
	// The LLM's pick among a chain's branches, when the code couldn't tell
	let branchId: string | null = null;

	const ask = async (offered: MatchCandidate[]) => {
		const answer = await askAgent(
			JSON.stringify({
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
		);
		// A chain is offered by one branch's id; a model may answer with another of its branches' ids:
		// still the chain (the branch only from `branchId`, never a guess)
		const chosen =
			offered.find(c => c.id === answer.venueId) ??
			offered.find(
				c =>
					!c.branchKnown &&
					venues.some(v => v.id === answer.venueId && v.brandId === c.brandId),
			) ??
			null;
		// The model sometimes picks one of several branches a post lists: the streets decide that
		const branch =
			(
				chosen &&
				!chosen.branchKnown &&
				answer.branchId &&
				!namesSeveralBranches(mention.locationHint, venues, chosen.brandId)
			) ?
				venues.find(v => v.id === answer.branchId && v.brandId === chosen.brandId)
			:	undefined;
		return { chosen, branchId: branch?.id ?? null };
	};

	if (!picked && candidates.length > 0) {
		const res = await ask(candidates);
		picked = res.chosen;
		branchId = res.branchId;
		if (picked) method = MentionMatchMethodEnum.LLM;
	} else if (
		picked &&
		!picked.branchKnown &&
		hasHint(mention.locationHint) &&
		!names.some(n => plain(n).trim() === plain(mention.locationHint!).trim()) &&
		!namesSeveralBranches(mention.locationHint, venues, picked.brandId)
	) {
		// The chain is sure but the code couldn't place the hint ("near Rosenthaler Platz",
		// "Prenzlauer Berg"): the LLM picks the branch, or none
		const res = await ask([picked]);
		if (res.chosen) branchId = res.branchId;
		else {
			// None of its branches is where the post says: another place of the same name
			picked = null;
			method = MentionMatchMethodEnum.NONE;
		}
	}

	// A chain's branch only when the post says which: else the brand alone
	if (picked?.branchKnown) branchId = picked.id;
	return {
		method,
		brandId: picked?.brandId ?? null,
		venueId: branchId,
		score: picked?.score ?? candidates[0]?.score ?? null,
	};
};

@Injectable()
export class MentionMatchingService {
	private readonly logger = new Logger(MentionMatchingService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly venueMatchAgent: VenueMatchAgent,
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
	 * `cityId`). Unmatched ones are only retried when the city got venues since their last
	 * attempt (a Google Maps lookup); `rematch` redoes every mention except the ones an admin
	 * corrected (`MANUAL`, `IGNORED`), which are never touched.
	 */
	async match(
		opts: { cityId?: string; rematch?: boolean } = {},
	): Promise<Record<MentionMatchMethodEnum, number>> {
		const counts = Object.fromEntries(
			Object.values(MentionMatchMethodEnum).map(m => [m, 0]),
		) as Record<MentionMatchMethodEnum, number>;
		const cities =
			opts.cityId ?
				[await this.cityService.getById(opts.cityId)]
			:	await this.cityService.list();
		for (const city of cities) await this.matchCity(city, !!opts.rematch, counts);
		return counts;
	}

	private async matchCity(
		city: City,
		rematch: boolean,
		counts: Record<MentionMatchMethodEnum, number>,
	): Promise<void> {
		const words = cityStopwords(city.nameStopwords);
		const venues = await this.candidateVenues(city, words);
		const mentions = await this.em.find(Mention, await this.toMatch(city, rematch), {
			populate: ['post', 'statements'],
		});
		this.logger.log(
			`Matching ${mentions.length} mentions against ${venues.length} venues of ${city.name}`,
		);

		const names = cityNames(city);
		const accounts = await this.brandAccounts();
		await this.matchAll(mentions, venues, names, words, counts, accounts);
		await this.sweepTags(city, venues, words, accounts, counts);
	}

	/** Every brand's own account on Instagram and TikTok, by `platform:handle`: what a post's tags can point at. */
	private async brandAccounts(): Promise<Map<string, TaggedAccount>> {
		const rows: { platform: string; handle: string; brand_id: string; branch_id: string | null }[] = await this.em
			.getConnection()
			.execute(
				`select platform, handle, brand_id, branch_id from social_accounts
				where brand_id is not null and handle_lost_at is null and platform in (?, ?)`,
				[SocialPlatformEnum.INSTAGRAM, SocialPlatformEnum.TIKTOK],
			);
		return new Map(
			rows.map(r => [`${r.platform}:${r.handle}`, { handle: r.handle, brandId: r.brand_id, branchId: r.branch_id }]),
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
		for (const ids of _.chunk(rows.map(r => r.id), 1000)) {
			for (const mention of await this.em.find(Mention, { id: { $in: ids } }, { populate: ['post'] })) {
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
		this.logger.log(`Matched ${matched.length} unmatched mentions of ${city.name} by their tagged own accounts`);
		await this.relinkFood(matched);
		await this.hashtagService.relink();
	}

	/**
	 * The city's unmatched mentions a tagged own account places, matched with no LLM
	 * (`sweepTags`): after the account matcher linked accounts from their profiles. Every `match`
	 * runs it too.
	 */
	async matchByTags(cityId: string): Promise<Record<MentionMatchMethodEnum, number>> {
		const counts = Object.fromEntries(
			Object.values(MentionMatchMethodEnum).map(m => [m, 0]),
		) as Record<MentionMatchMethodEnum, number>;
		const city = await this.cityService.getById(cityId);
		const words = cityStopwords(city.nameStopwords);
		await this.sweepTags(city, await this.candidateVenues(city, words), words, await this.brandAccounts(), counts);
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
		return this.em.count(Mention, await this.toMatch(await this.cityService.getById(cityId), false));
	}

	/**
	 * Matches the mentions, 8 at a time, and flushes. When the LLM account is unusable (no
	 * credits, a wrong key) the close calls are left for the next run (their `matchedAt` stays as it
	 * was) while exact and fuzzy matches go on and are saved; then the provider's error is thrown,
	 * so the step reads failed rather than done.
	 */
	private async matchAll(
		mentions: Mention[],
		venues: CandidateVenue[],
		names: string[],
		words: ReadonlySet<string>,
		counts: Record<MentionMatchMethodEnum, number>,
		accounts: ReadonlyMap<string, TaggedAccount>,
	): Promise<void> {
		const llm: { down?: Error } = {};
		await runPool(
			mentions,
			8,
			async mention => {
				const before = mention.matchedAt;
				try {
					counts[await this.matchOne(mention, venues, names, words, accounts, llm)]++;
				} catch (e) {
					mention.matchedAt = before;
					if (!isFatalProviderError(e)) throw e;
					llm.down ??= e as Error;
				}
			},
			(mention, e) => this.logger.warn(`Mention ${mention.id} failed: ${e.message}`),
		);
		await this.em.flush();
		await this.relinkFood(mentions);
		// A tag names a brand once a post carrying it is matched to it
		if (mentions.length) await this.hashtagService.relink();
		if (llm.down) throw llm.down;
	}

	/**
	 * Matches again the mentions linked to these brands or their branches (brands before and after
	 * an admin merged or split them), except the ones an admin corrected.
	 */
	async rematchBrands(brandIds: string[]): Promise<Record<MentionMatchMethodEnum, number>> {
		const counts = Object.fromEntries(
			Object.values(MentionMatchMethodEnum).map(m => [m, 0]),
		) as Record<MentionMatchMethodEnum, number>;
		if (brandIds.length === 0) return counts;
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
			// `matchOne` hands the LLM what each mention said
			{ populate: ['post', 'post.city', 'statements'] },
		);
		for (const [, cityMentions] of Object.entries(_.groupBy(mentions, m => m.post.city.id))) {
			const city = cityMentions[0].post.city;
			const words = cityStopwords(city.nameStopwords);
			const venues = await this.candidateVenues(city, words);
			const names = cityNames(city);
			await this.matchAll(cityMentions, venues, names, words, counts, await this.brandAccounts());
		}
		this.logger.log(`Rematched ${mentions.length} mentions of ${brandIds.length} brands`);
		return counts;
	}

	/** The city's open food venues as matching candidates. */
	private async candidateVenues(
		city: City,
		words: ReadonlySet<string>,
	): Promise<CandidateVenue[]> {
		return toCandidateVenues(
			await this.em.find(Venue, { city, closed: false }, { populate: ['brand'] }),
			words,
		);
	}

	private async matchOne(
		mention: Mention,
		venues: CandidateVenue[],
		names: string[],
		words: ReadonlySet<string>,
		accounts: ReadonlyMap<string, TaggedAccount>,
		llm: { down?: Error } = {},
	): Promise<MentionMatchMethodEnum> {
		mention.matchedAt = new Date();
		const decision = await decideMatch(
			{
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
			},
			venues,
			names,
			words,
			async message => {
				// The LLM account failed on another mention: this close call waits for the next run
				if (llm.down) throw llm.down;
				return (await this.venueMatchAgent.generate(message)).object;
			},
		);
		mention.brand = decision.brandId ? this.em.getReference(Brand, decision.brandId) : null;
		mention.venue = decision.venueId ? this.em.getReference(Venue, decision.venueId) : null;
		mention.matchMethod = decision.method;
		mention.matchScore = decision.score;
		return decision.method;
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
	 * since `lookupNames` drops the names searched lately before it caps the run.
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
				r.handle ? profileSearchName({ handle: r.handle, displayName: r.display_name, bio: r.bio }) : r.venue_name,
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
