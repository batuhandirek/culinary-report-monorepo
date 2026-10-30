import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import _ from 'lodash';

import { DishNameService } from 'src/modules/feedback/services/dish-name.service.js';
import { ProspectStageEnum } from 'src/modules/outreach/constants/outreach.constant.js';
import { Prospect } from 'src/modules/outreach/entities/prospect.entity.js';
import { Report } from 'src/modules/reports/entities/report.entity.js';
import type { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';
import { ownPostSql } from 'src/modules/social/util/accounts.js';
import { LEAD_PROSPECT_SCORE } from 'src/modules/venues/constants/lead-score.constant.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { BrandCompetitor } from 'src/modules/venues/entities/brand-competitor.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { monthRange, previousMonth } from 'src/modules/venues/util/month.js';

import type { AdminBrandMonthFiguresOutputDto } from '../dto/admin-brand-list.dto.js';
import type {
	AdminBrandReviewTagOutputDto,
	AdminBrandSummaryOutputDto,
	AdminBrandTodoOutputDto,
	AdminBrandTopPostOutputDto,
} from '../dto/admin-brand-summary.dto.js';
import { reviewTags } from '../util/review-tags.js';

import { BrandListService, monthBefore } from './brand-list.service.js';

const SERIES_MONTHS = 6;

const monthName = (month: string) =>
	new Date(`${month}-01T00:00:00Z`).toLocaleString('en', { month: 'long', timeZone: 'UTC' });

/** The brand page's Overview: the month in numbers, six months of them, its best posts and what to do. */
@Injectable()
export class BrandSummaryService {
	constructor(
		private readonly em: EntityManager,
		private readonly brandListService: BrandListService,
		private readonly dishNameService: DishNameService,
	) {}

	async summary(
		brandId: string,
		opts: { cityId?: string; month?: string },
		now = new Date(),
	): Promise<AdminBrandSummaryOutputDto> {
		const month = opts.month ?? previousMonth(now);
		const brand = await this.em.findOneOrFail(Brand, brandId);
		const branches = await this.em.find(Venue, {
			brand: brandId,
			...(opts.cityId && { city: opts.cityId }),
		});
		const months = [month];
		while (months.length < SERIES_MONTHS) months.unshift(monthBefore(months[0]));
		const allMonths = [monthBefore(months[0]), ...months];

		const [buzz, reviews, topPosts, brandOnlyPosts, reports, competitors, prospect] = await Promise.all([
			this.brandListService.buzz([brandId], allMonths, opts.cityId),
			this.reviewSeries(brandId, allMonths, opts.cityId),
			this.topPosts(brandId, month, opts.cityId),
			this.brandOnlyPosts(brandId, month, opts.cityId),
			this.em.find(
				Report,
				{ brand: brandId, ...(opts.cityId && { $or: [{ city: opts.cityId }, { city: null }] }) },
				{ orderBy: { month: 'desc' } },
			),
			this.em.count(BrandCompetitor, { brand: brandId }),
			this.em.findOne(Prospect, { brand: brandId }),
		]);
		const figuresOf = (m: string): AdminBrandMonthFiguresOutputDto => ({
			posts: 0,
			views: 0,
			creators: 0,
			ownPosts: 0,
			...buzz.get(m)?.get(brandId),
			reviews: 0,
			unanswered: 0,
			...reviews.get(m),
		});
		const figures = figuresOf(month);
		const report = reports.find(r => r.month === month) ?? reports[0];

		return {
			month,
			figures,
			previous: figuresOf(monthBefore(month)),
			series: months.map(m => ({ month: m, ...figuresOf(m) })),
			topPosts,
			brandOnlyPosts,
			...(report && {
				report: {
					id: report.id,
					month: report.month,
					...(report.highlights?.title && { title: report.highlights.title }),
					...(report.highlights?.headline && { headline: report.highlights.headline }),
					updatedAt: report.updatedAt,
					...(report.sentAt && { sentAt: report.sentAt }),
				},
			}),
			competitors,
			...(prospect && {
				prospect: {
					id: prospect.id,
					stage: prospect.stage,
					...(prospect.nextFollowUpAt && { nextFollowUpAt: prospect.nextFollowUpAt }),
					...(prospect.lastTouchAt && { lastTouchAt: prospect.lastTouchAt }),
					outreachCount: prospect.outreachCount,
				},
			}),
			reviewTags: await this.reviewTags(branches),
			todos: this.todos({
				month,
				figures,
				brand,
				branches: branches.filter(b => !b.closed),
				hasReport: reports.some(r => r.month === month),
				reportSent: !!reports.find(r => r.month === month)?.sentAt,
				brandOnlyPosts,
				competitors,
				prospect,
				now,
			}),
		};
	}

	/** Its places' Google review tags, each with the food topic it names */
	private async reviewTags(branches: Venue[]): Promise<AdminBrandReviewTagOutputDto[]> {
		const tags = reviewTags(branches);
		const topics = await this.dishNameService.reviewTagTopics(tags.map(t => t.title));
		return tags.map(tag => {
			const topic = topics.get(tag.title);
			return { ...tag, ...(topic && { topic }) };
		});
	}

	/** What an admin can do about the brand now, most pressing first. */
	todos(input: {
		month: string;
		figures: AdminBrandMonthFiguresOutputDto;
		brand: Brand;
		branches: Venue[];
		hasReport: boolean;
		reportSent: boolean;
		brandOnlyPosts: number;
		competitors: number;
		prospect: Prospect | null;
		now: Date;
	}): AdminBrandTodoOutputDto[] {
		const { month, figures, prospect } = input;
		const name = monthName(month);
		const customer = prospect?.stage === ProspectStageEnum.WON;
		const selling = !!prospect && !customer;
		const watched = customer || selling || figures.posts > 0;
		const out: AdminBrandTodoOutputDto[] = [];
		const endOfToday = new Date(input.now);
		endOfToday.setUTCHours(23, 59, 59, 999);

		if (prospect?.nextFollowUpAt && prospect.nextFollowUpAt <= endOfToday) {
			out.push({ key: 'follow-up', tone: 'urgent', tab: 'sales', text: 'A follow-up is due' });
		}
		if (figures.unanswered > 0) {
			out.push({
				key: 'unanswered',
				tone: customer ? 'urgent' : 'info',
				tab: 'reviews',
				text: `${figures.unanswered} critical ${figures.unanswered === 1 ? 'review' : 'reviews'} in ${name} nobody answered${customer ? '' : ': a pitch hook'}`,
			});
		}
		if (customer && !input.hasReport) {
			out.push({ key: 'report', tone: 'urgent', tab: 'reports', text: `No ${name} report yet` });
		} else if (customer && !input.reportSent) {
			out.push({ key: 'send', tone: 'todo', tab: 'reports', text: `The ${name} report is not sent yet` });
		} else if (selling && !input.hasReport) {
			out.push({ key: 'report', tone: 'todo', tab: 'reports', text: `Build a ${name} report to pitch with` });
		}
		if (!prospect && (input.brand.leadScore ?? 0) >= LEAD_PROSPECT_SCORE) {
			out.push({
				key: 'prospect',
				tone: 'todo',
				tab: 'sales',
				text: `Lead score ${Math.round(input.brand.leadScore!)}: add it to the sales list`,
			});
		}
		if (watched && input.competitors === 0) {
			out.push({
				key: 'competitors',
				tone: 'todo',
				tab: 'competitors',
				text: 'No competitors: its report compares it with nobody',
			});
		}
		if (input.brandOnlyPosts > 0 && input.branches.length > 1) {
			out.push({
				key: 'brand-only',
				tone: 'info',
				tab: 'posts',
				text: `${input.brandOnlyPosts} ${input.brandOnlyPosts === 1 ? 'post names' : 'posts name'} the brand but no branch`,
			});
		}
		const reviewed = _.sumBy(input.branches, b => b.reviewsCount ?? 0);
		if (watched && figures.reviews === 0 && reviewed >= 50) {
			out.push({
				key: 'reviews-missing',
				tone: 'info',
				tab: 'reviews',
				text: `No ${name} reviews stored: its reviews were not scraped for that month`,
			});
		}
		return out;
	}

	/** Reviews per month of the brand's branches (in the city). */
	private async reviewSeries(
		brandId: string,
		months: string[],
		cityId?: string,
	): Promise<Map<string, Pick<AdminBrandMonthFiguresOutputDto, 'reviews' | 'stars' | 'unanswered'>>> {
		const start = monthRange(months[0]).start;
		const end = monthRange(months[months.length - 1]).end;
		const rows: { month: string; reviews: number; stars: string | null; unanswered: number }[] = await this.em
			.getConnection()
			.execute(
				`select to_char(r.published_at at time zone 'UTC', 'YYYY-MM') as month, count(*)::int as reviews,
					avg(r.stars) as stars,
					(count(*) filter (where r.stars <= 3 and coalesce(nullif(trim(r.text), ''), r.text_translated) is not null
						and r.owner_response is null and r.marked_replied_at is null))::int as unanswered
				from reviews r join venues v on v.id = r.venue_id
				where v.brand_id = ? and r.published_at >= ? and r.published_at < ? ${cityId ? 'and v.city_id = ?' : ''}
				group by 1`,
				[brandId, start, end, ...(cityId ? [cityId] : [])],
			);
		return new Map(
			rows.map(r => [
				r.month,
				{
					reviews: r.reviews,
					...(r.stars !== null && { stars: Math.round(Number(r.stars) * 100) / 100 }),
					unanswered: r.unanswered,
				},
			]),
		);
	}

	/** The month's five most viewed posts naming the brand, by others. */
	private async topPosts(brandId: string, month: string, cityId?: string): Promise<AdminBrandTopPostOutputDto[]> {
		const { start, end } = monthRange(month);
		const rows: {
			id: string;
			platform: SocialPlatformEnum;
			url: string;
			author: string | null;
			posted_at: Date;
			views: number;
			summary: string;
			sentiment: string;
			venue_id: string | null;
			venue_name: string | null;
		}[] = await this.em.getConnection().execute(
			`select distinct on (p.id) p.id, p.platform, p.url, p.author, p.posted_at, p.views,
				m.summary, m.sentiment, v.id as venue_id, v.name as venue_name
			from mentions m
			join social_posts p on p.id = m.post_id
			left join venues v on v.id = m.venue_id
			where m.brand_id = ? and p.posted_at >= ? and p.posted_at < ? ${cityId ? 'and p.city_id = ?' : ''}
				and not ${ownPostSql('p', 'm.brand_id')}
			order by p.id, m.id`,
			[brandId, start, end, ...(cityId ? [cityId] : [])],
		);
		return _.orderBy(rows, r => r.views, 'desc')
			.slice(0, 5)
			.map(r => ({
				id: r.id,
				platform: r.platform,
				url: r.url,
				...(r.author && { author: r.author }),
				postedAt: new Date(r.posted_at),
				views: r.views,
				summary: r.summary,
				sentiment: r.sentiment,
				...(r.venue_id && r.venue_name && { branch: { id: r.venue_id, name: r.venue_name } }),
			}));
	}

	private async brandOnlyPosts(brandId: string, month: string, cityId?: string): Promise<number> {
		const { start, end } = monthRange(month);
		const [{ count }]: { count: number }[] = await this.em.getConnection().execute(
			`select count(distinct p.id)::int as count
			from mentions m join social_posts p on p.id = m.post_id
			where m.brand_id = ? and m.venue_id is null and p.posted_at >= ? and p.posted_at < ? ${cityId ? 'and p.city_id = ?' : ''}`,
			[brandId, start, end, ...(cityId ? [cityId] : [])],
		);
		return count;
	}
}
