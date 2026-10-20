import { wrap } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import _ from 'lodash';

import { ExceptionCodes } from 'exceptions';

import { CityDayService } from 'src/modules/cities/services/city-day.service.js';
import { OutreachService } from 'src/modules/outreach/services/outreach.service.js';
import { Report } from 'src/modules/reports/entities/report.entity.js';
import { ReportService } from 'src/modules/reports/services/report.service.js';
import { BrandPostsService } from 'src/modules/social/services/brand-posts.service.js';
import { OwnAccountService } from 'src/modules/social/services/own-account.service.js';
import { Brand, BrandReportScopeEnum } from 'src/modules/venues/entities/brand.entity.js';
import { CompetitorPickedByEnum } from 'src/modules/venues/entities/brand-competitor.entity.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import {
	CompetitorService,
	type CompetitorTarget,
	MAX_COMPETITORS,
} from 'src/modules/venues/services/competitor.service.js';
import { ReviewService } from 'src/modules/venues/services/review.service.js';
import { VenueBusynessService } from 'src/modules/venues/services/venue-busyness.service.js';
import { VenueReservationService } from 'src/modules/venues/services/venue-reservation.service.js';
import { monthRange, previousMonth } from 'src/modules/venues/util/month.js';

import {
	PortalListCreatorsInputDto,
	PortalListPostsInputDto,
	PortalListReviewsInputDto,
	PortalUpdateSettingsInputDto,
} from '../dto/portal.input.dto.js';
import {
	PortalBrandOutputDto,
	PortalCompetitorsOutputDto,
	PortalCompetitorVenueOutputDto,
	PortalCreatorsOutputDto,
	PortalPostFiltersOutputDto,
	PortalPostOutputDto,
	PortalPostsOutputDto,
	PortalReviewFiltersOutputDto,
	PortalReviewOutputDto,
	PortalReviewsOutputDto,
	PortalSettingsOutputDto,
	PortalVenueOutputDto,
} from '../dto/portal.output.dto.js';
import { PortalPatternsOutputDto } from '../dto/portal-patterns.output.dto.js';
import { PortalSeriesOutputDto } from '../dto/portal-series.output.dto.js';
import { buildPatterns, PatternsReport } from '../util/portal-patterns.js';
import {
	addBooked,
	addBusyness,
	addOwnAccounts,
	buildSeries,
	monthWindow,
	SeriesReport,
} from '../util/portal-series.js';

/**
 * What a brand's portal reads and writes. Every method takes a brand the caller has already
 * been let into (`BrandAccessGuard`), and checks that what it is asked for belongs to it. The
 * portal covers every branch: reviews, posts and creators of all of them, reports per city.
 */
@Injectable()
export class PortalService {
	constructor(
		private readonly em: EntityManager,
		private readonly reportService: ReportService,
		private readonly outreachService: OutreachService,
		private readonly reviewService: ReviewService,
		private readonly brandPostsService: BrandPostsService,
		private readonly competitorService: CompetitorService,
		private readonly venueBusynessService: VenueBusynessService,
		private readonly cityDayService: CityDayService,
		private readonly ownAccountService: OwnAccountService,
		private readonly venueReservationService: VenueReservationService,
		private readonly brandService: BrandService,
	) {}

	/** The brand with its open branches (most reviewed first) and their cities (most branches first). */
	async brand(brandId: string): Promise<PortalBrandOutputDto> {
		const brand = await this.em.findOne(Brand, { id: brandId }, { populate: ['branches', 'branches.city'] });
		if (!brand) throw new NotFoundException();
		const open = _.orderBy(
			brand.branches.getItems().filter(v => !v.closed),
			[v => v.reviewsCount ?? -1, v => v.id],
			['desc', 'asc'],
		);
		const cities = await this.brandService.citiesOf(brandId);
		return {
			id: brand.id,
			name: brand.name,
			reportScope: brand.reportScope,
			branches: open.map(
				v => wrap(v).serialize({ skipNull: true, forceObject: true }) as unknown as PortalVenueOutputDto,
			),
			cities: cities.map(c => ({ id: c.id, name: c.name })),
		};
	}

