import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import type { InstagramProfileItem } from 'src/modules/apify/actors/instagram-profile.actor.js';
import type { TiktokProfileItem } from 'src/modules/apify/actors/tiktok-profile.actor.js';
import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { cityNames, districtNames } from 'src/modules/cities/util/city.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { cityStopwords } from 'src/modules/venues/util/venue-names.js';

import { AccountBrandSourceEnum, SocialAccount } from '../entities/social-account.entity.js';
import { AccountSnapshotSourceEnum } from '../entities/social-account-snapshot.entity.js';
import { SocialPlatformEnum } from '../entities/social-post.entity.js';
import { SUGGEST_MIN_SCORE } from '../util/account-match.js';
import type { ProfilePlatform } from '../util/accounts.js';
import {
	instagramProfileFacts,
	type ProfileFacts,
	profileNamedAfter,
	type ProfileProof,
	profileProof,
	tiktokProfileFacts,
} from '../util/profile-proof.js';
import { PROFILE_ONLY_USD, type ProfileRuns, profilesPurpose } from '../util/profile-runs.js';

import { SocialAccountService } from './social-account.service.js';

const otherPlatform = (platform: ProfilePlatform): ProfilePlatform =>
	platform === SocialPlatformEnum.INSTAGRAM ?
		SocialPlatformEnum.TIKTOK
	:	SocialPlatformEnum.INSTAGRAM;

export interface AccountTwinResult {
	/** Brand accounts in the city whose brand has none on the other platform, not looked up yet */
	candidates: number;
	/** Handles asked for on the other platform */
	lookedUp: number;
	/** That exist there */
	found: number;
	/** Linked: the profile proved itself the brand's (source `profile`) */
	linked: number;
	/** Suggested: named after the brand, no proof */
	suggested: number;
	/** Proofs of the links, by kind */
	proofs: Record<string, number>;
}

/** What `planLookup` hands the `find-own-accounts` workflow: the lookups and their runs (one profile-only run a platform) */
export interface AccountTwinPlan extends ProfileRuns {
	candidates: number;
	/** Each lookup (`<platform>:<handle>`, the handle on the other platform) → the ids of the brand accounts whose handle it is (two brands' accounts of one handle are one lookup) */
	wanted: Record<string, string[]>;
}

/** The runs' records, one a platform the plan had a run for */
export interface AccountTwinRecords {
	instagram?: string;
	tiktok?: string;
}

/**
 * Finds a brand's account on the platform it has none on: its account's handle on the other
 * platform (`@munchiesde` on TikTok → `@munchiesde` on Instagram), looked up through the
 * profile atoms (`planLookup` the runs, `saveLookup` the reading of their stored items). A
 * profile that proves itself the brand's (`profileProof`: its link is on the brand's site, its bio
 * names a branch's street, or it links the brand's account) is linked (source `profile`); one
 * named after the brand is suggested. Each account is looked up once
 * (`SocialAccount.twinCheckedAt`), found or not; one a run didn't return stays to look up.
 */
@Injectable()
export class AccountTwinService {
	private readonly logger = new Logger(AccountTwinService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly apifyService: ApifyService,
		private readonly socialAccountService: SocialAccountService,
	) {}

	/**
	 * The city's brands' accounts to look up, highest lead score first, then most followed, as
	 * many as the budget covers at `PROFILE_ONLY_USD` each: the runs the atom makes, their
	 * accounts saved with `accounts: 'known'` (a stranger with the same handle gets no account).
	 */
	async planLookup(city: City, budgetUsd: number): Promise<AccountTwinPlan> {
		const rows: { id: string; platform: ProfilePlatform; handle: string }[] = await this.em
			.getConnection()
			.execute(
				`select a.id, a.platform, a.handle from social_accounts a
			join brands b on b.id = a.brand_id
			where a.platform in (?, ?) and a.twin_checked_at is null and a.handle_lost_at is null
			and exists (select 1 from venues v where v.brand_id = a.brand_id and v.city_id = ? and not v.closed)
			and not exists (
				select 1 from social_accounts o
				where o.brand_id = a.brand_id and o.platform in (?, ?) and o.platform <> a.platform
			)
			order by b.lead_score desc nulls last, a.followers desc nulls last, a.handle`,
				[
					SocialPlatformEnum.INSTAGRAM,
					SocialPlatformEnum.TIKTOK,
					city.id,
					SocialPlatformEnum.INSTAGRAM,
					SocialPlatformEnum.TIKTOK,
				],
			);
		let left = budgetUsd;
		const picked = rows.filter(row => {
			const cost = PROFILE_ONLY_USD[otherPlatform(row.platform)];
			if (cost > left) return false;
			left -= cost;
			return true;
		});
		// One lookup a handle on each platform: two brands' accounts of one handle are one
		const wanted: Record<string, string[]> = {};
		for (const row of picked) {
			const key = `${otherPlatform(row.platform)}:${row.handle}`;
			wanted[key] = [...(wanted[key] ?? []), row.id];
		}
		const run = (platform: ProfilePlatform) => {
			const handles = Object.keys(wanted)
				.filter(key => key.startsWith(`${platform}:`))
				.map(key => key.slice(platform.length + 1));
			return handles.length ?
					{
						handles,
						read: { mode: 'profile' } as const,
						maxCostUsd: handles.length * PROFILE_ONLY_USD[platform],
						purpose: profilesPurpose(platform, `twins ${city.name}`, handles.length),
					}
				:	null;
		};
		return {
			candidates: rows.length,
			wanted,
			instagram: run(SocialPlatformEnum.INSTAGRAM),
			tiktok: run(SocialPlatformEnum.TIKTOK),
		};
	}

