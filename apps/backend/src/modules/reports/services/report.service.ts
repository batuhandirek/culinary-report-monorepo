import { QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CityDayService } from 'src/modules/cities/services/city-day.service.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { Mention } from 'src/modules/social/entities/mention.entity.js';
import { ownPostSql } from 'src/modules/social/util/accounts.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import type { TopicIndex } from 'src/modules/topics/util/topics.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { VenueSnapshot } from 'src/modules/venues/entities/venue-snapshot.entity.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { CompetitorService } from 'src/modules/venues/services/competitor.service.js';
import { monthName, monthRange, previousMonth } from 'src/modules/venues/util/month.js';
import { offeredAmenities } from 'src/modules/venues/util/venue-details.js';
import { isFoodVenue } from 'src/modules/venues/util/venue-names.js';

import { ReportAnalysisAgent } from '../agents/report-analysis.agent.js';
import { ReportEditorAgent } from '../agents/report-editor.agent.js';
import { ReviewReplyAgent } from '../agents/review-reply.agent.js';
import { ANALYSIS_MODEL, ANALYSIS_TIMEOUT_MS, MAX_INVESTIGATIONS } from '../constants/report-analysis.constant.js';
import { EDITOR_MAX_TOOL_CALLS, EDITOR_MODEL, EDITOR_TIMEOUT_MS } from '../constants/report-editor.constant.js';
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
	ReportEditorTrace,
	ReportHighlights,
	ReportNeighbour,
	ReportReplyDraft,
} from '../interfaces/report-data.interface.js';
import type { EvidenceContext } from '../interfaces/report-evidence.interface.js';
import { ReportBuiltEvent } from '../persisted-events/report-built.persisted-event.js';
import { ToolRun } from '../tools/tool-run.js';
import { checkAnalysis } from '../util/analysis-check.js';
import { editorPack } from '../util/editor-pack.js';
import { checkHighlights, type EditorAnswer } from '../util/highlights-check.js';
import { observe, pickInvestigated, type ReportHistoryMonth } from '../util/report-observations.js';
import { runPlaybook } from '../util/report-playbooks.js';
import { replyCandidates } from '../util/reply-drafts.js';
import { type PromptScope, sectionsOutput, toSections, trimForSections } from '../util/report-sections.js';
import {
	articleTitle,
	NeighbourPost,
	ratingTrend,
	type ReportAspects,
	reportAspects,
	selectNearbyCreators,
	summarizeCompetitor,
	summarizePrevious,
	summarizeReport,
	type SummaryReview,
} from '../util/summarize-report.js';

import { ReportCityService } from './report-city.service.js';
import { type EvidenceBuild, ReportEvidenceService } from './report-evidence.service.js';
import { ReportReachService } from './report-reach.service.js';
import { ReportSignalsService } from './report-signals.service.js';
import { ReportConfigService } from './report-config.service.js';

const creatorKey = (platform: string, author: string) => `${platform}:${author.toLowerCase()}`;

/** What Mastra reports past the object; a mocked agent gives none of it. */
type FullGenerate = Partial<{
	totalUsage: ReportAnalysisTrace['usage'];
	usage: ReportAnalysisTrace['usage'];
	reasoningText: string;
	steps: unknown[];
}>;