	/** Every branch's id and how its reviews name it: a chain's carry the branch's street. */
	private async reviewVenues(brandId: string): Promise<Map<string, string>> {
		const venues = await this.em.find(Venue, { brand: brandId }, { fields: ['id', 'name', 'street'] });
		const label = (v: { name: string; street?: string | null }) =>
			venues.length > 1 && v.street ? `${v.name} · ${v.street}` : v.name;
		return new Map(venues.map(v => [v.id, label(v)]));
	}

	/**
	 * The reports a series or pattern reads and the branch their place-bound figures are: a
	 * brand reported across its cities reads those reports; else the city's (`cityId`, else the
	 * brand's first city). The branch is the one the newest report describes, else the most
	 * reviewed open one.
	 */
	private async place(brandId: string, cityId?: string): Promise<{ venue: Venue; reports: Report[] } | null> {
		const brand = await this.em.findOne(Brand, { id: brandId });
		if (!brand) return null;
		const acrossCities = brand.reportScope === BrandReportScopeEnum.ALL;
		const city = acrossCities ? null : (cityId ?? (await this.brandService.citiesOf(brandId))[0]?.id);
		if (city === undefined) return null;
		const reports = await this.reportService.forBrand(brandId, { cityId: city });
		// Stored reports may predate `venue`
		const described = reports[0]?.data.venue?.id;
		const branches =
			city ? await this.brandService.branchesIn(brandId, city) : await this.brandService.openBranches(brandId);
		const venue = branches.find(v => v.id === described) ?? branches[0];
		if (!venue) return null;
		await this.em.populate(venue, ['city']);
		return { venue, reports };
	}

	/** The brand's months, every city, newest first, without the report bodies. */
	async reports(brandId: string): Promise<Report[]> {
		return this.reportService.forBrand(brandId, { withData: false });
	}

	/** One of the brand's reports. Another brand's report id is refused, not hidden. */
	async report(brandId: string, reportId: string): Promise<Report> {
		const report = await this.reportService.get(reportId);
		if (!report) throw new NotFoundException();
		if (report.brand.id !== brandId) {
			throw new ForbiddenException({ code: ExceptionCodes.NO_BRAND_ACCESS });
		}
		return report;
	}

	/**
	 * The brand's last `count` months in a city, one row each, read from its stored reports. The
	 * window ends with the last finished month, or with a newer report when there is one.
	 */
	async series(
		brandId: string,
		count: number,
		cityId?: string,
		now = new Date(),
	): Promise<PortalSeriesOutputDto> {
		const place = await this.place(brandId, cityId);
		const reports = place?.reports ?? [];
		const last = [previousMonth(now), ...reports.map(report => report.month)].sort().at(-1)!;
		const months = monthWindow(last, count);
		const series = buildSeries(
			reports.filter(report => report.month >= months[0]) as SeriesReport[],
			months,
		);
		if (!place) return { ...addBusyness(series, []), calendar: [] };
		const { venue } = place;
		const busyness = await this.venueBusynessService.between(
			venue.id,
			monthRange(months[0]).start,
			monthRange(months.at(-1)!).end,
		);
		const calendar = await this.cityDayService.months(venue.city.id, months);
		addOwnAccounts(series, await this.ownAccountService.snapshots(brandId, venue.city.id, months));
		// Open tables: the branch's and its competitors', and its district's on the same evenings
		const samples = await this.venueReservationService.between(
			[venue.id, ...series.competitors.map(c => c.venueId)],
			`${months[0]}-01`,
			monthRange(months.at(-1)!).end.toISOString().slice(0, 10),
		);
		const ownDates = [...new Set(samples.filter(s => s.venue.id === venue.id).map(s => s.forDate))];
		const district =
			venue.district ?
				(await this.venueReservationService.cityEvenings(venue.city.id, ownDates, venue.id)).filter(
					e => e.district === venue.district,
				)
			:	[];
		addBooked(
			series,
			venue.id,
			samples.map(s => ({ ...s, venueId: s.venue.id })),
			district,
		);
		return { ...addBusyness(series, busyness), calendar };
	}

