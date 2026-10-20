import { QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import _ from 'lodash';

import { ExceptionCodes } from 'exceptions';

import { areNeighbourDistricts } from 'src/modules/cities/util/city.js';
import { FoodTopicKindEnum } from 'src/modules/food-topics/entities/food-topic.entity.js';
import { FoodTopicService } from 'src/modules/food-topics/services/food-topic.service.js';
import { VenueFoodTopicService } from 'src/modules/food-topics/services/venue-food-topic.service.js';
import { sharedFood } from 'src/modules/food-topics/util/venue-topics.js';

import { Brand } from '../entities/brand.entity.js';
import { BrandCompetitor, CompetitorPickedByEnum } from '../entities/brand-competitor.entity.js';
import { Venue } from '../entities/venue.entity.js';
import { busiestBranch } from '../util/brands.js';
import { cityStopwords, isFoodVenue, nameSimilarity, venueAliases } from '../util/venue-names.js';

/** How many competitors a brand's report compares it with at most. */
export const MAX_COMPETITORS = 5;

/** A venue an admin may add as a competitor (or its brand), with why. */
export interface CompetitorSuggestion {
	venue: Venue;
	score: number;
	mentions: number;
	reasons: string[];
}

/** What to add: one place, or a whole brand. */
export type CompetitorTarget = { venueId: string } | { brandId: string };

/**
 * One competitor as a report compares it: a place, or a rival brand's open branches in the
 * city; `branch` when it competes with one branch, not the whole brand.
 */
export interface CompetitorInCity {
	link: BrandCompetitor;
	name: string;
	venues: Venue[];
	branch?: Venue;
}

/**
 * Whether Google lists one of the two under the other's "People also search for" (titles only,
 * no place id, so names are compared after `venueAliases` with the city's stopwords).
 */
export const googleAlsoSearched = (
	a: Pick<Venue, 'name' | 'details'>,
	b: Pick<Venue, 'name' | 'details'>,
	cityWords?: ReadonlySet<string>,
): boolean => {
	const listed = (from: Pick<Venue, 'details'>, name: string) => {
		const ours = venueAliases(name, cityWords);
		return (from.details?.peopleAlsoSearch ?? []).some(place =>
			venueAliases(place.title, cityWords).some(x => ours.some(y => nameSimilarity(x, y) >= 0.85)),
		);
	};
	return listed(a, b.name) || listed(b, a.name);
};

/**
 * The one entry point for a brand's competition list. A competitor is a place or a whole rival
 * brand, for the whole brand or for one of its branches; never one of the brand's own branches.
 */
@Injectable()
export class CompetitorService {
	constructor(
		private readonly em: EntityManager,
		private readonly foodTopicService: FoodTopicService,
		private readonly venueFoodTopicService: VenueFoodTopicService,
	) {}

	/**
	 * A brand's competitors, by name, with their places (a rival's branches and cities) and the
	 * branch each is for, if one.
	 */
	async list(brandId: string): Promise<BrandCompetitor[]> {
		const links = await this.em.find(
			BrandCompetitor,
			{ brand: brandId },
			{
				populate: [
					'branch',
					'venue',
					'venue.city',
					'venue.favicon',
					'rival',
					'rival.branches',
					'rival.branches.city',
				],
			},
		);
		return _.sortBy(links, link => (link.venue?.name ?? link.rival?.name ?? '').toLowerCase());
	}

	/**
	 * Adds a competitor, for the whole brand or, with `branchId`, for one of its branches;
	 * adding one twice is a no-op (a place already on the list for another subject is left
	 * there). Each subject (the brand, each branch) has `MAX_COMPETITORS` at most, whoever picks
	 * them. The brand's owner (portal) may only pick an open food venue in one of its cities (the
	 * branch's, for a branch), or a brand with a branch there. Flushes.
	 */
	async add(
		brandId: string,
		target: CompetitorTarget,
		pickedBy: CompetitorPickedByEnum = CompetitorPickedByEnum.ADMIN,
		branchId?: string | null,
	): Promise<void> {
		const brand = await this.em.findOneOrFail(Brand, { id: brandId }, { populate: ['branches'] });
		const branch = branchId ? brand.branches.getItems().find(v => v.id === branchId) : null;
		if (branchId && !branch) throw new BadRequestException(`That place is not a branch of ${brand.name}`);
		const cities = new Set((branch ? [branch] : brand.branches.getItems()).map(v => v.city.id));
		const owner = pickedBy === CompetitorPickedByEnum.OWNER;
		const refuseOwner = () => {
			throw new BadRequestException('Pick an open restaurant, café or bar in your city');
		};

		if ('venueId' in target) {
			const venue = await this.em.findOneOrFail(Venue, { id: target.venueId });
			if (venue.brand.id === brandId) throw new BadRequestException(`${venue.name} is one of your own branches`);
			if (await this.em.count(BrandCompetitor, { brand: brandId, venue })) return;
			if (owner && (!cities.has(venue.city.id) || venue.closed || !isFoodVenue(venue.category))) refuseOwner();
			await this.checkRoom(brandId, branch);
			this.em.create(BrandCompetitor, { brand, branch, venue, pickedBy });
		} else {
			if (target.brandId === brandId) throw new BadRequestException('A brand cannot compete with itself');
			const rival = await this.em.findOneOrFail(Brand, { id: target.brandId }, { populate: ['branches'] });
			if (await this.em.count(BrandCompetitor, { brand: brandId, rival })) return;
			if (owner && !rival.branches.getItems().some(v => cities.has(v.city.id) && !v.closed)) refuseOwner();
			await this.checkRoom(brandId, branch);
			this.em.create(BrandCompetitor, { brand, branch, rival, pickedBy });
		}
		await this.em.flush();
	}

	/** Removes a competitor by its id on the list; another brand's is a 404. */
	async remove(brandId: string, competitorId: number): Promise<void> {
		const removed = await this.em.nativeDelete(BrandCompetitor, { id: competitorId, brand: brandId });
		if (!removed) throw new NotFoundException();
	}

	/**
	 * Venues the owner can pick, by name: open food venues in the brand's cities whose name,
	 * street or district holds the query, never its own branches, best known first. Their brands
	 * are populated, so a chain's branch can be added as the whole chain.
	 */
	async search(brandId: string, q: string, limit = 10): Promise<Venue[]> {
		const own = await this.em.find(Venue, { brand: brandId }, { fields: ['id', 'city'] });
		const term = `%${q.trim().replace(/[\\%_]/g, m => `\\${m}`)}%`;
		const found = await this.em.find(
			Venue,
			{
				city: { $in: _.uniq(own.map(v => v.city.id)) },
				closed: false,
				brand: { $ne: brandId },
				$or: [{ name: { $ilike: term } }, { street: { $ilike: term } }, { district: { $ilike: term } }],
			},
			{
				populate: ['brand', 'brand.branches'],
				orderBy: { reviewsCount: QueryOrder.DESC_NULLS_LAST, name: QueryOrder.ASC },
				limit: limit * 3,
			},
		);
		return found.filter(v => isFoodVenue(v.category)).slice(0, limit);
	}

	/**
	 * The brand's competitors in a city, as its report compares them: a place there, or a rival's
	 * open branches there together (a rival without one is left out). A branch's competitors
	 * count only in the branch's city.
	 */
	async inCity(brandId: string, cityId: string): Promise<CompetitorInCity[]> {
		return this.inCities(brandId, [cityId]);
	}

	/** `inCity` for a report across several cities: a rival counts with its branches in all of them. */
	async inCities(brandId: string, cityIds: string[]): Promise<CompetitorInCity[]> {
		const cities = new Set(cityIds);
		const out: CompetitorInCity[] = [];
		for (const link of await this.list(brandId)) {
			if (link.branch && !cities.has(link.branch.city.id)) continue;
			const branch = link.branch ? { branch: link.branch } : {};
			if (link.venue) {
				if (cities.has(link.venue.city.id))
					out.push({ link, name: link.venue.name, venues: [link.venue], ...branch });
				continue;
			}
			const branches = _.orderBy(
				link.rival!.branches.getItems().filter(v => cities.has(v.city.id) && !v.closed),
				[v => v.reviewsCount ?? -1],
				['desc'],
			);
			if (branches.length) out.push({ link, name: link.rival!.name, venues: branches, ...branch });
		}
		return out;
	}

	/**
	 * Every competing place of these brands in the city, once, never one of their own branches:
	 * what the pipeline scrapes reviews, details, busyness and menus for.
	 */
	async competitorVenueIdsOf(brandIds: string[], cityId: string): Promise<string[]> {
		if (brandIds.length === 0) return [];
		const ids: string[] = [];
		for (const brandId of _.uniq(brandIds))
			for (const competitor of await this.inCity(brandId, cityId)) ids.push(...competitor.venues.map(v => v.id));
		const own = await this.em.find(Venue, { brand: { $in: brandIds } }, { fields: ['id'] });
		return _.difference(
			_.uniq(ids),
			own.map(v => v.id),
		);
	}

	/**
	 * Venues the brand likely competes with in a city, best first, from its most reviewed open
	 * branch there (`busiestBranch`), or from `branchId` when given: the food they share (`sharedFood` over both venues' food
	 * topics: 3 for the same primary, 2 related, 1 overlapping), the same diet (0.5 each, "both
	 * vegan"), same or neighbouring district, same price level, then the most talked about;
	 * Google's "People also search for" (either way) adds 2 and lifts the district condition.
	 * Only open food venues of the city, never the brand's own branches, a current competitor or
	 * a current rival's branch, and only ones sharing some food with it. The brand's first city
	 * (the most branches) without `cityId`.
	 */
	async suggest(
		brandId: string,
		cityId?: string,
		limit = 5,
		branchId?: string,
	): Promise<CompetitorSuggestion[]> {
		const branches = await this.em.find(Venue, { brand: brandId, closed: false }, { populate: ['city'] });
		const city =
			cityId ??
			_.maxBy(
				Object.entries(_.countBy(branches, v => v.city.id)),
				([, n]) => n,
			)?.[0];
		const venue =
			branchId ? branches.find(v => v.id === branchId) : busiestBranch(branches.filter(v => v.city.id === city));
		if (!venue) return [];
		const taken = new Set((await this.inCity(brandId, venue.city.id)).flatMap(c => c.venues.map(v => v.id)));

		const rows: { venue_id: string; n: number }[] = await this.em
			.getConnection()
			.execute(`select venue_id, count(*)::int as n from mentions where venue_id is not null group by venue_id`);
		const mentions = new Map(rows.map(r => [r.venue_id, r.n]));

		const cityWords = cityStopwords(venue.city.nameStopwords ?? []);
		const candidates = (
			await this.em.find(Venue, {
				city: venue.city,
				closed: false,
				brand: { $ne: brandId },
				...(venue.district ? { district: { $ne: null } } : {}),
			})
		).filter(c => isFoodVenue(c.category) && !taken.has(c.id));
		const index = await this.foodTopicService.index();
		const tags = await this.venueFoodTopicService.tags([venue, ...candidates], index);
		const own = tags.get(venue.id) ?? [];
		const diets = (keys: { key: string }[]) =>
			keys.map(t => t.key).filter(k => index.get(k)?.kind === FoodTopicKindEnum.DIET);
		const ownDiets = diets(own);

		const scored: CompetitorSuggestion[] = [];
		for (const candidate of candidates) {
			const reasons: string[] = [];
			const theirs = tags.get(candidate.id) ?? [];
			const food = sharedFood(own, theirs, index);
			let score = food.points;
			if (food.reason) reasons.push(food.reason);
			// Nothing in common to eat: not competition, however close or popular
			if (score === 0) continue;
			for (const diet of diets(theirs).filter(d => ownDiets.includes(d))) {
				score += 0.5;
				reasons.push(`both ${index.get(diet)!.label.toLowerCase()}`);
			}

			const alsoSearched = googleAlsoSearched(venue, candidate, cityWords);
			if (venue.district) {
				if (candidate.district === venue.district) {
					score += 2;
					reasons.push('same district');
				} else if (candidate.district && areNeighbourDistricts(venue.city, venue.district, candidate.district)) {
					score += 1;
					reasons.push('neighbouring district');
				} else if (!alsoSearched) continue;
			}
			if (alsoSearched) {
				score += 2;
				reasons.push('Google: people also search for');
			}
			if (venue.priceLevel && venue.priceLevel === candidate.priceLevel) {
				score += 0.5;
				reasons.push('same price level');
			}
			const n = mentions.get(candidate.id) ?? 0;
			score += 0.5 * Math.log1p(n);
			scored.push({ venue: candidate, score: Math.round(score * 100) / 100, mentions: n, reasons });
		}
		return _.orderBy(scored, ['score', 'mentions'], ['desc', 'desc']).slice(0, limit);
	}

	/**
	 * Gives each of these brands that has no competitors its best suggestions in the city: the
	 * bulk action for the month's report brands. Brands that already have some are left as they
	 * are, so the comparison stays stable month to month. Flushes.
	 */
	async fill(
		brandIds: string[],
		cityId: string,
		perBrand = 5,
	): Promise<{ filled: number; added: number; skipped: number }> {
		let filled = 0;
		let added = 0;
		let skipped = 0;
		// One after another: they share the entity manager
		for (const brandId of brandIds) {
			if (await this.em.count(BrandCompetitor, { brand: brandId, branch: null })) {
				skipped++;
				continue;
			}
			const suggestions = await this.suggest(brandId, cityId, perBrand);
			for (const suggestion of suggestions)
				this.em.create(BrandCompetitor, {
					brand: this.em.getReference(Brand, brandId),
					venue: suggestion.venue,
					pickedBy: CompetitorPickedByEnum.SUGGESTED,
				});
			await this.em.flush();
			if (suggestions.length) filled++;
			added += suggestions.length;
		}
		return { filled, added, skipped };
	}

	/** The brand-wide list, and each branch's, holds `MAX_COMPETITORS` at most. */
	private async checkRoom(brandId: string, branch?: Venue | null): Promise<void> {
		if ((await this.em.count(BrandCompetitor, { brand: brandId, branch: branch ?? null })) >= MAX_COMPETITORS)
			throw new BadRequestException({
				code: ExceptionCodes.TOO_MANY_COMPETITORS,
				message: `${branch ? 'A branch' : 'A brand'} has ${MAX_COMPETITORS} competitors at most: remove one first`,
			});
	}
}
