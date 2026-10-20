import { QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import { createHash } from 'node:crypto';

import { ImageService, UnreadableImageError } from 'src/modules/image/services/image.service.js';
import { runPool } from 'src/shared/util/pool.js';

import {
	FAVICON_BATCH,
	FAVICON_CONCURRENCY,
	FAVICON_IMAGE_FOLDER,
	FAVICON_MAX_LINKS,
	FAVICON_REFRESH_DAYS,
	FAVICON_RETRY_DAYS,
	GENERIC_FAVICON_HOSTS,
} from '../constants/favicon.constant.js';
import { Venue } from '../entities/venue.entity.js';
import {
	defaultFaviconUrl,
	faviconFormat,
	faviconLinks,
	faviconSite,
	googleFaviconUrl,
} from '../util/favicon.js';
import { hostOf } from '../util/web-mentions.js';

import { FaviconFetchService, MAX_ICON_BYTES, MAX_PAGE_BYTES } from './favicon-fetch.service.js';

/** What one venue's refresh did. */
export type FaviconOutcome =
	/** A new or changed icon was uploaded */
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
	venues: number;
	outcomes: Record<FaviconOutcome, number>;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The one writer of `Venue.favicon` / `faviconHash` / `faviconCheckedAt`: each venue's
 * website icon, fetched from the site and kept on ImageKit through `ImageService`.
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
	 * `FAVICON_RETRY_DAYS` ago;
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
	 * One batch of due venues, side by side on one entity manager, flushed once at the end.
	 * Throws, after flushing, when ImageKit or the database failed.
	 */
	async refreshDue(now = new Date(), limit = FAVICON_BATCH): Promise<FaviconRunResult> {
		const venues = await this.due(now, limit);
		const outcomes: Record<FaviconOutcome, number> = {
			updated: 0,
			unchanged: 0,
			missing: 0,
			generic: 0,
			no_site: 0,
		};
		// A site's own failures are outcomes in `refresh`; what throws is ImageKit (keys, an
		// outage) or the database, true for every venue after it too: the run stops, the venues
		// it didn't finish stay due, and the job fails after keeping what it stored
		let failure: Error | null = null;
		await runPool(
			venues,
			FAVICON_CONCURRENCY,
			async venue => {
				if (failure) return;
				outcomes[await this.refresh(venue, now)]++;
			},
			(venue, error) => {
				failure ??= error;
				this.logger.warn(`Favicon of venue ${venue.id} failed: ${error.message}`);
			},
		);
		await this.em.flush();
		if (venues.length)
			this.logger.log(`Favicons: ${venues.length} venues, ${JSON.stringify(outcomes)}`);
		if (failure) throw new Error(`Favicon run stopped: ${(failure as Error).message}`);
		return { venues: venues.length, outcomes };
	}

	/**
	 * Looks for the venue's icon and stores what changed, unflushed: the page's best icon
	 * links, then `/favicon.ico`, then Google's copy; the first that is an image ImageKit can
	 * read wins. A venue `favicon` must be populated.
	 */
	async refresh(venue: Venue, now: Date): Promise<FaviconOutcome> {
		const site = faviconSite(venue.website);
		if (!site) {
			if (venue.favicon) await this.imageService.removeImage(venue.favicon);
			venue.favicon = null;
			venue.faviconHash = null;
			venue.faviconCheckedAt = now;
			return 'no_site';
		}

		for (const url of await this.candidates(site)) {
			const icon = await this.fetch(url, MAX_ICON_BYTES);
			const format = icon && faviconFormat(icon.body);
			if (!icon || !format) continue;

			const hash = createHash('sha256').update(icon.body).digest('hex');
			if (await this.isGeneric(hash, venue)) {
				await this.dropGeneric(hash, venue);
				venue.faviconCheckedAt = now;
				return 'generic';
			}
			if (venue.favicon && venue.faviconHash === hash) {
				venue.faviconCheckedAt = now;
				return 'unchanged';
			}
			let image;
			try {
				image = await this.imageService.createImageFromBytes(
					icon.body,
					FAVICON_IMAGE_FOLDER,
					`${venue.placeId.replace(/[^\w-]/g, '')}.${format}`,
				);
			} catch (e) {
				// ImageKit can't read every format a site serves (some ICO files): try the next.
				// Anything else (keys, an outage) is no verdict on the venue: it stays due
				if (!(e instanceof UnreadableImageError)) throw e;
				this.logger.debug(`Favicon ${url} not stored: ${e.message}`);
				continue;
			}
			if (venue.favicon) await this.imageService.removeImage(venue.favicon);
			venue.favicon = image;
			venue.faviconHash = hash;
			venue.faviconCheckedAt = now;
			return 'updated';
		}

		venue.faviconCheckedAt = now;
		return 'missing';
	}

	/**
	 * Whether venues on `GENERIC_FAVICON_HOSTS` − 1 other hosts found these bytes: a
	 * WordPress, Wix or site-builder default. Read from stored hashes, so the batch in flight
	 * isn't counted; the next venue to find it drops it from them.
	 */
	private async isGeneric(hash: string, venue: Venue): Promise<boolean> {
		const rows: { website: string | null }[] = await this.em
			.getConnection()
			.execute('select distinct website from venues where favicon_hash = ? and id <> ?', [
				hash,
				venue.id,
			]);
		const own = venue.website ? hostOf(venue.website) : null;
		const hosts = new Set(
			rows.map(r => r.website && hostOf(r.website)).filter(h => h && h !== own),
		);
		return hosts.size >= GENERIC_FAVICON_HOSTS - 1;
	}

	/**
	 * Removes a generic icon from every venue holding it, `venue` included (with whatever icon
	 * it had), and keeps the hash on `venue` so it stays counted and waits the refresh period.
	 */
	private async dropGeneric(hash: string, venue: Venue): Promise<void> {
		const holders = await this.em.find(
			Venue,
			{ faviconHash: hash, favicon: { $ne: null } },
			{ populate: ['favicon'] },
		);
		for (const holder of new Set([...holders, venue])) {
			if (holder.favicon) await this.imageService.removeImage(holder.favicon);
			holder.favicon = null;
		}
		venue.faviconHash = hash;
	}

	/** The URLs to try, best first, each once. */
	private async candidates(site: URL): Promise<string[]> {
		const page = await this.fetch(site.href, MAX_PAGE_BYTES, true);
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
