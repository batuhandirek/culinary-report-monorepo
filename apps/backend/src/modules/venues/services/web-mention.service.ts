import { QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { runPool } from 'src/shared/util/pool.js';

import { PressClassificationAgent } from '../agents/press-classification.agent.js';
import { Venue } from '../entities/venue.entity.js';
import { WebMention, WebMentionKindEnum } from '../entities/web-mention.entity.js';
import { venueSearchName } from '../util/brands.js';
import { monthRange } from '../util/month.js';
import {
	fromGoogleNewsItem,
	fromGoogleSearchPage,
	isPressCandidate,
	pressQuery,
	type WebResult,
} from '../util/web-mentions.js';

// $2.50 per 1k articles, dated, filtered by date on Google News
const GOOGLE_NEWS_ACTOR = 'scrapewise/google-news-scraper';
// ~$1.80–4.50 per 1k result pages: listicles and blogs Google News doesn't carry
const GOOGLE_SEARCH_ACTOR = 'apify/google-search-scraper';

// Articles per venue from Google News
const NEWS_PER_VENUE = 20;
// Results sent to the LLM in one call
// Pages read side by side, one a call
const CLASSIFY_CONCURRENCY = 10;

/** The share of the press budget that goes to Google News; the rest to web search. */
const NEWS_BUDGET_SHARE = 0.6;

const KIND_ORDER = [
	WebMentionKindEnum.FEATURE,
	WebMentionKindEnum.LISTICLE,
	WebMentionKindEnum.PASSING,
];

/**
 * The one entry point for press and web mentions: the monthly search, its classification and
 * what a report and the lead score read.
 */
@Injectable()
export class WebMentionService {
	private readonly logger = new Logger(WebMentionService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly apifyService: ApifyService,
		private readonly pressClassificationAgent: PressClassificationAgent,
	) {}

	/**
	 * Searches Google News and Google for each brand's name with the city, once per brand however
	 * many of its branches are given (the press writes about the brand), both limited to the
	 * month, and stores the results that can be press (`isPressCandidate`), once per URL, on the
	 * brand's first branch given: a page found again keeps its first venue. Stamps
	 * `pressSearchedAt` on every venue given. Flushes.
	 */
	async searchMonth(
		city: City,
		venues: Venue[],
		month: string,
		budgetUsd: number,
		now = new Date(),
	): Promise<{ found: number; saved: number }> {
		if (!venues.length) return { found: 0, saved: 0 };
		const { start, end } = monthRange(month);
		const lastDay = new Date(end.getTime() - 1).toISOString().slice(0, 10);
		// A branch is searched under its brand's name: one query a brand
		const byQuery = new Map<string, Venue>();
		for (const v of venues) {
			const query = pressQuery(venueSearchName(v), city.name);
			if (!byQuery.has(query)) byQuery.set(query, v);
		}
		const queries = [...byQuery.keys()];

		const [news, pages] = await Promise.all([
			this.apifyService.runActor<any>(
				GOOGLE_NEWS_ACTOR,
				{
					searchQueries: queries,
					language: city.language,
					countries: [city.country.toUpperCase()],
					dateFrom: `${month}-01`,
					dateTo: lastDay,
					maxItems: NEWS_PER_VENUE,
					resolveOriginalUrl: true,
					includeArticleDetails: true,
				},
				{
					maxCostUsd: budgetUsd * NEWS_BUDGET_SHARE,
					purpose: `google news ${month}: ${queries.length} brands`,
				},
			),
			this.apifyService.runActor<any>(
				GOOGLE_SEARCH_ACTOR,
				{
					queries: queries.join('\n'),
					maxPagesPerQuery: 1,
					countryCode: city.country.toLowerCase(),
					languageCode: city.language,
					afterDate: `${month}-01`,
					beforeDate: lastDay,
				},
				{
					maxCostUsd: budgetUsd * (1 - NEWS_BUDGET_SHARE),
					purpose: `google search press ${month}: ${queries.length} brands`,
				},
			),
		]);

		const results: WebResult[] = [
			...news.map(fromGoogleNewsItem).filter((r): r is WebResult => r !== null),
			...pages.flatMap(fromGoogleSearchPage),
		];
		const candidates = _.uniqBy(
			results.filter(r => {
				const venue = byQuery.get(r.query);
				return (
					venue &&
					isPressCandidate(r, { name: venueSearchName(venue), website: venue.website })
				);
			}),
			r => r.url,
		);
		const known = new Set(
			candidates.length ?
				(
					await this.em.find(
						WebMention,
						{ url: { $in: candidates.map(r => r.url) } },
						{ fields: ['url'] },
					)
				).map(m => m.url)
			:	[],
		);
		let saved = 0;
		for (const r of candidates) {
			if (known.has(r.url)) continue;
			this.em.create(WebMention, {
				venue: byQuery.get(r.query)!,
				url: r.url,
				outlet: r.outlet,
				title: r.title,
				snippet: r.snippet,
				publishedAt: r.publishedAt,
				month,
				source: r.source,
			});
			saved++;
		}
		for (const venue of venues) venue.pressSearchedAt = now;
		await this.em.flush();
		this.logger.log(`Press ${month}: ${results.length} results, ${saved} new mentions`);
		return { found: results.length, saved };
	}

	/** Classifies the city's mentions of the month that have no kind yet, one page a call. Flushes once. */
	async classifyMonth(city: City, month: string): Promise<{ classified: number }> {
		const mentions = await this.em.find(
			WebMention,
			{ month, analysedAt: null, venue: { city } },
			{ populate: ['venue', 'venue.brand'] },
		);
		let classified = 0;
		// A provider failure (no credits) stops the pool: keep what was finished before it
		try {
			// One page a call
			await runPool(
				mentions,
				CLASSIFY_CONCURRENCY,
				async mention => {
					const venue = mention.venue;
					const res = await this.pressClassificationAgent.generate(
						JSON.stringify({
							// The search was the brand's name: a chain's page names the brand, not this branch
							venue: venueSearchName(venue),
							...(venue.district && { district: venue.district }),
							title: mention.title,
							outlet: mention.outlet,
							snippet: mention.snippet?.slice(0, 500) ?? null,
						}),
						{ cityName: city.name },
					);
					mention.kind = res.object.kind;
					mention.summary = res.object.summary.trim();
					mention.analysedAt = new Date();
					classified++;
				},
				(mention, e) => this.logger.warn(`Press page ${mention.url} failed: ${e.message}`),
			);
		} catch (e) {
			await this.em.flush();
			throw e;
		}
		// One flush at the end: the pages are read side by side on this entity manager
		await this.em.flush();
		return { classified };
	}

	/**
	 * A brand's classified press of the month (found under any of its branches, in the city or,
	 * `cityId` null, anywhere), features first, then listicles and passing mentions.
	 */
	async forReport(brandId: string, cityId: string | null, month: string): Promise<WebMention[]> {
		const mentions = await this.em.find(
			WebMention,
			{
				venue: { brand: brandId, ...(cityId && { city: cityId }) },
				month,
				kind: { $in: KIND_ORDER },
			},
			{ orderBy: { publishedAt: QueryOrder.DESC_NULLS_LAST, createdAt: QueryOrder.ASC } },
		);
		return _.sortBy(mentions, m => KIND_ORDER.indexOf(m.kind!));
	}
}
