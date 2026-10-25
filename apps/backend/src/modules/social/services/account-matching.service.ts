import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { cityNames, districtNames } from 'src/modules/cities/util/city.js';
import { VenueFoodTopicService } from 'src/modules/food-topics/services/venue-food-topic.service.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { faviconSite } from 'src/modules/venues/util/favicon.js';
import { isFoodVenue } from 'src/modules/venues/util/venue-names.js';

import { AccountBrandSourceEnum, SocialAccount } from '../entities/social-account.entity.js';
import { SocialPlatformEnum } from '../entities/social-post.entity.js';
import {
	EXACT_MIN_LENGTH,
	type AccountMatchIndex,
	accountMatchIndex,
	type AccountMatchName,
	AccountMatchTier,
	handleForms,
	matchAccount,
} from '../util/account-match.js';
import { type LinkedProfile, normalizeAccountHandle, profileOf } from '../util/accounts.js';
import { siteProfileVerdicts } from '../util/site-profiles.js';

import { SocialAccountService } from './social-account.service.js';

/** What one matching run changed. */
export interface AccountMatchResult {
	/** Accounts of the city looked at */
	accounts: number;
	/** Newly linked to a brand by their handle */
	linked: number;
	/** The matcher's earlier links that no longer hold */
	unlinked: number;
	/** Open suggestions after the run */
	suggested: number;
	/** Linked because a branch's Google website is the profile */
	websites: number;
	/** Linked because the brand's own website links the profile */
	fromSites: number;
	/** Suggested because the brand's own website links the profile */
	siteSuggested: number;
	/** Accounts created for handles posts about a brand tagged, named like that brand */
	fromTags: number;
}

/**
 * Links accounts to the brands they are the own accounts of, for one city, free and on stored
 * data: a branch whose Google website is an Instagram or TikTok profile links that profile
 * (creating the account when nothing it posted was scraped yet); every other account of the
 * city goes through `matchAccount` against the city's open food venues and their brands, with
 * the brands its posts were matched to, and the brands of the posts that tagged it, as
 * evidence (a tagged handle named like a brand its post named becomes an account first). A link
 * becomes `brand` (source `handle`), a likely one `suggestedBrand` for an admin. Last, the
 * profiles the brands' own websites link (`Venue.siteProfiles`) are linked (source `site`) or
 * suggested (`siteProfileVerdicts`). An admin's link, a website's, a site's, a profile's and
 * outreach's are never touched; nor is a brand an admin said an account is not.
 */
@Injectable()
export class AccountMatchingService {
	private readonly logger = new Logger(AccountMatchingService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly socialAccountService: SocialAccountService,
		private readonly venueFoodTopicService: VenueFoodTopicService,
	) {}

	async match(city: City): Promise<AccountMatchResult> {
		const venues = (
			await this.em.find(Venue, { city: city.id, closed: false }, { populate: ['brand'] })
		).filter(v => isFoodVenue(v.category));
		const websites = await this.linkWebsites(venues, city);

		const names: AccountMatchName[] = [];
		for (const [brandId, branches] of Object.entries(_.groupBy(venues, v => v.brand.id))) {
			names.push({ brandId, name: branches[0].brand.name });
			for (const branch of branches) names.push({ brandId, branchId: branch.id, name: branch.name });
		}
		const index = accountMatchIndex(names, [...city.nameStopwords, ...cityNames(city), ...districtNames(city)]);

		const tagged = await this.taggedBrands(city);
		const fromTags = await this.addTaggedAccounts(tagged, index, city);

		const postedAbout = new Map<string, Set<string>>();
		const rows: { account_id: string; brand_id: string }[] = await this.em.getConnection().execute(
			`select distinct p.account_id, m.brand_id from social_posts p join mentions m on m.post_id = p.id
			where p.city_id = ? and p.account_id is not null and m.brand_id is not null`,
			[city.id],
		);
		for (const row of rows) {
			let set = postedAbout.get(row.account_id);
			if (!set) postedAbout.set(row.account_id, (set = new Set()));
			set.add(row.brand_id);
		}

		// A blog is a publication, never a venue's own account
		const accounts = await this.em.find(SocialAccount, { city: city.id, platform: { $ne: SocialPlatformEnum.BLOG } });
		const result: AccountMatchResult = {
			accounts: accounts.length,
			linked: 0,
			unlinked: 0,
			suggested: 0,
			websites,
			fromSites: 0,
			siteSuggested: 0,
			fromTags,
		};
		const rejectedOf = await this.socialAccountService.rejectedBrands(accounts.map(a => a.id));
		for (const account of accounts) {
			// An admin's, a website's and outreach's links stay
			if (account.brand && account.brandSource !== AccountBrandSourceEnum.HANDLE) continue;
			const evidence = new Set([
				...(postedAbout.get(account.id) ?? []),
				...(tagged.get(`${account.platform}:${account.handle}`) ?? []),
			]);
			const match = matchAccount(
				{
					handle: account.handle,
					displayName: account.displayName,
					postedAbout: evidence,
					rejected: rejectedOf.get(account.id) ?? new Set(),
				},
				index,
			);
			if (match?.link) {
				if (account.brand?.id !== match.brandId || (account.branch?.id ?? undefined) !== match.branchId) {
					await this.socialAccountService.setBrand(
						account,
						this.em.getReference(Brand, match.brandId),
						AccountBrandSourceEnum.HANDLE,
						match.branchId ? this.em.getReference(Venue, match.branchId) : null,
					);
					result.linked++;
				}
				continue;
			}
			if (account.brand) {
				await this.socialAccountService.setBrand(account, null, AccountBrandSourceEnum.HANDLE);
				result.unlinked++;
			}
			account.suggestedBrand = match ? this.em.getReference(Brand, match.brandId) : null;
			account.suggestedScore = match ? match.score : null;
			if (match) result.suggested++;
		}
		Object.assign(result, await this.linkSiteProfiles(venues, city, index));
		await this.em.flush();
		this.logger.log(
			`Accounts ${city.name}: ${result.linked} linked, ${result.unlinked} unlinked, ${result.suggested} suggested, ${websites} from Google websites, ${result.fromSites} linked and ${result.siteSuggested} suggested from sites, ${fromTags} new from tags`,
		);
		// An own account moves what posts by others say a venue's food is: its city's tags by job
		await this.venueFoodTopicService.queueCityRefresh([city.id]);
		return result;
	}