	/**
	 * The lookups read from the runs' stored items (`records`, one a platform): each looked-up
	 * account stamped `twinCheckedAt` (one not returned stays to look up), each profile that exists
	 * judged for the first owner it proves itself for (linked), else the first it is named after
	 * (suggested); a stranger gets no account from us. Flushes.
	 */
	async saveLookup(
		city: City,
		plan: AccountTwinPlan,
		records: AccountTwinRecords,
		now: Date,
	): Promise<AccountTwinResult> {
		const result: AccountTwinResult = {
			candidates: plan.candidates,
			lookedUp: Object.keys(plan.wanted).length,
			found: 0,
			linked: 0,
			suggested: 0,
			proofs: {},
		};
		const byKey = new Map<string, ProfileFacts>();
		const facts: (ProfileFacts | null)[] = [
			...(records.instagram ?
				(await this.apifyService.storedItems<InstagramProfileItem>(records.instagram)).map(
					instagramProfileFacts,
				)
			:	[]),
			...(records.tiktok ?
				(await this.apifyService.storedItems<TiktokProfileItem>(records.tiktok)).map(
					tiktokProfileFacts,
				)
			:	[]),
		];
		// A TikTok profile comes once per video: its first item is enough
		for (const f of facts)
			if (f && !byKey.has(`${f.platform}:${f.handle}`))
				byKey.set(`${f.platform}:${f.handle}`, f);

		const sources = await this.em.find(
			SocialAccount,
			{ id: { $in: _.uniq(Object.values(plan.wanted).flat()) } },
			{ populate: ['brand'] },
		);
		const sourceById = new Map(sources.map(s => [s.id, s]));
		const brandIds = _.uniq(sources.map(s => s.brand!.id));
		const branches = await this.em.find(Venue, { brand: { $in: brandIds }, closed: false });
		const branchesOf = _.groupBy(branches, b => b.brand.id);
		const cityWords = cityStopwords([
			...city.nameStopwords,
			...cityNames(city),
			...districtNames(city),
		]);

		for (const [key, ownerIds] of Object.entries(plan.wanted)) {
			const owners = ownerIds.map(id => sourceById.get(id)).filter(s => !!s);
			const profile = byKey.get(key);
			// Not returned (the run failed or its cap stopped it): looked up next time
			if (!profile) continue;
			for (const source of owners) source.twinCheckedAt = now;
			if (!profile.exists) continue;
			result.found++;
			// The atom updated a known account with the profile's name and followers already
			const existing = await this.em.findOne(SocialAccount, {
				platform: profile.platform,
				handle: profile.handle,
			});
			// An admin's, a website's, a site's, outreach's or another profile's link stays
			if (existing?.brand && existing.brandSource !== AccountBrandSourceEnum.HANDLE) continue;
			// The first owner the profile proves itself for, else the first it is named after
			let verdict: { brand: Brand; proof: ProfileProof | null } | null = null;
			for (const source of owners) {
				const brand = source.brand as Brand;
				if (existing && (await this.socialAccountService.isRejected(existing, brand.id)))
					continue;
				const own = branchesOf[brand.id] ?? [];
				const proof = profileProof(profile, {
					name: brand.name,
					websites: own.map(b => b.website),
					streets: own.map(b => b.street),
					account: {
						platform: source.platform as ProfilePlatform,
						handle: source.handle,
					},
				});
				if (proof) {
					verdict = { brand, proof };
					break;
				}
				if (
					!verdict &&
					!existing?.brand &&
					profileNamedAfter(profile, brand.name, cityWords)
				)
					verdict = { brand, proof: null };
			}
			// A stranger with the same handle gets no account from us
			if (!verdict) continue;
			const account =
				existing ??
				(await this.socialAccountService.ensure(
					profile.platform,
					profile.handle,
					city,
					{
						platformUserId: profile.platformUserId,
						displayName: profile.displayName,
						followers: profile.followers,
						following: profile.following,
						profile,
						source: AccountSnapshotSourceEnum.PROFILE,
					},
					now,
				));
			if (!account) continue;
			if (verdict.proof) {
				await this.socialAccountService.setBrand(
					account,
					verdict.brand,
					AccountBrandSourceEnum.PROFILE,
				);
				result.linked++;
				result.proofs[verdict.proof] = (result.proofs[verdict.proof] ?? 0) + 1;
			} else {
				account.suggestedBrand = verdict.brand;
				account.suggestedScore = SUGGEST_MIN_SCORE;
				result.suggested++;
			}
		}
		await this.em.flush();
		this.logger.log(
			`Account twins ${city.name}: ${result.lookedUp} looked up, ${result.found} found, ${result.linked} linked, ${result.suggested} suggested`,
		);
		return result;
	}
}