@Injectable()
export class ReportService {
	private readonly logger = new Logger(ReportService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly reportEditorAgent: ReportEditorAgent,
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
		private readonly topicService: TopicService,
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
	 * written part; the editor reads it with the rest of the month's material (`editorPack`) and
	 * the same read tools, once per configuration, over only the data its sections show. Neither
	 * fails the build: a failing editor leaves the code-written fallback and the trace says why.
	 * 400 when there is no open branch.
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
		const cityName = cityNames.join(', ');
		const build = await this.evidenceBuild(branches, city, month, data);
		const ctx = await this.evidenceContext(build);
		const analysis = await this.analyse(build, ctx, cityName);
		// The vocabulary the editor names themes with: the context's, read again only when it failed
		const aspects = ctx?.aspects ?? (await this.topicService.index());
		const [replyDrafts, ...written] = await Promise.all([
			this.draftReplies(branches, month, data),
			...targets.map(target => {
				const trimmed = trimForSections(data, target.sections);
				return this.write(trimmed.data, trimmed.scope, analysis, ctx, cityName, aspects);
			}),
		]);
		data.reviews.replyDrafts = replyDrafts;

		const reports: Report[] = [];
		for (const [i, target] of targets.entries()) {
			const report =
				(await this.em.findOne(Report, { brand, city: city ?? null, month, config: target.config ?? null })) ??
				this.em.create(Report, { brand, city, month, data, highlights: written[i] });
			report.data = data;
			report.config = target.config;
			report.template = target.template;
			report.name = target.name;
			// A copy: the configuration's own objects stay its own
			report.sections = toSections(sectionsOutput(target.sections));
			report.highlights = written[i];
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
		// Read once per build: the aspect vocabulary the counts are keyed by, kept in the data
		const index = await this.topicService.index();
		const data = await this.collect(branches, month, city, index);
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
		const build = await this.evidenceBuild(branches, report.city ?? null, report.month, report.data);
		const analysis = await this.analyse(build, await this.evidenceContext(build), cityNames);
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
	 * What the analysis and the editor read beyond the data, loaded once per build; null when
	 * reading it failed (the analysis then records the error, the editor writes without tools).
	 */
	private async evidenceContext(build: EvidenceBuild): Promise<EvidenceContext | null> {
		try {
			return await this.reportEvidenceService.context(build);
		} catch (e) {
			this.logger.warn(`Evidence for ${build.data.brand.name} ${build.month} failed: ${(e as Error).message}`);
			return null;
		}
	}

	/**
	 * The written part: the editor's read of the month over the material and the read tools,
	 * then the line-by-line check. A failing agent never fails the build: the fallback stands in
	 * and the trace says why.
	 */
	private async write(
		data: ReportData,
		scope: PromptScope,
		analysis: ReportAnalysis,
		ctx: EvidenceContext | null,
		cityName: string,
		aspects: ReportAspects,
	): Promise<ReportHighlights> {
		const started = Date.now();
		const trace: ReportEditorTrace = { model: EDITOR_MODEL, steps: [], toolCalls: 0, problems: [], durationMs: 0 };
		const pack = editorPack(data, scope, aspects, analysis);
		const run = new ToolRun(EDITOR_MAX_TOOL_CALLS);
		const tools = ctx ? this.reportEvidenceService.tools(ctx, run) : {};
		let answer: EditorAnswer | null = null;
		try {
			const res = await this.reportEditorAgent.generate(
				JSON.stringify(pack),
				{ cityName, tools },
				{ abortSignal: AbortSignal.timeout(EDITOR_TIMEOUT_MS) },
			);
			answer = (res.object as EditorAnswer | undefined) ?? null;
			const full = res as FullGenerate;
			const usage = full.totalUsage ?? full.usage;
			if (usage) trace.usage = _.pick(usage, ['inputTokens', 'outputTokens', 'totalTokens']);
			if (full.steps?.length) trace.modelSteps = full.steps.length;
		} catch (e) {
			trace.error = (e as Error).message;
			this.logger.warn(`The editor for ${data.brand.name} ${data.month} failed: ${trace.error}`);
		}
		trace.steps = run.calls;
		trace.toolCalls = run.ran;
		const written = checkHighlights(answer, pack, [pack, ...run.given], (where, problem) =>
			trace.problems.push({ where, problem }),
		);
		return { ...written, trace: { ...trace, durationMs: Date.now() - started } };
	}

	/**
	 * "What moved, and why it might have": the observations found in code with their checks, then
	 * one capped agent call with the evidence tools for the top ones, then the line-by-line check.
	 * A failing agent never fails the build: the investigations fall back to the observations'
	 * own sentences and the trace says why.
	 */
	private async analyse(build: EvidenceBuild, ctx: EvidenceContext | null, cityName: string): Promise<ReportAnalysis> {
		const started = Date.now();
		const trace: ReportAnalysisTrace = { model: ANALYSIS_MODEL, steps: [], toolCalls: 0, problems: [], durationMs: 0 };
		try {
			if (!ctx) throw new Error('The evidence could not be read');
			return await this.investigate(build, ctx, cityName, trace, started);
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

	private async investigate(
		build: EvidenceBuild,
		ctx: EvidenceContext,
		cityName: string,
		trace: ReportAnalysisTrace,
		started: number,
	): Promise<ReportAnalysis> {
		const { data } = build;
		const observations: ReportObservation[] = observe({
			data,
			previousData: build.previousData,
			history: build.history,
			timeZone: ctx.timeZone,
			aspects: ctx.aspects,
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
			const full = res as FullGenerate;
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

	private async collect(branches: Venue[], month: string, city: City | null, index: TopicIndex): Promise<ReportData> {
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
				aspects: index,
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
			summarizeReport({ ...(await this.monthInput(first, before, { branches, brandWide: true })), aspects: index }),
			beforeReport?.highlights.actions,
		);

		const input = await this.monthInput(first, month, { branches, brandWide: true });
		const brandAuthors = new Set(input.mentions.filter(m => m.author).map(m => creatorKey(m.platform, m.author!)));
		const { venue: _subject, ...summary } = summarizeReport({
			...input,
			aspects: index,
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
			branches: await this.branchRows(branches, month, !city, index),
			...summary,
			aspects: reportAspects(index),
		};
	}

	/**
	 * Each branch's own month (the posts that named it, not the ones naming only the brand, and
	 * its reviews, cut down like a competitor), where it is, its Google details, its rating trend
	 * and its district's neighbours. The place sections come after (`placeFigures`).
	 */
	private async branchRows(branches: Venue[], month: string, acrossCities: boolean, index: TopicIndex): Promise<ReportBranch[]> {
		const rows: ReportBranch[] = [];
		for (const branch of branches) {
			const own = summarizeReport({ ...(await this.monthInput(branch, month, { branches: [branch] })), aspects: index });
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
		// A chain's reviews say which branch (its street, else its name), as the view labels places
		const branchLabels = new Map(branches.length > 1 ? branches.map(b => [b.id, b.street ?? b.name]) : []);

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
					...(branchLabels.has(r.venue.id) && { branch: branchLabels.get(r.venue.id) }),
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
}
