import { QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, NotFoundException } from '@nestjs/common';

import _ from 'lodash';

import { monthRange, previousMonth } from 'src/modules/venues/util/month.js';

import { Creator } from '../entities/creator.entity.js';
import type { PostSourceKindEnum } from '../entities/post-source.entity.js';
import { SocialAccount } from '../entities/social-account.entity.js';
import { SocialPlatformEnum } from '../entities/social-post.entity.js';
import { ACCOUNT_POPULATE } from '../util/account-output.js';

import { type AccountWithFigures, SocialAccountService } from './social-account.service.js';

/** A creator's posts in one month, over all their accounts. */
export interface CreatorMonth {
	posts: number;
	views: number;
	/** Marked as an ad, or paid or gifted as the caption says */
	paid: number;
	/** Brands their posts named */
	brands: number;
	lastPostedAt?: Date;
}

export interface CreatorRow {
	creator: Creator;
	/** Every account is a brand's own: a venue, not word of mouth */
	own: boolean;
	/** The most followers of any of their accounts */
	followers?: number;
	month: CreatorMonth;
}

export interface CreatorDetail {
	creator: Creator;
	accounts: AccountWithFigures[];
	/** Posts and views per month, the six months up to the one asked for, oldest first */
	months: { month: string; posts: number; views: number }[];
	/** The brands their posts named most, all time */
	brands: { id: string; name: string; posts: number; views: number; lastPostedAt: Date; own: boolean }[];
	posts: number;
	views: number;
	/** What found their posts, the most posts first: a city source, a venue search or their own profile */
	foundBy: CreatorFind[];
}

/** One thing that found a creator's posts (`PostSource`), with how many of their posts. */
export interface CreatorFind {
	kind: PostSourceKindEnum;
	value: string;
	/** The city's source it is, when it is one (enabled or not) */
	sourceId?: string;
	sourceEnabled?: boolean;
	city: { id: string; name: string };
	/** A venue search's or place page's venue */
	venue?: { id: string; name: string };
	posts: number;
	lastPostedAt: Date;
}

const marks = (n: unknown[]) => n.map(() => '?').join(', ');
const monthBefore = (month: string) => previousMonth(new Date(`${month}-01T00:00:00Z`));

/**
 * Creators on the admin pages (read only; edits go through `SocialAccountService`): who posted in
 * a city and month, over all their accounts, and one creator's accounts, months and brands.
 */
@Injectable()
export class CreatorService {
	constructor(
		private readonly em: EntityManager,
		private readonly socialAccountService: SocialAccountService,
	) {}

	/**
	 * The creators who posted in the month (in the city, on the platform), venues' own accounts
	 * left out unless `includeOwn`, searched on their name and handles, sorted and paged in memory.
	 */
	async list(query: {
		cityId?: string;
		month: string;
		platform?: SocialPlatformEnum;
		q?: string;
		includeOwn?: boolean;
		sort?: string;
		page: number;
		size: number;
	}): Promise<{ items: CreatorRow[]; totalItems: number }> {
		const { start, end } = monthRange(query.month);
		const params: unknown[] = [start, end];
		let filter = '';
		if (query.cityId) {
			filter += ' and p.city_id = ?';
			params.push(query.cityId);
		}
		if (query.platform) {
			filter += ' and p.platform = ?';
			params.push(query.platform);
		}
		const rows: {
			creator_id: string;
			posts: string;
			views: string;
			paid: string;
			brands: string;
			last_posted_at: Date;
		}[] = await this.em.getConnection().execute(
			`with posts as (
				select a.creator_id, p.id, p.views, p.is_ad, p.is_promotional, p.posted_at
				from social_posts p join social_accounts a on a.id = p.account_id
				where p.posted_at >= ? and p.posted_at < ?${filter}
			)
			select creator_id, count(*) as posts, coalesce(sum(views), 0) as views,
				count(*) filter (where is_ad or is_promotional) as paid, max(posted_at) as last_posted_at,
				(select count(distinct m.brand_id) from mentions m join posts q on q.id = m.post_id
					where q.creator_id = posts.creator_id) as brands
			from posts group by creator_id`,
			params,
		);
		if (!rows.length) return { items: [], totalItems: 0 };
		const creators = await this.em.find(
			Creator,
			{ id: { $in: rows.map(r => r.creator_id) } },
			{ populate: ['accounts', 'accounts.brand'] },
		);
		const byId = new Map(creators.map(c => [c.id, c]));
		const q = query.q?.trim().toLowerCase().replace(/^@/, '');
		const items = rows
			.map((r): CreatorRow | null => {
				const creator = byId.get(r.creator_id);
				if (!creator) return null;
				const accounts = creator.accounts.getItems();
				const followers = _.max(accounts.map(a => a.followers ?? undefined).filter(n => n !== undefined));
				return {
					creator,
					own: accounts.length > 0 && accounts.every(a => !!a.brand),
					...(followers !== undefined && { followers }),
					month: {
						posts: Number(r.posts),
						views: Number(r.views),
						paid: Number(r.paid),
						brands: Number(r.brands),
						lastPostedAt: new Date(r.last_posted_at),
					},
				};
			})
			.filter((r): r is CreatorRow => !!r)
			.filter(r => query.includeOwn || !r.own)
			.filter(
				r =>
					!q ||
					r.creator.name.toLowerCase().includes(q) ||
					r.creator.accounts.getItems().some(a => a.handle.includes(q) || a.displayName?.toLowerCase().includes(q)),
			);
		const [field, order] = (query.sort ?? 'views:desc').split(':');
		const value = (r: CreatorRow): number | string =>
			field === 'name' ? r.creator.name.toLowerCase()
			: field === 'posts' ? r.month.posts
			: field === 'followers' ? (r.followers ?? -1)
			: field === 'brands' ? r.month.brands
			: r.month.views;
		const sorted = _.orderBy(items, [value, r => r.creator.name], [order === 'asc' ? 'asc' : 'desc', 'asc']);
		return { items: sorted.slice((query.page - 1) * query.size, query.page * query.size), totalItems: sorted.length };
	}

