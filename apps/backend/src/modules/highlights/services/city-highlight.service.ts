import { QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';

import { City } from 'src/modules/cities/entities/city.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { SitemapService } from 'src/modules/sitemap/services/sitemap.service.js';
import { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';
import { MentionMatchingService } from 'src/modules/social/services/mention-matching.service.js';
import { ownPostSql } from 'src/modules/social/util/accounts.js';
import { TrendService } from 'src/modules/trends/services/trend.service.js';
import { monthRange } from 'src/modules/venues/util/month.js';

import { CityHighlight } from '../entities/city-highlight.entity.js';
import {
	computeHighlights,
	HIGHLIGHT_BRANDS,
	type HighlightBranch,
	type HighlightMentionRow,
} from '../util/highlights.js';

// How far down the pipeline's top list the build looks, so denied brands leave room for ten
const TOP_ORDER_DEPTH = 50;

/**
 * The one entry point for a city's public month: `build` computes and stores it, `publish` and
 * `unpublish` are an admin's, never automatic. Mention corrections are read as they stand, so a
 * correction shows once the month is rebuilt.
 */
@Injectable()
export class CityHighlightService implements OnModuleInit {
	constructor(
		private readonly em: EntityManager,
		private readonly cityService: CityService,
		private readonly trendService: TrendService,
		private readonly mentionMatchingService: MentionMatchingService,
		private readonly sitemapService: SitemapService,
	) {}

	// Published months only: an unpublished one answers 404 and is never submitted
	onModuleInit() {
		const published = { publishedAt: { $ne: null } };
		this.sitemapService.register({
			name: 'highlights',
			count: () => this.em.fork().count(CityHighlight, published),
			list: async (offset, limit) => {
				const rows = await this.em.fork().find(CityHighlight, published, {
					populate: ['city'],
					orderBy: { month: QueryOrder.ASC, id: QueryOrder.ASC },
					offset,
					limit,
				});
				return rows.map(h => ({
					path: `/${h.city.slug}/${h.month}`,
					updatedAt: h.updatedAt.toISOString(),
				}));
			},
		});
	}

	/** The stored month, published or not; null when it was never built. */
	async find(cityId: string, month: string): Promise<CityHighlight | null> {
		return this.em.findOne(CityHighlight, { city: cityId, month }, { populate: ['city'] });
	}

	/** Every built month of a city, newest first. */
	async months(cityId: string): Promise<CityHighlight[]> {
		return this.em.find(CityHighlight, { city: cityId }, { orderBy: { month: QueryOrder.DESC } });
	}

	/** What the public page reads: the published month of the city with this slug, else 404. */
	async published(citySlug: string, month: string): Promise<CityHighlight> {
		const highlight = await this.em.findOne(
			CityHighlight,
			{ city: { slug: citySlug }, month, publishedAt: { $ne: null } },
			{ populate: ['city'] },
		);
		if (!highlight) throw new NotFoundException('No published highlights for this city and month');
		return highlight;
	}

	/**
	 * Computes the city's month and stores it, replacing an earlier build (a published one stays
	 * published with the new figures). Flushes.
	 */
	async build(cityId: string, month: string, now = new Date()): Promise<CityHighlight> {
		const city = await this.cityService.getById(cityId);
		const [rows, order, trends] = [
			await this.mentionRows(city, month),
			await this.mentionMatchingService.topBrandIds(month, TOP_ORDER_DEPTH, city.id),
			await this.trendService.month(month, city.id),
		];
		const branches = await this.branches(city.id, order.slice(0, HIGHLIGHT_BRANDS + city.doNotListVenues.length));
		const data = computeHighlights({
			rows,
			order,
			branches,
			trends,
			doNotList: { venues: city.doNotListVenues, creators: city.doNotListCreators },
			districtNames: city.districts.map(d => d.name),
		});

		const existing = await this.find(city.id, month);
		const highlight = existing ?? this.em.create(CityHighlight, { city, month, data, builtAt: now });
		Object.assign(highlight, { data, builtAt: now });
		await this.em.flush();
		return highlight;
	}

	/** Makes the month public. Only a month that is over: its figures are final. Flushes. */
	async publish(id: string, now = new Date()): Promise<CityHighlight> {
		const highlight = await this.em.findOneOrFail(CityHighlight, { id }, { populate: ['city'] });
		if (monthRange(highlight.month).end > now) {
			throw new BadRequestException('A month is published once it is over');
		}
		highlight.publishedAt ??= now;
		await this.em.flush();
		return highlight;
	}

	/** Takes the month off the site and out of the sitemap. Flushes. */
	async unpublish(id: string): Promise<CityHighlight> {
		const highlight = await this.em.findOneOrFail(CityHighlight, { id }, { populate: ['city'] });
		highlight.publishedAt = null;
		await this.em.flush();
		return highlight;
	}

	/**
	 * The month's matched mentions in posts by others (a brand's own account counts for the
	 * other brands it names, never its own), of the city's own posts and brands with an open
	 * branch there, as `topBrandIds` counts them.
	 */
	private async mentionRows(city: City, month: string): Promise<HighlightMentionRow[]> {
		const { start, end } = monthRange(month);
		const rows: {
			post_id: string;
			external_id: string;
			platform: SocialPlatformEnum;
			url: string;
			views: string | number;
			posted_at: Date;
			handle: string | null;
			creator_id: string | null;
			account_is_brand: boolean | null;
			brand_id: string;
			brand_name: string;
		}[] = await this.em.getConnection().execute(
			`select distinct p.id as post_id, p.external_id, p.platform, p.url, p.views, p.posted_at,
				a.handle, a.creator_id, (a.brand_id is not null) as account_is_brand,
				m.brand_id, b.name as brand_name
			from mentions m
			join social_posts p on p.id = m.post_id
			join brands b on b.id = m.brand_id
			left join social_accounts a on a.id = p.account_id
			where p.city_id = ? and p.posted_at >= ? and p.posted_at < ?
				and exists (select 1 from venues v where v.brand_id = m.brand_id and v.city_id = p.city_id and not v.closed)
				and not ${ownPostSql('p', 'm.brand_id')}`,
			[city.id, start, end],
		);
		return rows.map(r => ({
			postId: r.post_id,
			externalId: r.external_id,
			platform: r.platform,
			url: r.url,
			views: Number(r.views),
			postedAt: new Date(r.posted_at),
			handle: r.handle,
			creatorId: r.creator_id,
			accountIsBrand: !!r.account_is_brand,
			brandId: r.brand_id,
			brandName: r.brand_name,
		}));
	}

	/** Each brand's most reviewed open branch in the city: its district and category. */
	private async branches(cityId: string, brandIds: string[]): Promise<Map<string, HighlightBranch>> {
		if (!brandIds.length) return new Map();
		const rows: { brand_id: string; district: string | null; category: string | null }[] = await this.em
			.getConnection()
			.execute(
				`select distinct on (v.brand_id) v.brand_id, v.district, v.category
				from venues v
				where v.city_id = ? and not v.closed and v.brand_id in (${brandIds.map(() => '?').join(', ')})
				order by v.brand_id, v.reviews_count desc nulls last, v.id`,
				[cityId, ...brandIds],
			);
		return new Map(
			rows.map(r => [
				r.brand_id,
				{ ...(r.district && { district: r.district }), ...(r.category && { category: r.category }) },
			]),
		);
	}
}
