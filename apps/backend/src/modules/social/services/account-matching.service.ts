import { RequestContext } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { cityNames, districtNames } from 'src/modules/cities/util/city.js';
import { VenueTopicService } from 'src/modules/topics/services/venue-topic.service.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { faviconSite } from 'src/modules/venues/util/favicon.js';
import { cityStopwords, isFoodVenue } from 'src/modules/venues/util/venue-names.js';

import { AccountBrandSourceEnum, SocialAccount } from '../entities/social-account.entity.js';
import { SocialPlatformEnum } from '../entities/social-post.entity.js';
import {
	type AccountMatchIndex,
	accountMatchIndex,
	type AccountMatchName,
	AccountMatchTier,
	EXACT_MIN_LENGTH,
	handleForms,
	matchAccount,
	SUGGEST_MIN_SCORE,
} from '../util/account-match.js';
import { captionHandles, type LinkedProfile, normalizeAccountHandle, profileOf } from '../util/accounts.js';
import { placesAreOneBusiness, profilePlaceIndex, profilePlaces } from '../util/profile-places.js';
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
	/** Accounts created for the Instagram handles the city's posts tag or its profiles' bios name (`addMentionedAccounts`) */
	fromTags: number;
	/** Linked because their own profile names a branch's address or links its website (`profilePlaces`) */
	fromProfiles: number;
	/** Places joined to an account's brand because its profile names them as its own */
	joinedByProfiles: number;
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
 * suggested (`siteProfileVerdicts`). Then every account whose profile we read says itself which
 * places it is (`profilePlaces`: its bio names their street and house number, or it links their
 * website, and it is named after them): it is linked to their brand (source `bio`), and the
 * places it names that are a brand of their own join that brand (`BrandService.joinByProfile`).
 * An admin's link, a website's, a site's, a profile's and outreach's are never touched; nor is a
 * brand an admin said an account is not.
 */
/**
 * Whether a handle carries the whole name its match is on, at `EXACT_MIN_LENGTH`+ letters (exact,
 * near, or holding it: "eat.kanaan" for Kanaan), never a part of it: "@samurai" or "@garden" is
 * someone else's handle. What a link that only posts' tags back needs.
 */
const tagsCarryName = (match: NonNullable<ReturnType<typeof matchAccount>>, handle: string, index: AccountMatchIndex): boolean => {
	if (match.matched.length < EXACT_MIN_LENGTH) return false;
	const longest = Math.max(...handleForms(handle, index.cityWords).map(f => f.length));
	return !(match.tier === AccountMatchTier.CONTAINS && longest <= match.matched.length);
};

