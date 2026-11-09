import { QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import {
	GOOGLE_PLACE_USD,
	GOOGLE_PLACES_MIN_CAP_USD,
} from 'src/modules/apify/actors/google-places.actor.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { cityNames } from 'src/modules/cities/util/city.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { cityStopwords, isFoodVenue } from 'src/modules/venues/util/venue-names.js';

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
// Candidates one agent call is shown at most
export const MAX_PLACE_CANDIDATES = 8;
// The score an agent's pick is suggested with: under the matcher's links, for an admin to confirm
export const PROFILE_PLACE_SCORE = 0.8;

export interface PlaceAskResult {
	/** Profiles asked about the places at their bio's address */
	asked: number;
	/** Answered with one of the places: suggested to an admin */
	suggested: number;
}

/** What `planAddressSearches` hands the `read-mentioned-profiles` workflow: the Google Maps run to start (`places.run`, typed searches) */
export interface AddressSearchPlan {
	due: number;
	/** The profiles searched, most followed first, with the search each one's name and address makes */
	picked: { accountId: string; search: string }[];
	perSearch: number;
	capUsd: number;
}

/** One profile the agent is asked about: its prompt and the places it may pick from */
export interface PlaceQuestion {
	accountId: string;
	handle: string;
	/** The agent's input: the profile and its candidates, as JSON */
	prompt: string;
	candidates: { venueId: string; brandId: string }[];
}

/**
 * What an Instagram business profile's bio address says when the code can't settle it: the
 * profiles whose address none of our places is at are searched on Google Maps by their name and
 * that address (once each: `planAddressSearches`, the `places` atom, `saveAddressSearch`, in the
 * `read-mentioned-profiles` workflow), and the places found are saved like any search's, so the
 * account matcher's next pass links the ones named like the profile (`profilePlaces`). Where
 * places are at the address but none is named like the profile (a market hall's stall, a place
 * Google names otherwise), `ProfilePlaceAgent` picks one or none (`planPlaceQuestions`, one LLM
 * call workflow a profile, `recordPlaceAnswer`; once each), and its pick is only suggested
 * (`suggestedBrand`), never linked, until its answers are scored.
 */
@Injectable()
export class ProfilePlaceService {
	private readonly logger = new Logger(ProfilePlaceService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly profilePlaceAgent: ProfilePlaceAgent,
		private readonly socialAccountService: SocialAccountService,
	) {}

	/** The agent the questions go to, for a workflow that starts one call per question itself */
	get agent(): ProfilePlaceAgent {
		return this.profilePlaceAgent;
	}

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
		const venues = (
			await this.em.find(Venue, { city: city.id, closed: false }, { populate: ['brand'] })
		).filter(v => isFoodVenue(v.category));
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
	 * The unlinked business profiles whose bio gives an address none of our places is at, never
	 * searched, and the ones the budget covers ("SELO COFFEE Tempelhofer Damm 212, 12099 Berlin",
	 * `ADDRESS_SEARCH_RESULTS` places each at `GOOGLE_PLACE_USD`; nothing under the actor's
	 * floor), most followed first: the step before the Google Maps run, `saveAddressSearch` the
	 * one after.
	 */
	async planAddressSearches(city: City, budgetUsd: number): Promise<AddressSearchPlan> {
		const { accounts, index } = await this.unlinked(city, { placesSearchedAt: null });
		const due = accounts.filter(
			a => bioAddresses(a.bio).length > 0 && addressPlaces(a, index).length === 0,
		);
		const perSearch = ADDRESS_SEARCH_RESULTS * GOOGLE_PLACE_USD;
		const picked =
			budgetUsd >= GOOGLE_PLACES_MIN_CAP_USD ?
				due.slice(0, Math.floor(budgetUsd / perSearch))
			:	[];
		return {
			due: due.length,
			picked: picked.map(a => ({
				accountId: a.id,
				search: `${profileSearchName(a)} ${city.name}`,
			})),
			perSearch: ADDRESS_SEARCH_RESULTS,
			capUsd:
				picked.length ? Math.max(GOOGLE_PLACES_MIN_CAP_USD, picked.length * perSearch) : 0,
		};
	}

	/**
	 * The searched profiles stamped `placesSearchedAt`, so each is searched once; the places the
	 * run found were saved by the atom (known venues updated, new food places in the city added).
	 * Flushes.
	 */
	async saveAddressSearch(
		city: City,
		accountIds: string[],
		result: { found: number; saved: number },
		now = new Date(),
	): Promise<{ found: number; saved: number }> {
		const accounts = await this.em.find(SocialAccount, { id: { $in: accountIds } });
		for (const account of accounts) account.placesSearchedAt = now;
		await this.em.flush();
		this.logger.log(
			`Profile addresses in ${city.name}: ${accountIds.length} searched, ${result.found} places, ${result.saved} saved`,
		);
		return { found: result.found, saved: result.saved };
	}

	/**
	 * The profiles the agent is due to be asked about, each with its prompt (the profile and the
	 * places at its address, `MAX_PLACE_CANDIDATES` at most): the `read-mentioned-profiles`
	 * workflow starts one LLM call workflow per question and records each answer with
	 * `recordPlaceAnswer`.
	 */
	async planPlaceQuestions(city: City): Promise<PlaceQuestion[]> {
		const { accounts, index } = await this.unlinked(city, {
			placeAskedAt: null,
			suggestedBrand: null,
		});
		const words = cityStopwords([...city.nameStopwords, ...cityNames(city)]);
		return accounts
			.map(account => ({ account, places: addressPlaces(account, index) }))
			.filter(
				({ account, places }) =>
					places.length > 0 && profilePlaces(account, index, words).length === 0,
			)
			.map(({ account, places }) => {
				const offered = places.slice(0, MAX_PLACE_CANDIDATES);
				return {
					accountId: account.id,
					handle: account.handle,
					prompt: JSON.stringify({
						profile: {
							handle: account.handle,
							displayName: account.displayName ?? null,
							bio: account.bio,
							category: account.businessCategory ?? null,
							followers: account.followers ?? null,
						},
						candidates: offered.map(v => ({
							id: v.id,
							name: v.name,
							category: v.category ?? null,
							street: v.street,
						})),
					}),
					candidates: offered.map(v => ({ venueId: v.id, brandId: v.brandId })),
				};
			});
	}

	/**
	 * The agent's answer for one profile: the profile is stamped asked; a pick among its candidates
	 * becomes its suggestion (`PROFILE_PLACE_SCORE`) unless an admin rejected that brand for it.
	 * Flushes; true when a suggestion was made.
	 */
	async recordPlaceAnswer(
		question: PlaceQuestion,
		venueId: string | null,
		now = new Date(),
	): Promise<boolean> {
		const account = await this.em.findOneOrFail(SocialAccount, question.accountId);
		account.placeAskedAt = now;
		const pick = question.candidates.find(c => c.venueId === venueId);
		const rejected =
			pick ?
				(await this.socialAccountService.rejectedBrands([account.id])).get(account.id)
			:	undefined;
		const suggested = !!pick && !rejected?.has(pick.brandId);
		if (pick && suggested) {
			account.suggestedBrand = this.em.getReference(Brand, pick.brandId);
			account.suggestedScore = PROFILE_PLACE_SCORE;
		}
		await this.em.flush();
		return suggested;
	}
}
