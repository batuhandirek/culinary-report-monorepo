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
import { CompetitorService } from 'src/modules/venues/services/competitor.service.js';
import { monthRange, previousMonth } from 'src/modules/venues/util/month.js';
import { offeredAmenities } from 'src/modules/venues/util/venue-details.js';
import { isFoodVenue } from 'src/modules/venues/util/venue-names.js';

import { ReportHighlightsAgent } from '../agents/report-highlights.agent.js';
import { ReviewReplyAgent } from '../agents/review-reply.agent.js';
import { Report } from '../entities/report.entity.js';
import {
	ReportBrand,
	ReportCompetitor,
	ReportData,
	ReportNeighbour,
	ReportReplyDraft,
	ReportReviewGroup,
} from '../interfaces/report-data.interface.js';
import { ReportBuiltEvent } from '../persisted-events/report-built.persisted-event.js';
import { reachPromptInput } from '../util/reach.js';
import { replyCandidates } from '../util/reply-drafts.js';
import {
	compareMonths,
	NeighbourPost,
	ratingTrend,
	selectNearbyCreators,
	summarizeCompetitor,
	summarizePrevious,
	summarizeReport,
} from '../util/summarize-report.js';

import { ReportCityService } from './report-city.service.js';
import { ReportReachService } from './report-reach.service.js';
import { ReportSignalsService, signalsPromptInput } from './report-signals.service.js';

const creatorKey = (platform: string, author: string) => `${platform}:${author.toLowerCase()}`;

/** Topic counts as the model should quote them, largest first: `{ food: '19 of 34 written reviews (56%)' }`. */
const shares = (counts: Record<string, number>, total: number, unit: string) =>
	Object.fromEntries(
		_.sortBy(Object.entries(counts), ([, n]) => -n).map(([topic, n]) => [
			topic,
			`${n} of ${total} ${unit} (${total ? Math.round((n / total) * 100) : 0}%)`,
		]),
	);

