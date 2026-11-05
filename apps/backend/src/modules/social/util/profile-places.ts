// What a profile's own bio and links say about which places it is the account of, and how to
// search Google Maps for a business profile we have no venue for. Pure, read in code against the
// city's venues (no LLM): a bio is short and its useful parts are addresses, domains and names,
// which a known venue's street, house number and website settle exactly. Tested in
// `social/tests/profile-places.spec.ts` on bios Instagram returned.

import { brandHead, registrableDomain, siteNamedAfter } from 'src/modules/venues/util/brands.js';
import { faviconSite } from 'src/modules/venues/util/favicon.js';
import { normalizeVenueName, plain, streetKey } from 'src/modules/venues/util/venue-names.js';
import { hostOf } from 'src/modules/venues/util/web-mentions.js';

import { BIO_DOMAINS } from './profile-proof.js';

/** A place a profile may be the account of. */
export interface ProfilePlaceVenue {
	id: string;
	name: string;
	brandId: string;
	brandName: string;
	/** Google's street with its house number ("Torstraße 116") */
	street: string | null;
	website: string | null;
	/** Google's main category, shown to `ProfilePlaceAgent` */
	category?: string | null;
}

/** What we stored of a profile (`SocialAccount`). */
export interface ProfileToRead {
	handle: string;
	displayName?: string | null;
	bio?: string | null;
	links?: readonly string[] | null;
}

/** Why the profile is a place's account: its bio names the place's address, or its link is the place's website. */
export type ProfilePlaceProof = 'street' | 'site';

export interface ProfilePlace {
	venueId: string;
	brandId: string;
	proof: ProfilePlaceProof;
}

// Shorter street keys say too little ("Am 3")
const MIN_STREET_LETTERS = 5;

/** A text in the form `streetKey` compares, house numbers kept: "Torstraße 116" → "torstr 116". */
const addressForm = (s: string): string =>
	plain(s).replace(/strasse\b/g, 'str').replace(/\bplatz\b/g, 'pl');

/** A street's key and its house number's digits: "Torstraße 116a" → ["torstr", "116"]. */
const streetParts = (street: string): { key: string; number: string | null } => ({
	key: streetKey(street),
	number: addressForm(street).match(/\b(\d{1,4})[a-z]?\b/)?.[1] ?? null,
});

/**
 * Whether a text names this street with its house number ("🌱Torstraße 116" names "Torstraße
 * 116", "Torstr. 116-118" too; "Torstraße 12" does not). A street stored without a number is
 * named by the street alone.
 */
export const textNamesAddress = (text: string, street: string): boolean => {
	const { key, number } = streetParts(street);
	if (key.replaceAll(' ', '').length < MIN_STREET_LETTERS) return false;
	const form = ` ${addressForm(text)} `;
	if (!number) return form.includes(` ${key} `);
	const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return new RegExp(` ${escaped} ${number}(?:[a-z])?(?= )`).test(form);
};

