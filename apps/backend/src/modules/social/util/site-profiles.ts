// What the profiles a brand's website links say about which are its own accounts. Pure,
// tested in `social/tests/own-account-finding.spec.ts`.

import { siteNamedAfter } from 'src/modules/venues/util/brands.js';

import {
	type AccountMatchIndex,
	AccountMatchTier,
	matchAccount,
	SUGGEST_MIN_SCORE,
} from './account-match.js';
import type { LinkedProfile } from './accounts.js';

/**
 * A profile the sites of this many different brands in a city link is no venue's own: a web
 * agency's credit in the footer, or a group's account on each of its venues' pages
 * (`amanogroup`, `studierendenwerkberlin`). A chain's branches are one brand.
 */
export const GENERIC_PROFILE_BRANDS = 3;

/** The brand whose sites linked the profiles. */
export interface SiteBrand {
	id: string;
	name: string;
	/** Its branches' names: a site may be named after one */
	branchNames: readonly string[];
}

/** What to do with one profile a brand's site links. */
export interface SiteProfileVerdict extends LinkedProfile {
	/** Store the link (source `site`); otherwise suggest the brand to an admin */
	link: boolean;
	score: number;
	/** A branch's own account, when the handle names that branch and not the brand */
	branchId?: string;
}

/**
 * The profiles a brand's websites link (`Venue.siteProfiles` of its branches, each once):
 * one named after the brand (the account matcher links it with the site as evidence, or it is
 * `siteNamedAfter` the brand or a branch) is linked when it is the site's only one named so on
 * its platform, or an exact name among several ("theboxdonut.berlin" next to
 * "theboxdonutdebrecen", which is suggested); the only profile on its platform that isn't named
 * after the brand is suggested; anything else is left. A profile `brandsLinking` says 3+ brands'
 * sites link (`GENERIC_PROFILE_BRANDS`), or one an admin said is not the brand's (`rejected`), is left.
 */
export const siteProfileVerdicts = (
	brand: SiteBrand,
	profiles: readonly LinkedProfile[],
	index: AccountMatchIndex,
	{
		brandsLinking,
		rejected,
	}: {
		/** How many different brands' sites in the city link each profile, by `platform:handle` */
		brandsLinking: ReadonlyMap<string, number>;
		/** Brands an admin said each account is not, by `platform:handle` */
		rejected: ReadonlyMap<string, ReadonlySet<string>>;
	},
): SiteProfileVerdict[] => {
	const evidence = new Set([brand.id]);
	const out: SiteProfileVerdict[] = [];
	const platforms = new Set(profiles.map(p => p.platform));
	for (const platform of platforms) {
		const own = profiles.filter(p => {
			const key = `${p.platform}:${p.handle}`;
			return (
				p.platform === platform &&
				(brandsLinking.get(key) ?? 0) < GENERIC_PROFILE_BRANDS &&
				!rejected.get(key)?.has(brand.id)
			);
		});
		const read = own.map(profile => {
			const match = matchAccount(
				{
					handle: profile.handle,
					postedAbout: evidence,
					rejected: rejected.get(`${profile.platform}:${profile.handle}`),
				},
				index,
			);
			const matched = match?.brandId === brand.id ? match : null;
			const named =
				!!matched?.link ||
				[brand.name, ...brand.branchNames].some(name =>
					siteNamedAfter(profile.handle, name, index.cityWords),
				);
			return { profile, matched, named };
		});
		const named = read.filter(r => r.named);
		for (const { profile, matched } of named) {
			const link = named.length === 1 || matched?.tier === AccountMatchTier.EXACT;
			out.push({
				...profile,
				link,
				score: matched?.score ?? 1,
				...(matched?.branchId && { branchId: matched.branchId }),
			});
		}
		if (!named.length && read.length === 1)
			out.push({ ...read[0].profile, link: false, score: SUGGEST_MIN_SCORE });
	}
	return out;
};