const reviewGroupInput = (group: ReportReviewGroup) => ({
	reviews: group.count,
	writtenReviews: group.written,
	praisingTopic: shares(group.praise, group.written, 'written reviews'),
	criticisingTopic: shares(group.complaints, group.written, 'written reviews'),
	whatTheyPraised: group.praiseDetails.map(p => `${p.topic}: ${p.detail}`),
	whatTheyCriticised: group.complaintDetails.map(p => `${p.topic}: ${p.detail}`),
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
	) {}

	/**
	 * Builds (or rebuilds) a brand's report on its branches in a city (or, `cityId` null, in
	 * every city: `Brand.reportScope` `all`) for a month and returns it, flushed. Two LLM calls:
	 * the highlights and the reply drafts, side by side. `peerBrandIds` are the month's report
	 * brands the city section compares it with (the pipeline passes them; else the month's
	 * reports). Posts and reviews cover every open branch covered; the place-bound sections
	 * describe the one with the most Google reviews (`ReportData.venue`), in its own city; a
	 * chain gets `ReportData.brand`. A report across cities has no city section: one city's
	 * peers don't compare with a brand in several. 400 when there is no open branch.
	 */
	async build(
		brandId: string,
		cityId: string | null,
		month: string,
		{ peerBrandIds }: { peerBrandIds?: string[] } = {},
	): Promise<Report> {
		const branches =
			cityId ? await this.brandService.branchesIn(brandId, cityId) : await this.brandService.openBranches(brandId);
		if (!branches.length)
			throw new BadRequestException(cityId ? 'The brand has no open branch in the city' : 'The brand has no open branch');
		await this.em.populate(branches, ['city', 'brand', 'brand.branches']);
		const [venue] = branches;
		const { brand } = venue;
		const city = cityId ? venue.city : null;
		const cityNames = _.uniq(branches.map(b => b.city.name));
		const data = await this.collect(venue, month, branches, city);
		if (city) data.city = await this.reportCityService.section(venue, month, peerBrandIds);
		data.neighbourhood = await this.reportCityService.neighbourhood(venue, month);
		data.searchRanks = await this.reportCityService.searchRanks(venue, month);
		data.context = await this.cityDayService.month(venue.city.id, month);
		// Busyness, open tables, delivery prices and the computed correlations, when tracked
		Object.assign(data, await this.reportSignalsService.sections(venue, month, data));
		// Own accounts, comments, press and the review platforms, when scraped
		Object.assign(data, await this.reportReachService.sections(venue, month, data, city));
		const [res, replyDrafts] = await Promise.all([
			this.reportHighlightsAgent.generate(JSON.stringify(this.highlightsInput(data)), {
				cityName: cityNames.join(', '),
			}),
			this.draftReplies(branches, month, data),
		]);
		data.reviews.replyDrafts = replyDrafts;

		const report =
			(await this.em.findOne(Report, { brand, city: city ?? null, month })) ??
			this.em.create(Report, { brand, city, month, data, highlights: res.object });
		report.data = data;
		report.highlights = res.object;
		report.postCount = data.social.postCount;
		report.reviewCount = data.reviews.count;
		await this.em.flush();
		this.logger.log(`Built ${month} report of ${brand.name} in ${city?.name ?? `all its cities (${cityNames.join(', ')})`}`);
		// The outreach side mails it to a brand that subscribed
		await this.pgBossService.publish(
			ReportBuiltEvent.eventName,
			new ReportBuiltEvent({ reportId: report.id }),
		);
		return report;
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

	private async collect(venue: Venue, month: string, branches: Venue[], city: City | null): Promise<ReportData> {
		const brand = venue.brand;
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
				neighbours: [],
			});
			const reviewsTracked =
				(await this.em.count(Review, { venue: { $in: competitor.venues.map(v => v.id) } })) > 0;
			const branch = competitor.branch;
			competitors.push({
				...summarizeCompetitor(data, reviewsTracked),
				...(competitor.link.rival && { branches: competitor.venues.length }),
				...(branch && { against: branch.street ? `${branch.name}, ${branch.street}` : branch.name }),
			});
		}

		// The month before, on the same pure summary: its numbers cost no LLM call
		const before = previousMonth(new Date(`${month}-01T00:00:00Z`));
		const beforeReport = await this.em.findOne(Report, { brand, city: city ?? null, month: before });
		const previous = summarizePrevious(
			summarizeReport({
				...(await this.monthInput(venue, before, { branches, brandWide: true })),
				neighbours: [],
			}),
			beforeReport?.highlights.actions,
		);

		const input = await this.monthInput(venue, month, { branches, brandWide: true });
		const snapshots = await this.em.find(VenueSnapshot, { venue }, { orderBy: { snapshotDate: QueryOrder.ASC } });
		const brandAuthors = new Set(input.mentions.filter(m => m.author).map(m => creatorKey(m.platform, m.author!)));
		const data = summarizeReport({
			...input,
			venue: { ...input.venue, ratingTrend: ratingTrend(snapshots, month) },
			neighbours: venue.district ? await this.neighbours(venue, month) : [],
			competitors,
			creatorsNearby:
				venue.district ? selectNearbyCreators(await this.neighbourPosts(venue, month), brandAuthors) : [],
			previous,
		});
		if (branches.length > 1) data.brand = await this.brandSection(venue, month, branches, input, !city);
		return data;
	}

	/**
	 * Each branch's own month: the posts that named it (not the ones naming only the brand) and
	 * its reviews, cut down like a competitor.
	 */
	private async brandSection(
		venue: Venue,
		month: string,
		branches: Venue[],
		input: Awaited<ReturnType<ReportService['monthInput']>>,
		acrossCities = false,
	): Promise<ReportBrand> {
		const brandName = venue.brand.name;
		const rows: ReportBrand['branches'] = [];
		for (const branch of branches) {
			const own = await this.monthInput(branch, month, { branches: [branch] });
			const summary = summarizeReport({ ...own, neighbours: [] });
			rows.push({
				...summarizeCompetitor(summary, (await this.em.count(Review, { venue: branch })) > 0),
				street: branch.street ?? undefined,
				described: branch.id === venue.id,
				...(acrossCities && { city: branch.city.name }),
			});
		}
		// Posts by others in the brand's figures that named no branch
		const named = new Set(input.mentions.filter(m => !m.brandOnly).map(m => m.postId));
		const posts = summarizeReport({ ...input, neighbours: [] }).posts;
		return {
			name: brandName,
			brandOnlyPosts: posts.filter(p => !named.has(p.postId)).length,
			branches: rows,
		};
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
		const [venue] = branches;
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
					venue: _.pick(data.venue, ['name', 'category', 'district']),
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
			this.logger.warn(`Reply drafts for ${venue.name} failed: ${(e as Error).message}`);
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
			platform: 'tiktok' | 'instagram';
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
			{ populate: ['post', 'post.account'] },
		);
		const reviews = await this.em.find(Review, {
			venue: { $in: ids },
			publishedAt: { $gte: start, $lt: end },
		});

		return {
			venue: {
				id: venue.id,
				name: name ?? venue.name,
				category: venue.category ?? undefined,
				district: venue.district ?? undefined,
				street: venue.street ?? undefined,
				rating: venue.rating ?? undefined,
				reviewsCount: venue.reviewsCount ?? undefined,
				googleUrl: venue.googleUrl ?? undefined,
				amenities: venue.details?.amenities ? offeredAmenities(venue.details) : undefined,
				reviewsDistribution: venue.details?.reviewsDistribution,
				ratingTrend: [],
			},
			month,
			mentions: mentions.map(m => ({
				postId: m.post.id,
				platform: m.post.platform,
				url: m.post.url,
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
				praise: m.praise,
				complaints: m.complaints,
				dishes: m.dishes,
				brandOnly: !m.venue,
			})),
			reviews,
		};
	}

	/** Other food venues talked about this month in the same district, its brand's branches left out. */
	private async neighbours(venue: Venue, month: string): Promise<ReportNeighbour[]> {
		const rows: {
			venue_id: string;
			name: string;
			category: string | null;
			posts: number;
			views: string;
		}[] = await this.em.getConnection().execute(
			`select v.id as venue_id, v.name, v.category, count(distinct p.id)::int as posts, sum(p.views) as views
				from mentions m
				join social_posts p on p.id = m.post_id
				join venues v on v.id = m.venue_id
				where v.city_id = ? and v.district = ? and v.brand_id <> ?
					and to_char(p.posted_at at time zone 'UTC', 'YYYY-MM') = ?
				group by v.id order by sum(p.views) desc limit 40`,
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

	private highlightsInput(data: ReportData) {
		return {
			venue: _.pick(data.venue, ['name', 'category', 'district', 'rating']),
			month: data.month,
			// All-time Google figures at the close of each month, oldest first
			googleRatingTrend:
				data.venue.ratingTrend.length >= 2 ?
					data.venue.ratingTrend.map(p => _.pick(p, ['month', 'rating', 'reviewsCount']))
				:	undefined,
			previousMonth: compareMonths(data),
			cityCalendar: data.context,
			demandAndPrices: signalsPromptInput(data),
			reachAndPress: reachPromptInput(data),
			socialMedia: {
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
			},
			ownPosts: {
				note: 'Posted by the venue itself, not word of mouth',
				count: data.ownPosts.length,
				views: _.sumBy(data.ownPosts, p => p.views),
			},
			googleReviews: {
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
				fiveStarReviews: reviewGroupInput(data.reviews.split.fiveStar),
				reviewsBelowFiveStars: reviewGroupInput(data.reviews.split.belowFive),
				// One entry per review, so the model counts reviews rather than changes
				reviewsNoticingChanges: data.reviews.changes,
			},
			topCreators: data.creators.map(c =>
				_.pick(c, ['author', 'platform', 'authorFans', 'posts', 'views', 'promotional']),
			),
			nearbyCreatorsWhoDidNotPostAboutYou: data.creatorsNearby.map(c => ({
				author: c.author,
				platform: c.platform,
				followers: c.authorFans,
				postedAbout: c.venues,
			})),
			neighbours: data.neighbours.map(n => _.pick(n, ['name', 'category', 'posts', 'views'])),
			googleMapsSearchRanks: data.searchRanks?.map(r => ({
				search: r.query,
				yourPlace: r.rank ?? `not in the top ${r.results}`,
				earlierMonths: r.history.map(h => ({
					month: h.month,
					place: h.rank ?? 'not in the results',
				})),
				topThree: r.top.slice(0, 3).map(t => (t.isVenue ? `${t.name} (you)` : t.name)),
			})),
			// Seen by our Google Maps scrapes, so "first seen", not an opening date
			openingsAndClosuresNearbyThisQuarter: data.neighbourhood && {
				district: data.neighbourhood.changes.district,
				..._.pick(data.neighbourhood.changes, ['opened', 'closed', 'reopened']),
				onYourStreet: data.neighbourhood.changes.street,
				venues: data.neighbourhood.changes.venues
					.slice(0, 6)
					.map(v => _.pick(v, ['name', 'category', 'kind', 'sameStreet'])),
			},
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
			// A chain: posts and reviews above cover every branch in the city; each branch's own here
			brand: data.brand && {
				name: data.brand.name,
				postsNamingNoBranch: data.brand.brandOnlyPosts,
				branches: data.brand.branches.map(b => ({
					name: b.name,
					district: b.district,
					street: b.street,
					placeSectionsDescribeIt: b.described || undefined,
					googleRatingAllTime: b.rating,
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
				})),
			},
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