	/**
	 * The relations the brand's stored reports in a city hold, month by month, and its branch's
	 * weeks across those months (views, reviews, busyness, booked out). Same window as `series`;
	 * nothing is recomputed.
	 */
	async patterns(brandId: string, count: number, cityId?: string, now = new Date()): Promise<PortalPatternsOutputDto> {
		const place = await this.place(brandId, cityId);
		const reports = place?.reports ?? [];
		const last = [previousMonth(now), ...reports.map(report => report.month)].sort().at(-1)!;
		const months = monthWindow(last, count);
		// The first week may start in the month before the window
		const samples =
			place ?
				await this.venueBusynessService.between(
					place.venue.id,
					new Date(monthRange(months[0]).start.getTime() - 7 * 86_400_000),
					new Date(monthRange(months.at(-1)!).end.getTime() + 7 * 86_400_000),
				)
			:	[];
		return buildPatterns(
			reports.filter(report => months.includes(report.month)) as PatternsReport[],
			months,
			samples,
			place?.venue.city.timezone ?? 'UTC',
		);
	}

	async settings(brandId: string): Promise<PortalSettingsOutputDto> {
		const prospect = await this.outreachService.forBrand(brandId);
		return {
			contactEmail: prospect?.contactEmail ?? undefined,
			language: prospect?.language ?? 'en',
			editable: !!prospect,
		};
	}

	/** Writes the report's address and language onto the brand's outreach record. */
	async updateSettings(
		brandId: string,
		patch: PortalUpdateSettingsInputDto,
	): Promise<PortalSettingsOutputDto> {
		const prospect = await this.outreachService.forBrand(brandId);
		if (!prospect) throw new NotFoundException('This brand has no settings to change');
		await this.outreachService.update(prospect.id, {
			...(patch.contactEmail !== undefined && { contactEmail: patch.contactEmail }),
			...(patch.language && { language: patch.language }),
		});
		return this.settings(brandId);
	}

	/** One page of every branch's reviews, with the reply drafts for the unanswered ones. */
	async reviews(brandId: string, query: PortalListReviewsInputDto): Promise<PortalReviewsOutputDto> {
		const { page, size, ...filters } = query;
		const venues = await this.reviewVenues(brandId);
		const { items, total } = await this.reviewService.listForVenue([...venues.keys()], filters, page, size);
		const drafts = await this.reportService.replyDrafts(brandId);
		return {
			items: items.map(review => this.reviewOutput(review, drafts, venues)),
			totalItems: total,
			page,
			pageSize: size,
		};
	}

	async reviewFilters(brandId: string): Promise<PortalReviewFiltersOutputDto> {
		return this.reviewService.facets([...(await this.reviewVenues(brandId)).keys()]);
	}

	/** The owner marks a review answered (or not). Another brand's review is a 404. */
	async markReviewReplied(
		brandId: string,
		reviewId: string,
		replied: boolean,
	): Promise<PortalReviewOutputDto> {
		const venues = await this.reviewVenues(brandId);
		const review = await this.reviewService.markReplied([...venues.keys()], reviewId, replied);
		return this.reviewOutput(review, await this.reportService.replyDrafts(brandId), venues);
	}

	async posts(brandId: string, query: PortalListPostsInputDto): Promise<PortalPostsOutputDto> {
		const { page, size, ...filters } = query;
		const { items, total } = await this.brandPostsService.list(brandId, filters, page, size);
		return {
			items: items.map(({ post, mention, own, paid }) => ({
				...(wrap(post).serialize({ skipNull: true, forceObject: true }) as unknown as Omit<
					PortalPostOutputDto,
					'own' | 'paid' | 'sentiment' | 'summary' | 'visited' | 'dishes'
				>),
				own,
				paid,
				sentiment: mention.sentiment,
				summary: mention.summary,
				visited: mention.visited,
				dishes: mention.dishes,
			})),
			totalItems: total,
			page,
			pageSize: size,
		};
	}

