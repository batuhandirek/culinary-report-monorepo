import { QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CityDayService } from 'src/modules/cities/services/city-day.service.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { Mention } from 'src/modules/social/entities/mention.entity.js';
import { ownPostSql } from 'src/modules/social/util/accounts.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { VenueSnapshot } from 'src/modules/venues/entities/venue-snapshot.entity.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import {
	FEEDBACK_THEMES,
	feedbackThemeLabel,
	isFeedbackTheme,
} from 'src/modules/venues/constants/feedback-themes.constant.js';
import { CompetitorService } from 'src/modules/venues/services/competitor.service.js';
import { monthName, monthRange, previousMonth } from 'src/modules/venues/util/month.js';
import { offeredAmenities } from 'src/modules/venues/util/venue-details.js';
import { isFoodVenue } from 'src/modules/venues/util/venue-names.js';

import { ReportAnalysisAgent } from '../agents/report-analysis.agent.js';
import { ReportHighlightsAgent } from '../agents/report-highlights.agent.js';
import { ReviewReplyAgent } from '../agents/review-reply.agent.js';
import { ANALYSIS_MODEL, ANALYSIS_TIMEOUT_MS, MAX_INVESTIGATIONS } from '../constants/report-analysis.constant.js';
import { Report } from '../entities/report.entity.js';
import type {
	ReportAnalysis,
	ReportAnalysisAnswer,
	ReportAnalysisTrace,
	ReportObservation,
} from '../interfaces/report-analysis.interface.js';
import {
	ReportBranch,
	ReportCompetitor,
	ReportData,
	ReportFeedbackPoint,
	ReportNeighbour,
	ReportReplyDraft,
	ReportReviewGroup,
} from '../interfaces/report-data.interface.js';
import { ReportBuiltEvent } from '../persisted-events/report-built.persisted-event.js';
import { ToolRun } from '../tools/tool-run.js';
import { checkAnalysis } from '../util/analysis-check.js';
import { reachPromptInput } from '../util/reach.js';
import { observe, pickInvestigated, type ReportHistoryMonth } from '../util/report-observations.js';
import { runPlaybook } from '../util/report-playbooks.js';
import { ratingBenchmarkSentence } from '../util/rating-benchmark.js';
import { replyCandidates } from '../util/reply-drafts.js';
import { type PromptScope, sectionsOutput, toSections, trimForSections } from '../util/report-sections.js';
import {
	articleTitle,
	compareMonths,
	NeighbourPost,
	ratingTrend,
	selectNearbyCreators,
	summarizeCompetitor,
	summarizePrevious,
	summarizeReport,
	type SummaryReview,
} from '../util/summarize-report.js';

import { ReportCityService } from './report-city.service.js';
import { type EvidenceBuild, ReportEvidenceService } from './report-evidence.service.js';
import { ReportReachService } from './report-reach.service.js';
import { ReportSignalsService, signalsPromptInput } from './report-signals.service.js';
import { ReportConfigService } from './report-config.service.js';

const creatorKey = (platform: string, author: string) => `${platform}:${author.toLowerCase()}`;

/** Topic counts as the model should quote them, largest first: `{ food: '19 of 34 written reviews (56%)' }`. */
const shares = (counts: Record<string, number>, total: number, unit: string) =>
	Object.fromEntries(
		_.sortBy(Object.entries(counts), ([, n]) => -n).map(([topic, n]) => [
			topic,
			`${n} of ${total} ${unit} (${total ? Math.round((n / total) * 100) : 0}%)`,
		]),
	);

/**
 * Theme counts the same way, keyed "price / price increase"; the topics' catch-all themes are
 * left out (the topic counts carry them). Undefined when the counts are (a point without a theme).
 */
const themeShares = (counts: Record<string, number> | undefined, total: number, unit: string) =>
	counts &&
	shares(
		Object.fromEntries(
			Object.entries(counts)
				.filter(([theme]) => isFeedbackTheme(theme) && !FEEDBACK_THEMES[theme].label.endsWith(', other') && theme !== 'other')
				.map(([theme, n]) => [feedbackThemeLabel(theme as keyof typeof FEEDBACK_THEMES), n]),
		),
		total,
		unit,
	);

/** "price / price increase: prices went up", or the topic for a point without a theme. */
const pointLine = (p: ReportFeedbackPoint) => `${p.theme ? feedbackThemeLabel(p.theme) : p.topic}: ${p.detail}`;

const reviewGroupInput = (group: ReportReviewGroup) => ({
	reviews: group.count,
	writtenReviews: group.written,
	praisingTopic: shares(group.praise, group.written, 'written reviews'),
	criticisingTopic: shares(group.complaints, group.written, 'written reviews'),
	praisingTheme: themeShares(group.praiseThemes, group.written, 'written reviews'),
	criticisingTheme: themeShares(group.complaintThemes, group.written, 'written reviews'),
	whatTheyPraised: group.praiseDetails.map(pointLine),
	whatTheyCriticised: group.complaintDetails.map(pointLine),
});

@Injectable()
export class ReportService {
	private readonly logger = new Logger(ReportService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly reportHighlightsAgent: ReportHighlightsAgent,
		private readonly reviewReplyAgent: ReviewReplyAgent,
		private readonly competitorService: CompetitorService,
		private readonly pgBossService: PgBossService,
		private readonly reportCityService: ReportCityService,
		private readonly cityDayService: CityDayService,
		private readonly reportSignalsService: ReportSignalsService,
		private readonly reportReachService: ReportReachService,
		private readonly brandService: BrandService,
		private readonly reportConfigService: ReportConfigService,
		private readonly reportAnalysisAgent: ReportAnalysisAgent,
		private readonly reportEvidenceService: ReportEvidenceService,
	) {}

