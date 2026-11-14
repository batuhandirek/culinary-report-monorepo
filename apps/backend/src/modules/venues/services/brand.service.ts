import { QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';

import { Brand, BrandReportScopeEnum } from '../entities/brand.entity.js';
import { BrandDismissal } from '../entities/brand-dismissal.entity.js';
import { BrandExcludedVenue } from '../entities/brand-excluded-venue.entity.js';
import { Venue } from '../entities/venue.entity.js';
import { BrandChangedJob } from '../jobs/brand-changed.job.js';
import {
	brandKey,
	type BrandSuggestionGroup,
	busiestBranch,
	isBrandName,
	isDistinctiveBrand,
	isProfileKey,
	oneBrandSite,
	ownSite,
	suggestBrands,
} from '../util/brands.js';
import { cityStopwords, isFoodVenue } from '../util/venue-names.js';

/** One brand a branch search is planned for (plain data: a step's result). Its first branch says which brand it is in after a merge. */
export interface BranchSearchBrand {
	id: string;
	name: string;
	key: string;
	branchId: string | null;
}

/** What a brand search's `places.run` hands back: every place saved as a lookup, the ids per name */
export interface BranchSearchFound {
	found: number;
	saved: number;
	byQuery: Record<string, string[]>;
	venueIds: Record<string, string>;
}

/** Placeholders for `ids` in raw SQL: one `?` each (`em.execute` never binds an array to one). */
const marks = (ids: readonly unknown[]) => ids.map(() => '?').join(', ');

/**
 * Brands: the one entry point for `Brand` and `Venue.brand`. Every venue is a branch of one
 * brand, a brand of its own until an admin merges brands into a chain. Merging moves the
 * merged brands' reports, prospect, portal members, competitors and mentions onto the one that
 * stays. Suggestions are worked out on read and never saved. Every change queues
 * `BrandChangedJob`, so the brands' mentions are matched again and their cities scored again.
 */
@Injectable()
export class BrandService {
	private readonly logger = new Logger(BrandService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly cityService: CityService,
		private readonly pgBossService: PgBossService,
	) {}

	/**
	 * Chains: brands with more than one branch, biggest first, with their branches and cities.
	 */
	async list(): Promise<Brand[]> {
		const rows: { id: string }[] = await this.em.getConnection().execute(
			`select b.id from brands b
			where (select count(*) from venues v where v.brand_id = b.id) > 1`,
		);
		if (rows.length === 0) return [];
		const brands = await this.em.find(
			Brand,
			{ id: { $in: rows.map(r => r.id) } },
			{ populate: ['branches', 'branches.city', 'branches.favicon'] },
		);
		return _.orderBy(
			brands,
			[b => b.branches.length, b => b.name.toLowerCase()],
			['desc', 'asc'],
		);
	}

	/** A brand with its branches (and their cities and icons). */
	async get(id: string): Promise<Brand> {
		return this.em.findOneOrFail(
			Brand,
			{ id },
			{ populate: ['branches', 'branches.city', 'branches.favicon'] },
		);
	}

	/** The brand's open branches in a city, the most Google reviews first (`busiestBranch` first). */
	async branchesIn(brandId: string, cityId: string): Promise<Venue[]> {
		return this.em.find(
			Venue,
			{ brand: brandId, city: cityId, closed: false },
			{ orderBy: { reviewsCount: QueryOrder.DESC_NULLS_LAST, id: QueryOrder.ASC } },
		);
	}

	/** The brand's open branches in every city, the most Google reviews first. */
	async openBranches(brandId: string): Promise<Venue[]> {
		return this.em.find(
			Venue,
			{ brand: brandId, closed: false },
			{ orderBy: { reviewsCount: QueryOrder.DESC_NULLS_LAST, id: QueryOrder.ASC } },
		);
	}

	/**
	 * The open branches in a city of these brands, each with its brand (and the brand's branches),
	 * the most Google reviews first: what the month's report brands are scraped and reported for.
	 */
	async openBranchesIn(brandIds: string[], cityId: string): Promise<Venue[]> {
		if (!brandIds.length) return [];
		return this.em.find(
			Venue,
			{ brand: { $in: _.uniq(brandIds) }, city: cityId, closed: false },
			{
				populate: ['brand', 'brand.branches'],
				orderBy: { reviewsCount: QueryOrder.DESC_NULLS_LAST, id: QueryOrder.ASC },
			},
		);
	}

	/**
	 * Each of these brands' busiest open branch in the city (`busiestBranch`), its brand loaded:
	 * the one that carries a search by the brand's name (`venueSearchQuery`). A brand with no open
	 * branch there is left out.
	 */
	async busiestBranchesIn(brandIds: string[], cityId: string): Promise<Venue[]> {
		const branches = await this.openBranchesIn(brandIds, cityId);
		return Object.values(_.groupBy(branches, v => v.brand.id)).map(group => group[0]);
	}

	/** These brands, those with an open branch in the city only */
	async withBranchIn(brandIds: string[], cityId: string): Promise<Brand[]> {
		if (!brandIds.length) return [];
		return this.em.find(Brand, {
			id: { $in: _.uniq(brandIds) },
			branches: { city: cityId, closed: false },
		});
	}

	/** Brands by id, their names only (a list that names them) */
	async names(brandIds: string[]): Promise<{ id: string; name: string }[]> {
		if (!brandIds.length) return [];
		return this.em.find(Brand, { id: { $in: _.uniq(brandIds) } }, { fields: ['id', 'name'] });
	}

	/** The cities a brand has open branches in, the most branches first. */
	async citiesOf(brandId: string): Promise<City[]> {
		const venues = await this.em.find(
			Venue,
			{ brand: brandId, closed: false },
			{ populate: ['city'] },
		);
		return _.orderBy(
			Object.values(_.groupBy(venues, v => v.city.id)),
			[group => group.length, group => group[0].city.name],
			['desc', 'asc'],
		).map(group => group[0].city);
	}

	/**
	 * Groups of the city's venues that look like one brand (`suggestBrands`), the most mentioned
	 * first. Only venues that are a brand of their own take part, and the keys of chains and of
	 * dismissed suggestions are left out.
	 */
	async suggestions(cityId: string): Promise<{ group: BrandSuggestionGroup; venues: Venue[] }[]> {
		const city = await this.cityService.getById(cityId);
		const venues = await this.loneVenues({ city: city.id, closed: false });
		const chains = await this.list();
		const dismissals = await this.em.find(BrandDismissal, {}, { fields: ['key'] });
		const groups = suggestBrands(
			venues,
			cityStopwords(city.nameStopwords),
			new Set([...chains.map(b => b.key), ...dismissals.map(d => d.key)]),
		);
		// The chains people post about first: those are the ones matching and the top list miscount
		const byId = new Map(venues.map(v => [v.id, v]));
		const mentions = await this.mentionCounts(groups.flatMap(g => g.venueIds));
		const total = (group: BrandSuggestionGroup) =>
			_.sumBy(group.venueIds, id => mentions.get(id) ?? 0);
		return _.orderBy(groups, [total, g => g.venueIds.length], ['desc', 'desc']).map(group => ({
			group,
			venues: _.orderBy(
				group.venueIds.map(id => byId.get(id)!),
				[v => v.reviewsCount ?? -1],
				['desc'],
			),
		}));
	}

	/**
	 * Places in any city that could be the brand's branches and aren't yet: open food venues
	 * that are a brand of their own and whose name is a branch name (`isBrandName`), minus the
	 * ones an admin said are not. A name search (`searchBranches`) adds the places this reads.
	 */
	async candidates(brand: Brand): Promise<Venue[]> {
		const cities = await this.cityService.list();
		const words = new Map(cities.map(c => [c.id, cityStopwords(c.nameStopwords)]));
		const excluded = (await this.excludedVenues([brand.id])).get(brand.id) ?? new Set<string>();
		const venues = (await this.loneVenues({ closed: false })).filter(
			v =>
				v.brand.id !== brand.id &&
				!excluded.has(v.id) &&
				isFoodVenue(v.category) &&
				isBrandName(v.name, brand.key, words.get(v.city.id)),
		);
		if (venues.length === 0) return [];
		return this.em.find(
			Venue,
			{ id: { $in: venues.map(v => v.id) } },
			{
				populate: ['city', 'favicon'],
				orderBy: { reviewsCount: QueryOrder.DESC_NULLS_LAST },
			},
		);
	}

	/**
	 * Makes the venues' brands one chain, named `name`. The brand
	 * that stays is the one with a prospect, else the one with the most reports, else the biggest
	 * venue's; the others' records move onto it (`absorb`). 409 when another chain has the
	 * name's key (add the branches to it instead), or when two of the brands have a prospect.
	 */
	async merge(input: { name: string; venueIds: string[] }): Promise<Brand> {
		const { keep, venues } = await this.combine(input.name, input.venueIds);
		await this.changed([keep.id], venues);
		return this.get(keep.id);
	}

	/**
	 * Merges what is one brand for sure, with no admin, in a city whose venues were just saved
	 * (`BrandAutoMergeJob`, queued by every venue scrape): so a chain is one brand from the day
	 * its branches come in. The site is the proof (`ownSite`, `oneBrandSite`): a branch's Google
	 * website named after the brand, which a listing or delivery site never is. First the
	 * chains take the city's places of their name that give their site, or no site at all where
	 * the chain has a branch already (any city for a place with their site); then each of the
	 * city's suggestions whose branches give one site named after the brand becomes a chain.
	 * Name alone, two sites, or one branch's site stay suggestions for
	 * an admin. An admin's word stays: dismissed and split keys are not suggested, and a branch
	 * taken off is excluded (`BrandExcludedVenue`).
	 */
	async autoMerge(cityId: string): Promise<{ joined: number; merged: number }> {
		const city = await this.cityService.getById(cityId);
		const words = cityStopwords(city.nameStopwords);
		const kept: string[] = [];
		const moved: Venue[] = [];

		let joined = 0;
		const lone = (await this.loneVenues({ city: city.id, closed: false })).filter(v =>
			isFoodVenue(v.category),
		);
		const taken = new Set<string>();
		const chains = await this.list();
		const exclusions = await this.excludedVenues(chains.map(c => c.id));
		for (const chain of chains) {
			// The chain's own sites, by their letters: "losteria.net" and "losteria.de" are one
			const sites = new Set(
				chain.branches
					.getItems()
					.map(v => ownSite(v.website, chain.name, words))
					.filter(s => s?.named)
					.map(s => s!.token),
			);
			if (sites.size === 0) continue;
			// A place of the name without a site joins where the chain is, if the name says more than food
			const riders =
				chain.branches.getItems().some(v => v.city.id === city.id) &&
				isDistinctiveBrand(chain.name, words);
			const excluded = exclusions.get(chain.id) ?? new Set<string>();
			const venues = lone.filter(v => {
				if (taken.has(v.id) || excluded.has(v.id) || !isBrandName(v.name, chain.key, words))
					return false;
				const site = ownSite(v.website, chain.name, words);
				return site ? site.named && sites.has(site.token) : riders;
			});
			if (venues.length === 0) continue;
			for (const v of venues) taken.add(v.id);
			moved.push(
				...(await this.join(
					chain.id,
					venues.map(v => v.id),
				)),
			);
			kept.push(chain.id);
			joined += venues.length;
			this.logger.log(`${chain.name} took ${venues.map(v => v.name).join(', ')} (same site)`);
		}

		let merged = 0;
		for (const { group, venues } of await this.suggestions(city.id)) {
			// Names sharing no words on one profile may be one owner's two concepts: an admin's call
			if (isProfileKey(group.key) || !oneBrandSite(venues, group.name, words)) continue;
			try {
				const result = await this.combine(group.name, group.venueIds);
				kept.push(result.keep.id);
				moved.push(...result.venues);
				merged++;
			} catch (e) {
				// Two prospects, or a chain of the name elsewhere: an admin's call
				this.logger.warn(`Not merging ${group.name} by itself: ${(e as Error).message}`);
			}
		}
		if (kept.length) await this.changed(kept, moved);
		this.logger.log(
			`Merged by site in ${city.name}: ${merged} new chains, ${joined} branches joined`,
		);
		return { joined, merged };
	}

	/** Renames a brand, or changes how its cities are reported (`reportScope`). */
	async update(
		id: string,
		input: {
			name?: string;
			reportScope?: BrandReportScopeEnum;
		},
	): Promise<Brand> {
		const brand = await this.get(id);
		if (input.name !== undefined) {
			const name = input.name.trim();
			const key = brandKey(name);
			if (!key) throw new BadRequestException('Give the brand a name');
			const chain =
				key !== brand.key && (await this.list()).find(b => b.key === key && b.id !== id);
			if (chain) throw new ConflictException(`A brand named ${name} exists already`);
			Object.assign(brand, { name, key });
		}
		if (input.reportScope) brand.reportScope = input.reportScope;
		await this.em.flush();
		// The name moves own-account checks
		await this.changed([brand.id], brand.branches.getItems());
		return brand;
	}

	/**
	 * Brands whose name or a branch's name holds `q`, for an admin to pick one (the brand page's
	 * "Merge with another brand"): the name starting with it first, then the most branches.
	 */
	async search(q: string, excludeId?: string, limit = 8): Promise<Brand[]> {
		const like = `%${q.trim().replace(/[\\%_]/g, m => `\\${m}`)}%`;
		const prefix = `${q.trim().replace(/[\\%_]/g, m => `\\${m}`)}%`;
		const rows: { id: string }[] = await this.em.getConnection().execute(
			`select b.id from brands b
			where (b.name ilike ? or exists (select 1 from venues v where v.brand_id = b.id and v.name ilike ?))
				${excludeId ? 'and b.id <> ?' : ''}
			order by (b.name ilike ?) desc,
				(select count(*) from venues v where v.brand_id = b.id) desc,
				lower(b.name), b.id
			limit ?`,
			[like, like, ...(excludeId ? [excludeId] : []), prefix, limit],
		);
		if (rows.length === 0) return [];
		const brands = await this.em.find(
			Brand,
			{ id: { $in: rows.map(r => r.id) } },
			{ populate: ['branches', 'branches.city', 'branches.favicon'] },
		);
		const order = new Map(rows.map((r, i) => [r.id, i]));
		return _.sortBy(brands, b => order.get(b.id));
	}

	/**
	 * Merges another brand into this one, whatever their names: its branches and records move
	 * here (`absorb`) and it is deleted. This brand keeps its id, and its name unless `name` is
	 * given. 409 when both are prospects, or when another chain has the name's key.
	 */
	async mergeBrand(id: string, otherId: string, rawName?: string): Promise<Brand> {
		if (id === otherId) throw new BadRequestException('Pick another brand to merge');
		const brand = await this.get(id);
		const other = await this.get(otherId);
		const name = (rawName ?? brand.name).trim();
		const key = brandKey(name);
		if (!key) throw new BadRequestException('Give the brand a name');
		const chain =
			key !== brand.key &&
			(await this.list()).find(b => b.key === key && b.id !== id && b.id !== otherId);
		if (chain)
			throw new ConflictException(`${chain.name} is a brand already: merge into it instead`);
		const prospects: { n: number }[] = await this.em
			.getConnection()
			.execute(`select count(*)::int n from prospects where brand_id in (?, ?)`, [id, otherId]);
		if (prospects[0].n > 1)
			throw new ConflictException(
				'Both brands are prospects: take one off outreach first',
			);

		const venues = other.branches.getItems();
		const keep = await this.absorb(brand, [brand, other]);
		// Its own places are branches now, whatever this brand said about them before
		if (venues.length)
			await this.em.nativeDelete(BrandExcludedVenue, {
				brand: keep.id,
				venue: { $in: venues.map(v => v.id) },
			});
		Object.assign(keep, { name, key });
		await this.em.flush();
		await this.changed([keep.id], venues);
		return this.get(keep.id);
	}

	/** Adds venues as branches: their brands are merged into this one (`absorb`). */
	async addBranches(id: string, venueIds: string[]): Promise<Brand> {
		const venues = await this.join(id, venueIds);
		await this.changed([id], venues);
		return this.get(id);
	}

	/**
	 * Joins the places a brand's own profile says are its own (its bio gives their streets and
	 * house numbers, or it links their website, and it is named after them: the account matcher's
	 * `profilePlaces`) to the brand, as `addBranches` does: Lucy's profile lists Torstraße 116
	 * and Brunnenstraße 24, so its two places are one brand. Only a place that is a brand of its
	 * own joins (a chain is never swallowed by a profile), never one the brand excluded, and none
	 * while an admin's split or dismissal holds the brand's key or the place's. A place whose
	 * brand can't be merged in (two prospects) is left and logged. One `BrandChangedJob`.
	 * Returns the venues that joined.
	 */
	async joinByProfile(brandId: string, venueIds: string[]): Promise<string[]> {
		const brand = await this.get(brandId);
		const excluded = (await this.excludedVenues([brandId])).get(brandId) ?? new Set<string>();
		const venues = (
			await this.em.find(
				Venue,
				{ id: { $in: _.uniq(venueIds) } },
				{ populate: ['brand', 'brand.branches'] },
			)
		).filter(
			v => v.brand.id !== brandId && !excluded.has(v.id) && v.brand.branches.length === 1,
		);
		if (!venues.length) return [];
		const keys = [brand.key, ...venues.map(v => v.brand.key)];
		const dismissed = new Set(
			(
				await this.em.find(
					BrandDismissal,
					{ key: { $in: _.uniq(keys) } },
					{ fields: ['key'] },
				)
			).map(d => d.key),
		);
		if (dismissed.has(brand.key)) return [];
		const joined: Venue[] = [];
		for (const venue of venues.filter(v => !dismissed.has(v.brand.key))) {
			try {
				joined.push(...(await this.join(brandId, [venue.id])));
			} catch (e) {
				this.logger.warn(
					`${venue.name} not joined to ${brand.name} by its profile: ${(e as Error).message}`,
				);
			}
		}
		if (joined.length) {
			this.logger.log(
				`Joined ${joined.map(v => v.name).join(', ')} to ${brand.name}: its profile names them`,
			);
			await this.changed([brandId], [...joined, ...brand.branches.getItems()]);
		}
		return joined.map(v => v.id);
	}

	/**
	 * Takes a branch off the brand: it becomes a brand of its own, named like it, and the brand's
	 * records (reports, prospect, members) stay with the brand. It is never offered or joined
	 * again (`BrandExcludedVenue`), or `autoMerge` would put it back; with `exclude`, a venue that
	 * is no branch is excluded too, so "Not a branch" works on a candidate. A brand's last branch
	 * can't be taken off.
	 */
	async removeBranch(id: string, venueId: string, exclude = false): Promise<Brand> {
		const brand = await this.get(id);
		const venue = await this.em.findOneOrFail(Venue, { id: venueId });
		const wasBranch = venue.brand.id === brand.id;
		if (wasBranch && brand.branches.length === 1)
			throw new BadRequestException(`${venue.name} is the brand's only branch`);
		if (exclude || wasBranch) await this.exclude(brand, venue);
		if (wasBranch) {
			await this.standAlone([venue]);
			await this.changed([brand.id, venue.brand.id], [venue, ...brand.branches.getItems()]);
		}
		await this.em.flush();
		return this.get(id);
	}

	/**
	 * Undoes a chain: every branch but the most reviewed becomes a brand of its own again. The
	 * brand keeps that branch and its records. The branches
	 * are not one brand, so their suggestions are dismissed: neither an admin nor `autoMerge`
	 * sees them again.
	 */
	async split(id: string): Promise<Brand> {
		const brand = await this.get(id);
		const keep =
			busiestBranch(brand.branches.getItems().filter(v => !v.closed)) ?? brand.branches[0];
		const others = brand.branches.getItems().filter(v => v.id !== keep.id);
		const keys = [
			brand.key,
			...Object.values(_.groupBy(brand.branches.getItems(), v => v.city.id)).flatMap(
				branches =>
					suggestBrands(
						branches,
						cityStopwords(branches[0].city.nameStopwords),
						new Set(),
					).map(g => g.key),
			),
		];
		const name = brand.name;
		Object.assign(brand, { name: keep.name, key: brandKey(keep.name) });
		await this.standAlone(others);
		for (const key of _.uniq(keys))
			if (!(await this.em.count(BrandDismissal, { key })))
				this.em.create(BrandDismissal, { name, key });
		await this.em.flush();
		await this.changed([brand.id, ...others.map(v => v.brand.id)], [keep, ...others]);
		return this.get(id);
	}

	/** "Not one brand": the suggestion with this key never comes back. */
	async dismiss(input: { name: string; key: string }): Promise<void> {
		const chain = (await this.list()).find(b => b.key === input.key);
		if (chain) throw new ConflictException(`${chain.name} is a brand: split it instead`);
		if (await this.em.count(BrandDismissal, { key: input.key })) return;
		this.em.create(BrandDismissal, { name: input.name.trim(), key: input.key });
		await this.em.flush();
	}

	/**
	 * The brands a branch search covers: every chain with a branch in the city (`brandIds` null:
	 * the quarter's `SEARCH_BRANCHES`), or the given ones ("Find branches" on a brand's page). The
	 * plan step of `brand-branch-search`: the search is one `places.run` for their names
	 * (`BRAND_SEARCH_RESULTS` places each, every place saved as a lookup, never an opening, so
	 * matching gets the look-alikes too; unlike a name lookup it is repeated every time, as new
	 * branches open), `saveBranchSearch` the step after it.
	 */
	async planBranchSearch(
		city: City,
		brandIds: string[] | null,
	): Promise<{ brands: BranchSearchBrand[] }> {
		const brands =
			brandIds ?
				await this.em.find(Brand, { id: { $in: brandIds } }, { populate: ['branches'] })
			:	(await this.list()).filter(b =>
					b.branches.getItems().some(v => v.city.id === city.id),
				);
		return {
			brands: brands.map(b => ({
				id: b.id,
				name: b.name,
				key: b.key,
				branchId: b.branches.getItems()[0]?.id ?? null,
			})),
		};
	}

	/**
	 * What the brands' name searches found: the places are saved already; the ones whose site is
	 * the brand's join it now (`autoMerge`, so the brand page shows them when its polling ends),
	 * and the other open food venues named like the brand (`isBrandName`), minus the ones an admin
	 * said are not its branches, are counted as `candidates` for an admin. Every searched brand is
	 * stamped `branchesSearchedAt` for the city: the brand it is in now, since a brand of one branch
	 * may itself have been merged into a chain. Flushes.
	 */
	async saveBranchSearch(
		city: City,
		brands: BranchSearchBrand[],
		result: BranchSearchFound,
		now = new Date(),
	): Promise<{ brands: number; found: number; saved: number; candidates: number }> {
		if (brands.length === 0)
			return { brands: 0, found: result.found, saved: result.saved, candidates: 0 };
		await this.autoMerge(city.id);

		const words = cityStopwords(city.nameStopwords);
		const byQuery = new Map(
			Object.entries(result.byQuery).map(([query, ids]) => [query.trim().toLowerCase(), ids]),
		);
		const foundFor = (brand: BranchSearchBrand): string[] =>
			(byQuery.get(brand.name.trim().toLowerCase()) ?? [])
				.map(placeId => result.venueIds[placeId])
				.filter((id): id is string => !!id);
		const venues = new Map(
			(
				await this.em.find(
					Venue,
					{ id: { $in: _.uniq(brands.flatMap(foundFor)) } },
					{ populate: ['brand'] },
				)
			).map(v => [v.id, v]),
		);
		// Each searched brand as it is now: a brand of one branch may have joined a chain
		const branches = new Map(
			(
				await this.em.find(
					Venue,
					{ id: { $in: brands.map(b => b.branchId).filter((id): id is string => !!id) } },
					{ populate: ['brand'] },
				)
			).map(v => [v.id, v.brand]),
		);
		const stillThere = new Map(
			(await this.em.find(Brand, { id: { $in: brands.map(b => b.id) } })).map(b => [b.id, b]),
		);
		const current = new Map<string, Brand>();
		for (const brand of brands) {
			const searched =
				(brand.branchId && branches.get(brand.branchId)) || stillThere.get(brand.id);
			if (searched) current.set(brand.id, searched);
		}
		const exclusions = await this.excludedVenues(_.uniq([...current.values()].map(b => b.id)));

		let candidates = 0;
		for (const brand of brands) {
			const searched = current.get(brand.id);
			if (!searched) continue;
			searched.branchesSearchedAt = {
				...searched.branchesSearchedAt,
				[city.id]: now.toISOString(),
			};
			candidates += foundFor(brand).filter(id => {
				const v = venues.get(id);
				return (
					!!v &&
					!v.closed &&
					isFoodVenue(v.category) &&
					isBrandName(v.name, brand.key, words) &&
					v.brand.id !== searched.id &&
					!exclusions.get(searched.id)?.has(v.id)
				);
			}).length;
		}
		await this.em.flush();
		this.logger.log(
			`Searched ${brands.length} brands in ${city.name}: ${result.found} places, ${candidates} possible new branches`,
		);
		return { brands: brands.length, found: result.found, saved: result.saved, candidates };
	}

	/** Mentions linked to each venue (its branch known), of any month. */
	async mentionCounts(venueIds: string[]): Promise<Map<string, number>> {
		if (venueIds.length === 0) return new Map();
		const rows: { venue_id: string; n: number }[] = await this.em
			.getConnection()
			.execute(
				`select venue_id, count(*)::int n from mentions where venue_id in (${marks(venueIds)}) group by venue_id`,
				venueIds,
			);
		return new Map(rows.map(r => [r.venue_id, r.n]));
	}

	/** Each brand's mentions that name it but no branch, of any month. */
	async brandOnlyMentionCounts(brandIds: string[]): Promise<Map<string, number>> {
		if (brandIds.length === 0) return new Map();
		const rows: { brand_id: string; n: number }[] = await this.em.getConnection().execute(
			`select brand_id, count(*)::int n from mentions
			where brand_id in (${marks(brandIds)}) and venue_id is null group by brand_id`,
			brandIds,
		);
		return new Map(rows.map(r => [r.brand_id, r.n]));
	}

	/**
	 * Makes the venues' brands one, named `name` (`merge`, `autoMerge`): the brand that stays is
	 * `keeper`'s, the others' records move onto it (`absorb`). 409 when another chain has the
	 * name's key, or two of the brands have a prospect. Queues nothing.
	 */
	private async combine(
		rawName: string,
		venueIds: string[],
	): Promise<{ keep: Brand; venues: Venue[] }> {
		const name = rawName.trim();
		const key = brandKey(name);
		if (!key) throw new BadRequestException('Give the brand a name');
		const venues = await this.em.find(
			Venue,
			{ id: { $in: _.uniq(venueIds) } },
			{ populate: ['brand'] },
		);
		if (venues.length === 0) throw new BadRequestException('Pick at least one branch');
		const brands = _.uniqBy(
			venues.map(v => v.brand),
			b => b.id,
		);
		const chain = (await this.list()).find(
			b => b.key === key && !brands.some(m => m.id === b.id),
		);
		if (chain)
			throw new ConflictException(`${chain.name} is a brand already: add the branches to it`);

		const keep = await this.absorb(await this.keeper(brands, venues), brands);
		Object.assign(keep, { name, key });
		await this.em.flush();
		return { keep, venues };
	}

	/** Moves the venues' brands into this one (`absorb`), and lets it take them again if excluded. Queues nothing. */
	private async join(id: string, venueIds: string[]): Promise<Venue[]> {
		const brand = await this.get(id);
		const venues = await this.em.find(
			Venue,
			{ id: { $in: _.uniq(venueIds) } },
			{ populate: ['brand'] },
		);
		const keep = await this.absorb(brand, [brand, ...venues.map(v => v.brand)]);
		await this.em.nativeDelete(BrandExcludedVenue, {
			brand: keep.id,
			venue: { $in: _.uniq(venueIds) },
		});
		await this.em.flush();
		return venues;
	}

	/** Venues that are a brand of their own (one branch), with their brand and city. */
	private async loneVenues(where: { city?: string; closed?: boolean }): Promise<Venue[]> {
		const params: unknown[] = [];
		const conditions = ['(select count(*) from venues o where o.brand_id = b.id) = 1'];
		if (where.city) {
			conditions.push('v.city_id = ?');
			params.push(where.city);
		}
		if (where.closed === false) conditions.push('not v.closed');
		const rows: { id: string }[] = await this.em
			.getConnection()
			.execute(
				`select v.id from venues v join brands b on b.id = v.brand_id where ${conditions.join(' and ')}`,
				params,
			);
		const venues: Venue[] = [];
		for (const ids of _.chunk(
			rows.map(r => r.id),
			5000,
		))
			venues.push(
				...(await this.em.find(Venue, { id: { $in: ids } }, { populate: ['favicon'] })),
			);
		return venues;
	}

	/** The venues each of these brands excluded, by brand id (`BrandExcludedVenue`). */
	async excludedVenues(brandIds: string[]): Promise<Map<string, Set<string>>> {
		const out = new Map<string, Set<string>>();
		for (const ids of _.chunk(_.uniq(brandIds), 1000)) {
			if (!ids.length) continue;
			const rows: { brand_id: string; venue_id: string }[] = await this.em
				.getConnection()
				.execute(
					`select brand_id, venue_id from brand_excluded_venues where brand_id in (${marks(ids)})`,
					ids,
				);
			for (const r of rows) {
				const set = out.get(r.brand_id) ?? new Set<string>();
				set.add(r.venue_id);
				out.set(r.brand_id, set);
			}
		}
		return out;
	}

	/** Records that the venue is not the brand's branch, once. Does not flush. */
	private async exclude(brand: Brand, venue: Venue): Promise<void> {
		if (!(await this.em.findOne(BrandExcludedVenue, { brand, venue })))
			this.em.create(BrandExcludedVenue, { brand, venue });
	}

	/** Gives each venue a brand of its own, named like it; its own mentions follow it. Flushes. */
	private async standAlone(venues: Venue[]): Promise<void> {
		for (const venue of venues)
			venue.brand = this.em.create(Brand, { name: venue.name, key: brandKey(venue.name) });
		await this.em.flush();
		// The mentions naming only the old brand stay with it; a branch's own accounts follow it
		for (const venue of venues) {
			await this.em
				.getConnection()
				.execute(`update mentions set brand_id = ? where venue_id = ?`, [
					venue.brand.id,
					venue.id,
				]);
			await this.em
				.getConnection()
				.execute(
					`update social_accounts set brand_id = ?, branch_id = null where branch_id = ?`,
					[venue.brand.id, venue.id],
				);
		}
	}

	/** Of the brands to merge, the one that stays: with a prospect, else the most reports, else the biggest venue's. 409 on two prospects. */
	private async keeper(brands: Brand[], venues: Venue[]): Promise<Brand> {
		const ids = brands.map(b => b.id);
		const conn = this.em.getConnection();
		const prospects: { brand_id: string }[] = await conn.execute(
			`select brand_id from prospects where brand_id in (${marks(ids)})`,
			ids,
		);
		if (prospects.length > 1)
			throw new ConflictException(
				`${prospects.length} of these brands are prospects: take all but one off outreach first`,
			);
		if (prospects.length === 1) return brands.find(b => b.id === prospects[0].brand_id)!;
		const reports: { brand_id: string; n: number }[] = await conn.execute(
			`select brand_id, count(*)::int n from reports where brand_id in (${marks(ids)}) group by brand_id`,
			ids,
		);
		const best = _.maxBy(reports, r => r.n);
		if (best) return brands.find(b => b.id === best.brand_id)!;
		return busiestBranch(venues)!.brand;
	}

	/**
	 * Moves the branches and records of every brand in `brands` but `keep` onto `keep`, deletes
	 * them, and returns `keep` (managed: the entity manager is cleared on the way). A report of
	 * the same city and month as one of `keep`'s is dropped (the next build redoes it); members
	 * and competitors already on `keep` are not doubled; competition between the merged brands
	 * goes. Search interest rows are dropped: the next pull searches the brand's name.
	 */
	private async absorb(keep: Brand, brands: Brand[]): Promise<Brand> {
		const others = _.uniqBy(
			brands.filter(b => b.id !== keep.id),
			b => b.id,
		);
		if (others.length === 0) return keep;
		const ids = others.map(b => b.id);
		const all = [keep.id, ...ids];
		const branchesSearchedAt = Object.assign(
			{},
			...others.map(b => b.branchesSearchedAt),
			keep.branchesSearchedAt,
		);
		await this.em.flush();
		await this.em.transactional(async em => {
			const sql = (q: string, params: unknown[]) =>
				em.getConnection().execute(q, params, 'run', em.getTransactionContext());
			await sql(`update venues set brand_id = ? where brand_id in (${marks(ids)})`, [
				keep.id,
				...ids,
			]);
			await sql(`update mentions set brand_id = ? where brand_id in (${marks(ids)})`, [
				keep.id,
				...ids,
			]);
			// Own accounts move; a suggestion of the chain for its own account goes; "not theirs" for
			// a merged brand says nothing about the chain
			await sql(`update social_accounts set brand_id = ? where brand_id in (${marks(ids)})`, [
				keep.id,
				...ids,
			]);
			await sql(
				`update social_accounts set suggested_brand_id = ? where suggested_brand_id in (${marks(ids)})`,
				[keep.id, ...ids],
			);
			await sql(
				`update social_accounts set suggested_brand_id = null, suggested_score = null where suggested_brand_id = brand_id`,
				[],
			);
			// "Not theirs" for a merged brand is for the chain now; never for the chain's own account
			await sql(
				`update account_rejected_brands r set brand_id = ? where r.brand_id in (${marks(ids)})
				and not exists (select 1 from account_rejected_brands k where k.account_id = r.account_id and k.brand_id = ?)`,
				[keep.id, ...ids, keep.id],
			);
			await sql(
				`delete from account_rejected_brands r using social_accounts a
				where a.id = r.account_id and r.brand_id = ? and a.brand_id = ?`,
				[keep.id, keep.id],
			);
			// The places an admin said are not the merged brands' are not the chain's either
			await sql(
				`update brand_excluded_venues e set brand_id = ? where e.brand_id in (${marks(ids)})
				and not exists (select 1 from brand_excluded_venues k where k.venue_id = e.venue_id and k.brand_id = ?)`,
				[keep.id, ...ids, keep.id],
			);
			await sql(
				`delete from reports r where r.brand_id in (${marks(ids)}) and exists (
					select 1 from reports k where k.brand_id = ? and k.city_id = r.city_id and k.month = r.month
				)`,
				[...ids, keep.id],
			);
			// Of two moved reports of one city and month, the newer stays
			await sql(
				`delete from reports r using reports o
				where r.brand_id in (${marks(ids)}) and o.brand_id in (${marks(ids)})
					and o.city_id = r.city_id and o.month = r.month and o.id <> r.id
					and (o.updated_at > r.updated_at or (o.updated_at = r.updated_at and o.id > r.id))`,
				[...ids, ...ids],
			);
			await sql(`update reports set brand_id = ? where brand_id in (${marks(ids)})`, [
				keep.id,
				...ids,
			]);
			await sql(`update prospects set brand_id = ? where brand_id in (${marks(ids)})`, [
				keep.id,
				...ids,
			]);
			await sql(
				`delete from brand_members m where m.brand_id in (${marks(ids)}) and exists (
					select 1 from brand_members k where k.brand_id = ? and k.user_id = m.user_id
				)`,
				[...ids, keep.id],
			);
			await sql(
				`delete from brand_members m using brand_members o
				where m.brand_id in (${marks(ids)}) and o.brand_id in (${marks(ids)})
					and o.user_id = m.user_id and o.created_at < m.created_at`,
				[...ids, ...ids],
			);
			await sql(`update brand_members set brand_id = ? where brand_id in (${marks(ids)})`, [
				keep.id,
				...ids,
			]);
			// Competition inside the new chain goes, then the rest moves without doubles
			await sql(
				`delete from brand_competitors c where c.brand_id in (${marks(all)}) and (
					c.rival_id in (${marks(all)})
					or c.venue_id in (select id from venues where brand_id = ?)
				)`,
				[...all, ...all, keep.id],
			);
			await sql(
				`delete from brand_competitors c where c.brand_id in (${marks(ids)}) and exists (
					select 1 from brand_competitors k where k.brand_id = ? and (k.venue_id = c.venue_id or k.rival_id = c.rival_id)
				)`,
				[...ids, keep.id],
			);
			await sql(
				`delete from brand_competitors c using brand_competitors o
				where c.brand_id in (${marks(ids)}) and o.brand_id in (${marks(ids)}) and o.id < c.id
					and (o.venue_id = c.venue_id or o.rival_id = c.rival_id)`,
				[...ids, ...ids],
			);
			await sql(
				`update brand_competitors set brand_id = ? where brand_id in (${marks(ids)})`,
				[keep.id, ...ids],
			);
			// Brands that picked a merged brand as their rival now compete with the chain
			await sql(
				`delete from brand_competitors c where c.rival_id in (${marks(ids)}) and exists (
					select 1 from brand_competitors k where k.brand_id = c.brand_id and k.rival_id = ?
				)`,
				[...ids, keep.id],
			);
			await sql(
				`update brand_competitors set rival_id = ? where rival_id in (${marks(ids)})`,
				[keep.id, ...ids],
			);
			await sql(`delete from trend_search_interest where brand_id in (${marks(ids)})`, ids);
			await sql(`delete from trend_related_queries where brand_id in (${marks(ids)})`, ids);
			await sql(`delete from brands where id in (${marks(ids)})`, ids);
		});
		// The identity map still holds the deleted brands and the venues' old brands
		this.em.clear();
		const kept = await this.em.findOneOrFail(Brand, { id: keep.id });
		Object.assign(kept, { branchesSearchedAt });
		await this.em.flush();
		this.logger.log(`Merged ${others.length} brands into ${kept.name}`);
		return kept;
	}

	/** Queues the rematch and rescoring of these brands (before and after a change) and the venues' cities. */
	private async changed(brandIds: string[], venues: Venue[]): Promise<void> {
		await this.pgBossService.sendJob(
			BrandChangedJob.jobName,
			new BrandChangedJob({
				brandIds: _.uniq(brandIds),
				cityIds: _.uniq(venues.map(v => v.city.id)),
			}),
		);
	}
}
