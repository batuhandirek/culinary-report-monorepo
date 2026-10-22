// Brands: which venue names are branches of one brand. Pure functions, shared by the venues and
// social modules.

import { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';
import { isDistinctive, nameVariants } from 'src/modules/social/util/account-match.js';
import { profileOf } from 'src/modules/social/util/accounts.js';

import { brandHead, brandKey } from './brand-key.js';
import { faviconSite } from './favicon.js';
import { isFoodVenue, plain } from './venue-names.js';
import { hostOf } from './web-mentions.js';

/**
 * The shortest one-word brand key a longer name may extend ("burgermeister" → "Burgermeister
 * Leopoldplatz"): a short one is a word for food and sweeps in strangers ("burger" → "Burger
 * Vision", "curry" → "Curry Baude"). A key of two words or more may always be extended.
 */
export const BRAND_PREFIX_MIN_LENGTH = 8;

/** How many names with a key inside them (not first) make it a common word (`suggestBrands`). */
export const COMMON_WORD_NAMES = 2;

/** Whether longer names may extend this key (`BRAND_PREFIX_MIN_LENGTH`). */
const extendable = (key: string): boolean =>
	key.includes(' ') || key.length >= BRAND_PREFIX_MIN_LENGTH;

export { brandHead, brandKey } from './brand-key.js';

/**
 * Whether a venue name is a branch name of the brand `key`: the same key, or the key followed
 * by more words ("Burgermeister Kottbusser Tor"), with or without the city's stopwords.
 */
export const isBrandName = (
	venueName: string,
	key: string,
	cityWords?: ReadonlySet<string>,
): boolean => {
	if (!key) return false;
	return [brandKey(venueName), brandKey(venueName, cityWords)].some(
		k => k === key || (extendable(key) && k.startsWith(`${key} `)),
	);
};

/** One branch for `busiestBranch`. */
export interface BranchRank {
	id: string;
	reviewsCount?: number | null;
}

/**
 * A brand's branch with the most Google reviews (then the lowest id): the one whose address a
 * report's place-bound sections describe (district, neighbours, search ranks, busyness). Worked
 * out when needed, never stored. SQL mirrors it as `order by reviews_count desc nulls last, id`.
 */
export const busiestBranch = <T extends BranchRank>(branches: T[]): T | undefined =>
	[...branches].sort(
		(a, b) =>
			(b.reviewsCount ?? -1) - (a.reviewsCount ?? -1) ||
			(a.id < b.id ? -1
			: a.id > b.id ? 1
			: 0),
	)[0];

/**
 * The name people search a venue by: its brand's ("Burgermeister", not "Burgermeister
 * Schlesisches Tor"), its own when the brand isn't loaded.
 */
export const venueSearchName = (venue: {
	name: string;
	brand?: { name?: string } | null;
}): string => venue.brand?.name || venue.name;

export interface BrandSuggestionVenue {
	id: string;
	name: string;
	website?: string | null;
	category?: string | null;
	closed?: boolean;
}

/** Why venues look like one brand (`suggestBrands`). */
export type BrandSuggestionReason =
	| 'same name'
	| 'name prefix'
	| 'same website'
	| 'same Instagram'
	| 'same TikTok';

export interface BrandSuggestionGroup {
	/**
	 * The brand key the branches share; the profile itself ("instagram:kinza.berlin") when they
	 * share one and their names share no words (`isProfileKey`)
	 */
	key: string;
	/** The name to confirm it under: the shared head of the branch names */
	name: string;
	venueIds: string[];
	reason: BrandSuggestionReason;
}

/**
 * Whether a suggestion's key is a shared Instagram or TikTok profile rather than a brand key:
 * such a group is an admin's call, never merged by itself (one owner's two concepts may list
 * one profile).
 */
export const isProfileKey = (key: string): boolean => /^(instagram|tiktok):/.test(key);

const commonWordPrefix = (keys: string[]): string => {
	const words = keys.map(k => k.split(' '));
	const out: string[] = [];
	for (let i = 0; i < words[0].length; i++) {
		if (words.some(w => w[i] !== words[0][i])) break;
		out.push(words[0][i]);
	}
	return out.join(' ');
};

/**
 * A city's open food venues that look like one brand, biggest group first. Same brand key, or
 * a key and longer names that start with it (`BRAND_PREFIX_MIN_LENGTH`), or the same website
 * with the same first word, or the same Instagram or TikTok profile whatever the names (a
 * profile is the business's own; a shared Lieferando or Linktree page says nothing). `skipKeys`
 * (chains that exist, dismissed suggestions) are left out; so are venues with no partner. A
 * venue joins one group at most, and a key names one group.
 */
export const suggestBrands = (
	venues: BrandSuggestionVenue[],
	cityWords: ReadonlySet<string>,
	skipKeys: ReadonlySet<string>,
): BrandSuggestionGroup[] => {
	const open = venues.filter(v => !v.closed && isFoodVenue(v.category));
	const keyOf = new Map(open.map(v => [v.id, brandKey(v.name, cityWords)]));
	const byKey = new Map<string, BrandSuggestionVenue[]>();
	for (const v of open) {
		const key = keyOf.get(v.id)!;
		if (key) byKey.set(key, [...(byKey.get(key) ?? []), v]);
	}

	const assigned = new Set<string>();
	const groups: BrandSuggestionGroup[] = [];
	// A branch's own words, cut back to the brand: "Burgermeister Zoo" → "Burgermeister"
	const nameFor = (key: string, members: BrandSuggestionVenue[]): string => {
		const heads = members
			.map(v => brandHead(v.name))
			.sort((a, b) => a.length - b.length || a.localeCompare(b));
		for (const head of heads) {
			const words = head.split(' ');
			while (words.length > 1 && brandKey(words.join(' '), cityWords) !== key) words.pop();
			if (brandKey(words.join(' '), cityWords) === key) return words.join(' ');
		}
		return heads[0];
	};

	// A key that also stands inside other names ("Cafe & Bäckerei Olive", "Café Espresso Bar")
	// is a word for a kind of place, not a brand: it never takes in longer names
	const words = open.map(v => ` ${plain(brandHead(v.name))} `);
	const common = (key: string): boolean =>
		words.filter(w => w.includes(` ${key} `) && !w.startsWith(` ${key} `)).length >=
		COMMON_WORD_NAMES;

	// Shorter keys first, so "burgermeister" takes "burgermeister leopoldplatz" before it can anchor
	for (const key of [...byKey.keys()].sort((a, b) => a.length - b.length || a.localeCompare(b))) {
		if (skipKeys.has(key)) continue;
		const exact = byKey.get(key)!.filter(v => !assigned.has(v.id));
		if (exact.length === 0) continue;
		const longer =
			extendable(key) && !common(key) ?
				open.filter(v => !assigned.has(v.id) && keyOf.get(v.id)!.startsWith(`${key} `))
			:	[];
		const members = [...exact, ...longer];
		if (members.length < 2) continue;
		for (const v of members) assigned.add(v.id);
		groups.push({
			key,
			name: nameFor(key, members),
			venueIds: members.map(v => v.id),
			reason: longer.length ? 'name prefix' : 'same name',
		});
	}

	// A profile shared by names with no words in common is named after the venue it is named
	// after ("kinza.berlin" → Kinza), else the shortest name
	const profileName = (handle: string, members: BrandSuggestionVenue[]): string => {
		const heads = members
			.map(v => brandHead(v.name))
			.sort((a, b) => a.length - b.length || a.localeCompare(b));
		return heads.find(head => siteNamedAfter(handle, head, cityWords)) ?? heads[0];
	};

	// Branches with their own names on one website ("Burgermeister Zoo", "Burgermeister
	// Mehringdamm"), or on one Instagram or TikTok profile ("instagram.com/kinza.berlin"),
	// whatever their names: a shared website says little without a shared first word, a profile
	// is the business's own
	const bySite = new Map<
		string,
		{ reason: BrandSuggestionReason; handle: string | null; members: BrandSuggestionVenue[] }
	>();
	for (const v of open) {
		if (assigned.has(v.id)) continue;
		const profile = profileOf(v.website);
		const site = profile ? null : faviconSite(v.website);
		const host = site && hostOf(site.href);
		const first = keyOf.get(v.id)!.split(' ')[0];
		const siteKey =
			profile ? `${profile.platform}:${profile.handle}`
			: host && first ? `${host} ${first}`
			: null;
		if (!siteKey) continue;
		const reason: BrandSuggestionReason =
			!profile ? 'same website'
			: profile.platform === SocialPlatformEnum.TIKTOK ? 'same TikTok'
			: 'same Instagram';
		const group = bySite.get(siteKey) ?? { reason, handle: profile?.handle ?? null, members: [] };
		group.members.push(v);
		bySite.set(siteKey, group);
	}
	for (const [siteKey, { reason, handle, members }] of bySite) {
		if (members.length < 2) continue;
		// Keyed by the words the names share; a profile shared by names with none is keyed by
		// the profile itself, so a dismissal sticks and no brand's key is taken
		const shared = commonWordPrefix(members.map(v => keyOf.get(v.id)!));
		const key = shared || (handle ? siteKey : '');
		if (!key || skipKeys.has(key)) continue;
		for (const v of members) assigned.add(v.id);
		// A key is one suggestion (dismissals and chains are keyed by it): "goldies" on its
		// website joins the "goldies" of the same name
		const same = groups.find(g => g.key === key);
		if (same) same.venueIds.push(...members.map(v => v.id));
		else
			groups.push({
				key,
				name: shared ? nameFor(key, members) : profileName(handle!, members),
				venueIds: members.map(v => v.id),
				reason,
			});
	}

	return groups.sort(
		(a, b) => b.venueIds.length - a.venueIds.length || a.key.localeCompare(b.key),
	);
};

// Country domains registered one level down ("co.uk", "com.tr")
const SECOND_LEVELS = new Set(['co', 'com', 'org', 'net', 'gov', 'ac', 'edu']);

/** The domain a host is registered under: "pberg.benedict.world" → "benedict.world". */
export const registrableDomain = (host: string): string => {
	const parts = host.split('.');
	const levels =
		parts.length > 2 && parts.at(-1)!.length === 2 && SECOND_LEVELS.has(parts.at(-2)!) ? 3 : 2;
	return parts.slice(-levels).join('.');
};

// What domains and handles add around a brand's name ("nilakitchen.de", "fedora_berlin"), the
// city's words besides
const SITE_AFFIXES = [
	'the',
	'restaurant',
	'ristorante',
	'cafe',
	'bar',
	'kitchen',
	'grill',
	'bistro',
	'food',
	'official',
	'online',
];

/** Letters and digits only: "lily-burger" → "lilyburger". */
const letters = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** A domain's or handle's letters without what sites add around a name, from either end. */
const siteCore = (token: string, cityWords: ReadonlySet<string>): string => {
	const affixes = [...SITE_AFFIXES, ...[...cityWords].map(letters)].filter(a => a.length >= 3);
	let core = token;
	for (let changed = true; changed;) {
		changed = false;
		for (const a of affixes) {
			if (core.length > a.length && core.startsWith(a))
				[core, changed] = [core.slice(a.length), true];
			if (core.length > a.length && core.endsWith(a))
				[core, changed] = [core.slice(0, -a.length), true];
		}
	}
	return core;
};

/** A venue's own place on the web (`ownSite`). */
export interface OwnSite {
	/** "instagram:kaffee_buro", "lily-burger.de", or a whole shared host ("veracruz.eatbu.com") */
	site: string;
	kind: 'profile' | 'domain';
	/**
	 * A domain's name without its ending ("losteria" of "losteria.net" and "losteria.de"; "roma-berlin"
	 * is not "romaberlin"), or a profile's handle
	 */
	token: string;
	/** Named after the brand (`siteNamedAfter`): a listing or delivery site never is */
	named: boolean;
}

/**
 * A venue's own place on the web, from its Google website: its Instagram or TikTok profile, or
 * its site as the domain it is registered under, or the whole host on a shared host
 * ("veracruz.eatbu.com"), whichever is named after `name`. Null for no website or a platform page.
 */
export const ownSite = (
	website: string | null | undefined,
	name: string,
	cityWords: ReadonlySet<string>,
): OwnSite | null => {
	const profile = profileOf(website);
	if (profile)
		return {
			site: `${profile.platform}:${profile.handle}`,
			kind: 'profile',
			token: profile.handle,
			named: siteNamedAfter(profile.handle, name, cityWords),
		};
	const url = faviconSite(website);
	const host = url && hostOf(url.href);
	if (!host) return null;
	const domain = registrableDomain(host);
	const label = domain.slice(0, domain.indexOf('.'));
	if (siteNamedAfter(domain, name, cityWords))
		return { site: domain, kind: 'domain', token: label, named: true };
	const sub = host.split('.')[0];
	const shared = host !== domain && siteNamedAfter(sub, name, cityWords);
	return { site: host, kind: 'domain', token: shared ? sub : host, named: shared };
};

/**
 * Whether a domain or handle is named after the brand `name`. It is the name ("losteria.net"
 * of "L'Osteria", "lap.coffee" of "LAP COFFEE"), maybe with what sites add around it
 * ("nilakitchen.de" of "NILA South Indian", "loveatfirstbite_berlin"); or it holds the name
 * or its first words ("lily-burger.de", "oggiskebab.de" of "Oggi's Gemüsekebab"); or the name
 * holds it ("hokey-pokey.de" of "Eispatisserie Hokey Pokey", "yoko.de" of "Yoko Sushi
 * Lieferservice"). What only a word for food or a place is never names a brand ("pizza.de").
 */
export const siteNamedAfter = (
	site: string,
	name: string,
	cityWords: ReadonlySet<string>,
): boolean => {
	// "lily-burger.de" → "lilyburger", and with its ending, "lap.coffee" → "lapcoffee"
	const dot = site.indexOf('.');
	const isDomain = dot > 0 && !site.startsWith('@') && /\.[a-z]{2,}$/i.test(site);
	const label = letters(isDomain ? site.slice(0, dot) : site);
	const whole = letters(site);
	const core = siteCore(label, cityWords);
	if (label.length < 3) return false;
	return nameVariants(name).some(variant => {
		const words = plain(variant).split(' ').filter(Boolean);
		const all = words.join('');
		if (all.length < 3) return false;
		// The name itself, even of generic words ("losteria" of "L'Osteria"), but not one such word ("pizza")
		const exact = label === all || whole === all || core === all;
		if (exact && all.length >= 5 && (words.length > 1 || isDistinctive(all, cityWords)))
			return true;
		if (!isDistinctive(words.join(' '), cityWords)) return false;
		if (all.length >= 4 && (label.includes(all) || whole.includes(all))) return true;
		// The first words: "oggis" of "oggi s gemusekebab", "nila" of "nila south indian"
		for (let n = words.length - 1; n >= 1; n--) {
			const run = words.slice(0, n).join('');
			if (!isDistinctive(words.slice(0, n).join(' '), cityWords)) continue;
			if ((run.length >= 5 && label.includes(run)) || (run.length >= 4 && core === run))
				return true;
		}
		// The name holds it: "hokeypokey" in "eispatisseriehokeypokey", "yoko" starting "yokosushi…"
		if (label.length >= 6 && all.includes(label) && isDistinctive(label, cityWords))
			return true;
		return label.length >= 4 && all.startsWith(label) && isDistinctive(label, cityWords);
	});
};

/** Whether a brand's name says more than words for food and places ("Asia Haus" does not). */
export const isDistinctiveBrand = (name: string, cityWords: ReadonlySet<string>): boolean =>
	nameVariants(name).some(variant => isDistinctive(plain(variant), cityWords));

/** One venue for `oneBrandSite`. */
export interface BrandSiteVenue {
	website?: string | null;
}

/**
 * The site that makes venues of one name one brand with no admin (`BrandService.autoMerge`):
 * an own site named after `name` that two or more of them give (a domain and a profile of the
 * same letters count together: "sweetjamaicafood.de", "@sweetjamaicafood"), when none gives
 * another domain, or another profile. A profile next to a domain must be named after the
 * brand too ("fedora-eismanufaktur.de" and "@fedora_berlin"). Venues without a site go along
 * when the name says more than food ("Pizza Hut" yes, "Asia Haus" no). Null when nothing
 * settles it: one site only, two sites, or a site named after something else.
 */
export const oneBrandSite = (
	venues: readonly BrandSiteVenue[],
	name: string,
	cityWords: ReadonlySet<string>,
): string | null => {
	const sites = venues.map(v => ownSite(v.website, name, cityWords));
	const given = sites.filter(s => s !== null);
	const domains = new Set(given.filter(s => s.kind === 'domain').map(s => s.token));
	const profiles = new Set(given.filter(s => s.kind === 'profile').map(s => s.token));
	if (domains.size > 1 || profiles.size > 1) return null;
	const proof = given.find(s => s.named && s.kind === 'domain') ?? given.find(s => s.named);
	if (!proof) return null;
	// A domain and a profile of the same letters are one site; another profile next to a domain
	// must be the brand's too, not someone else's
	const same = (s: OwnSite) =>
		s.token === proof.token || letters(s.token) === letters(proof.token);
	if (given.some(s => s.kind !== proof.kind && !s.named && !same(s))) return null;
	if (given.filter(same).length < 2) return null;
	if (sites.some(s => s === null) && !isDistinctiveBrand(name, cityWords)) return null;
	return proof.site;
};
