import { QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { cityNames } from 'src/modules/cities/util/city.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { VenueScrapeService } from 'src/modules/venues/services/venue-scrape.service.js';
import { GOOGLE_PLACE_USD } from 'src/modules/venues/util/search-ranks.js';
import { cityStopwords, isFoodVenue } from 'src/modules/venues/util/venue-names.js';
import { isFatalProviderError, runPool } from 'src/shared/util/pool.js';

import { ProfilePlaceAgent } from '../agents/profile-place.agent.js';
import { SocialAccount } from '../entities/social-account.entity.js';
import { SocialPlatformEnum } from '../entities/social-post.entity.js';
import {
	addressPlaces,
	bioAddresses,
	type ProfilePlaceIndex,
	profilePlaceIndex,
	profilePlaces,
	profileSearchName,
} from '../util/profile-places.js';

import { SocialAccountService } from './social-account.service.js';

// Places one address search keeps: the place itself, and its neighbours at the address (a market
// hall's stalls) for the agent to pick from
export const ADDRESS_SEARCH_RESULTS = 3;
// The places actor refuses a run capped under this
const PLACES_MIN_CAP_USD = 0.5;
// Candidates one agent call is shown at most
const MAX_PLACE_CANDIDATES = 8;
// The score an agent's pick is suggested with: under the matcher's links, for an admin to confirm
export const PROFILE_PLACE_SCORE = 0.8;

export interface AddressSearchResult {
	/** Unlinked business profiles whose bio gives an address none of our places is at, never searched */
	due: number;
	/** Searched in this run: as many as the budget covers, most followed first */
	searched: number;
	/** Places the searches returned, and the ones saved (known ones updated, new food places in the city added) */
	found: number;
	saved: number;
}

export interface PlaceAskResult {
	/** Profiles asked about the places at their bio's address */
	asked: number;
	/** Answered with one of the places: suggested to an admin */
	suggested: number;
}

/**
 * What an Instagram business profile's bio address says when the code can't settle it: the
 * profiles whose address none of our places is at are searched on Google Maps by their name and
 * that address (`searchAddresses`, once each), and the places found are saved like any search's,
 * so the account matcher's next pass links the ones named like the profile (`profilePlaces`).
 * Where places are at the address but none is named like the profile (a market hall's stall, a
 * place Google names otherwise), `ProfilePlaceAgent` picks one or none (`askPlaces`, once each),
 * and its pick is only suggested (`suggestedBrand`), never linked, until its answers are scored.
 */
@Injectable()
export class ProfilePlaceService {
	private readonly logger = new Logger(ProfilePlaceService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly venueScrapeService: VenueScrapeService,
		private readonly profilePlaceAgent: ProfilePlaceAgent,
		private readonly socialAccountService: SocialAccountService,
	) {}

	/** The city's unlinked Instagram business profiles with a bio and their places index. */
	private async unlinked(city: City, where: Record<string, unknown>) {
		const accounts = await this.em.find(
			SocialAccount,
			{
				city: city.id,
				platform: SocialPlatformEnum.INSTAGRAM,
				isBusiness: true,
				brand: null,
				handleLostAt: null,
				bio: { $ne: null },
				...where,
			},
			{ orderBy: { followers: QueryOrder.DESC_NULLS_LAST, handle: QueryOrder.ASC } },
		);
		const venues = (await this.em.find(Venue, { city: city.id, closed: false }, { populate: ['brand'] })).filter(v =>
			isFoodVenue(v.category),
		);
		const index: ProfilePlaceIndex = profilePlaceIndex(
			venues.map(v => ({
				id: v.id,
				name: v.name,
				brandId: v.brand.id,
				brandName: v.brand.name,
				street: v.street ?? null,
				website: v.website ?? null,
				category: v.category ?? null,
			})),
		);
		return { accounts, index };
	}

	/**
	 * Searches Google Maps for each due profile ("SELO COFFEE Tempelhofer Damm 212, 12099 Berlin",
	 * `ADDRESS_SEARCH_RESULTS` places), most followed first, as many as the budget covers (none
	 * under the actor's $0.50 floor), and stamps `placesSearchedAt`. Flushes.
	 */
	async searchAddresses(city: City, budgetUsd: number, now = new Date()): Promise<AddressSearchResult> {
		const { accounts, index } = await this.unlinked(city, { placesSearchedAt: null });
		const due = accounts.filter(a => bioAddresses(a.bio).length > 0 && addressPlaces(a, index).length === 0);
		const perSearch = ADDRESS_SEARCH_RESULTS * GOOGLE_PLACE_USD;
		const picked = budgetUsd >= PLACES_MIN_CAP_USD ? due.slice(0, Math.floor(budgetUsd / perSearch)) : [];
		const result: AddressSearchResult = { due: due.length, searched: picked.length, found: 0, saved: 0 };
		if (!picked.length) return result;
		const searches = picked.map(a => `${profileSearchName(a)} ${city.name}`);
		const { items, saved } = await this.venueScrapeService.searchPlaces(
			city,
			searches,
			ADDRESS_SEARCH_RESULTS,
			Math.max(PLACES_MIN_CAP_USD, picked.length * perSearch),
			`google-places profile addresses ${city.name}: ${picked.length}`,
		);
		for (const account of picked) account.placesSearchedAt = now;
		await this.em.flush();
		Object.assign(result, { found: items.length, saved });
		this.logger.log(`Profile addresses in ${city.name}: ${picked.length} of ${due.length} searched, ${items.length} places, ${saved} saved`);
		return result;
	}

	/**
	 * Asks `ProfilePlaceAgent`, one profile a call, which place at its bio's address each unlinked
	 * business profile is, where places are there (`addressPlaces`) but none is named like it
	 * (`profilePlaces` would have linked that one). A pick becomes the account's suggestion,
	 * unless an admin said it is not that brand or it has a suggestion already; every answered
	 * profile is stamped `placeAskedAt`. A provider failure keeps what was answered, then throws.
	 * Flushes.
	 */
	async askPlaces(city: City, now = new Date()): Promise<PlaceAskResult> {
		const { accounts, index } = await this.unlinked(city, { placeAskedAt: null, suggestedBrand: null });
		const words = cityStopwords([...city.nameStopwords, ...cityNames(city)]);
		const due = accounts
			.map(account => ({ account, places: addressPlaces(account, index) }))
			.filter(({ account, places }) => places.length > 0 && profilePlaces(account, index, words).length === 0);
		if (!due.length) return { asked: 0, suggested: 0 };
		const rejectedOf = await this.socialAccountService.rejectedBrands(due.map(d => d.account.id));
		const result: PlaceAskResult = { asked: 0, suggested: 0 };
		let failure: unknown;
		try {
			await runPool(
				due,
				4,
				async ({ account, places }) => {
					const offered = places.slice(0, MAX_PLACE_CANDIDATES);
					const { object } = await this.profilePlaceAgent.generate(
						JSON.stringify({
							profile: {
								handle: account.handle,
								displayName: account.displayName ?? null,
								bio: account.bio,
								category: account.businessCategory ?? null,
								followers: account.followers ?? null,
							},
							candidates: offered.map(v => ({ id: v.id, name: v.name, category: v.category ?? null, street: v.street })),
						}),
					);
					account.placeAskedAt = now;
					result.asked++;
					const pick = offered.find(v => v.id === object.venueId);
					if (!pick || rejectedOf.get(account.id)?.has(pick.brandId)) return;
					account.suggestedBrand = this.em.getReference(Brand, pick.brandId);
					account.suggestedScore = PROFILE_PLACE_SCORE;
					result.suggested++;
				},
				(item, e) => this.logger.warn(`Profile place of @${item.account.handle} failed: ${e.message}`),
			);
		} catch (e) {
			if (!isFatalProviderError(e)) throw e;
			failure = e;
		}
		await this.em.flush();
		this.logger.log(`Profile places in ${city.name}: ${result.asked} asked, ${result.suggested} suggested`);
		if (failure) throw failure;
		return result;
	}
}