	/**
	 * The profiles the city's branches give as their Google website, linked to the brand (one
	 * branch's own when another branch of the brand gives a different profile). Does not flush.
	 */
	private async linkWebsites(venues: Venue[], city: City): Promise<number> {
		let linked = 0;
		const profiles = venues
			.map(venue => ({ venue, profile: profileOf(venue.website) }))
			.filter((x): x is { venue: Venue; profile: NonNullable<ReturnType<typeof profileOf>> } => !!x.profile);
		const byBrand = _.groupBy(profiles, p => p.venue.brand.id);
		for (const { venue, profile } of profiles) {
			const brand = venue.brand;
			const account = await this.socialAccountService.ensure(profile.platform, profile.handle, city);
			if (!account || (await this.socialAccountService.isRejected(account, brand.id))) continue;
			// Only the matcher's own guess gives way; an admin's, outreach's or a website's link stays
			if (account.brand && account.brandSource !== AccountBrandSourceEnum.HANDLE) continue;
			const ownBranch = byBrand[brand.id].some(
				p => p.venue.id !== venue.id && (p.profile.platform !== profile.platform || p.profile.handle !== profile.handle),
			);
			await this.socialAccountService.setBrand(account, brand, AccountBrandSourceEnum.WEBSITE, ownBranch ? venue : null);
			linked++;
		}
		return linked;
	}

	/**
	 * The brands of the city's Instagram posts by tag: for each handle a post tagged (caption
	 * @-mentions, co-authors, people tagged in the photo), the brands its mentions were matched
	 * to. By `platform:handle`. TikTok's tags are left out: its items' `mentions` are display
	 * names as the caption shows them ("@Friendly Fish - Berlin"), not handles.
	 */
	private async taggedBrands(city: City): Promise<Map<string, Set<string>>> {
		const rows: { platform: SocialPlatformEnum; handle: string; brand_id: string }[] = await this.em
			.getConnection()
			.execute(
				`select distinct p.platform, h.handle, m.brand_id
				from social_posts p
				join mentions m on m.post_id = p.id
				cross join lateral jsonb_array_elements_text(coalesce(p.tagged_handles, '[]'::jsonb)) as h(handle)
				where p.city_id = ? and m.brand_id is not null and p.platform = ?`,
				[city.id, SocialPlatformEnum.INSTAGRAM],
			);
		const out = new Map<string, Set<string>>();
		for (const row of rows) {
			const handle = normalizeAccountHandle(row.handle);
			if (!handle) continue;
			const key = `${row.platform}:${handle}`;
			let set = out.get(key);
			if (!set) out.set(key, (set = new Set()));
			set.add(row.brand_id);
		}
		return out;
	}

