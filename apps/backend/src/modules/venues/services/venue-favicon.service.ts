import { QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import { createHash } from 'node:crypto';

import { Image } from 'src/modules/image/entities/image.entity.js';
import { ImageService, UnreadableImageError } from 'src/modules/image/services/image.service.js';
import { type LinkedProfile, profileLinks } from 'src/modules/social/util/accounts.js';
import { runPool } from 'src/shared/util/pool.js';

import {
	FAVICON_CONCURRENCY,
	FAVICON_IMAGE_FOLDER,
	FAVICON_MAX_LINKS,
	FAVICON_PAGE,
	FAVICON_REFRESH_DAYS,
	FAVICON_RETRY_DAYS,
	FAVICON_RUN_SECONDS,
	GENERIC_FAVICON_HOSTS,
	SITE_CONTACT_PAGES,
} from '../constants/favicon.constant.js';
import { Venue } from '../entities/venue.entity.js';
import {
	defaultFaviconUrl,
	faviconFormat,
	faviconLinks,
	faviconSite,
	googleFaviconUrl,
} from '../util/favicon.js';
import { contactPageUrls } from '../util/site-pages.js';
import { hostOf } from '../util/web-mentions.js';

import type { FetchedResource } from './favicon-fetch.service.js';

import { FaviconFetchService, MAX_ICON_BYTES, MAX_PAGE_BYTES } from './favicon-fetch.service.js';

/** What a refresh did to one venue. */
export type FaviconOutcome =
	/** A new or changed icon was stored */
	| 'updated'
	/** The icon is the one already stored */
	| 'unchanged'
	/** No icon could be fetched; a stored one is kept */
	| 'missing'
	/** The site serves a platform's default icon (`GENERIC_FAVICON_HOSTS`): no icon */
	| 'generic'
	/** No website we take icons from (none, or a platform profile); a stored icon is dropped */
	| 'no_site';

export interface FaviconRunResult {
	/** Venues refreshed, the open venues sharing a due venue's website included */
	venues: number;
	/** Websites looked at: one fetch each, however many venues share it */
	sites: number;
	outcomes: Record<FaviconOutcome, number>;
	/** Websites whose pages link an Instagram or TikTok profile */
	withProfiles: number;
}

/** The venues one fetch serves: every open venue on one website host, or one venue without a site. */
interface SiteGroup {
	site: URL | null;
	venues: Venue[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The one writer of `Venue.favicon` / `faviconHash` / `faviconCheckedAt`: the icon of each
 * venue's website, fetched once per website host and kept on ImageKit through `ImageService`
 * (one file per host, one `Image` row per venue sharing it). The same home page fetch gives
 * `Venue.siteProfiles` / `siteProfilesAt`, the Instagram and TikTok profiles the site links
 * (its contact or Impressum page when the home page has none), which `AccountMatchingService`
 * links to the brand.
 */
@Injectable()
export class VenueFaviconService {
	private readonly logger = new Logger(VenueFaviconService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly imageService: ImageService,
		private readonly fetcher: FaviconFetchService,
	) {}

	/**
	 * Open venues whose icon is due: never looked for (or the website changed since), found
	 * (a generic one too) more than `FAVICON_REFRESH_DAYS` ago, or nothing found more than
	 * `FAVICON_RETRY_DAYS` ago, or whose website was never read for profiles;
	 * with a website, or with an icon left from a website that is gone. Never-looked-for first.
	 */
	async due(now: Date, limit: number): Promise<Venue[]> {
		const refreshBefore = new Date(now.getTime() - FAVICON_REFRESH_DAYS * DAY_MS);
		const retryBefore = new Date(now.getTime() - FAVICON_RETRY_DAYS * DAY_MS);
		return this.em.find(
			Venue,
			{
				closed: false,
				$and: [
					{ $or: [{ website: { $ne: null } }, { favicon: { $ne: null } }] },
					{
						$or: [
							{ faviconCheckedAt: null },
							{ website: { $ne: null }, siteProfilesAt: null },
							{ faviconCheckedAt: { $lt: refreshBefore } },
							{
								favicon: null,
								faviconHash: null,
								faviconCheckedAt: { $lt: retryBefore },
							},
						],
					},
				],
			},
			{
				populate: ['favicon'],
				orderBy: { faviconCheckedAt: QueryOrder.ASC_NULLS_FIRST, id: QueryOrder.ASC },
				limit,
			},
		);
	}

	/**
	 * Due venues a page at a time, their websites side by side on one entity manager, each
	 * page flushed, until none is due or `runMs` (wall clock) has passed; a website started
	 * by then is finished. Throws, after flushing, when ImageKit or the database failed.
	 */
	async refreshDue(
		now = new Date(),
		runMs = FAVICON_RUN_SECONDS * 1000,
	): Promise<FaviconRunResult> {
		const deadline = Date.now() + runMs;
		const result: FaviconRunResult = {
			venues: 0,
			sites: 0,
			outcomes: { updated: 0, unchanged: 0, missing: 0, generic: 0, no_site: 0 },
			withProfiles: 0,
		};
		// A site's own failures are outcomes in `refreshSite`; what throws is ImageKit (keys,
		// an outage) or the database, true for every site after it too: the run stops, the
		// venues it didn't finish stay due, and the job fails after keeping what it stored
		let failure: Error | null = null;
		while (!failure && Date.now() < deadline) {
			const due = await this.due(now, FAVICON_PAGE);
			if (!due.length) break;
			await runPool(
				await this.siteGroups(due),
				FAVICON_CONCURRENCY,
				async group => {
					if (failure || Date.now() >= deadline) return;
					const outcomes = await this.refreshSite(group, now);
					result.sites++;
					if (group.venues[0]?.siteProfiles?.length) result.withProfiles++;
					result.venues += outcomes.length;
					for (const outcome of outcomes) result.outcomes[outcome]++;
				},
				(group, error) => {
					failure ??= error;
					this.logger.warn(
						`Favicon of ${group.site?.hostname ?? `venue ${group.venues[0].id}`} failed: ${error.message}`,
					);
				},
			);
			await this.em.flush();
		}
		if (result.venues)
			this.logger.log(
				`Favicons: ${result.sites} sites, ${result.venues} venues, ${JSON.stringify(result.outcomes)}, ${result.withProfiles} sites link a profile`,
			);
		if (failure) throw new Error(`Favicon run stopped: ${(failure as Error).message}`);
		return result;
	}

	/**
	 * The due venues by website host, each host with every other open venue on it, so a
	 * chain's branches share one fetch and one icon whichever of them is due.
	 */
	private async siteGroups(due: Venue[]): Promise<SiteGroup[]> {
		const groups = new Map<string, SiteGroup>();
		for (const venue of due) {
			const site = faviconSite(venue.website);
			const key = site ? hostOf(site.href)! : `venue:${venue.id}`;
			const group = groups.get(key) ?? { site, venues: [] };
			group.venues.push(venue);
			groups.set(key, group);
		}
		const hosts = [...groups.entries()].filter(([, g]) => g.site).map(([host]) => host);
		if (hosts.length) {
			// The text match narrows the read; the host check below decides
			const others = await this.em.find(
				Venue,
				{
					closed: false,
					id: { $nin: due.map(v => v.id) },
					$or: hosts.map(host => ({ website: { $ilike: `%${host}%` } })),
				},
				{ populate: ['favicon'] },
			);
			for (const venue of others) {
				const site = faviconSite(venue.website);
				const group = site && groups.get(hostOf(site.href)!);
				if (group?.site) group.venues.push(venue);
			}
		}
		return [...groups.values()];
	}

	/**
	 * Looks for the website's icon once and stores what changed on each of its venues,
	 * unflushed: the page's best icon links, then `/favicon.ico`, then Google's copy; the first
	 * that is an image ImageKit can read wins. It is uploaded once (or taken from a venue that
	 * already holds it), and every venue gets its own `Image` row on that file. The venues'
	 * `favicon` must be populated. One outcome per venue, in order. The home page read for icon
	 * links also gives the venues' `siteProfiles`; a page that could not be read keeps them.
	 */
	async refreshSite({ site, venues }: SiteGroup, now: Date): Promise<FaviconOutcome[]> {
		const done = (outcomes: FaviconOutcome[]) => {
			for (const venue of venues) {
				venue.faviconCheckedAt = now;
				venue.siteProfilesAt = now;
			}
			return outcomes;
		};
		if (!site) {
			// No site of its own: a profile as website is linked from `website` itself
			for (const venue of venues) venue.siteProfiles = [];
			await this.imageService.removeImages(
				venues.flatMap(v => (v.favicon ? [v.favicon] : [])),
			);
			for (const venue of venues) {
				venue.favicon = null;
				venue.faviconHash = null;
			}
			return done(venues.map(() => 'no_site'));
		}

		const page = await this.fetch(site.href, MAX_PAGE_BYTES, true);
		if (page) {
			const profiles = await this.profilesOf(page);
			for (const venue of venues) venue.siteProfiles = profiles;
		}

		for (const url of this.candidates(site, page)) {
			const icon = await this.fetch(url, MAX_ICON_BYTES);
			const format = icon && faviconFormat(icon.body);
			if (!icon || !format) continue;

			const hash = createHash('sha256').update(icon.body).digest('hex');
			if (await this.isGeneric(hash, site, venues)) {
				await this.dropGeneric(hash, venues);
				return done(venues.map(() => 'generic'));
			}
			const held = (v: Venue) => !!v.favicon && v.faviconHash === hash;
			let image: Image | null = venues.find(held)?.favicon ?? null;
			if (!image) {
				try {
					image = await this.imageService.createImageFromBytes(
						icon.body,
						FAVICON_IMAGE_FOLDER,
						`${hostOf(site.href)!.replace(/[^\w.-]/g, '')}.${format}`,
					);
				} catch (e) {
					// ImageKit can't read every format a site serves (some ICO files): try the
					// next. Anything else (keys, an outage) is no verdict on the site: its
					// venues stay due
					if (!(e instanceof UnreadableImageError)) throw e;
					this.logger.debug(`Favicon ${url} not stored: ${e.message}`);
					continue;
				}
			}
			let fresh: Image | null = venues.some(held) ? null : image;
			const replaced: Image[] = [];
			const outcomes = venues.map((venue): FaviconOutcome => {
				if (held(venue)) return 'unchanged';
				if (venue.favicon) replaced.push(venue.favicon);
				// The uploaded row goes to the first venue, a row on the same file to the rest
				venue.favicon = fresh ?? this.imageService.duplicate(image);
				fresh = null;
				venue.faviconHash = hash;
				return 'updated';
			});
			await this.imageService.removeImages(replaced);
			return done(outcomes);
		}

		return done(venues.map(() => 'missing'));
	}

	/**
	 * Whether venues on `GENERIC_FAVICON_HOSTS` − 1 hosts other than this site's found these
	 * bytes: a WordPress, Wix or site-builder default. Read from stored hashes, so the sites in
	 * flight aren't counted; the next venue to find it drops it from them.
	 */
	private async isGeneric(hash: string, site: URL, venues: Venue[]): Promise<boolean> {
		const ids = venues.map(v => v.id);
		const rows: { website: string | null }[] = await this.em
			.getConnection()
			.execute(
				`select distinct website from venues where favicon_hash = ? and id not in (${ids.map(() => '?').join(', ')})`,
				[hash, ...ids],
			);
		const own = hostOf(site.href);
		const hosts = new Set(
			rows.map(r => r.website && hostOf(r.website)).filter(h => h && h !== own),
		);
		return hosts.size >= GENERIC_FAVICON_HOSTS - 1;
	}

	/**
	 * Removes a generic icon from every venue holding it, and the site's venues' icons
	 * whatever they were; keeps the hash on the site's venues so they stay counted and wait
	 * the refresh period.
	 */
	private async dropGeneric(hash: string, venues: Venue[]): Promise<void> {
		const holders = await this.em.find(
			Venue,
			{ faviconHash: hash, favicon: { $ne: null } },
			{ populate: ['favicon'] },
		);
		const all = [...new Set([...holders, ...venues])];
		await this.imageService.removeImages(all.flatMap(v => (v.favicon ? [v.favicon] : [])));
		for (const holder of all) holder.favicon = null;
		for (const venue of venues) venue.faviconHash = hash;
	}

	/**
	 * The profiles the home page links, else those its contact, Impressum or about pages link
	 * (`SITE_CONTACT_PAGES` at most, read until one links any).
	 */
	private async profilesOf(page: FetchedResource): Promise<LinkedProfile[]> {
		const html = page.body.toString('utf8');
		const own = profileLinks(html);
		if (own.length) return own;
		for (const url of contactPageUrls(html, page.url, SITE_CONTACT_PAGES)) {
			const contact = await this.fetch(url, MAX_PAGE_BYTES, true);
			const found = contact ? profileLinks(contact.body.toString('utf8')) : [];
			if (found.length) return found;
		}
		return [];
	}

	/** The URLs to try, best first, each once. */
	private candidates(site: URL, page: FetchedResource | null): string[] {
		const origin = page ? new URL(page.url) : site;
		const links =
			page ?
				faviconLinks(page.body.toString('utf8'), page.url).slice(0, FAVICON_MAX_LINKS)
			:	[];
		return [...new Set([...links, defaultFaviconUrl(origin), googleFaviconUrl(site)])];
	}

	/** A failed or refused fetch is no resource: one broken URL never stops the others. */
	private async fetch(url: string, maxBytes: number, truncate = false) {
		try {
			return await this.fetcher.get(url, { maxBytes, truncate });
		} catch (e) {
			this.logger.debug(`Favicon fetch ${url} failed: ${(e as Error).message}`);
			return null;
		}
	}
}
