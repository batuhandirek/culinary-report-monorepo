import { wrap } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import _ from 'lodash';

import { ProspectStageEnum } from 'src/modules/outreach/constants/outreach.constant.js';
import { ownPostSql } from 'src/modules/social/util/accounts.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { monthRange, previousMonth } from 'src/modules/venues/util/month.js';

import type {
	AdminBrandMonthFiguresOutputDto,
	AdminBrandRowOutputDto,
	AdminBrandRowVenueOutputDto,
	AdminBrandSegment,
	AdminListBrandsInputDto,
	AdminListBrandsOutputDto,
} from '../dto/admin-brand-list.dto.js';

/** The month before `month` (`YYYY-MM`). */
export const monthBefore = (month: string): string => previousMonth(new Date(`${month}-01T00:00:00Z`));

const SEGMENTS: AdminBrandSegment[] = ['talked', 'all', 'prospects', 'customers', 'chains'];

interface BaseRow {
	id: string;
	name: string;
	lead_score: number | null;
	branches: number;
	districts: string[] | null;
	branch_names: string[];
	described_id: string | null;
	described_rating: number | null;
	prospect_id: string | null;
	stage: ProspectStageEnum | null;
	next_follow_up_at: Date | null;
}

export interface BrandBuzz {
	posts: number;
	views: number;
	creators: number;
	ownPosts: number;
}

const emptyFigures = (): AdminBrandMonthFiguresOutputDto => ({
	posts: 0,
	views: 0,
	creators: 0,
	ownPosts: 0,
	reviews: 0,
	unanswered: 0,
});

/**
 * The Brands page: every brand with an open branch in a city, with what was said about it in a
 * month and where it stands on the sales list. Worked out on read from mentions, reviews,
 * prospects and reports; nothing is stored.
 */
@Injectable()
export class BrandListService {
	constructor(private readonly em: EntityManager) {}

	async list(query: AdminListBrandsInputDto, now = new Date()): Promise<AdminListBrandsOutputDto> {
		const month = query.month ?? previousMonth(now);
		const base = await this.baseRows(query);
		const ids = base.map(b => b.id);
		const [buzz, reviews, reports] = await Promise.all([
			this.buzz(ids, [month, monthBefore(month)], query.cityId),
			this.reviewFigures(month, query.cityId),
			this.reports(month, query.cityId),
		]);

		const rows = base.map(b => {
			const now = buzz.get(month)?.get(b.id);
			const before = buzz.get(monthBefore(month))?.get(b.id);
			const review = reviews.get(b.id);
			const report = reports.get(b.id);
			return {
				base: b,
				month: { ...emptyFigures(), ...now, ...review },
				previous: { posts: before?.posts ?? 0, views: before?.views ?? 0 },
				report,
			};
		});
		const inSegment = (row: (typeof rows)[number], segment: AdminBrandSegment) => {
			const stage = row.base.stage;
			switch (segment) {
				case 'talked':
					return row.month.posts > 0;
				case 'all':
					return true;
				case 'prospects':
					return !!stage && stage !== ProspectStageEnum.WON;
				case 'customers':
					return stage === ProspectStageEnum.WON;
				case 'chains':
					return row.base.branches > 1;
			}
		};
		const segments = Object.fromEntries(
			SEGMENTS.map(s => [s, rows.filter(r => inSegment(r, s)).length]),
		) as Record<AdminBrandSegment, number>;
		const segment = query.segment ?? 'talked';
		const picked = rows.filter(r => inSegment(r, segment));

		const [field, order] = (query.sort ?? 'posts:desc').split(':') as [string, 'asc' | 'desc'];
		const key = (row: (typeof rows)[number]): number | string | null => {
			switch (field) {
				case 'posts':
					return row.month.posts;
				case 'change':
					return row.month.posts - row.previous.posts;
				case 'views':
					return row.month.views;
				case 'leadScore':
					return row.base.lead_score;
				case 'reviews':
					return row.month.reviews;
				case 'branches':
					return row.base.branches;
				case 'name':
					return row.base.name.toLowerCase();
				case 'followUp':
					return row.base.next_follow_up_at ? new Date(row.base.next_follow_up_at).getTime() : null;
				default:
					return null;
			}
		};
		const sortKey = field === 'rating' ? (row: (typeof rows)[number]) => row.base.described_rating : key;
		const sorted = _.orderBy(
			picked,
			[r => sortKey(r) === null, sortKey, r => r.month.views, r => r.base.lead_score ?? -1, r => r.base.name],
			['asc', order, 'desc', 'desc', 'asc'],
		);
		const page = sorted.slice((query.page - 1) * query.size, query.page * query.size);
		const venues = await this.describedVenues(page.map(r => r.base.described_id));

		return {
			items: page.map(
				(row): AdminBrandRowOutputDto => ({
					id: row.base.id,
					name: row.base.name,
					...(row.base.lead_score !== null && { leadScore: row.base.lead_score }),
					branches: row.base.branches,
					districts: row.base.districts ?? [],
					...(row.base.described_id &&
						venues.get(row.base.described_id) && { venue: venues.get(row.base.described_id) }),
					month: row.month,
					previous: row.previous,
					...(row.base.prospect_id &&
						row.base.stage && {
							prospect: {
								id: row.base.prospect_id,
								stage: row.base.stage,
								...(row.base.next_follow_up_at && { nextFollowUpAt: new Date(row.base.next_follow_up_at) }),
							},
						}),
					...(row.report && { report: row.report }),
				}),
			),
			totalItems: picked.length,
			page: query.page,
			pageSize: query.size,
			month,
			segments,
		};
	}