	/**
	 * Builds (or rebuilds) a brand's reports on its branches in a city (or, `cityId` null, in
	 * every city: `Brand.reportScope` `all`) for a month, flushed: one per active configuration of
	 * the brand, or the default template's when it has none (`ReportConfigService.targets`), and
	 * only `configId`'s when given. The data and the reply drafts are computed once and stored
	 * whole on each; each report keeps a copy of its sections and gets its own highlights, written
	 * from only the data those sections show (`trimForSections`). LLM calls side by side: one
	 * highlights call per report and one reply-drafts call. `peerBrandIds` are the month's report
	 * brands the city section compares it with (the pipeline passes them; else the month's
	 * reports). Posts, reviews and the other brand-wide sections cover every open branch covered;
	 * each branch's place figures (busyness, open tables, prices, search ranks, neighbourhood,
	 * rating trend, Google details) go in its own `ReportData.branches` entry. A report across
	 * cities has no city section and no calendar: one city's peers don't compare with a brand in
	 * several. The analysis ("what moved, and why it might have") is computed once before the
	 * highlights, which quote it where a configuration shows the section; it never fails the
	 * build. 400 when there is no open branch.
	 */
	async buildAll(
		brandId: string,
		cityId: string | null,
		month: string,
		{ peerBrandIds, configId }: { peerBrandIds?: string[]; configId?: string } = {},
	): Promise<Report[]> {
		const targets = await this.reportConfigService.targets(brandId, configId);
		const { data, branches, city, cityNames } = await this.compute(brandId, cityId, month, { peerBrandIds });
		const [first] = branches;
		const { brand } = first;
		const analysis = await this.analyse(await this.evidenceBuild(branches, city, month, data), cityNames.join(', '));
		const [replyDrafts, ...highlights] = await Promise.all([
			this.draftReplies(branches, month, data),
			...targets.map(target => {
				const trimmed = trimForSections(data, target.sections);
				return this.reportHighlightsAgent.generate(
					JSON.stringify(this.highlightsInput(trimmed.data, trimmed.scope, analysis)),
					{ cityName: cityNames.join(', ') },
				);
			}),
		]);
		data.reviews.replyDrafts = replyDrafts;

		const reports: Report[] = [];
		for (const [i, target] of targets.entries()) {
			const report =
				(await this.em.findOne(Report, { brand, city: city ?? null, month, config: target.config ?? null })) ??
				this.em.create(Report, { brand, city, month, data, highlights: highlights[i].object });
			report.data = data;
			report.config = target.config;
			report.template = target.template;
			report.name = target.name;
			// A copy: the configuration's own objects stay its own
			report.sections = toSections(sectionsOutput(target.sections));
			report.highlights = highlights[i].object;
			report.analysis = analysis;
			report.postCount = data.social.postCount;
			report.reviewCount = data.reviews.count;
			reports.push(report);
		}
		await this.em.flush();
		this.logger.log(
			`Built ${month} ${targets.map(t => `"${t.name}"`).join(', ')} of ${brand.name} in ${city?.name ?? `all its cities (${cityNames.join(', ')})`}`,
		);
		// The outreach side mails each to a brand that subscribed
		for (const report of reports)
			await this.pgBossService.publish(ReportBuiltEvent.eventName, new ReportBuiltEvent({ reportId: report.id }));
		return reports;
	}

	/** `buildAll`, returning the first report it built (the brand's oldest active configuration's, or the default). */
	async build(...args: Parameters<ReportService['buildAll']>): Promise<Report> {
		return (await this.buildAll(...args))[0];
	}

	/**
	 * A report's data as a build would compute it now, without the two LLM calls (no highlights,
	 * no reply drafts) and without saving: what a rebuild would show, and how a change to the
	 * readers is checked against the stored data. 400 when there is no open branch.
	 */
	async compute(
		brandId: string,
		cityId: string | null,
		month: string,
		{ peerBrandIds }: { peerBrandIds?: string[] } = {},
	): Promise<{ data: ReportData; branches: Venue[]; city: City | null; cityNames: string[] }> {
		const branches =
			cityId ? await this.brandService.branchesIn(brandId, cityId) : await this.brandService.openBranches(brandId);
		if (!branches.length)
			throw new BadRequestException(cityId ? 'The brand has no open branch in the city' : 'The brand has no open branch');
		await this.em.populate(branches, ['city', 'brand', 'brand.branches']);
		const [first] = branches;
		const city = cityId ? first.city : null;
		const cityNames = _.uniq(branches.map(b => b.city.name));
		const data = await this.collect(branches, month, city);
		if (city) data.city = await this.reportCityService.section(branches, month, peerBrandIds);
		if (cityNames.length === 1) data.context = await this.cityDayService.month(first.city.id, month);
		// The relations over every branch's reviews, and the competitors' open tables and busyness
		const correlations = await this.reportSignalsService.correlations(branches, month, first.city.timezone, data);
		if (correlations) data.correlations = correlations;
		const competitors = await this.reportSignalsService.competitorSignals(data.competitors, month);
		if (competitors) data.competitors = competitors;
		// Each branch's place figures, read one after another (they share the entity manager)
		for (const [i, branch] of branches.entries()) await this.placeFigures(branch, data.branches[i], month, data);
		// Each branch's all-time rating against its district's and its kind of food's venues
		const benchmarks = await this.reportCityService.ratingBenchmarks(branches);
		for (const [i, branch] of branches.entries()) {
			const benchmark = benchmarks?.get(branch.id);
			if (benchmark) data.branches[i].ratingBenchmark = benchmark;
		}
		// Own accounts, comments, press and the review platforms, when scraped
		Object.assign(data, await this.reportReachService.sections(branches, month, data, city));
		return { data, branches, city, cityNames };
	}