@Injectable()
export class AccountMatchingService {
	private readonly logger = new Logger(AccountMatchingService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly socialAccountService: SocialAccountService,
		private readonly venueTopicService: VenueTopicService,
		private readonly brandService: BrandService,
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
		const fromTags = await this.addMentionedAccounts(city);

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

		// A blog is a publication, never a venue's own account; an account whose handle another user took keeps
		// its link as it was, since no handle of its own is known
		const accounts = await this.em.find(SocialAccount, {
			city: city.id,
			platform: { $ne: SocialPlatformEnum.BLOG },
			handleLostAt: null,
		});
		const result: AccountMatchResult = {
			accounts: accounts.length,
			linked: 0,
			unlinked: 0,
			suggested: 0,
			websites,
			fromSites: 0,
			siteSuggested: 0,
			fromTags,
			fromProfiles: 0,
			joinedByProfiles: 0,
		};
		const rejectedOf = await this.socialAccountService.rejectedBrands(accounts.map(a => a.id));
		for (const account of accounts) {
			// An admin's, a website's and outreach's links stay
			if (account.brand && account.brandSource !== AccountBrandSourceEnum.HANDLE) continue;
			const evidence = new Set([
				...(postedAbout.get(account.id) ?? []),
				...(tagged.get(`${account.platform}:${account.handle}`) ?? []),
			]);
			const rejected = rejectedOf.get(account.id) ?? new Set<string>();
			let match = matchAccount(
				{ handle: account.handle, displayName: account.displayName, postedAbout: evidence, rejected },
				index,
			);
			// A link only the tags back must carry the brand's whole name: "@samurai" under a post
			// about Samurai Wagyu Yakiniku is someone else
			if (match && !postedAbout.get(account.id)?.has(match.brandId) && tagged.get(`${account.platform}:${account.handle}`)?.has(match.brandId)) {
				const alone = matchAccount(
					{ handle: account.handle, displayName: account.displayName, postedAbout: new Set(postedAbout.get(account.id) ?? []), rejected },
					index,
				);
				if (!(alone?.brandId === match.brandId && alone.link) && !tagsCarryName(match, account.handle, index)) match = null;
			}
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
		Object.assign(result, await this.linkProfilePlaces(venues, city));
		this.logger.log(
			`Accounts ${city.name}: ${result.linked} linked, ${result.unlinked} unlinked, ${result.suggested} suggested, ${websites} from Google websites, ${result.fromSites} linked and ${result.siteSuggested} suggested from sites, ${fromTags} new from tags, ${result.fromProfiles} linked and ${result.joinedByProfiles} places joined from their own profiles`,
		);
		// An own account moves what posts by others say a venue's food is: its city's tags by job
		await this.venueTopicService.queueCityRefresh([city.id]);
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
	 * An account for every Instagram handle the city's posts tag (caption @-mentions, co-authors,
	 * photo tags; any post, read or not) or its Instagram profiles' bios name ("by @haelibo"),
	 * so every account anyone mentions is in the system, its profile to be read
	 * (`READ_MENTIONED_PROFILES`). Existing is no link: the matcher's rules decide that, and a
	 * link only tags back needs the brand's whole name (`tagsCarryName`). TikTok's tags are
	 * display names, not handles, so they make none. Flushes. Returns how many were created.
	 */
	async addMentionedAccounts(city: City): Promise<number> {
		const rows: { handle: string }[] = await this.em.getConnection().execute(
			`select distinct h.handle from social_posts p
			cross join lateral jsonb_array_elements_text(coalesce(p.tagged_handles, '[]'::jsonb)) as h(handle)
			where p.city_id = ? and p.platform = ?`,
			[city.id, SocialPlatformEnum.INSTAGRAM],
		);
		const bios: { bio: string }[] = await this.em.getConnection().execute(
			`select bio from social_accounts where city_id = ? and platform = ? and bio like '%@%'`,
			[city.id, SocialPlatformEnum.INSTAGRAM],
		);
		const handles = new Set<string>();
		for (const row of rows) {
			const handle = normalizeAccountHandle(row.handle);
			if (handle) handles.add(handle);
		}
		for (const { bio } of bios) for (const handle of captionHandles(bio)) handles.add(handle);
		const known = new Set<string>();
		for (const chunk of _.chunk([...handles], 1000)) {
			const found: { handle: string }[] = await this.em.getConnection().execute(
				`select handle from social_accounts where platform = ? and handle in (${chunk.map(() => '?').join(', ')})`,
				[SocialPlatformEnum.INSTAGRAM, ...chunk],
			);
			for (const row of found) known.add(row.handle);
		}
		let created = 0;
		for (const handle of handles) {
			if (known.has(handle)) continue;
			if (await this.socialAccountService.ensure(SocialPlatformEnum.INSTAGRAM, handle, city)) created++;
			if (created % 200 === 0) await this.em.flush();
		}
		await this.em.flush();
		return created;
	}

	/**
	 * The accounts whose profile we read (`profileReadAt`, a bio or links stored), each read
	 * against the city's open food venues (`profilePlaces`). The brand they name is the account's
	 * own (source `bio`), unless an admin, a website, a site, a profile lookup or outreach linked
	 * it already, which stays; a rejected brand is never taken. Among several brands it names, the
	 * one with the most branches in the city stays, else the most reviewed place's, and its other
	 * places that are a brand of their own join it (`BrandService.joinByProfile`, in an entity
	 * manager of its own: a merge clears the one it runs in), but only when they are one
	 * business's (`placesAreOneBusiness`: a business account, three places at most, one name);
	 * else the account is only suggested the brand, for an admin. Then the accounts and venues are
	 * read again and linked. An account naming one branch of a brand with others in the city is
	 * that branch's own. Flushes.
	 */
	private async linkProfilePlaces(
		venues: Venue[],
		city: City,
	): Promise<{ fromProfiles: number; joinedByProfiles: number }> {
		const out = { fromProfiles: 0, joinedByProfiles: 0 };
		const where = {
			platform: { $in: [SocialPlatformEnum.INSTAGRAM, SocialPlatformEnum.TIKTOK] },
			handleLostAt: null,
			profileReadAt: { $ne: null },
			$or: [{ bio: { $ne: null } }, { bioLinks: { $ne: null } }],
		};
		let accounts = await this.em.find(SocialAccount, where);
		if (!accounts.length) return out;
		const words = cityStopwords([...city.nameStopwords, ...cityNames(city)]);
		const rejectedOf = await this.socialAccountService.rejectedBrands(accounts.map(a => a.id));

		// What each profile names, and the brand that keeps its places
		const read = (places: Venue[]) => {
			const index = profilePlaceIndex(
				places.map(v => ({
					id: v.id,
					name: v.name,
					brandId: v.brand.id,
					brandName: v.brand.name,
					street: v.street ?? null,
					website: v.website ?? null,
				})),
			);
			const byId = new Map(places.map(v => [v.id, v]));
			const branchesOf = _.countBy(places, v => v.brand.id);
			return (account: SocialAccount) => {
				const rejected = rejectedOf.get(account.id) ?? new Set<string>();
				const named = profilePlaces(
					{ handle: account.handle, displayName: account.displayName, bio: account.bio, links: account.bioLinks },
					index,
					words,
				)
					.map(p => byId.get(p.venueId)!)
					.filter(v => !rejected.has(v.brand.id));
				if (!named.length) return null;
				const decided =
					!!account.brand &&
					account.brandSource !== AccountBrandSourceEnum.HANDLE &&
					account.brandSource !== AccountBrandSourceEnum.BIO;
				const brandId =
					decided ?
						account.brand!.id
					:	_.orderBy(named, [v => branchesOf[v.brand.id] ?? 0, v => v.reviewsCount ?? 0], ['desc', 'desc'])[0].brand.id;
				// Places of several brands are joined only when they are one business's branches
				const brands = new Set(named.map(v => v.brand.id));
				const oneBusiness = placesAreOneBusiness(account, named.map(v => v.name), words);
				return { named, decided, brandId, branches: branchesOf[brandId] ?? 0, several: brands.size > 1, oneBusiness };
			};
		};

		let plan = read(venues);
		for (const account of accounts) {
			const p = plan(account);
			const others = p?.named.filter(v => v.brand.id !== p.brandId).map(v => v.id) ?? [];
			if (!p || !others.length || !p.oneBusiness) continue;
			const joined = await RequestContext.create(this.em.fork(), () => this.brandService.joinByProfile(p.brandId, others));
			out.joinedByProfiles += joined?.length ?? 0;
		}
		if (out.joinedByProfiles) {
			// The joins moved venues, accounts and mentions to the brands that stayed
			venues = (await this.em.find(Venue, { city: city.id, closed: false }, { populate: ['brand'], refresh: true })).filter(v =>
				isFoodVenue(v.category),
			);
			accounts = await this.em.find(SocialAccount, where, { refresh: true });
			plan = read(venues);
		}

		for (const account of accounts) {
			const p = plan(account);
			if (!p || p.decided) continue;
			// Places of several brands that are not one business: an admin's call, never a link
			if (p.several) {
				if (!account.brand && account.suggestedBrand?.id !== p.brandId) {
					account.suggestedBrand = this.em.getReference(Brand, p.brandId);
					account.suggestedScore = SUGGEST_MIN_SCORE;
				}
				continue;
			}
			const own = p.named.filter(v => v.brand.id === p.brandId);
			const branch = own.length === 1 && p.branches > 1 ? own[0] : null;
			if (account.brand?.id === p.brandId && (account.branch?.id ?? null) === (branch?.id ?? null)) continue;
			await this.socialAccountService.setBrand(account, this.em.getReference(Brand, p.brandId), AccountBrandSourceEnum.BIO, branch);
			account.suggestedBrand = null;
			account.suggestedScore = null;
			out.fromProfiles++;
		}
		await this.em.flush();
		return out;
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
