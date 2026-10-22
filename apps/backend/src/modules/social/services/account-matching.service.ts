import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { cityNames, districtNames } from 'src/modules/cities/util/city.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { isFoodVenue } from 'src/modules/venues/util/venue-names.js';

import { AccountBrandSourceEnum, SocialAccount } from '../entities/social-account.entity.js';
import { SocialPlatformEnum } from '../entities/social-post.entity.js';
import { accountMatchIndex, type AccountMatchName, matchAccount } from '../util/account-match.js';
import { profileOf } from '../util/accounts.js';

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
}

/**
 * Links accounts to the brands they are the own accounts of, for one city, free and on stored
 * data: a branch whose Google website is an Instagram or TikTok profile links that profile
 * (creating the account when nothing it posted was scraped yet); every other account of the
 * city goes through `matchAccount` against the city's open food venues and their brands, with
 * the brands its posts were matched to as evidence. A link becomes `brand` (source `handle`), a
 * likely one `suggestedBrand` for an admin. An admin's link, a website's and outreach's are
 * never touched; nor is a brand an admin said an account is not.
 */
@Injectable()
export class AccountMatchingService {
	private readonly logger = new Logger(AccountMatchingService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly socialAccountService: SocialAccountService,
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
		const result: AccountMatchResult = { accounts: accounts.length, linked: 0, unlinked: 0, suggested: 0, websites };
		for (const account of accounts) {
			// An admin's, a website's and outreach's links stay
			if (account.brand && account.brandSource !== AccountBrandSourceEnum.HANDLE) continue;
			const match = matchAccount(
				{
					handle: account.handle,
					displayName: account.displayName,
					postedAbout: postedAbout.get(account.id),
					rejected: new Set(account.rejectedBrandIds),
				},
				index,
			);
			if (match?.link) {
				if (account.brand?.id !== match.brandId || (account.branch?.id ?? undefined) !== match.branchId) {
					this.socialAccountService.setBrand(
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
				this.socialAccountService.setBrand(account, null, AccountBrandSourceEnum.HANDLE);
				result.unlinked++;
			}
			account.suggestedBrand = match ? this.em.getReference(Brand, match.brandId) : null;
			account.suggestedScore = match ? match.score : null;
			if (match) result.suggested++;
		}
		await this.em.flush();
		this.logger.log(
			`Accounts ${city.name}: ${result.linked} linked, ${result.unlinked} unlinked, ${result.suggested} suggested, ${websites} from websites`,
		);
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
			if (!account || account.rejectedBrandIds.includes(brand.id)) continue;
			// Only the matcher's own guess gives way; an admin's, outreach's or a website's link stays
			if (account.brand && account.brandSource !== AccountBrandSourceEnum.HANDLE) continue;
			const ownBranch = byBrand[brand.id].some(
				p => p.venue.id !== venue.id && (p.profile.platform !== profile.platform || p.profile.handle !== profile.handle),
			);
			this.socialAccountService.setBrand(account, brand, AccountBrandSourceEnum.WEBSITE, ownBranch ? venue : null);
			linked++;
		}
		return linked;
	}
}