	/**
	 * Posts naming each brand per month, by others and by its own accounts (`ownPostSql`), in the
	 * city when given: month → brand → figures. Creators are people (`Creator`), so one person's
	 * TikTok and Instagram count once.
	 */
	async buzz(brandIds: string[], months: string[], cityId?: string): Promise<Map<string, Map<string, BrandBuzz>>> {
		const out = new Map(months.map(m => [m, new Map<string, BrandBuzz>()]));
		if (!brandIds.length || !months.length) return out;
		const rows: { brand_id: string; month: string; own: boolean; posts: number; views: string; creators: number }[] =
			await this.em.getConnection().execute(
				`select x.brand_id, to_char(p.posted_at at time zone 'UTC', 'YYYY-MM') as month,
					${ownPostSql('p', 'x.brand_id')} as own,
					count(*)::int as posts, coalesce(sum(p.views), 0) as views, count(distinct a.creator_id)::int as creators
				from (select distinct m.brand_id, m.post_id from mentions m where m.brand_id is not null) x
				join social_posts p on p.id = x.post_id
				left join social_accounts a on a.id = p.account_id
				where to_char(p.posted_at at time zone 'UTC', 'YYYY-MM') in (${months.map(() => '?').join(', ')})
					${cityId ? 'and p.city_id = ?' : ''}
				group by 1, 2, 3`,
				[...months, ...(cityId ? [cityId] : [])],
			);
		const wanted = new Set(brandIds);
		for (const row of rows) {
			if (!wanted.has(row.brand_id)) continue;
			const byBrand = out.get(row.month)!;
			const figures = byBrand.get(row.brand_id) ?? { posts: 0, views: 0, creators: 0, ownPosts: 0 };
			if (row.own) figures.ownPosts += row.posts;
			else Object.assign(figures, { posts: row.posts, views: Number(row.views), creators: row.creators });
			byBrand.set(row.brand_id, figures);
		}
		return out;
	}

