import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { cityNames, districtNames } from 'src/modules/cities/util/city.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { cityStopwords } from 'src/modules/venues/util/venue-names.js';

import { AccountBrandSourceEnum, SocialAccount } from '../entities/social-account.entity.js';
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

import { INSTAGRAM_PROFILE_ACTOR, TIKTOK_PROFILE_ACTOR } from './account-scrape.service.js';
import { SocialAccountService } from './social-account.service.js';

// What one lookup costs at most: an Instagram profile ~$0.0026, a TikTok profile its one
// latest video at ~$0.003; a missing profile costs less
const LOOKUP_USD: Record<ProfilePlatform, number> = {
	[SocialPlatformEnum.INSTAGRAM]: 0.003,
	[SocialPlatformEnum.TIKTOK]: 0.004,
};

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

/**
 * Finds a brand's account on the platform it has none on: its account's handle on the other
 * platform (`@munchiesde` on TikTok → `@munchiesde` on Instagram), looked up with the profile
 * actors. A profile that proves itself the brand's (`profileProof`: its link is on the brand's
 * site, its bio names a branch's street, or it links the brand's account) is linked (source
 * `profile`); one named after the brand is suggested. Each account is looked up once
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
	 * many as the budget covers. Both platforms' runs go side by side; one failing keeps the
	 * other's results, then the call fails with its error. Flushes.
	 */
	async lookup(city: City, budgetUsd: number, now = new Date()): Promise<AccountTwinResult> {
		const rows: { id: string; platform: ProfilePlatform }[] = await this.em
			.getConnection()
			.execute(
				`select a.id, a.platform from social_accounts a
			join brands b on b.id = a.brand_id
			where a.platform in (?, ?) and a.twin_checked_at is null
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
		const result: AccountTwinResult = {
			candidates: rows.length,
			lookedUp: 0,
			found: 0,
			linked: 0,
			suggested: 0,
			proofs: {},
		};
		let left = budgetUsd;
		const picked = rows.filter(row => {
			const cost = LOOKUP_USD[otherPlatform(row.platform)];
			if (cost > left) return false;
			left -= cost;
			return true;
		});
		if (!picked.length) return result;
		const sources = await this.em.find(
			SocialAccount,
			{ id: { $in: picked.map(r => r.id) } },
			{ populate: ['brand'] },
		);
		// One source a handle on each platform: two brands' accounts of one handle are one lookup
		const wanted = _.groupBy(
			sources,
			s => `${otherPlatform(s.platform as ProfilePlatform)}:${s.handle}`,
		);
		const handlesOn = (platform: ProfilePlatform) =>
			Object.keys(wanted)
				.filter(key => key.startsWith(`${platform}:`))
				.map(key => key.slice(platform.length + 1));
		const instagram = handlesOn(SocialPlatformEnum.INSTAGRAM);
		const tiktok = handlesOn(SocialPlatformEnum.TIKTOK);
		result.lookedUp = instagram.length + tiktok.length;

		const [instagramItems, tiktokItems] = await Promise.allSettled([
			instagram.length ?
				this.apifyService.runActor<any>(
					INSTAGRAM_PROFILE_ACTOR,
					{ usernames: instagram },
					{
						maxCostUsd: Math.max(instagram.length * LOOKUP_USD.instagram, 0.05),
						purpose: `instagram twins ${city.name}: ${instagram.length}`,
					},
				)
			:	Promise.resolve([]),
			tiktok.length ?
				this.apifyService.runActor<any>(
					TIKTOK_PROFILE_ACTOR,
					{
						profiles: tiktok,
						resultsPerPage: 1,
						profileSorting: 'latest',
						shouldDownloadVideos: false,
						shouldDownloadCovers: false,
						shouldDownloadSlideshowImages: false,
						shouldDownloadAvatars: false,
					},
					{
						maxCostUsd: Math.max(tiktok.length * LOOKUP_USD.tiktok, 0.05),
						purpose: `tiktok twins ${city.name}: ${tiktok.length}`,
					},
				)
			:	Promise.resolve([]),
		]);

		const facts: ProfileFacts[] = [
			...(instagramItems.status === 'fulfilled' ?
				instagramItems.value.map(instagramProfileFacts)
			:	[]),
			...(tiktokItems.status === 'fulfilled' ?
				tiktokItems.value.map(tiktokProfileFacts)
			:	[]),
		].filter((f): f is ProfileFacts => !!f);
		const byKey = new Map<string, ProfileFacts>();
		// A TikTok profile comes once per video: its first item is enough
		for (const f of facts)
			if (!byKey.has(`${f.platform}:${f.handle}`)) byKey.set(`${f.platform}:${f.handle}`, f);

		const brandIds = _.uniq(sources.map(s => s.brand!.id));
		const branches = await this.em.find(Venue, { brand: { $in: brandIds }, closed: false });
		const branchesOf = _.groupBy(branches, b => b.brand.id);
		const cityWords = cityStopwords([
			...city.nameStopwords,
			...cityNames(city),
			...districtNames(city),
		]);

		for (const [key, owners] of Object.entries(wanted)) {
			const profile = byKey.get(key);
			// Not returned (the run failed or its cap stopped it): looked up next time
			if (!profile) continue;
			for (const source of owners) source.twinCheckedAt = now;
			if (!profile.exists) continue;
			result.found++;
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
					{ displayName: profile.displayName, followers: profile.followers },
					now,
				));
			if (!account) continue;
			if (existing) {
				// A known account takes the profile's name and followers too
				await this.socialAccountService.ensure(
					profile.platform,
					profile.handle,
					city,
					{
						displayName: profile.displayName,
						followers: profile.followers,
					},
					now,
				);
			}
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

		const failed = [instagramItems, tiktokItems].find(r => r.status === 'rejected');
		if (failed) throw (failed as PromiseRejectedResult).reason;
		return result;
	}
}