	/** A brand's newest report (of any city), or null when it has none. */
	async latest(brandId: string): Promise<Report | null> {
		return this.em.findOne(
			Report,
			{ brand: brandId },
			{ orderBy: { month: QueryOrder.DESC, updatedAt: QueryOrder.DESC }, populate: ['city'] },
		);
	}

	/** Every reply draft a brand's reports hold, by Google review id (the newest report's wins). */
	async replyDrafts(brandId: string): Promise<Map<string, string>> {
		const rows: { review_id: string; draft: string }[] = await this.em.getConnection().execute(
			`select d->>'reviewId' as review_id, d->>'draft' as draft
			from reports r, jsonb_array_elements(coalesce(r.data->'reviews'->'replyDrafts', '[]'::jsonb)) d
			where r.brand_id = ? order by r.month asc`,
			[brandId],
		);
		return new Map(rows.filter(r => r.review_id && r.draft).map(r => [r.review_id, r.draft]));
	}

	/**
	 * A brand's reports, newest month first: of one city (`cityId`), the reports across all its
	 * cities (`cityId: null`), or every one (absent): the portal's archive and its trend series.
	 * `withData: false` leaves the big `data` column out.
	 */
	async forBrand(
		brandId: string,
		{ withData = true, fromMonth, cityId }: { withData?: boolean; fromMonth?: string; cityId?: string | null } = {},
	): Promise<Report[]> {
		return (await this.em.find(
			Report,
			{
				brand: brandId,
				...(cityId !== undefined && { city: cityId }),
				...(fromMonth && { month: { $gte: fromMonth } }),
			},
			{
				populate: ['brand', 'city'],
				orderBy: { month: QueryOrder.DESC },
				...(withData ? {} : { exclude: ['data'] as const }),
			},
		)) as Report[];
	}

	/** One report with its brand and city, or null. */
	async get(id: string): Promise<Report | null> {
		return this.em.findOne(Report, { id }, { populate: ['brand', 'city'] });
	}

	/**
	 * Runs the analysis again on a report's stored data (the observations, their checks, the
	 * agent and the check), writing it on every report of that build (the brand's reports of the
	 * month in that city share one data), flushed. The highlights are not rewritten: a rebuild
	 * does that. 404 for an unknown report, 400 when the brand has no open branch any more.
	 */
	async analyseAgain(reportId: string): Promise<Report> {
		const report = await this.em.findOneOrFail(Report, { id: reportId }, { populate: ['brand', 'city'] });
		const cityId = report.city?.id ?? null;
		const branches =
			cityId ? await this.brandService.branchesIn(report.brand.id, cityId) : await this.brandService.openBranches(report.brand.id);
		if (!branches.length) throw new BadRequestException('The brand has no open branch to analyse');
		await this.em.populate(branches, ['city', 'brand']);
		const cityNames = _.uniq(branches.map(b => b.city.name)).join(', ');
		const analysis = await this.analyse(await this.evidenceBuild(branches, report.city ?? null, report.month, report.data), cityNames);
		const siblings = await this.em.find(Report, { brand: report.brand, city: cityId, month: report.month });
		for (const sibling of siblings) sibling.analysis = analysis;
		report.analysis = analysis;
		await this.em.flush();
		return report;
	}

	/** The build's inputs for the analysis: the data, the month before's stored report and the months before it. */
	private async evidenceBuild(branches: Venue[], city: City | null, month: string, data: ReportData): Promise<EvidenceBuild> {
		const { brand } = branches[0];
		const before = previousMonth(monthRange(month).start);
		const beforeReport = await this.em.findOne(Report, { brand, city: city ?? null, month: before });
		const history = await this.history(brand.id, city?.id ?? null, before);
		return { branches, city, month, data, ...(beforeReport && { previousData: beforeReport.data }), history };
	}

	/**
	 * The brand's earlier months from its stored reports in a city (or across cities), oldest
	 * first, `count` at most before `beforeMonth`: the figures the observations draw as a series.
	 * One row per month (every configuration's report carries the same data).
	 */
	async history(brandId: string, cityId: string | null, beforeMonth: string, count = 5): Promise<ReportHistoryMonth[]> {
		const rows: { month: string; social: ReportData['social'] | null; reviews: ReportData['reviews'] | null; own_accounts: ReportData['ownAccounts'] | null }[] =
			await this.em.getConnection().execute(
				`select distinct on (month) month, data->'social' as social, data->'reviews' as reviews, data->'ownAccounts' as own_accounts
				from reports where brand_id = ? and city_id is not distinct from ? and month < ?
				order by month desc, updated_at desc limit ?`,
				[brandId, cityId, beforeMonth, count],
			);
		return rows.reverse().map(r => ({
			month: r.month,
			...(r.social && { social: _.pick(r.social, ['postCount', 'views', 'creators']) }),
			...(r.reviews?.count && { reviews: _.pick(r.reviews, ['count', 'written', 'avgStars', 'replyRate']) }),
			...(r.own_accounts?.length && {
				followers: r.own_accounts.flatMap(a =>
					a.followers === undefined ? [] : [{ platform: a.platform, handle: a.handle, followers: a.followers }],
				),
			}),
		}));
	}

