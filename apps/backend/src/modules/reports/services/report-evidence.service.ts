import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import type { Tool } from '@mastra/core/tools';
import _ from 'lodash';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CityDayService } from 'src/modules/cities/services/city-day.service.js';
import { changesOf, complaintsOf, praiseOf } from 'src/modules/feedback/util/feedback-rows.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import type { TopicIndex } from 'src/modules/topics/util/topics.js';
import { ThemeInsightService } from 'src/modules/trends/services/theme-insight.service.js';
import { Review, ReviewPlatformEnum } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { monthRange } from 'src/modules/venues/util/month.js';
import { addDays, weekStart } from 'src/modules/venues/util/week.js';

import type { ReportData } from '../interfaces/report-data.interface.js';
import type { EvidenceContext, EvidenceReview } from '../interfaces/report-evidence.interface.js';
import { calendarTool } from '../tools/calendar.tool.js';
import { cityThemeTrendTool } from '../tools/city-theme-trend.tool.js';
import { competitorTool } from '../tools/competitor.tool.js';
import { historyTool } from '../tools/history.tool.js';
import { placeTool } from '../tools/place.tool.js';
import { postsTool } from '../tools/posts.tool.js';
import { pressAndCommentsTool } from '../tools/press-and-comments.tool.js';
import { reviewsTool } from '../tools/reviews.tool.js';
import { ToolRun } from '../tools/tool-run.js';
import { weeklySeriesTool } from '../tools/weekly-series.tool.js';
import { excerpt } from '../util/summarize-report.js';
import type { ReportHistoryMonth } from '../util/report-observations.js';
import { reviewWeeksOf } from '../util/report-playbooks.js';

/** What one build hands the evidence service: the computed data and the brand's past. */
export interface EvidenceBuild {
	branches: Venue[];
	city: City | null;
	month: string;
	data: ReportData;
	/** The month before's stored report body, when there is one */
	previousData?: ReportData;
	history: ReportHistoryMonth[];
}

const EXCERPT_CHARS = 160;
/** The week after the month: reviews a post late in the month brings in */
const AFTER_DAYS = 7;

/** A point's theme label, the topic for a point without one */
const themeLabel = (p: { theme?: string; topic: string }, index: TopicIndex) => (p.theme ? index.label(p.theme) : p.topic);

/**
 * What the analysis reads beyond `ReportData`, loaded once per build (`context`): the brand's
 * review rows of the month with their themes, the city's stored days, the city's complaint
 * themes (`ThemeInsightService`), the month before's competitors and the aspect vocabulary
 * (`TopicService.index`, read once). `tools` makes the agent's read tools over it, each call
 * counted by one `ToolRun` (the budget and the trace).
 */
@Injectable()
export class ReportEvidenceService {
	private readonly logger = new Logger(ReportEvidenceService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly cityDayService: CityDayService,
		private readonly themeInsightService: ThemeInsightService,
		private readonly topicService: TopicService,
	) {}

	async context({ branches, city, month, data, previousData, history }: EvidenceBuild): Promise<EvidenceContext> {
		const index = await this.topicService.index();
		const timeZone = branches[0].city.timezone;
		const cityId = city?.id ?? null;
		const chain = branches.length > 1;
		const { start, end } = monthRange(month);
		const until = new Date(end.getTime() + AFTER_DAYS * 86_400_000);
		const rows = await this.em.find(
			Review,
			{ venue: { $in: branches.map(b => b.id) }, publishedAt: { $gte: start, $lt: until } },
			{ populate: ['feedback', 'venue'], orderBy: { publishedAt: 'desc', id: 'asc' } },
		);
		const reviews: EvidenceReview[] = rows.map(r => {
			const feedback = r.feedback.getItems();
			const text = r.textTranslated || r.text;
			return {
				date: r.publishedAt.toISOString().slice(0, 10),
				week: weekStart(r.publishedAt, timeZone),
				...(r.stars != null && { stars: r.stars }),
				...(text && { excerpt: excerpt(text, EXCERPT_CHARS) }),
				complaints: _.uniq(complaintsOf(feedback).map(p => themeLabel(p, index))),
				praise: _.uniq(praiseOf(feedback).map(p => themeLabel(p, index))),
				changes: changesOf(feedback).map(c => c.detail),
				replied: !!r.ownerResponse || !!r.markedRepliedAt,
				platform: r.platform === ReviewPlatformEnum.TRIPADVISOR ? 'tripadvisor' : 'google',
				...(chain && { branch: r.venue.name }),
			};
		});
		const reviewWeeks = reviewWeeksOf(
			rows.map(r => ({
				publishedAt: r.publishedAt,
				stars: r.stars,
				text: r.text,
				textTranslated: r.textTranslated,
				themes: complaintsOf(r.feedback.getItems()).map(p => p.theme ?? p.topic),
			})),
			timeZone,
		);

		const days = (cityId ? await this.cityDayService.days(cityId, `${month}-01`, addDays(end.toISOString().slice(0, 10), AFTER_DAYS)) : []) ?? [];
		let cityThemes: EvidenceContext['cityThemes'];
		if (cityId)
			try {
				const insights = await this.themeInsightService.city(cityId, month);
				cityThemes = insights.complaints.map(t => ({
					key: t.key,
					label: t.label,
					reviewShare: t.reviewShare,
					reviewShareChange: t.reviewShareChange,
					venues: t.venues,
				}));
			} catch (e) {
				// The city's themes are one check and one tool: the analysis goes on without them
				this.logger.warn(`City themes for ${month} failed: ${(e as Error).message}`);
			}

		return {
			data,
			previousData,
			history,
			timeZone,
			days: days.map(d => ({ date: d.date, rainMm: d.rainMm, holiday: d.holiday })),
			reviewWeeks,
			baselinePerWeek: data.correlations?.buzzToReviews?.baselinePerWeek ?? null,
			cityThemes,
			competitorsPrevious: new Map((previousData?.competitors ?? []).map(c => [c.venueId, c])),
			cityId,
			...(city && { cityName: city.name }),
			reviews,
			aspects: index,
		};
	}

	/** The agent's read tools over a context, every call going through `run`. */
	tools(ctx: EvidenceContext, run: ToolRun): Record<string, Tool> {
		return {
			weekly_series: weeklySeriesTool(ctx, run),
			history: historyTool(ctx, run),
			reviews: reviewsTool(ctx, run),
			posts: postsTool(ctx, run),
			competitor: competitorTool(ctx, run),
			calendar: calendarTool(ctx, run),
			place: placeTool(ctx, run),
			city_theme_trend: cityThemeTrendTool(ctx, run),
			press_and_comments: pressAndCommentsTool(ctx, run),
		} as unknown as Record<string, Tool>;
	}
}
