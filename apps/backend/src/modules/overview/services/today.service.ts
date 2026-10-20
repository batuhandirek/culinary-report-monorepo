import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { FoodTopicService } from 'src/modules/food-topics/services/food-topic.service.js';
import { ProspectStageEnum } from 'src/modules/outreach/constants/outreach.constant.js';
import { Prospect } from 'src/modules/outreach/entities/prospect.entity.js';
import { ProspectQueryService } from 'src/modules/outreach/services/prospect-query.service.js';
import { PipelineRunStatusEnum } from 'src/modules/pipeline/entities/pipeline-run.entity.js';
import type { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';
import { LEAD_PROSPECT_SCORE } from 'src/modules/venues/constants/lead-score.constant.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { monthRange, previousMonth } from 'src/modules/venues/util/month.js';

import type { AdminTodayOutputDto, AdminTodoOutputDto, AdminUnmatchedPostOutputDto } from '../dto/admin-today.dto.js';

import { DataCoverageService } from './data-coverage.service.js';

const monthName = (month: string) =>
	new Date(`${month}-01T00:00:00Z`).toLocaleString('en', { month: 'long', timeZone: 'UTC' });
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const TONE_ORDER = { urgent: 0, todo: 1, info: 2 } as const;
// Within a tone, in this order (a city's items by key prefix)
const KEY_ORDER = [
	'follow-ups',
	'replies',
	'customer-reports',
	'unsent-reports',
	'prospects',
	'failed-runs',
	'coverage',
	'unmatched',
	'merges',
	'accounts',
	'words',
];
const keyRank = (key: string) => KEY_ORDER.findIndex(k => key === k || key.startsWith(`${k}-`));

/**
 * `/admin`'s "waiting on you": every list an admin works through, counted, each linking to the
 * page where it is done. Each count is read on its own; a failed one is left out, not zeroed.
 */
@Injectable()
export class TodayService {
	private readonly logger = new Logger(TodayService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly cityService: CityService,
		private readonly brandService: BrandService,
		private readonly foodTopicService: FoodTopicService,
		private readonly prospectQueryService: ProspectQueryService,
		private readonly dataCoverageService: DataCoverageService,
	) {}

	async today(now = new Date()): Promise<AdminTodayOutputDto> {
		const reportMonth = previousMonth(now);
		const name = monthName(reportMonth);
		const todos: AdminTodoOutputDto[] = [];
		const tryRead = async (what: string, read: () => Promise<void>) => {
			try {
				await read();
			} catch (e) {
				this.logger.warn(`Today: ${what} failed: ${(e as Error).message}`);
			}
		};
		const em = () => this.em.fork();
		const cities = await this.cityService.active();

		await Promise.all([
			tryRead('follow-ups', async () => {
				const due = await this.prospectQueryService.due(100, now);
				if (due.length)
					todos.push({
						key: 'follow-ups',
						tone: 'urgent',
						text: `${plural(due.length, 'follow-up is', 'follow-ups are')} due today`,
						href: '/admin/brands?segment=prospects&sort=followUp:asc',
						cta: 'Write',
					});
			}),
			tryRead('replies', async () => {
				const replied = await em().count(Prospect, { stage: ProspectStageEnum.REPLIED });
				if (replied)
					todos.push({
						key: 'replies',
						tone: 'urgent',
						text: `${plural(replied, 'brand answered', 'brands answered')}: reply or book a meeting`,
						href: `/admin/brands?segment=prospects&stage=${ProspectStageEnum.REPLIED}`,
						cta: 'Answer',
					});
			}),
			tryRead('customer reports', async () => {
				const rows: { missing: number; unsent: number }[] = await em()
					.getConnection()
					.execute(
						`select (count(*) filter (where r.id is null))::int as missing,
							(count(*) filter (where r.id is not null and r.sent_at is null))::int as unsent
						from prospects p left join reports r on r.brand_id = p.brand_id and r.month = ?
						where p.stage = ?`,
						[reportMonth, ProspectStageEnum.WON],
					);
				const { missing, unsent } = rows[0] ?? { missing: 0, unsent: 0 };
				if (missing)
					todos.push({
						key: 'customer-reports',
						tone: 'urgent',
						text: `${plural(missing, 'customer has', 'customers have')} no ${name} report yet`,
						href: '/admin/brands?segment=customers',
						cta: 'Build',
					});
				if (unsent)
					todos.push({
						key: 'unsent-reports',
						tone: 'todo',
						text: `${plural(unsent, `${name} report is`, `${name} reports are`)} not sent to the customer yet`,
						href: `/admin/reports?month=${reportMonth}`,
						cta: 'Send',
					});
			}),
			tryRead('suggested prospects', async () => {
				const suggested = await this.prospectQueryService.suggested(100);
				const good = suggested.filter(b => (b.leadScore ?? 0) >= LEAD_PROSPECT_SCORE).length;
				if (good)
					todos.push({
						key: 'prospects',
						tone: 'todo',
						text: `${plural(good, 'brand scores', 'brands score')} ${LEAD_PROSPECT_SCORE}+ and ${good === 1 ? 'is' : 'are'} not on the sales list`,
						href: '/admin/brands?tab=suggested',
						cta: 'Review',
					});
			}),
			tryRead('failed runs', async () => {
				// A failure a later run of the same step, city and month made good is history
				const [{ failed }]: { failed: number }[] = await em()
					.getConnection()
					.execute(
						`select count(*)::int as failed from pipeline_runs f
						where f.status = ? and f.finished_at >= ?
							and not exists (select 1 from pipeline_runs s where s.city_id = f.city_id and s.month = f.month
								and s.step = f.step and s.created_at > f.created_at and s.status in (?, ?, ?))`,
						[
							PipelineRunStatusEnum.FAILED,
							new Date(now.getTime() - 7 * 24 * 3600 * 1000),
							PipelineRunStatusEnum.SUCCEEDED,
							PipelineRunStatusEnum.RUNNING,
							PipelineRunStatusEnum.QUEUED,
						],
					);
				if (failed)
					todos.push({
						key: 'failed-runs',
						tone: 'todo',
						text: `${plural(failed, 'pipeline run', 'pipeline runs')} failed this week and ${failed === 1 ? 'was' : 'were'} not run again`,
						href: '/admin/data?tab=runs',
						cta: 'Check',
					});
			}),
			tryRead('unmatched', async () => {
				const { start } = monthRange(reportMonth);
				const [{ posts }]: { posts: number }[] = await em()
					.getConnection()
					.execute(
						`select count(distinct m.post_id)::int as posts from mentions m join social_posts p on p.id = m.post_id
						where m.match_method = 'none' and p.posted_at >= ?`,
						[start],
					);
				if (posts)
					todos.push({
						key: 'unmatched',
						tone: 'info',
						text: `${plural(posts, 'post since', 'posts since')} ${name} 1 name a place no venue matches`,
						href: '/admin/posts?unmatchedOnly=true&sort=views:desc',
						cta: 'Link',
					});
			}),
			...cities.map(city =>
				tryRead(`coverage ${city.name}`, async () => {
					const coverage = await this.dataCoverageService.coverage(city.id, 2, now);
					const month = coverage.months.find(m => m.month === reportMonth);
					if (!month || month.complete) return;
					const busy = month.steps.filter(s => s.state === 'running' || s.state === 'queued').length;
					const failed = month.steps.filter(s => s.state === 'failed').length;
					const never = month.steps.filter(s => !s.state).length;
					todos.push({
						key: `coverage-${city.id}`,
						tone: busy ? 'info' : 'todo',
						text:
							busy ?
								`${city.name}, ${name}: ${plural(busy, 'step', 'steps')} running or queued`
							:	`${city.name}, ${name} is not complete: ${[failed && `${failed} failed`, never && `${never} never ran`].filter(Boolean).join(', ')}`,
						href: `/admin/data?cityId=${city.id}`,
						cta: busy ? 'Watch' : 'Finish',
					});
				}),
			),
			...cities.map(city =>
				tryRead(`merges ${city.name}`, async () => {
					const groups = (await this.brandService.suggestions(city.id)).length;
					if (groups)
						todos.push({
							key: `merges-${city.id}`,
							tone: 'info',
							text: `${plural(groups, 'group', 'groups')} of ${city.name} places look like one brand`,
							href: '/admin/brands?tab=merges',
							cta: 'Review',
						});
				}),
			),
			...cities.map(city =>
				tryRead(`accounts ${city.name}`, async () => {
					const [{ n }]: { n: number }[] = await em()
						.getConnection()
						.execute(
							`select count(*)::int as n from social_accounts
							where city_id = ? and brand_id is null and suggested_brand_id is not null`,
							[city.id],
						);
					if (n)
						todos.push({
							key: `accounts-${city.id}`,
							tone: 'info',
							text: `${plural(n, 'account', 'accounts')} in ${city.name} look like a venue's own`,
							href: `/admin/posts?tab=review&cityId=${city.id}`,
							cta: 'Review',
						});
				}),
			),
			...cities.map(city =>
				tryRead(`words ${city.name}`, async () => {
					const words = (await this.foodTopicService.overview(city.id)).unmapped.length;
					if (words)
						todos.push({
							key: `words-${city.id}`,
							tone: 'info',
							text: `${plural(words, 'food word', 'food words')} in ${city.name} map to no topic`,
							href: '/admin/trends?tab=words',
							cta: 'Map',
						});
				}),
			),
		]);

		return {
			reportMonth,
			todos: todos.sort(
				(a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone] || keyRank(a.key) - keyRank(b.key),
			),
			unmatchedPosts: await this.unmatchedPosts(reportMonth).catch(() => []),
		};
	}

	private async unmatchedPosts(reportMonth: string): Promise<AdminUnmatchedPostOutputDto[]> {
		const rows: {
			post_id: string;
			platform: SocialPlatformEnum;
			author: string | null;
			views: number;
			posted_at: string;
			name: string;
		}[] = await this.em.getConnection().execute(
			`select distinct on (p.views, p.id) p.id as post_id, p.platform, p.author, p.views, p.posted_at, m.venue_name as name
			from mentions m join social_posts p on p.id = m.post_id
			where m.match_method = 'none' and p.posted_at >= ?
			order by p.views desc, p.id limit 6`,
			[monthRange(reportMonth).start],
		);
		return rows.map(r => ({
			postId: r.post_id,
			platform: r.platform,
			...(r.author && { author: r.author }),
			views: r.views,
			postedAt: new Date(r.posted_at),
			name: r.name,
		}));
	}
}
