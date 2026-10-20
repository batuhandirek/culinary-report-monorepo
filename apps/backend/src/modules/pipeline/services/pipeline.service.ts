import { QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import {
	apifyRunContext,
	processShutdown,
	ShuttingDownError,
} from 'src/modules/apify/util/apify-run-context.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { stepBudgetUsd } from 'src/modules/cities/util/city.js';
import { ProspectQueryService } from 'src/modules/outreach/services/prospect-query.service.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { ReportService } from 'src/modules/reports/services/report.service.js';
import { AccountMatchingService } from 'src/modules/social/services/account-matching.service.js';
import { MentionExtractionService } from 'src/modules/social/services/mention-extraction.service.js';
import { MentionMatchingService } from 'src/modules/social/services/mention-matching.service.js';
import { OwnAccountService } from 'src/modules/social/services/own-account.service.js';
import { PostCommentService } from 'src/modules/social/services/post-comment.service.js';
import { SocialScrapeService } from 'src/modules/social/services/social-scrape.service.js';
import { SearchInterestService } from 'src/modules/trends/services/search-interest.service.js';
import { Brand, BrandReportScopeEnum } from 'src/modules/venues/entities/brand.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { BrandLeadScoreService } from 'src/modules/venues/services/brand-lead-score.service.js';
import { CompetitorService } from 'src/modules/venues/services/competitor.service.js';
import { ReviewService } from 'src/modules/venues/services/review.service.js';
import { TripadvisorReviewService } from 'src/modules/venues/services/tripadvisor-review.service.js';
import { VenueBusynessService } from 'src/modules/venues/services/venue-busyness.service.js';
import { VenueDeliveryService } from 'src/modules/venues/services/venue-delivery.service.js';
import { VenueReservationService } from 'src/modules/venues/services/venue-reservation.service.js';
import { VenueScrapeService } from 'src/modules/venues/services/venue-scrape.service.js';
import { VenueSearchRankService } from 'src/modules/venues/services/venue-search-rank.service.js';
import { WebMentionService } from 'src/modules/venues/services/web-mention.service.js';
import { reservationUrlOf } from 'src/modules/venues/util/reservations.js';

import {
	MONTHLY_STEPS,
	PipelineStepEnum,
	RESERVATION_SAMPLE_MAX_VENUES,
	REVIEW_WATCH_DAYS,
} from '../constants/pipeline.constant.js';
import {
	PipelineRun,
	PipelineRunParams,
	PipelineRunStatusEnum,
} from '../entities/pipeline-run.entity.js';
import { RunPipelineJob } from '../jobs/run-pipeline.job.js';
import { INSTAGRAM_RECENT_DAYS } from '../util/monthly-schedule.js';
import { isPaidStep, latestStepStates, SKIPPED_RESULT } from '../util/step-states.js';


// The share of SCRAPE_REVIEWS' budget for TripAdvisor: reviews cost $0.40 per 1k there
const TRIPADVISOR_BUDGET_SHARE = 0.1;

/**
 * A brand a month's run covers in a city: its open branches there, the most reviewed first.
 * `venue` is that first one, the branch its report's place-bound sections describe.
 */
export interface TopBrand {
	brand: Brand;
	branches: Venue[];
	venue: Venue;
}

@Injectable()
export class PipelineService {
	private readonly logger = new Logger(PipelineService.name);
	// Runs this process is working on: a boot-time recovery never queues them again
	readonly executing = new Set<string>();

	constructor(
		private readonly em: EntityManager,
		private readonly pgBossService: PgBossService,
		private readonly venueScrapeService: VenueScrapeService,
		private readonly competitorService: CompetitorService,
		private readonly reviewService: ReviewService,
		private readonly socialScrapeService: SocialScrapeService,
		private readonly mentionExtractionService: MentionExtractionService,
		private readonly mentionMatchingService: MentionMatchingService,
		private readonly reportService: ReportService,
		private readonly brandLeadScoreService: BrandLeadScoreService,
		private readonly prospectQueryService: ProspectQueryService,
		private readonly cityService: CityService,
		private readonly ownAccountService: OwnAccountService,
		private readonly accountMatchingService: AccountMatchingService,
		private readonly postCommentService: PostCommentService,
		private readonly webMentionService: WebMentionService,
		private readonly tripadvisorReviewService: TripadvisorReviewService,
		private readonly venueBusynessService: VenueBusynessService,
		private readonly venueReservationService: VenueReservationService,
		private readonly venueDeliveryService: VenueDeliveryService,
		private readonly venueSearchRankService: VenueSearchRankService,
		private readonly searchInterestService: SearchInterestService,
		private readonly brandService: BrandService,
	) {}

	/**
	 * Records a run for a city and queues it. The queue runs one at a time, never retried: steps
	 * cost money.
	 */
	async queue(
		cityId: string,
		step: PipelineStepEnum,
		month: string,
		params: PipelineRunParams = {},
	): Promise<PipelineRun> {
		const run = this.em.create(PipelineRun, {
			city: await this.cityService.getById(cityId),
			step,
			month,
			params,
			status: PipelineRunStatusEnum.QUEUED,
		});
		await this.em.flush();
		await this.pgBossService.sendJob(
			RunPipelineJob.jobName,
			new RunPipelineJob({ pipelineRunId: run.id }),
		);
		return run;
	}

	/** Wakes the worker: it works through every queued run, oldest first. */
	async wake(pipelineRunId: string): Promise<void> {
		await this.pgBossService.sendJob(RunPipelineJob.jobName, new RunPipelineJob({ pipelineRunId }));
	}

	/** Queues a run again that a backend restart cut short; it goes on after its last finished step. */
	async resume(pipelineRunId: string): Promise<void> {
		const em = this.em.fork();
		const run = await em.findOneOrFail(PipelineRun, pipelineRunId);
		run.status = PipelineRunStatusEnum.QUEUED;
		run.resumes += 1;
		await em.flush();
		await this.pgBossService.sendJob(
			RunPipelineJob.jobName,
			new RunPipelineJob({ pipelineRunId: run.id }),
		);
	}

	/**
	 * Gives the month's report brands that have no competitors their five best suggestions. An
	 * admin's explicit bulk action, not a step: competitors never change on their own.
	 */
	async fillCompetitors(cityId: string, month: string, top?: number) {
		const city = await this.cityService.getById(cityId);
		const ids = (await this.topBrands(city, month, top)).map(t => t.brand.id);
		return { brands: ids.length, ...(await this.competitorService.fill(ids, city.id)) };
	}

	/**
	 * The city's brands a month's scrapes and reports cover: the `top` (the city's `topBrands` by
	 * default) most talked about by others, plus every won prospect with a branch in the city
	 * whatever its rank, since the report is what they pay for. A lost or opted-out prospect still
	 * gets one when it ranks: only outreach stops. Each with its open branches in the city.
	 */
	async topBrands(city: City, month: string, top = city.topBrands): Promise<TopBrand[]> {
		const [ranked, won] = await Promise.all([
			this.mentionMatchingService.topBrandIds(month, top, city.id),
			this.prospectQueryService.wonBrandIds(),
		]);
		const ids = [...new Set([...ranked, ...won])];
		if (ids.length === 0) return [];
		const branches = await this.em.find(
			Venue,
			{ brand: { $in: ids }, city, closed: false },
			{ populate: ['brand', 'brand.branches'], orderBy: { reviewsCount: QueryOrder.DESC_NULLS_LAST, id: QueryOrder.ASC } },
		);
		const byBrand = _.groupBy(branches, v => v.brand.id);
		// Ranked first, in rank order, then the subscribers outside the top
		return ids
			.filter(id => byBrand[id])
			.map(id => ({ brand: byBrand[id][0].brand, branches: byBrand[id], venue: byBrand[id][0] }));
	}

	/**
	 * The city's open venues in the order `SAMPLE_RESERVATIONS`' cap cuts them: won brands'
	 * branches, the month's other report brands' branches, their competitors, then the rest by
	 * their brand's lead score (in tens). Each band is shuffled, so Google sees no fixed order
	 * from one run to the next. Venues without a booking link come last: the run counts them as
	 * `noPlatform`.
	 */
	async reservationVenues(city: City, month: string, top = city.topBrands): Promise<Venue[]> {
		const [won, report] = await Promise.all([
			this.prospectQueryService.wonBrandIds(),
			this.topBrands(city, month, top),
		]);
		const reportIds = report.map(t => t.brand.id);
		const competitorIds = await this.competitorService.competitorVenueIdsOf([...new Set([...won, ...reportIds])], city.id);
		const venues = await this.em.find(
			Venue,
			{ city, closed: false },
			{ orderBy: [{ brand: { leadScore: QueryOrder.DESC_NULLS_LAST } }, { id: QueryOrder.ASC }] },
		);
		const [linked, unlinked] = _.partition(venues, v => reservationUrlOf(v));
		const band = (venue: Venue) =>
			won.includes(venue.brand.id) ? 0
			: reportIds.includes(venue.brand.id) ? 1
			: competitorIds.includes(venue.id) ? 2
			: 3;
		const bands = _.groupBy(linked, band);
		// The rest keep their lead-score order between groups of ten, shuffled inside each
		return [
			...[0, 1, 2, 3].flatMap(b =>
				b < 3 ? _.shuffle(bands[b] ?? []) : _.chunk(bands[b] ?? [], 10).flatMap(chunk => _.shuffle(chunk)),
			),
			...unlinked,
		];
	}

	/** The city's open branches of won brands: the subscribers the weekly review watch covers. */
	async subscribedVenues(city: City): Promise<Venue[]> {
		const won = await this.prospectQueryService.wonBrandIds();
		if (won.length === 0) return [];
		return this.em.find(Venue, { brand: { $in: won }, city, closed: false });
	}

	/**
	 * Whether every other monthly-cron city the brand has an open branch in has finished the
	 * month's reports (a `MONTHLY` or `BUILD_REPORTS` run of the month that succeeded): then
	 * `city`'s run is the last, and builds the brand's report across its cities. The queue runs one
	 * run at a time, so two cities never decide at once.
	 */
	private async otherCitiesDone(brand: Brand, city: City, month: string): Promise<boolean> {
		const cron = new Set((await this.cityService.forMonthlyCron()).map(c => c.id));
		const others = (await this.brandService.citiesOf(brand.id)).filter(c => c.id !== city.id && cron.has(c.id));
		for (const other of others) {
			const done = await this.em.count(PipelineRun, {
				city: other,
				month,
				step: { $in: [PipelineStepEnum.MONTHLY, PipelineStepEnum.BUILD_REPORTS] },
				status: PipelineRunStatusEnum.SUCCEEDED,
			});
			if (!done) return false;
		}
		return true;
	}

	/** The steps that succeeded for the run's city and month in the other runs. */
	private async succeededSteps(run: PipelineRun): Promise<Set<PipelineStepEnum>> {
		const others = await this.em.find(PipelineRun, { city: run.city, month: run.month, id: { $ne: run.id } });
		return new Set(
			[...latestStepStates(others).values()].filter(a => a.state === 'succeeded').map(a => a.step),
		);
	}

	/**
	 * The run the queue works on next: the oldest queued one. A pg-boss job only wakes the worker,
	 * so a run resumed after a restart (queued again, created earlier) goes before the runs queued
	 * after it, and steps keep the order an admin queued them in.
	 */
	async nextQueuedRunId(): Promise<string | undefined> {
		const [next] = await this.em.fork().find(
			PipelineRun,
			{ status: PipelineRunStatusEnum.QUEUED },
			{ orderBy: { createdAt: QueryOrder.ASC }, limit: 1, fields: ['id'] },
		);
		return next?.id;
	}

	/**
	 * Runs a queued run's steps in order. Each step's result is stored as it finishes, under
	 * `"<n>. <STEP>"`, so a run resumed after a restart skips the steps it already finished; the
	 * step it was in runs again and re-attaches to the Apify runs it had started
	 * (`apifyRunContext`), so nothing is paid twice.
	 */
	async execute(pipelineRunId: string): Promise<void> {
		const run = await this.em.findOneOrFail(PipelineRun, { id: pipelineRunId }, { populate: ['city'] });
		if (run.status !== PipelineRunStatusEnum.QUEUED || this.executing.has(run.id)) return;
		this.executing.add(run.id);
		try {
			await this.executeClaimed(run);
		} finally {
			this.executing.delete(run.id);
		}
	}

	private async executeClaimed(run: PipelineRun): Promise<void> {
		run.status = PipelineRunStatusEnum.RUNNING;
		run.startedAt ??= new Date();
		run.result ??= {};
		await this.em.flush();

		const steps = run.step === PipelineStepEnum.MONTHLY ? MONTHLY_STEPS : [run.step];
		// "Finish the month": the paid steps that already succeeded for it are not paid again; the
		// free ones (extraction, matching, analysis, reports, scores) run, as new data came in
		const done =
			run.step === PipelineStepEnum.MONTHLY && run.params?.onlyMissing ?
				await this.succeededSteps(run)
			:	new Set<PipelineStepEnum>();
		try {
			for (const [index, step] of steps.entries()) {
				// The same step can run twice in the monthly sequence: keep both results
				const key = `${index + 1}. ${step}`;
				if (run.result && key in run.result) continue;
				// Left RUNNING: the next process resumes it from here
				if (processShutdown.requested) return;
				if (done.has(step) && isPaidStep(step)) {
					run.result = { ...run.result, [key]: SKIPPED_RESULT };
					await this.em.flush();
					continue;
				}
				this.logger.log(`Run ${run.id}: ${step} for ${run.city.name}, ${run.month}`);
				const result = await apifyRunContext.run({ pipelineRunId: run.id, stepKey: key }, () =>
					this.runStep(
						run.city,
						step,
						run.month,
						run.step === PipelineStepEnum.MONTHLY ? {} : (run.params ?? {}),
					),
				);
				// A step that ended during a shutdown may have swallowed a refused Apify run (a
				// failed search "yields nothing"): not recorded, so it runs again and re-attaches
				if (processShutdown.requested) return;
				run.result = { ...run.result, [key]: result ?? null };
				await this.em.flush();
			}
			run.status = PipelineRunStatusEnum.SUCCEEDED;
		} catch (e) {
			if (e instanceof ShuttingDownError || processShutdown.requested) {
				this.logger.warn(`Run ${run.id} stopped by the shutdown; the next process resumes it`);
				return;
			}
			run.status = PipelineRunStatusEnum.FAILED;
			run.error = (e as Error).message;
			this.logger.error(`Run ${run.id} failed: ${run.error}`);
		}
		run.finishedAt = new Date();
		await this.em.flush();
	}

	private async runStep(
		city: City,
		step: PipelineStepEnum,
		month: string,
		params: PipelineRunParams,
	): Promise<unknown> {
		const budgetUsd = params.budgetUsd ?? stepBudgetUsd(city, step);
		const top = params.top ?? city.topBrands;
		const since = `${month}-01T00:00:00.000Z`;
		const topBrands = () => this.topBrands(city, month, top);
		// Each top brand's described branch: what the place-bound steps sample
		const described = async () => (await topBrands()).map(t => t.venue);

		switch (step) {
			case PipelineStepEnum.SCRAPE_VENUES:
				return this.venueScrapeService.scrapeCity({
					city,
					terms: ['restaurant', 'bar', 'cafe'],
					maxPerTerm: 1000,
					budgetUsd,
				});
			case PipelineStepEnum.SEARCH_BRANCHES:
				return this.brandService.searchCity(city, budgetUsd);
			case PipelineStepEnum.SCRAPE_TIKTOK:
				return this.socialScrapeService.scrapeCityTikTok({
					city,
					since,
					perSource: 100,
					budgetUsd,
				});
			case PipelineStepEnum.SCRAPE_INSTAGRAM:
				return this.socialScrapeService.scrapeCityInstagram({
					city,
					since,
					perSource: 300,
					budgetUsd,
				});
			case PipelineStepEnum.SCRAPE_INSTAGRAM_RECENT:
				// The daily cron: each hashtag's newest page of posts, whatever the run's month
				return this.socialScrapeService.scrapeCityInstagram({
					city,
					since: new Date(Date.now() - INSTAGRAM_RECENT_DAYS * 24 * 3600 * 1000).toISOString(),
					perSource: 100,
					budgetUsd,
					kinds: ['posts'],
				});
			case PipelineStepEnum.EXTRACT_MENTIONS:
				return this.mentionExtractionService.extract({ limit: 5000, cityId: city.id });
			case PipelineStepEnum.MATCH_MENTIONS:
				// Mentions to venues, then authors to the brands they are the own accounts of: the
				// posts by others that rank brands leave those out
				return {
					...(await this.mentionMatchingService.match({ cityId: city.id })),
					accounts: await this.accountMatchingService.match(city),
				};
			case PipelineStepEnum.LOOKUP_VENUES:
				return this.venueScrapeService.lookupNames(
					city,
					await this.mentionMatchingService.unmatchedNames(city.id, 500),
					budgetUsd,
				);
			case PipelineStepEnum.SCRAPE_VENUE_SOCIAL:
				// One search per brand, by its name
				return this.socialScrapeService.scrapeVenueSocial({
					city,
					venues: await described(),
					since,
					perVenue: 30,
					budgetUsd,
				});
			case PipelineStepEnum.SCRAPE_REVIEWS: {
				// Every branch (a chain's report compares them) and the competitors, inside the same
				// budget. A tenth goes to the described branches' TripAdvisor side (pages found once,
				// then the month). `params.since` starts the Google side earlier, to backfill the
				// months before
				const brands = await topBrands();
				const branchIds = brands.flatMap(t => t.branches.map(v => v.id));
				const competitorIds = await this.competitorService.competitorVenueIdsOf(
					brands.map(t => t.brand.id),
					city.id,
				);
				const venues = brands.map(t => t.venue);
				const tripadvisorBudget = budgetUsd * TRIPADVISOR_BUDGET_SHARE;
				const pages = await this.tripadvisorReviewService.findPages(city, venues, tripadvisorBudget / 2);
				return {
					saved: await this.reviewService.scrapeMonth(
						month,
						_.uniq([...branchIds, ...competitorIds]),
						budgetUsd - tripadvisorBudget,
						new Date(),
						params.since,
					),
					branches: branchIds.length - brands.length,
					competitors: competitorIds.length,
					tripadvisor: {
						...pages,
						saved: await this.tripadvisorReviewService.scrapeMonth(
							month,
							venues.map(v => v.id),
							tripadvisorBudget / 2,
						),
					},
				};
			}
			case PipelineStepEnum.ANALYSE_REVIEWS:
				return { analysed: await this.reviewService.analyseMonth(month) };
			case PipelineStepEnum.REFRESH_VENUE_DETAILS: {
				// Every report branch and the competitors: the report compares hours and amenities
				const brands = await topBrands();
				const competitorIds = await this.competitorService.competitorVenueIdsOf(
					brands.map(t => t.brand.id),
					city.id,
				);
				const competitors = await this.em.find(Venue, { id: { $in: competitorIds } }, { fields: ['placeId'] });
				return {
					...(await this.venueScrapeService.refreshDetails(
						[...brands.flatMap(t => t.branches), ...competitors].map(v => v.placeId),
						budgetUsd,
					)),
					competitors: competitors.length,
				};
			}
			case PipelineStepEnum.SCRAPE_OWN_ACCOUNTS: {
				// The report brands' accounts (matched by MATCH_MENTIONS) and outreach's handles, then
				// one profile scrape each
				const ids = (await topBrands()).map(t => t.brand.id);
				const fromProspects = await this.ownAccountService.addProspectHandles(
					await this.prospectQueryService.instagramHandles(ids),
				);
				return {
					fromProspects: fromProspects.created,
					...(await this.ownAccountService.scrapeMonth(ids, month, budgetUsd)),
				};
			}
			case PipelineStepEnum.SCRAPE_COMMENTS:
				// The top five TikTok posts of each report brand, 100 top-level comments each at most:
				// they come most liked first, and the report reads shares and repeated questions
				return this.socialScrapeService.scrapeComments(
					await this.postCommentService.topPosts(
						(await topBrands()).map(t => t.brand),
						city.id,
						month,
						5,
					),
					100,
					budgetUsd,
				);
			case PipelineStepEnum.ANALYSE_COMMENTS:
				return this.postCommentService.analyse(city);
			case PipelineStepEnum.SCRAPE_PRESS:
				return {
					...(await this.webMentionService.searchMonth(city, await described(), month, budgetUsd)),
					...(await this.webMentionService.classifyMonth(city, month)),
				};
			case PipelineStepEnum.TRACK_SEARCH_RANKS:
				return this.venueSearchRankService.track(city, month, await described(), budgetUsd);
			case PipelineStepEnum.SEARCH_INTEREST: {
				// The city's top cuisines, and the names of the subscribers with a branch in the city
				const won = await this.prospectQueryService.wonBrandIds();
				const brands = await this.em.find(Brand, { id: { $in: won }, branches: { city, closed: false } });
				return this.searchInterestService.pull(city.id, month, { brands, budgetUsd });
			}
			case PipelineStepEnum.BUILD_REPORTS: {
				let built = 0;
				let acrossCities = 0;
				let waiting = 0;
				const brands = await topBrands();
				// Each report's city baseline compares it with the month's other report brands
				const peerBrandIds = brands.map(t => t.brand.id);
				for (const { brand } of brands) {
					if (brand.reportScope === BrandReportScopeEnum.ALL) {
						// One report across its cities, built by the last of their runs
						if (!(await this.otherCitiesDone(brand, city, month))) {
							waiting++;
							continue;
						}
						await this.reportService.build(brand.id, null, month);
						acrossCities++;
						continue;
					}
					await this.reportService.build(brand.id, city.id, month, { peerBrandIds });
					built++;
				}
				return { built, acrossCities, waiting };
			}
			case PipelineStepEnum.WATCH_REVIEWS: {
				// Subscribers only: their last ten days of reviews, then an alert per new critical one
				const ids = (await this.subscribedVenues(city)).map(v => v.id);
				const since = new Date(Date.now() - REVIEW_WATCH_DAYS * 24 * 60 * 60 * 1000);
				const saved = await this.reviewService.scrapeRecent(ids, since, budgetUsd);
				const analysed = await this.reviewService.analyseRecent(ids, since);
				const alerted = await this.reviewService.claimAlerts(ids, since);
				return { venues: ids.length, saved, analysed, alerted };
			}
			case PipelineStepEnum.SCORE_LEADS:
				return this.brandLeadScoreService.scoreAll(month, city.id);
			case PipelineStepEnum.SAMPLE_BUSYNESS: {
				// The month's report brands' described branches (won prospects included) and their
				// competitors, sampled now
				const brands = await topBrands();
				const competitorIds = await this.competitorService.competitorVenueIdsOf(
					brands.map(t => t.brand.id),
					city.id,
				);
				const competitors = await this.em.find(Venue, { id: { $in: competitorIds } });
				return {
					...(await this.venueBusynessService.sample([...brands.map(t => t.venue), ...competitors], budgetUsd)),
					competitors: competitors.length,
				};
			}
			case PipelineStepEnum.SAMPLE_RESERVATIONS:
				// Every open venue with a booking page, subscribers first, up to the cap: the
				// report compares a venue's booked-out share with its competitors' and the district's
				return this.venueReservationService.sample(await this.reservationVenues(city, month, top), city, budgetUsd, {
					maxVenues: RESERVATION_SAMPLE_MAX_VENUES,
				});
			case PipelineStepEnum.SCRAPE_DELIVERY: {
				// The described branches and their competitors: the price block compares their menus
				const brands = await topBrands();
				const competitorIds = await this.competitorService.competitorVenueIdsOf(
					brands.map(t => t.brand.id),
					city.id,
				);
				const competitors = await this.em.find(Venue, { id: { $in: competitorIds } });
				return this.venueDeliveryService.scrape([...brands.map(t => t.venue), ...competitors], city, month, budgetUsd);
			}
			case PipelineStepEnum.MONTHLY:
				throw new Error('MONTHLY is a sequence, not a step');
		}
	}
}