	/**
	 * "What moved, and why it might have": the observations found in code with their checks, then
	 * one capped agent call with the evidence tools for the top ones, then the line-by-line check.
	 * A failing agent never fails the build: the investigations fall back to the observations'
	 * own sentences and the trace says why.
	 */
	private async analyse(build: EvidenceBuild, cityName: string): Promise<ReportAnalysis> {
		const started = Date.now();
		const trace: ReportAnalysisTrace = { model: ANALYSIS_MODEL, steps: [], toolCalls: 0, problems: [], durationMs: 0 };
		try {
			return await this.investigate(build, cityName, trace, started);
		} catch (e) {
			// Reading the evidence or finding the moves failed: the report still builds
			this.logger.warn(`Analysis for ${build.data.brand.name} ${build.month} failed: ${(e as Error).message}`);
			return {
				builtAt: new Date().toISOString(),
				observations: [],
				investigations: [],
				trace: { ...trace, error: (e as Error).message, durationMs: Date.now() - started },
			};
		}
	}

	private async investigate(build: EvidenceBuild, cityName: string, trace: ReportAnalysisTrace, started: number): Promise<ReportAnalysis> {
		const ctx = await this.reportEvidenceService.context(build);
		const { data } = build;
		const observations: ReportObservation[] = observe({
			data,
			previousData: build.previousData,
			history: build.history,
			timeZone: ctx.timeZone,
		}).map(o => ({ ...o, checks: runPlaybook(o, ctx) }));
		const done = (investigations: ReportAnalysis['investigations']): ReportAnalysis => ({
			builtAt: new Date().toISOString(),
			observations,
			investigations,
			trace: { ...trace, durationMs: Date.now() - started },
		});
		if (!observations.length) {
			trace.skipped = data.previous ? 'no notable move' : 'no previous month';
			return done([]);
		}

		// The top moves, one of each sibling group (posts, views and creators rising together are one story)
		const asked = pickInvestigated(observations, MAX_INVESTIGATIONS);
		const input = this.analysisInput(data, asked);
		const run = new ToolRun();
		const tools = this.reportEvidenceService.tools(ctx, run);
		let answer: ReportAnalysisAnswer | null = null;
		try {
			const res = await this.reportAnalysisAgent.generate(
				JSON.stringify(input),
				{ cityName, tools },
				{ abortSignal: AbortSignal.timeout(ANALYSIS_TIMEOUT_MS) },
			);
			answer = res.object ?? null;
			// What Mastra reports past the object; a mocked agent gives none of it
			const full = res as Partial<{
				totalUsage: ReportAnalysisTrace['usage'];
				usage: ReportAnalysisTrace['usage'];
				reasoningText: string;
				steps: unknown[];
			}>;
			const usage = full.totalUsage ?? full.usage;
			if (usage) trace.usage = _.pick(usage, ['inputTokens', 'outputTokens', 'totalTokens']);
			if (full.reasoningText) trace.reasoning = full.reasoningText.slice(0, 4_000);
			if (full.steps?.length) trace.modelSteps = full.steps.length;
			if (answer?.notes) trace.notes = answer.notes;
		} catch (e) {
			trace.error = (e as Error).message;
			this.logger.warn(`Analysis for ${data.brand.name} ${data.month} failed: ${trace.error}`);
		}
		trace.steps = run.calls;
		trace.toolCalls = run.ran;
		const investigations = checkAnalysis(answer, asked, [input, ...run.given], (where, problem) =>
			trace.problems.push({ where, problem }),
		);
		return done(investigations);
	}

	/** The agent's user message: who, when, the observations with their checks, the calendar and last month's actions. */
	private analysisInput(data: ReportData, observations: ReportObservation[]) {
		const chain = data.branches.length > 1;
		return {
			venue: {
				name: data.brand.name,
				category: data.brand.category,
				...(!chain && { district: data.branches[0].district }),
				places: data.branches.map(b => ({ id: b.venueId, name: b.name, street: b.street, district: b.district })),
			},
			month: monthName(data.month),
			previousMonth: data.previous ? monthName(data.previous.month) : undefined,
			observations: observations.map(o => _.omit(o, ['score', 'related'])),
			context: {
				cityCalendar: data.context,
				actionsSuggestedLastMonth: data.previous?.actions,
			},
		};
	}

