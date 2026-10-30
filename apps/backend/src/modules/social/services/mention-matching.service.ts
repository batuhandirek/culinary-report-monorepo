import { FilterQuery } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import { MentionTopicService } from 'src/modules/topics/services/mention-topic.service.js';
import { VenueTopicService } from 'src/modules/topics/services/venue-topic.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityNames } from 'src/modules/cities/util/city.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { brandKey } from 'src/modules/venues/util/brands.js';
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
import { ownPostSql } from '../util/accounts.js';

import { HashtagService } from './hashtag.service.js';

// Accepted without asking the LLM
const AUTO_SCORE = 0.9;
// Below this a candidate is not worth showing to the LLM
const CANDIDATE_SCORE = 0.45;
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

type CandidateVenue = Omit<MatchCandidate, 'raw' | 'score' | 'branchKnown' | 'branches'>;

/**
 * The venues a mention could mean, best first: name similarity, plus a boost when the creator
 * tagged that exact place or the location hint names its district or street. `cityWords` are the
 * city's stopwords (`cityStopwords`), dropped from names on both sides. A chain's branches are
 * one candidate: the one branch the creator tagged, else the best-scored one. `branchKnown`
 * when one was tagged; when the post names more than the brand, when the closest name is
 * `BRANCH_LEAD` ahead of the next ("Burgermeister Kottbusser Tor"); when it names only the brand,
 * when a hint naming one branch's district or street puts it that far ahead (the name alone
 * would pick a branch called just like the brand).
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
				(!!venue.street && !!mention.locationHint && hintNamesStreet(mention.locationHint, venue.street));
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
	return out.slice(0, 5);
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
const namesSeveralBranches = (hint: string | null | undefined, venues: CandidateVenue[], brandId: string): boolean =>
	!!hint &&
	venues.filter(v => v.brandId === brandId && !!v.street && hintNamesStreet(hint, v.street)).length >= 2;

/** A location hint with words in it ("/", "." or a postcode alone place nothing). */
const hasHint = (hint: string | null | undefined): boolean =>
	!!hint && plain(hint).replace(/\d+/g, '').trim().length >= 3;

const strip = <T extends { total: number; isTagged: boolean }>({ total: _t, isTagged: _i, ...c }: T) => c;

