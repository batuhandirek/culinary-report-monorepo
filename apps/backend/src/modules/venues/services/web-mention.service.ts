import { QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import type { ActorCall } from 'src/modules/apify/actors/actor.js';
import {
	GOOGLE_NEWS_ACTOR,
	type GoogleNewsInput,
	type GoogleNewsItem,
} from 'src/modules/apify/actors/google-news.actor.js';
import {
	GOOGLE_SEARCH_ACTOR,
	type GoogleSearchInput,
	type GoogleSearchPage,
} from 'src/modules/apify/actors/google-search.actor.js';
import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';

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

// Articles per venue from Google News
const NEWS_PER_VENUE = 20;
/** The share of the press budget that goes to Google News; the rest to web search. */
const NEWS_BUDGET_SHARE = 0.6;

const KIND_ORDER = [
	WebMentionKindEnum.FEATURE,
	WebMentionKindEnum.LISTICLE,
	WebMentionKindEnum.PASSING,
];

/** The month's press search as the `scrape-press` workflow runs it: two runs over one query a brand */
export interface PressPlan {
	month: string;
	/** The query → the venue that carried it (a brand's first branch) */
	venueIds: Record<string, string>;
	/** Every venue searched, stamped by the save */
	allVenueIds: string[];
	news: ActorCall<GoogleNewsInput, GoogleNewsItem> | null;
	web: ActorCall<GoogleSearchInput, GoogleSearchPage> | null;
}

/** The runs' records as the workflow hands them to `saveMonth`: null for a run that failed */
export interface PressRecords {
	news?: string | null;
	web?: string | null;
}

/** One press page as the classifier reads it (`WebMentionService.pageForClassifying`) */
export interface PressPageForClassifying {
	id: string;
	cityId: string;
	cityName: string;
	/** The name the search was for */
	venue: string;
	district: string | null;
	title: string;
	outlet: string | null;
	snippet: string | null;
}

/**
 * The one entry point for press and web mentions: the monthly search, storing its classification
 * (the pipeline's `classify-press` reads the pages) and what a report and the lead score read.
 */
@Injectable()
export class WebMentionService {
	private readonly logger = new Logger(WebMentionService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly apifyService: ApifyService,
	) {}

	/**
	 * The month's search: each brand's quoted name with the city once (a branch is searched under
	 * its brand's name, one query a brand, carried by the first branch), on Google News (`dateFrom`
	 * / `dateTo` the month, `NEWS_BUDGET_SHARE` of the budget) and Google (the listicles and blogs
	 * Google News doesn't carry, one page, the rest of the budget). None without a venue.
	 */
	planMonth(city: City, venues: Venue[], month: string, budgetUsd: number): PressPlan {
		const { end } = monthRange(month);
		const lastDay = new Date(end.getTime() - 1).toISOString().slice(0, 10);
		const venueIds: Record<string, string> = {};
		for (const v of venues) venueIds[pressQuery(venueSearchName(v), city.name)] ??= v.id;
		const queries = Object.keys(venueIds);
		const allVenueIds = venues.map(v => v.id);
		if (!queries.length) return { month, venueIds, allVenueIds, news: null, web: null };
		return {
			month,
			venueIds,
			allVenueIds,
			news: {
				actor: GOOGLE_NEWS_ACTOR,
				input: {
					searchQueries: queries,
					language: city.language,
					countries: [city.country.toUpperCase()],
					dateFrom: `${month}-01`,
					dateTo: lastDay,
					maxItems: NEWS_PER_VENUE,
					resolveOriginalUrl: true,
					includeArticleDetails: true,
				},
				maxCostUsd: budgetUsd * NEWS_BUDGET_SHARE,
				purpose: `google news ${month}: ${queries.length} brands`,
			},
			web: {
				actor: GOOGLE_SEARCH_ACTOR,
				input: {
					queries: queries.join('\n'),
					maxPagesPerQuery: 1,
					countryCode: city.country.toLowerCase(),
					languageCode: city.language,
					afterDate: `${month}-01`,
					beforeDate: lastDay,
				},
				maxCostUsd: budgetUsd * (1 - NEWS_BUDGET_SHARE),
				purpose: `google search press ${month}: ${queries.length} brands`,
			},
		};
	}

	/**
	 * The runs' items read from their rows: the results that can be press (`isPressCandidate`:
	 * not a platform, directory, booking or delivery site nor the branch's own domain, and the
	 * title or snippet names the brand), once per URL (a page found again keeps its first venue),
	 * stored as `WebMention`s for the classifier; every searched venue stamped `pressSearchedAt`.
	 * Flushes.
	 */
	async saveMonth(
		plan: PressPlan,
		records: PressRecords,
		now: Date,
	): Promise<{ found: number; saved: number }> {
		const venues = await this.em.find(Venue, { id: { $in: plan.allVenueIds } });
		const byId = new Map(venues.map(v => [v.id, v]));
		const venueOf = (query: string) => byId.get(plan.venueIds[query] ?? '');
		const news =
			records.news ? await this.apifyService.storedItems<GoogleNewsItem>(records.news) : [];
		const pages =
			records.web ? await this.apifyService.storedItems<GoogleSearchPage>(records.web) : [];
		const results: WebResult[] = [
			...news.map(fromGoogleNewsItem).filter((r): r is WebResult => r !== null),
			...pages.flatMap(fromGoogleSearchPage),
		];
		const candidates = _.uniqBy(
			results.filter(r => {
				const venue = venueOf(r.query);
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
				venue: venueOf(r.query)!,
				url: r.url,
				outlet: r.outlet,
				title: r.title,
				snippet: r.snippet,
				publishedAt: r.publishedAt,
				month: plan.month,
				source: r.source,
			});
			saved++;
		}
		for (const venue of venues) venue.pressSearchedAt = now;
		await this.em.flush();
		this.logger.log(`Press ${plan.month}: ${results.length} results, ${saved} new mentions`);
		return { found: results.length, saved };
	}

	/** The city's press pages not classified yet: what the reading takes, one page a workflow */
	async unclassifiedIds(cityId: string, limit: number): Promise<string[]> {
		const pages = await this.em.find(
			WebMention,
			{ analysedAt: null, venue: { city: cityId } },
			{ orderBy: { createdAt: QueryOrder.ASC, id: QueryOrder.ASC }, limit, fields: ['id'] },
		);
		return pages.map(p => p.id);
	}

	/** The city's press pages not classified yet */
	countPending(cityId: string): Promise<number> {
		return this.em.count(WebMention, { analysedAt: null, venue: { city: cityId } });
	}

	/**
	 * One press page as the classifier reads it, as plain data (a workflow stores it): the name the
	 * search was for (the brand's: a chain's page names the brand, not this branch), the branch's
	 * district, the page's title, outlet and snippet, and the city. Null once it is classified.
	 */
	async pageForClassifying(id: string): Promise<PressPageForClassifying | null> {
		const page = await this.em.findOne(
			WebMention,
			{ id, analysedAt: null },
			{ populate: ['venue', 'venue.brand', 'venue.city'] },
		);
		if (!page) return null;
		return {
			id: page.id,
			cityId: page.venue.city.id,
			cityName: page.venue.city.name,
			venue: venueSearchName(page.venue),
			district: page.venue.district ?? null,
			title: page.title,
			outlet: page.outlet ?? null,
			snippet: page.snippet ?? null,
		};
	}

	/** The classifier's verdict on the page stored (`kind`, `summary`, `analysedAt`). Flushes. */
	async saveClassification(
		id: string,
		answer: { kind: WebMentionKindEnum; summary: string },
	): Promise<void> {
		const page = await this.em.findOneOrFail(WebMention, id);
		page.kind = answer.kind;
		page.summary = answer.summary.trim();
		page.analysedAt = new Date();
		await this.em.flush();
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