	private async collect(branches: Venue[], month: string, city: City | null): Promise<ReportData> {
		const [first] = branches;
		const brand = first.brand;
		const cityIds = _.uniq(branches.map(b => b.city.id));
		// Read one after another: they share the entity manager
		const competitors: ReportCompetitor[] = [];
		for (const competitor of await this.competitorService.inCities(brand.id, cityIds)) {
			const [first] = competitor.venues;
			const data = summarizeReport({
				...(await this.monthInput(first, month, {
					branches: competitor.venues,
					// A rival brand: all its posts in the cities, under its name
					brandWide: !!competitor.link.rival,
					name: competitor.name,
				})),
			});
			const reviewsTracked =
				(await this.em.count(Review, { venue: { $in: competitor.venues.map(v => v.id) } })) > 0;
			const branch = competitor.branch;
			competitors.push({
				...summarizeCompetitor(data, reviewsTracked),
				...(competitor.link.rival && { branches: competitor.venues.length }),
				...(branch && {
					branchId: branch.id,
					against: branch.street ? `${branch.name}, ${branch.street}` : branch.name,
				}),
			});
		}

		// The month before, on the same pure summary: its numbers cost no LLM call
		const before = previousMonth(new Date(`${month}-01T00:00:00Z`));
		const beforeReport = await this.em.findOne(Report, { brand, city: city ?? null, month: before });
		const previous = summarizePrevious(
			summarizeReport(await this.monthInput(first, before, { branches, brandWide: true })),
			beforeReport?.highlights.actions,
		);

		const input = await this.monthInput(first, month, { branches, brandWide: true });
		const brandAuthors = new Set(input.mentions.filter(m => m.author).map(m => creatorKey(m.platform, m.author!)));
		const { venue: _subject, ...summary } = summarizeReport({
			...input,
			competitors,
			creatorsNearby: selectNearbyCreators(await this.nearbyPosts(branches, month), brandAuthors),
			previous,
		});
		// Posts by others in the brand's figures that named no branch
		const named = new Set(input.mentions.filter(m => !m.brandOnly).map(m => m.postId));
		const categories = _.countBy(branches.map(b => b.category).filter(Boolean));
		const category = _.maxBy(Object.keys(categories), c => categories[c]);
		return {
			brand: {
				id: brand.id,
				name: brand.name,
				...(category && { category }),
				brandOnlyPosts: summary.posts.filter(p => !named.has(p.postId)).length,
			},
			branches: await this.branchRows(branches, month, !city),
			...summary,
		};
	}

	/**
	 * Each branch's own month (the posts that named it, not the ones naming only the brand, and
	 * its reviews, cut down like a competitor), where it is, its Google details, its rating trend
	 * and its district's neighbours. The place sections come after (`placeFigures`).
	 */
	private async branchRows(branches: Venue[], month: string, acrossCities: boolean): Promise<ReportBranch[]> {
		const rows: ReportBranch[] = [];
		for (const branch of branches) {
			const own = summarizeReport(await this.monthInput(branch, month, { branches: [branch] }));
			const figures = _.pick(summarizeCompetitor(own, true), [
				'venueId',
				'name',
				'category',
				'district',
				'rating',
				'reviewsCount',
				'social',
				'reviews',
			]);
			const snapshots = await this.em.find(
				VenueSnapshot,
				{ venue: branch },
				{ orderBy: { snapshotDate: QueryOrder.ASC } },
			);
			rows.push({
				...figures,
				...(branch.street && { street: branch.street }),
				...(acrossCities && { city: branch.city.name }),
				...(branch.googleUrl && { googleUrl: branch.googleUrl }),
				...(branch.details?.amenities && { amenities: offeredAmenities(branch.details) }),
				...(branch.details?.reviewsDistribution && { reviewsDistribution: branch.details.reviewsDistribution }),
				ratingTrend: ratingTrend(snapshots, month),
				neighbours: branch.district ? await this.neighbours(branch, month) : [],
			});
		}
		return rows;
	}

	/**
	 * A branch's place sections, in place: its busyness, open tables and prices (against the
	 * competitors picked for the whole brand or for it), its search ranks and neighbourhood.
	 */
	private async placeFigures(branch: Venue, row: ReportBranch, month: string, data: ReportData): Promise<void> {
		Object.assign(
			row,
			await this.reportSignalsService.placeSections(branch, month, {
				posts: data.posts,
				reviews: row.reviews,
				dishes: data.dishes,
				competitors: data.competitors.filter(c => !c.branchId || c.branchId === branch.id),
			}),
		);
		const neighbourhood = await this.reportCityService.neighbourhood(branch, month);
		if (neighbourhood) row.neighbourhood = neighbourhood;
		const searchRanks = await this.reportCityService.searchRanks(branch, month);
		if (searchRanks) row.searchRanks = searchRanks;
	}

	/** Posts about district neighbours of every branch (each post and neighbour once). */
	private async nearbyPosts(branches: Venue[], month: string): Promise<NeighbourPost[]> {
		const posts: NeighbourPost[] = [];
		for (const district of _.uniqBy(
			branches.filter(b => b.district),
			b => `${b.city.id}:${b.district}`,
		))
			posts.push(...(await this.neighbourPosts(district, month)));
		return _.uniqBy(posts, p => `${p.postId}:${p.venueName}`);
	}