	/** One creator: their accounts with figures for the month, six months of posts, the brands they named. */
	async detail(id: string, month: string): Promise<CreatorDetail> {
		const creator = await this.em.findOne(Creator, { id });
		if (!creator) throw new NotFoundException();
		const accounts = await this.em.find(
			SocialAccount,
			{ creator: id },
			{ populate: [...ACCOUNT_POPULATE], orderBy: { platform: QueryOrder.ASC, handle: QueryOrder.ASC } },
		);
		const ids = accounts.map(a => a.id);
		const months = [month];
		while (months.length < 6) months.unshift(monthBefore(months[0]));
		const conn = this.em.getConnection();
		const perMonth: { month: string; posts: string; views: string }[] = ids.length ?
				await conn.execute(
					`select to_char(posted_at at time zone 'UTC', 'YYYY-MM') as month, count(*) as posts, coalesce(sum(views), 0) as views
					from social_posts where account_id in (${marks(ids)}) group by 1`,
					ids,
				)
			:	[];
		const brands: { brand_id: string; name: string; posts: string; views: string; last_posted_at: Date }[] = ids.length ?
				await conn.execute(
					`select x.brand_id, b.name, count(*) as posts, coalesce(sum(x.views), 0) as views, max(x.posted_at) as last_posted_at
					from (
						select distinct m.brand_id, p.id, p.views, p.posted_at
						from mentions m join social_posts p on p.id = m.post_id
						where p.account_id in (${marks(ids)}) and m.brand_id is not null
					) x join brands b on b.id = x.brand_id
					group by x.brand_id, b.name order by posts desc, views desc limit 12`,
					ids,
				)
			:	[];
		const finds: {
			kind: PostSourceKindEnum;
			value: string;
			source_id: string | null;
			source_enabled: boolean | null;
			city_id: string;
			city_name: string;
			venue_id: string | null;
			venue_name: string | null;
			posts: string;
			last_posted_at: Date;
		}[] = ids.length ?
				await conn.execute(
					`select ps.kind, ps.value, ps.source_id, cs.enabled as source_enabled, p.city_id, c.name as city_name,
						ps.venue_id, v.name as venue_name, count(distinct ps.post_id) as posts, max(p.posted_at) as last_posted_at
					from post_sources ps
					join social_posts p on p.id = ps.post_id
					join cities c on c.id = p.city_id
					left join city_sources cs on cs.id = ps.source_id
					left join venues v on v.id = ps.venue_id
					where p.account_id in (${marks(ids)})
					group by ps.kind, ps.value, ps.source_id, cs.enabled, p.city_id, c.name, ps.venue_id, v.name
					order by posts desc, last_posted_at desc limit 15`,
					ids,
				)
			:	[];
		const ownBrands = new Set(accounts.map(a => a.brand?.id).filter(Boolean));
		return {
			creator,
			accounts: await this.socialAccountService.withFigures(accounts, month),
			months: months.map(m => {
				const row = perMonth.find(r => r.month === m);
				return { month: m, posts: Number(row?.posts ?? 0), views: Number(row?.views ?? 0) };
			}),
			brands: brands.map(b => ({
				id: b.brand_id,
				name: b.name,
				posts: Number(b.posts),
				views: Number(b.views),
				lastPostedAt: new Date(b.last_posted_at),
				own: ownBrands.has(b.brand_id),
			})),
			posts: _.sumBy(perMonth, r => Number(r.posts)),
			views: _.sumBy(perMonth, r => Number(r.views)),
			foundBy: finds.map(f => ({
				kind: f.kind,
				value: f.value,
				...(f.source_id && { sourceId: f.source_id, sourceEnabled: !!f.source_enabled }),
				city: { id: f.city_id, name: f.city_name },
				...(f.venue_id && { venue: { id: f.venue_id, name: f.venue_name ?? '' } }),
				posts: Number(f.posts),
				lastPostedAt: new Date(f.last_posted_at),
			})),
		};
	}
}