	async creators(brandId: string, query: PortalListCreatorsInputDto): Promise<PortalCreatorsOutputDto> {
		return { items: await this.brandPostsService.creators(brandId, query) };
	}

	async postFilters(brandId: string): Promise<PortalPostFiltersOutputDto> {
		return { months: await this.brandPostsService.months(brandId) };
	}

	/**
	 * The brand's competitors, the same list the admin edits, and the best suggestions (in its
	 * first city) while there is room for more.
	 */
	async competitors(brandId: string): Promise<PortalCompetitorsOutputDto> {
		const links = await this.competitorService.list(brandId);
		const suggestions = links.length < MAX_COMPETITORS ? await this.competitorService.suggest(brandId) : [];
		const venues = [...links.flatMap(l => (l.venue ? [l.venue] : [])), ...suggestions.map(s => s.venue)];
		await this.em.populate(venues, ['brand', 'brand.branches']);
		return {
			items: links.map(link => ({
				id: link.id,
				pickedBy: link.pickedBy,
				...(link.branch && {
					branch: {
						id: link.branch.id,
						name: link.branch.name,
						...(link.branch.street && { street: link.branch.street }),
					},
				}),
				...(link.venue && { venue: competitorVenue(link.venue) }),
				...(link.rival && {
					brand: {
						id: link.rival.id,
						name: link.rival.name,
						branches: link.rival.branches.getItems().filter(v => !v.closed).length,
					},
				}),
			})),
			suggestions: suggestions.map(s => ({ venue: competitorVenue(s.venue), reasons: s.reasons })),
			max: MAX_COMPETITORS,
		};
	}

	async addCompetitor(
		brandId: string,
		target: CompetitorTarget,
		branchId?: string,
	): Promise<PortalCompetitorsOutputDto> {
		await this.competitorService.add(brandId, target, CompetitorPickedByEnum.OWNER, branchId);
		return this.competitors(brandId);
	}

	async removeCompetitor(brandId: string, competitorId: number): Promise<PortalCompetitorsOutputDto> {
		await this.competitorService.remove(brandId, competitorId);
		return this.competitors(brandId);
	}

	async searchCompetitors(brandId: string, q: string): Promise<PortalCompetitorVenueOutputDto[]> {
		return (await this.competitorService.search(brandId, q)).map(competitorVenue);
	}

	/** `venues`: the brand's branches by id; with more than one (a chain), each review names its branch. */
	private reviewOutput(
		review: Review,
		drafts: Map<string, string>,
		venues: Map<string, string>,
	): PortalReviewOutputDto {
		const answered = !!review.ownerResponse || !!review.markedRepliedAt;
		const written = !!(review.text || review.textTranslated);
		// The alert's draft is newer than a report's
		const replyDraft = !answered && written ? (review.replyDraft ?? drafts.get(review.reviewId)) : undefined;
		const { replyDraft: _stored, ...fields } = wrap(review).serialize({
			skipNull: true,
			forceObject: true,
		}) as unknown as PortalReviewOutputDto;
		return {
			...fields,
			answered,
			...(replyDraft && { replyDraft }),
			...(venues.size > 1 && { branch: venues.get(review.venue.id) }),
		};
	}
}

/** A place as the competitor picker shows it, with its brand (populated, with branches). */
const competitorVenue = (venue: Venue): PortalCompetitorVenueOutputDto => ({
	...(wrap(venue).serialize({ skipNull: true, forceObject: true, exclude: ['brand'] }) as unknown as Omit<
		PortalCompetitorVenueOutputDto,
		'brand'
	>),
	brand: {
		id: venue.brand.id,
		name: venue.brand.name,
		branches: venue.brand.branches.getItems().filter(v => !v.closed).length,
	},
});