	/**
	 * Replies to the month's unanswered written reviews, critical first. A failed call leaves
	 * the report without drafts rather than failing it.
	 */
	private async draftReplies(
		branches: Venue[],
		month: string,
		data: ReportData,
	): Promise<ReportReplyDraft[]> {
		const { start, end } = monthRange(month);
		const candidates = replyCandidates(
			await this.em.find(Review, {
				venue: { $in: branches.map(b => b.id) },
				publishedAt: { $gte: start, $lt: end },
			}),
		);
		if (!candidates.length) return [];
		try {
			const res = await this.reviewReplyAgent.generate(
				JSON.stringify({
					venue: {
						name: data.brand.name,
						category: data.brand.category,
						...(data.branches.length === 1 && { district: data.branches[0].district }),
					},
					praisedThisMonth: Object.keys(data.reviews.praise).filter(t => t !== 'other'),
					topDishes: data.dishes.slice(0, 5).map(d => d.name),
					reviews: candidates.map(r => ({
						reviewId: r.reviewId,
						stars: r.stars,
						language: r.language,
						// The original words: the reply goes in the guest's language
						text: r.text || r.textTranslated,
					})),
				}),
			);
			const byId = new Map(res.object.replies.map(r => [r.reviewId, r.reply.trim()]));
			return candidates
				.filter(r => byId.get(r.reviewId))
				.map(r => ({ reviewId: r.reviewId, draft: byId.get(r.reviewId)! }));
		} catch (e) {
			this.logger.warn(`Reply drafts for ${data.brand.name} failed: ${(e as Error).message}`);
			return [];
		}
	}

	/**
	 * Non-promotional posts this month about other food venues in the venue's district, its
	 * brand's branches left out.
	 */
	private async neighbourPosts(venue: Venue, month: string): Promise<NeighbourPost[]> {
		const { start, end } = monthRange(month);
		const rows: {
			post_id: string;
			platform: 'tiktok' | 'instagram' | 'blog';
			url: string;
			author: string;
			author_fans: number | null;
			views: number;
			venue_name: string;
			own: boolean;
			category: string | null;
		}[] = await this.em.getConnection().execute(
			`select distinct p.id as post_id, p.platform, p.url, p.author, p.author_fans, p.views,
					v.name as venue_name, ${ownPostSql('p', 'v.brand_id')} as own, v.category
				from mentions m
				join social_posts p on p.id = m.post_id
				join venues v on v.id = m.venue_id
				where v.city_id = ? and v.district = ? and v.brand_id <> ?
					and p.posted_at >= ? and p.posted_at < ?
					and p.author is not null and not p.is_ad and p.is_promotional is not true`,
			[venue.city.id, venue.district, venue.brand.id, start, end],
		);
		return rows.map(r => ({
			postId: r.post_id,
			platform: r.platform,
			url: r.url,
			author: r.author,
			authorFans: r.author_fans,
			views: Number(r.views),
			venueName: r.venue_name,
			own: r.own,
			category: r.category,
		}));
	}

	/**
	 * The mentions and reviews of the month, as `summarizeReport` takes them, of `branches`
	 * (the venue alone by default): with `brandWide`, every mention of the venue's brand in posts
	 * of the branches' cities, the ones naming only the brand too; else only the mentions that
	 * named one of the branches. `name` overrides the venue's name (a rival brand's).
	 */
	private async monthInput(
		venue: Venue,
		month: string,
		{ branches = [venue], brandWide = false, name }: { branches?: Venue[]; brandWide?: boolean; name?: string } = {},
	) {
		const { start, end } = monthRange(month);
		const ids = branches.map(b => b.id);
		const mentions = await this.em.find(
			Mention,
			brandWide ?
				{
						brand: venue.brand.id,
						post: { city: { $in: _.uniq(branches.map(b => b.city.id)) }, postedAt: { $gte: start, $lt: end } },
					}
			:	{ venue: { $in: ids }, post: { postedAt: { $gte: start, $lt: end } } },
			{ populate: ['post', 'post.account', 'feedback'] },
		);
		// Newest first, so the details a review group quotes first are always the same ones
		const reviews = await this.em.find(
			Review,
			{ venue: { $in: ids }, publishedAt: { $gte: start, $lt: end } },
			{ populate: ['feedback'], orderBy: { publishedAt: 'desc', id: 'asc' } },
		);

		return {
			venue: {
				id: venue.id,
				name: name ?? venue.name,
				category: venue.category ?? undefined,
				district: venue.district ?? undefined,
				rating: venue.rating ?? undefined,
				reviewsCount: venue.reviewsCount ?? undefined,
			},
			month,
			mentions: mentions.map(m => ({
				postId: m.post.id,
				platform: m.post.platform,
				url: m.post.url,
				title: articleTitle(m.post.platform, m.post.text),
				author: m.post.author,
				authorFans: m.post.authorFans,
				own: m.post.account?.brand?.id === venue.brand.id,
				postedAt: m.post.postedAt,
				views: m.post.views,
				likes: m.post.likes,
				comments: m.post.comments,
				saves: m.post.saves,
				shares: m.post.shares,
				isAd: m.post.isAd,
				isPromotional: m.post.isPromotional,
				visited: m.visited,
				sentiment: m.sentiment,
				summary: m.summary,
				feedback: m.feedback.getItems(),
				brandOnly: !m.venue,
			})),
			reviews: reviews.map(
				(r): SummaryReview => ({
					reviewId: r.reviewId,
					publishedAt: r.publishedAt,
					language: r.language,
					stars: r.stars,
					text: r.text,
					textTranslated: r.textTranslated,
					ownerResponse: r.ownerResponse,
					feedback: r.feedback.getItems(),
				}),
			),
		};
	}