/** The registrable domains a profile links or writes out in its bio. */
const profileDomains = (profile: ProfileToRead): Set<string> => {
	const written = [...(profile.bio ?? '').matchAll(BIO_DOMAINS)].map(m => m[1]);
	const out = new Set<string>();
	for (const link of [...(profile.links ?? []), ...written]) {
		const host = hostOf(/^https?:\/\//i.test(link) ? link : `https://${link}`);
		if (host) out.add(registrableDomain(host));
	}
	return out;
};

/** Whether the profile is named after the place: its handle or display name is the place's or its brand's name. */
const namedAfter = (profile: ProfileToRead, venue: ProfilePlaceVenue, cityWords: ReadonlySet<string>): boolean => {
	const forms = [profile.handle, ...(profile.displayName ? [profile.displayName.replace(/\s+/g, '')] : [])];
	return forms.some(form => [venue.name, venue.brandName].some(name => siteNamedAfter(form, name, cityWords)));
};

/** The city's venues, indexed once for many profiles: by their street key's first word, and by their own website's domain. */
export interface ProfilePlaceIndex {
	byStreetWord: Map<string, ProfilePlaceVenue[]>;
	bySite: Map<string, ProfilePlaceVenue[]>;
}

export const profilePlaceIndex = (venues: readonly ProfilePlaceVenue[]): ProfilePlaceIndex => {
	const byStreetWord = new Map<string, ProfilePlaceVenue[]>();
	const bySite = new Map<string, ProfilePlaceVenue[]>();
	const add = (map: Map<string, ProfilePlaceVenue[]>, key: string, venue: ProfilePlaceVenue) => {
		const list = map.get(key);
		if (list) list.push(venue);
		else map.set(key, [venue]);
	};
	for (const venue of venues) {
		const first = venue.street ? streetKey(venue.street).split(' ')[0] : '';
		if (first) add(byStreetWord, first, venue);
		// A platform page (Instagram, a booking or delivery site) is nobody's own site
		const site = faviconSite(venue.website);
		const host = site && hostOf(site.href);
		if (host) add(bySite, registrableDomain(host), venue);
	}
	return { byStreetWord, bySite };
};

/**
 * The places at the addresses a profile's bio names (street and house number,
 * `textNamesAddress`), whatever they are called: a market hall's stalls, a place Google names
 * otherwise than its account. What `ProfilePlaceAgent` picks from; `profilePlaces` keeps only
 * those named after the profile.
 */
export const addressPlaces = (profile: ProfileToRead, index: ProfilePlaceIndex): ProfilePlaceVenue[] => {
	if (!profile.bio) return [];
	const out = new Map<string, ProfilePlaceVenue>();
	for (const word of new Set(addressForm(profile.bio).split(' ')))
		for (const venue of index.byStreetWord.get(word) ?? [])
			if (!out.has(venue.id) && textNamesAddress(profile.bio, venue.street!)) out.set(venue.id, venue);
	return [...out.values()];
};

/**
 * The places a profile says it is the account of: each venue whose street and house number its
 * bio names (`street`), or whose own website is a domain the profile links or writes out
 * (`site`), when the profile is also named after the place or its brand (`siteNamedAfter` of the
 * handle or the display name). Lucy's (`lucys.berlin`) bio lists "Torstraße 116" and "Brunnenstraße
 * 24": both its places. An address alone is not enough (a street holds many places, and a
 * creator's bio may name a favourite), nor is a domain alone (a group's site serves several
 * names). A place once, the street proof first.
 */
export const profilePlaces = (
	profile: ProfileToRead,
	index: ProfilePlaceIndex,
	cityWords: ReadonlySet<string>,
): ProfilePlace[] => {
	const out = new Map<string, ProfilePlace>();
	for (const venue of addressPlaces(profile, index))
		if (namedAfter(profile, venue, cityWords))
			out.set(venue.id, { venueId: venue.id, brandId: venue.brandId, proof: 'street' });
	for (const domain of profileDomains(profile))
		for (const venue of index.bySite.get(domain) ?? [])
			if (!out.has(venue.id) && namedAfter(profile, venue, cityWords))
				out.set(venue.id, { venueId: venue.id, brandId: venue.brandId, proof: 'site' });
	return [...out.values()];
};

// A bio naming more places than this is a guide's or a directory's, never one business's
export const MAX_PROFILE_BRANCHES = 3;

/** A name's first distinctive word, letters only: "Lucy's The Deli" and "Lucy's. A healthy Deli Concept." both "lucy". */
const nameHead = (name: string, cityWords: ReadonlySet<string>): string =>
	normalizeVenueName(brandHead(name), cityWords).split(' ').find(w => w.length >= 3) ?? '';

/**
 * Whether the places a profile names (`profilePlaces`, each already named after it) are one
 * business's branches, so they may be joined into one brand: the profile is a business account
 * (a creator's or a person's never joins anything; TikTok's unknown counts as not), it names
 * `MAX_PROFILE_BRANCHES` places at most, and the places' names start with the same distinctive
 * word. Five spots a creator lists, or a guide account's addresses, stay apart.
 */
export const placesAreOneBusiness = (
	profile: { isBusiness?: boolean | null },
	names: readonly string[],
	cityWords: ReadonlySet<string>,
): boolean => {
	if (profile.isBusiness !== true || names.length < 2 || names.length > MAX_PROFILE_BRANCHES) return false;
	const heads = new Set(names.map(n => nameHead(n, cityWords)));
	return heads.size === 1 && !heads.has('');
};

// The last word of a street name ("Torstraße", "Tempelhofer Damm", "Kufsteiner Str.")
const STREET_END =
	/(?:stra(?:ß|ss)e|str\.?|damm|platz|pl\.|allee|weg|ufer|ring|chaussee|gasse|markt|brücke|bruecke|steig|zeile|promenade|kai)$/i;

/**
 * The addresses a bio writes out, as a search would take them: a street ending like one
 * ("…straße", "… Damm", "… Allee") and its house number, with the postcode when one follows
 * ("Tempelhofer Damm 212, 12099"). In the bio's order, each once.
 */
export const bioAddresses = (bio: string | null | undefined): string[] => {
	if (!bio) return [];
	const out: string[] = [];
	for (const segment of bio.split(/[\n|•·;]+/)) {
		const tokens = segment
			.split(/\s+/)
			.map(t => t.replace(/[^\p{L}\p{N}.'-]/gu, ''))
			.filter(Boolean);
		for (let i = 1; i < tokens.length; i++) {
			if (!/^\d{1,4}[a-z]?$/i.test(tokens[i]) || !STREET_END.test(tokens[i - 1])) continue;
			// The words of the name before its last: capitalised ones, two at most ("Tempelhofer Damm")
			let start = i - 1;
			while (start > 0 && i - start < 3 && /^\p{Lu}/u.test(tokens[start - 1]) && !STREET_END.test(tokens[start - 1]))
				start--;
			// A lone "Damm 212" or "Str. 5" names no street; "Torstraße 116" does
			if (start === i - 1 && tokens[i - 1].replace(STREET_END, '').length < 3) continue;
			const postcode = /^\d{5}$/.test(tokens[i + 1] ?? '') ? `, ${tokens[i + 1]}` : '';
			const address = `${tokens.slice(start, i + 1).join(' ')}${postcode}`;
			if (!out.includes(address)) out.push(address);
		}
	}
	return out;
};

/**
 * What to search Google Maps for to find a business profile's place: its display name before
 * any slogan ("MAGIC BITTE | Berlin Coffee Studio™" → "MAGIC BITTE"), else its handle's words,
 * and the first address its bio writes out ("SELO COFFEE Tempelhofer Damm 212, 12099").
 */
export const profileSearchName = (profile: ProfileToRead): string => {
	const shown = profile.displayName?.split(/\s[|\-–·•]\s|[|]/)[0].replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
	const name = shown || profile.handle.replace(/[._]+/g, ' ').trim();
	const [address] = bioAddresses(profile.bio);
	return address ? `${name} ${address}` : name;
};