	private async baseRows(query: AdminListBrandsInputDto): Promise<BaseRow[]> {
		const city = query.cityId ? 'and v.city_id = ?' : '';
		const cityParams = query.cityId ? [query.cityId] : [];
		const conditions: string[] = [];
		const params: unknown[] = [...cityParams, ...cityParams];
		if (query.q) {
			conditions.push(
				`(b.name ilike ? or exists (select 1 from venues v where v.brand_id = b.id and v.name ilike ?))`,
			);
			params.push(`%${query.q}%`, `%${query.q}%`);
		}
		if (query.district) {
			conditions.push(
				`exists (select 1 from venues v where v.brand_id = b.id and not v.closed and v.district = ? ${city})`,
			);
			params.push(query.district, ...cityParams);
		}
		if (query.stage) {
			conditions.push('p.stage = ?');
			params.push(query.stage);
		}
		return this.em.getConnection().execute(
			`with open_branches as (
				select v.brand_id, count(*)::int as branches,
					array_remove(array_agg(distinct v.district), null) as districts,
					array_agg(v.name) as branch_names
				from venues v
				where not v.closed ${city}
				group by v.brand_id
			)
			select b.id, b.name, b.lead_score, ob.branches, ob.districts, ob.branch_names,
				d.id as described_id, d.rating as described_rating,
				p.id as prospect_id, p.stage, p.next_follow_up_at
			from brands b
			join open_branches ob on ob.brand_id = b.id
			left join lateral (
				select v.id, v.rating from venues v where v.brand_id = b.id and not v.closed ${city}
				order by v.reviews_count desc nulls last, v.id limit 1
			) d on true
			left join prospects p on p.brand_id = b.id
			${conditions.length ? `where ${conditions.join(' and ')}` : ''}`,
			params,
		);
	}

	/** Each brand's reviews posted in the month (in the city), their mean stars and the unanswered critical ones. */
	private async reviewFigures(
		month: string,
		cityId?: string,
	): Promise<Map<string, Pick<AdminBrandMonthFiguresOutputDto, 'reviews' | 'stars' | 'unanswered'>>> {
		const { start, end } = monthRange(month);
		const rows: { brand_id: string; reviews: number; stars: string | null; unanswered: number }[] =
			await this.em.getConnection().execute(
				`select v.brand_id, count(*)::int as reviews, avg(r.stars) as stars,
					(count(*) filter (where r.stars <= 3 and coalesce(nullif(trim(r.text), ''), r.text_translated) is not null
						and r.owner_response is null and r.marked_replied_at is null))::int as unanswered
				from reviews r join venues v on v.id = r.venue_id
				where r.published_at >= ? and r.published_at < ? ${cityId ? 'and v.city_id = ?' : ''}
				group by v.brand_id`,
				[start, end, ...(cityId ? [cityId] : [])],
			);
		return new Map(
			rows.map(r => [
				r.brand_id,
				{
					reviews: r.reviews,
					...(r.stars !== null && { stars: Math.round(Number(r.stars) * 100) / 100 }),
					unanswered: r.unanswered,
				},
			]),
		);
	}

	/** The month's report of each brand: the city's, else the one across its cities. */
	private async reports(
		month: string,
		cityId?: string,
	): Promise<Map<string, { id: string; updatedAt: Date; sentAt?: Date }>> {
		const rows: { id: string; brand_id: string; city_id: string | null; updated_at: Date; sent_at: Date | null }[] =
			await this.em
				.getConnection()
				.execute(
					`select id, brand_id, city_id, updated_at, sent_at from reports where month = ? ${cityId ? 'and (city_id = ? or city_id is null)' : ''} order by city_id nulls last`,
					[month, ...(cityId ? [cityId] : [])],
				);
		const out = new Map<string, { id: string; updatedAt: Date; sentAt?: Date }>();
		for (const r of rows) {
			if (out.has(r.brand_id)) continue;
			out.set(r.brand_id, {
				id: r.id,
				updatedAt: new Date(r.updated_at),
				...(r.sent_at && { sentAt: new Date(r.sent_at) }),
			});
		}
		return out;
	}

	private async describedVenues(ids: (string | null)[]): Promise<Map<string, AdminBrandRowVenueOutputDto>> {
		const wanted = ids.filter((id): id is string => !!id);
		if (!wanted.length) return new Map();
		const venues = await this.em.find(Venue, { id: { $in: wanted } }, { populate: ['favicon'] });
		return new Map(
			venues.map(v => {
				const { id, name, category, district, street, rating, reviewsCount, favicon } = wrap(v).serialize({
					skipNull: true,
					forceObject: true,
					populate: ['favicon'],
				}) as unknown as AdminBrandRowVenueOutputDto;
				return [
					v.id,
					{
						id,
						name,
						...(category && { category }),
						...(district && { district }),
						...(street && { street }),
						...(rating != null && { rating }),
						...(reviewsCount != null && { reviewsCount }),
						...(favicon && { favicon }),
					},
				];
			}),
		);
	}
}