	/**
	 * Other food venues talked about this month in the same district, its brand's branches left
	 * out: posts by others, each once per venue (a post can name a venue twice), as in their own reports.
	 */
	private async neighbours(venue: Venue, month: string): Promise<ReportNeighbour[]> {
		const rows: {
			venue_id: string;
			name: string;
			category: string | null;
			posts: number;
			views: string;
		}[] = await this.em.getConnection().execute(
			`select v.id as venue_id, v.name, v.category, count(*)::int as posts, sum(vp.views) as views
				from (
					select distinct m.venue_id, p.id, p.views
						from mentions m
						join social_posts p on p.id = m.post_id
						join venues v on v.id = m.venue_id
						where v.city_id = ? and v.district = ? and v.brand_id <> ?
							and to_char(p.posted_at at time zone 'UTC', 'YYYY-MM') = ?
							and not ${ownPostSql('p', 'v.brand_id')}
				) vp
				join venues v on v.id = vp.venue_id
				group by v.id order by sum(vp.views) desc limit 40`,
			[venue.city.id, venue.district, venue.brand.id, month],
		);
		return rows
			.filter(r => isFoodVenue(r.category))
			.slice(0, 8)
			.map(r => ({
				venueId: r.venue_id,
				name: r.name,
				category: r.category ?? undefined,
				posts: r.posts,
				views: Number(r.views),
			}));
	}

