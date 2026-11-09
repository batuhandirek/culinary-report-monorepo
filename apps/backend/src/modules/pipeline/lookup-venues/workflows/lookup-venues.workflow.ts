import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { stepBudgetUsd } from 'src/modules/cities/util/city.js';
import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { durableNow } from 'src/modules/durable-workflows/util/durable-steps.js';
import { MentionMatchingService } from 'src/modules/social/services/mention-matching.service.js';
import { VenueScrapeSourceEnum } from 'src/modules/venues/constants/venue-status.constant.js';
import {
	LOOKUP_RESULTS_PER_NAME,
	VenueScrapeService,
} from 'src/modules/venues/services/venue-scrape.service.js';

import { type PlacesResult, PlacesWorkflow } from '../../atoms/places/workflows/places.workflow.js';
import { PipelineStepEnum } from '../../constants/pipeline.constant.js';
import {
	matchCityNow,
	MatchMentionsWorkflow,
} from '../../match-mentions/workflows/match-mentions.workflow.js';
import { OSM_PLACES_MONTH } from '../../osm-places/constants/osm-places.constant.js';
import { OsmPlacesWorkflow } from '../../osm-places/workflows/osm-places.workflow.js';
import { SCRAPE_BLOGS_MONTH } from '../../scrape-blogs/constants/scrape-blogs.constant.js';
import { ScrapeBlogsWorkflow } from '../../scrape-blogs/workflows/scrape-blogs.workflow.js';
import { SCRAPE_INSTAGRAM_MONTH } from '../../scrape-instagram/constants/scrape-instagram.constant.js';
import { ScrapeInstagramWorkflow } from '../../scrape-instagram/workflows/scrape-instagram.workflow.js';
import { SCRAPE_TIKTOK_MONTH } from '../../scrape-tiktok/constants/scrape-tiktok.constant.js';
import { ScrapeTiktokWorkflow } from '../../scrape-tiktok/workflows/scrape-tiktok.workflow.js';
import { SCRAPE_VENUES_MONTH } from '../../scrape-venues/constants/scrape-venues.constant.js';
import { ScrapeVenuesWorkflow } from '../../scrape-venues/workflows/scrape-venues.workflow.js';
import { runOperation, workflowName } from '../../shared/util/operations.js';

/** What the plan step says: the names to search, and what the run may spend */
interface LookupPlan {
	cityName: string;
	queries: string[];
	budgetUsd: number;
}

/**
 * The places posts named that no venue matched, searched on Google Maps (a name only once it is
 * `LOOKUP_RETRY_MONTHS` stale), and matched again. A month's run looks up what the month's scrapes
 * named, against the quarter's Places list and OpenStreetMap's (`LookupVenuesWeekWorkflow` is the
 * week's). Whatever it depends on, it calls; the posts are read and matched first. The search is
 * one `places.run` on the city's grid, `LOOKUP_RESULTS_PER_NAME` places a name.
 */
@Injectable()
export class LookupVenuesWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly venueScrapeService: VenueScrapeService,
		private readonly mentionMatchingService: MentionMatchingService,
		private readonly places: PlacesWorkflow,
		private readonly scrapeVenues: ScrapeVenuesWorkflow,
		private readonly osmPlaces: OsmPlacesWorkflow,
		private readonly scrapeTiktok: ScrapeTiktokWorkflow,
		private readonly scrapeInstagram: ScrapeInstagramWorkflow,
		private readonly scrapeBlogs: ScrapeBlogsWorkflow,
		private readonly matchMentions: MatchMentionsWorkflow,
	) {}

	@DurableWorkflow({ name: workflowName('lookup-venues', 'month') })
	@EnsureRequestContext()
	async month(cityId: string, month: string) {
		// The venues to match against, and the month's posts
		await runOperation(
			this.durable,
			this.scrapeVenues.month,
			SCRAPE_VENUES_MONTH,
			cityId,
			month,
		);
		await runOperation(this.durable, this.osmPlaces.month, OSM_PLACES_MONTH, cityId, month);
		await runOperation(
			this.durable,
			this.scrapeTiktok.month,
			SCRAPE_TIKTOK_MONTH,
			cityId,
			month,
		);
		await runOperation(
			this.durable,
			this.scrapeInstagram.month,
			SCRAPE_INSTAGRAM_MONTH,
			cityId,
			month,
		);
		await runOperation(this.durable, this.scrapeBlogs.month, SCRAPE_BLOGS_MONTH, cityId, month);
		return this.lookUpAndMatch(cityId);
	}

	/**
	 * Read and matched; the names nothing matched planned, searched (a `places.run` child) and
	 * recorded; then matched again against what the search found. The week's workflow calls it too.
	 */
	async lookUpAndMatch(cityId: string) {
		await matchCityNow(this.durable, this.matchMentions, cityId);
		const now = await durableNow(this.durable);
		const plan = await this.planLookups(cityId, now);
		const found =
			plan.queries.length ?
				await this.places.call({
					cityId,
					search: {
						mode: 'grid',
						queries: plan.queries,
						perQuery: LOOKUP_RESULTS_PER_NAME,
					},
					maxCostUsd: plan.budgetUsd,
					purpose: `google-places lookup ${plan.cityName}: ${plan.queries.length} names`,
					save: { source: VenueScrapeSourceEnum.LOOKUP, newPlaces: 'food-in-city' },
				})
			:	null;
		const lookedUp = await this.recordLookups(cityId, plan.queries, found, now);
		const matched = await matchCityNow(this.durable, this.matchMentions, cityId);
		return { lookedUp, matched };
	}

	/** Every unmatched name, most posted first, then views, then likes; the ones searched lately dropped, `LOOKUP_MAX_NAMES` a run */
	@DurableStep({ name: 'plan lookups' })
	private async planLookups(cityId: string, now: Date): Promise<LookupPlan> {
		const city = await this.cityService.getById(cityId);
		const names = await this.mentionMatchingService.unmatchedNames(city.id);
		const { queries } = await this.venueScrapeService.planLookups(city, names, now);
		return {
			cityName: city.name,
			queries,
			budgetUsd: stepBudgetUsd(city, PipelineStepEnum.LOOKUP_VENUES),
		};
	}

	/** The searched names stamped (`VenueLookup`), with what the run saved */
	@DurableStep({ name: PipelineStepEnum.LOOKUP_VENUES })
	private async recordLookups(
		cityId: string,
		queries: string[],
		found: PlacesResult | null,
		now: Date,
	): Promise<{ lookedUp: number; retried: number; saved: number }> {
		if (!queries.length || !found) return { lookedUp: 0, retried: 0, saved: 0 };
		const recorded = await this.venueScrapeService.recordLookups(
			await this.cityService.getById(cityId),
			queries,
			found.byQuery,
			now,
		);
		return { ...recorded, saved: found.saved };
	}
}