/** Accepted without the LLM: confident, and clearly ahead of the runner-up. */
export const autoMatch = (candidates: MatchCandidate[]): MatchCandidate | null => {
	const [best, second] = candidates;
	return best && best.score >= AUTO_SCORE && (!second || best.score - second.score >= 0.1) ? best : null;
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
		const counts = Object.fromEntries(Object.values(MentionMatchMethodEnum).map(m => [m, 0])) as Record<
			MentionMatchMethodEnum,
			number
		>;
		const cities = opts.cityId ? [await this.cityService.getById(opts.cityId)] : await this.cityService.list();
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

		const [newestVenue] = await this.em.find(Venue, { city }, { orderBy: { createdAt: 'desc' }, limit: 1 });
		// `not in` drops nulls, so a never-matched mention needs its own branch
		const notCorrected: FilterQuery<Mention> = {
			$or: [{ matchMethod: null }, { matchMethod: { $nin: ADMIN_METHODS } }],
		};
		const mentions = await this.em.find(
			Mention,
			rematch ? { $and: [notCorrected, { post: { city } }] } : (
				{
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
				}
			),
			{ populate: ['post'] },
		);
		this.logger.log(`Matching ${mentions.length} mentions against ${venues.length} venues of ${city.name}`);

		const names = cityNames(city);
		await this.matchAll(mentions, venues, names, words, counts);
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
	): Promise<void> {
		const llm: { down?: Error } = {};
		await runPool(
			mentions,
			8,
			async mention => {
				const before = mention.matchedAt;
				try {
					counts[await this.matchOne(mention, venues, names, words, llm)]++;
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
		const counts = Object.fromEntries(Object.values(MentionMatchMethodEnum).map(m => [m, 0])) as Record<
			MentionMatchMethodEnum,
			number
		>;
		if (brandIds.length === 0) return counts;
		const mentions = await this.em.find(
			Mention,
			{
				$and: [
					{ $or: [{ brand: { $in: brandIds } }, { venue: { brand: { $in: brandIds } } }] },
					{ $or: [{ matchMethod: null }, { matchMethod: { $nin: ADMIN_METHODS } }] },
				],
			},
			{ populate: ['post', 'post.city'] },
		);
		for (const [, cityMentions] of Object.entries(_.groupBy(mentions, m => m.post.city.id))) {
			const city = cityMentions[0].post.city;
			const words = cityStopwords(city.nameStopwords);
			const venues = await this.candidateVenues(city, words);
			const names = cityNames(city);
			await this.matchAll(cityMentions, venues, names, words, counts);
		}
		this.logger.log(`Rematched ${mentions.length} mentions of ${brandIds.length} brands`);
		return counts;
	}

	/** The city's open food venues as matching candidates. */
	private async candidateVenues(city: City, words: ReadonlySet<string>): Promise<CandidateVenue[]> {
		const venues = (await this.em.find(Venue, { city, closed: false }, { populate: ['brand'] })).filter(v =>
			isFoodVenue(v.category),
		);
		const branchCount = _.countBy(venues, v => v.brand.id);
		return venues.map(v => ({
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
	}

	private async matchOne(
		mention: Mention,
		venues: CandidateVenue[],
		names: string[],
		words: ReadonlySet<string>,
		llm: { down?: Error } = {},
	): Promise<MentionMatchMethodEnum> {
		mention.matchedAt = new Date();
		if (!isInCity(mention.city, names)) {
			mention.brand = null;
			mention.venue = null;
			mention.matchMethod = MentionMatchMethodEnum.OTHER_CITY;
			mention.matchScore = null;
			return MentionMatchMethodEnum.OTHER_CITY;
		}

		const candidates = rankCandidates(mention, mention.post.locationName, venues, words);
		let picked = autoMatch(candidates);
		let method = picked ? (picked.raw === 1 ? MentionMatchMethodEnum.EXACT : MentionMatchMethodEnum.FUZZY) : MentionMatchMethodEnum.NONE;
		// The LLM's pick among a chain's branches, when the code couldn't tell
		let branchId: string | null = null;

		const ask = async (offered: MatchCandidate[]) => {
			// The LLM account failed on another mention: this close call waits for the next run
			if (llm.down) throw llm.down;
			const res = await this.venueMatchAgent.generate(
				JSON.stringify({
					mention: {
						name: mention.venueName,
						// The post's account: a venue posting about itself spells its own name right
						author: mention.post.author,
						locationHint: mention.locationHint,
						cuisine: mention.cuisine,
						summary: mention.summary,
						taggedLocation: mention.post.locationName,
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
			const chosen = offered.find(c => c.id === res.object.venueId) ?? null;
			// The model sometimes picks one of several branches a post lists: the streets decide that
			const branch =
				chosen &&
				!chosen.branchKnown &&
				res.object.branchId &&
				!namesSeveralBranches(mention.locationHint, venues, chosen.brandId) ?
					venues.find(v => v.id === res.object.branchId && v.brandId === chosen.brandId)
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
			!namesSeveralBranches(mention.locationHint, venues, picked.brandId)
		) {
			// The chain is sure but the code couldn't place the hint ("near Rosenthaler Platz",
			// "Prenzlauer Berg"): the LLM picks the branch, or none
			const res = await ask([picked]);
			if (res.chosen) branchId = res.branchId;
		}

		// A chain's branch only when the post says which: else the brand alone
		if (picked?.branchKnown) branchId = picked.id;
		mention.brand = picked ? this.em.getReference(Brand, picked.brandId) : null;
		mention.venue = branchId ? this.em.getReference(Venue, branchId) : null;
		mention.matchMethod = method;
		mention.matchScore = picked?.score ?? candidates[0]?.score ?? null;
		return method;
	}

	/**
	 * An admin's correction, which matching never overwrites: link to a venue (`MANUAL`, its
	 * brand too), to a brand without a branch (`MANUAL`, `brandId` only), unlink (`MANUAL`
	 * without either) or mark as not a venue (`IGNORED`, never with one). Flushed.
	 */
	async correct(
		id: number,
		input: { venueId: string | null; brandId?: string | null; ignored?: boolean; note?: string },
	): Promise<Mention> {
		const mention = await this.em.findOneOrFail(Mention, { id });
		const venue =
			input.venueId && !input.ignored ? await this.em.findOneOrFail(Venue, { id: input.venueId }) : null;
		const brand =
			venue?.brand ??
			(input.brandId && !input.ignored ? await this.em.findOneOrFail(Brand, { id: input.brandId }) : null);
		mention.venue = venue;
		mention.brand = brand;
		mention.matchMethod = input.ignored ? MentionMatchMethodEnum.IGNORED : MentionMatchMethodEnum.MANUAL;
		mention.matchScore = null;
		mention.matchedAt = new Date();
		mention.matchNote = input.note?.trim() || null;
		await this.em.flush();
		await this.em.populate(mention, ['venue', 'brand', 'post']);
		await this.relinkFood([mention]);
		return mention;
	}

	/**
	 * Every name the city's mentions gave that nothing matched yet, most posted first, then by
	 * views, then likes (Instagram posts carry no views): what to look up. No limit here, since
	 * `lookupNames` drops the names searched lately before it caps the run.
	 */
	async unmatchedNames(cityId: string): Promise<string[]> {
		const rows: { venue_name: string }[] = await this.em.getConnection().execute(
			`select m.venue_name from mentions m join social_posts p on p.id = m.post_id
			where m.match_method = ? and p.city_id = ?
			group by m.venue_name
			order by count(distinct p.id) desc, sum(p.views) desc, sum(p.likes) desc, m.venue_name`,
			[MentionMatchMethodEnum.NONE, cityId],
		);
		return rows.map(r => r.venue_name);
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