	private highlightsInput(data: ReportData, scope: PromptScope, analysis?: ReportAnalysis) {
		const chain = data.branches.length > 1;
		const previous = compareMonths(data);
		return {
			venue: {
				name: data.brand.name,
				category: data.brand.category,
				...(!chain && _.pick(data.branches[0], ['district', 'rating'])),
			},
			month: data.month,
			previousMonth: previous && {
				...previous,
				socialMedia: scope.social ? previous.socialMedia : undefined,
				googleReviews: scope.reviews ? previous.googleReviews : undefined,
			},
			cityCalendar: data.context,
			// The month's notable moves with their possible reasons, as the analysis section shows them
			whatMovedAndWhy:
				scope.analysis && analysis ?
					analysis.investigations.slice(0, scope.analysis).map(i => ({
						whatHappened: i.whatHappened,
						possibleReasons: i.hypotheses.map(h => `${h.confidence}: ${h.reason}`),
						cannotTell: i.cannotTell,
						worthChecking: i.worthChecking,
					}))
				:	undefined,
			// The brand's relations over every branch; each place's own sentences are in places
			demandAndPrices: signalsPromptInput({ correlations: data.correlations }),
			reachAndPress: reachPromptInput(data),
			socialMedia: scope.social ? {
				postsByOthers: data.social.postCount,
				ofWhichPromotional: data.social.promotional,
				..._.pick(data.social, [
					'tiktokCount',
					'instagramCount',
					'views',
					'creators',
					'sentiment',
				]),
				postsPraisingTopic: shares(data.social.praise, data.social.postCount, 'posts'),
				postsCriticisingTopic: shares(
					data.social.complaints,
					data.social.postCount,
					'posts',
				),
				postsPraisingTheme: themeShares(data.social.praiseThemes, data.social.postCount, 'posts'),
				postsCriticisingTheme: themeShares(
					data.social.complaintThemes,
					data.social.postCount,
					'posts',
				),
				posts: data.posts.map(p =>
					_.pick(p, [
						'platform',
						'author',
						'authorFans',
						'views',
						'sentiment',
						'summary',
						'praise',
						'complaints',
						'promotional',
						'visited',
					]),
				),
				topDishes: data.dishes.slice(0, 8),
			} : undefined,
			ownPosts: data.ownPosts.length ? {
				note: 'Posted by the venue itself, not word of mouth',
				count: data.ownPosts.length,
				views: _.sumBy(data.ownPosts, p => p.views),
			} : undefined,
			googleReviews: scope.reviews ? {
				..._.pick(data.reviews, ['count', 'avgStars', 'replyRate', 'stars', 'critical']),
				writtenReviews: data.reviews.written,
				reviewsPraisingTopic: shares(
					data.reviews.praise,
					data.reviews.written,
					'written reviews',
				),
				reviewsCriticisingTopic: shares(
					data.reviews.complaints,
					data.reviews.written,
					'written reviews',
				),
				reviewsPraisingTheme: themeShares(
					data.reviews.praiseThemes,
					data.reviews.written,
					'written reviews',
				),
				reviewsCriticisingTheme: themeShares(
					data.reviews.complaintThemes,
					data.reviews.written,
					'written reviews',
				),
				fiveStarReviews: scope.stars ? reviewGroupInput(data.reviews.split.fiveStar) : undefined,
				reviewsBelowFiveStars: scope.stars ? reviewGroupInput(data.reviews.split.belowFive) : undefined,
				// One entry per review, so the model counts reviews rather than changes
				reviewsNoticingChanges: data.reviews.changes,
			} : undefined,
			topCreators: data.creators.map(c =>
				_.pick(c, ['author', 'platform', 'authorFans', 'posts', 'views', 'promotional']),
			),
			nearbyCreatorsWhoDidNotPostAboutYou: data.creatorsNearby.map(c => ({
				author: c.author,
				platform: c.platform,
				followers: c.authorFans,
				postedAbout: c.venues,
			})),
			// Every place on its own: never sum or average these across places
			places: data.branches.map(b => {
				const competitors = data.competitors.filter(c => !c.branchId || c.branchId === b.venueId);
				return {
					name: b.name,
					district: b.district,
					street: b.street,
					city: b.city,
					googleRatingAllTime: b.rating,
					// One pre-written sentence: its rating against its district's and its kind of food's venues
					googleRatingAgainstOthers: b.ratingBenchmark && ratingBenchmarkSentence(b.ratingBenchmark),
					// All-time Google figures at the close of each month, oldest first
					googleRatingTrend:
						b.ratingTrend.length >= 2 ?
							b.ratingTrend.map(p => _.pick(p, ['month', 'rating', 'reviewsCount']))
						:	undefined,
					// A chain's branch: the posts that named it and its reviews
					...(chain && scope.branches && {
						postsByOthersNamingIt: b.social.postCount,
						views: b.social.views,
						googleReviews:
							b.reviews.written >= 5 ?
								{
									count: b.reviews.count,
									writtenReviews: b.reviews.written,
									avgStars: b.reviews.avgStars,
									replyRate: b.reviews.replyRate,
									reviewsPraisingTopic: shares(b.reviews.praise, b.reviews.written, 'written reviews'),
									reviewsCriticisingTopic: shares(b.reviews.complaints, b.reviews.written, 'written reviews'),
								}
							:	`${b.reviews.count} reviews: too few written to compare`,
					}),
					demandAndPrices: signalsPromptInput({ ...b, competitors }),
					neighbours: b.neighbours.map(n => _.pick(n, ['name', 'category', 'posts', 'views'])),
					googleMapsSearchRanks: b.searchRanks?.map(r => ({
						search: r.query,
						yourPlace: r.rank ?? `not in the top ${r.results}`,
						earlierMonths: r.history.map(h => ({
							month: h.month,
							place: h.rank ?? 'not in the results',
						})),
						topThree: r.top.slice(0, 3).map(t => (t.isVenue ? `${t.name} (you)` : t.name)),
					})),
					// Seen by our Google Maps scrapes, so "first seen", not an opening date; an
					// opening with `source: posts` is one a creator's post announced
					openingsAndClosuresNearbyThisQuarter: b.neighbourhood && {
						district: b.neighbourhood.changes.district,
						..._.pick(b.neighbourhood.changes, ['opened', 'openedFromPosts', 'closed', 'reopened']),
						onYourStreet: b.neighbourhood.changes.street,
						venues: b.neighbourhood.changes.venues
							.slice(0, 6)
							.map(v => _.pick(v, ['name', 'category', 'kind', 'sameStreet', 'source'])),
					},
				};
			}),
			city: data.city && {
				name: data.city.cityName,
				risingCuisines: data.city.risingCuisines.map(r => ({
					cuisine: r.label,
					shareOfCityMentions: `${r.prevShare}% → ${r.share}%`,
				})),
				risingDishes: data.city.risingDishes.map(r => ({
					dish: r.label,
					shareOfPostsAndReviewsNamingADish: `${r.prevShare}% → ${r.share}%`,
				})),
				yourKindOfFood: data.city.cuisine && {
					cuisine: data.city.cuisine.label,
					venuesMentionedForIt: data.city.cuisine.venues,
					yourPlaceByViews: data.city.cuisine.rank,
					shareOfCityMentions:
						data.city.cuisine.share !== undefined ?
							`${data.city.cuisine.prevShare}% → ${data.city.cuisine.share}%`
						:	undefined,
				},
				// Google search interest (0–100, the term's own 12-month peak) against mention share
				googleSearchesByCuisine: data.city.searches?.map(r => ({
					cuisine: r.label,
					searches:
						r.searchChange !== undefined ?
							`${r.prevInterest} → ${r.interest} (${r.searchChange >= 0 ? '+' : ''}${Math.round(r.searchChange * 100)}%)`
						:	`${r.interest}`,
					shareOfCityMentions:
						r.share !== undefined && r.prevShare !== undefined ?
							`${r.prevShare}% → ${r.share}%`
						:	undefined,
				})),
				// Pre-written: the model quotes the shares, never computes them
				complaintThemesAgainstReportVenues: data.city.themes?.map(
					t =>
						`${t.label.toLowerCase()} was criticised in ${Math.round(t.venueShare * 100)}% of your written reviews; ` +
						`${Math.round(t.median * 100)}% at the month's report venues (median of ${t.venues})`,
				),
				youAgainstThisMonthsReportVenues: {
					venuesCompared: data.city.baseline.venues,
					..._.mapValues(
						_.pick(data.city.baseline, ['posts', 'views', 'avgStars', 'replyRate']),
						m => ({
							you: m.venue,
							median: m.median,
							youAreAheadOfPercent: m.percentile,
						}),
					),
				},
			},
			// A chain: posts and reviews above cover every branch; each branch's own month is in places
			brand: chain && scope.branches ? { name: data.brand.name, postsNamingNoBranch: data.brand.brandOnlyPosts } : undefined,
			competitors: data.competitors.map(c => ({
				name: c.name,
				// A chain's places together; one picked for a branch compares with that branch only
				wholeChainOfPlaces: c.branches,
				comparedWithYourBranch: c.against,
				category: c.category,
				googleRatingAllTime: c.rating,
				socialMedia: {
					postsByOthers: c.social.postCount,
					views: c.social.views,
					creators: c.social.creators,
				},
				googleReviews:
					c.reviewsTracked ?
						{
							count: c.reviews.count,
							writtenReviews: c.reviews.written,
							avgStars: c.reviews.avgStars,
							replyRate: c.reviews.replyRate,
							reviewsPraisingTopic: shares(
								c.reviews.praise,
								c.reviews.written,
								'written reviews',
							),
							reviewsCriticisingTopic: shares(
								c.reviews.complaints,
								c.reviews.written,
								'written reviews',
							),
						}
					:	'not tracked: do not compare reviews with this one',
			})),
		};
	}
}