	/**
	 * An account for each tagged handle we have none for that carries the whole name of a brand
	 * the tagging posts named ("@munchiesde" under a post about Munchies), so the handle pass can
	 * link it before it ever posts for us. The handle must be that name (or a near spelling) or
	 * hold it, at `EXACT_MIN_LENGTH`+ letters: a caption's @ cuts at a hyphen ("@Frieda" of
	 * "@Frieda-Schlamassel.de"), and a part of a name ("@samurai", "@garden") is someone else.
	 * Flushes. Returns how many were created.
	 */
	private async addTaggedAccounts(
		tagged: Map<string, Set<string>>,
		index: AccountMatchIndex,
		city: City,
	): Promise<number> {
		const known = new Set<string>();
		for (const keys of _.chunk([...tagged.keys()], 1000)) {
			const rows: { platform: string; handle: string }[] = await this.em.getConnection().execute(
				`select platform, handle from social_accounts where (platform, handle) in (${keys.map(() => '(?, ?)').join(', ')})`,
				keys.flatMap(key => key.split(/:(.*)/s).slice(0, 2)),
			);
			for (const row of rows) known.add(`${row.platform}:${row.handle}`);
		}
		let created = 0;
		for (const [key, brands] of tagged) {
			if (known.has(key)) continue;
			const [platform, handle] = key.split(/:(.*)/s) as [SocialPlatformEnum, string];
			const match = matchAccount({ handle, postedAbout: brands }, index);
			if (!match?.link || !brands.has(match.brandId) || match.matched.length < EXACT_MIN_LENGTH) continue;
			// Contained: only the handle holding the name, never the name holding the handle
			const longest = Math.max(...handleForms(handle, index.cityWords).map(f => f.length));
			if (match.tier === AccountMatchTier.CONTAINS && longest <= match.matched.length) continue;
			if (await this.socialAccountService.ensure(platform, handle, city)) created++;
		}
		if (created) await this.em.flush();
		return created;
	}

	/**
	 * The profiles the city's brands' own websites link (`Venue.siteProfiles`), each brand's
	 * once over its branches: linked (source `site`) or suggested by `siteProfileVerdicts`. Only
	 * the matcher's guess gives way; another link stays. Does not flush.
	 */
	private async linkSiteProfiles(
		venues: Venue[],
		city: City,
		index: AccountMatchIndex,
	): Promise<{ fromSites: number; siteSuggested: number }> {
		const out = { fromSites: 0, siteSuggested: 0 };
		// How many brands' sites in the city link each profile: a group links its account from
		// every venue's page on one domain
		const brandsOf = new Map<string, Set<string>>();
		for (const venue of venues) {
			if (!faviconSite(venue.website)) continue;
			for (const p of venue.siteProfiles ?? []) {
				const key = `${p.platform}:${p.handle}`;
				let set = brandsOf.get(key);
				if (!set) brandsOf.set(key, (set = new Set()));
				set.add(venue.brand.id);
			}
		}
		const brandsLinking = new Map([...brandsOf].map(([key, brands]) => [key, brands.size]));

		const byBrand = _.groupBy(
			venues.filter(v => v.siteProfiles?.length && faviconSite(v.website)),
			v => v.brand.id,
		);
		const candidates: { brand: Brand; branches: Venue[]; profiles: LinkedProfile[] }[] = Object.values(byBrand).map(
			branches => ({
				brand: branches[0].brand,
				branches,
				profiles: _.uniqBy(
					branches.flatMap(v => v.siteProfiles ?? []),
					p => `${p.platform}:${p.handle}`,
				),
			}),
		);
		const accounts = new Map<string, SocialAccount>();
		const allProfiles = _.uniqBy(
			candidates.flatMap(c => c.profiles),
			p => `${p.platform}:${p.handle}`,
		);
		for (const chunk of _.chunk(allProfiles, 500))
			for (const account of await this.em.find(SocialAccount, {
				$or: chunk.map(p => ({ platform: p.platform, handle: p.handle })),
			}))
				accounts.set(`${account.platform}:${account.handle}`, account);
		const rejectedOf = await this.socialAccountService.rejectedBrands([...accounts.values()].map(a => a.id));
		const rejected = new Map([...accounts].map(([key, a]) => [key, rejectedOf.get(a.id) ?? new Set<string>()]));

		for (const { brand, branches, profiles } of candidates) {
			const verdicts = siteProfileVerdicts(
				{ id: brand.id, name: brand.name, branchNames: branches.map(b => b.name) },
				profiles,
				index,
				{ brandsLinking, rejected },
			);
			for (const verdict of verdicts) {
				const key = `${verdict.platform}:${verdict.handle}`;
				const existing = accounts.get(key);
				// An admin's, outreach's, a website's or a profile's link stays; so does another
				// site's: two brands' sites linking one profile leave it with the first
				if (existing?.brand && existing.brandSource !== AccountBrandSourceEnum.HANDLE) continue;
				if (!verdict.link && existing?.brand) continue;
				const account = existing ?? (await this.socialAccountService.ensure(verdict.platform, verdict.handle, city));
				if (!account) continue;
				accounts.set(key, account);
				if (verdict.link) {
					await this.socialAccountService.setBrand(
						account,
						brand,
						AccountBrandSourceEnum.SITE,
						verdict.branchId ? this.em.getReference(Venue, verdict.branchId) : null,
					);
					out.fromSites++;
				} else if (account.suggestedBrand?.id !== brand.id) {
					account.suggestedBrand = brand;
					account.suggestedScore = verdict.score;
					out.siteSuggested++;
				}
			}
		}
		return out;
	}
}
