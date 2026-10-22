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
import type { FeedbackPoint } from 'src/modules/venues/interfaces/feedback.interface.js';
import { CompetitorService } from 'src/modules/venues/services/competitor.service.js';
import { monthRange, previousMonth } from 'src/modules/venues/util/month.js';
import { offeredAmenities } from 'src/modules/venues/util/venue-details.js';
import { isFoodVenue } from 'src/modules/venues/util/venue-names.js';

import { ReportHighlightsAgent } from '../agents/report-highlights.agent.js';
import { ReviewReplyAgent } from '../agents/review-reply.agent.js';
import { Report } from '../entities/report.entity.js';
import {
	ReportBranch,
	ReportCompetitor,
	ReportData,
	ReportNeighbour,
	ReportReplyDraft,
	ReportReviewGroup,
} from '../interfaces/report-data.interface.js';
import { ReportBuiltEvent } from '../persisted-events/report-built.persisted-event.js';
import { reachPromptInput } from '../util/reach.js';
import { ratingBenchmarkSentence } from '../util/rating-benchmark.js';
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
const pointLine = (p: FeedbackPoint) => `${p.theme ? feedbackThemeLabel(p.theme) : p.topic}: ${p.detail}`;

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
	) {}

	/**
	 * Builds (or rebuilds) a brand's report on its branches in a city (or, `cityId` null, in
	 * every city: `Brand.reportScope` `all`) for a month and returns it, flushed. Two LLM calls:
	 * the highlights and the reply drafts, side by side. `peerBrandIds` are the month's report
	 * brands the city section compares it with (the pipeline passes them; else the month's
	 * reports). Posts, reviews and the other brand-wide sections cover every open branch covered;
	 * each branch's place figures (busyness, open tables, prices, search ranks, neighbourhood,
	 * rating trend, Google details) go in its own `ReportData.branches` entry. A report across
	 * cities has no city section and no calendar: one city's peers don't compare with a brand in
	 * several. 400 when there is no open branch.
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
		const [first] = branches;
		const { brand } = first;
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
				rating: venue.rating ?? undefined,
				reviewsCount: venue.reviewsCount ?? undefined,
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

	private highlightsInput(data: ReportData) {
		const chain = data.branches.length > 1;
		return {
			venue: {
				name: data.brand.name,
				category: data.brand.category,
				...(!chain && _.pick(data.branches[0], ['district', 'rating'])),
			},
			month: data.month,
			previousMonth: compareMonths(data),
			cityCalendar: data.context,
			// The brand's relations over every branch; each place's own sentences are in places
			demandAndPrices: signalsPromptInput({ correlations: data.correlations }),
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
					...(chain && {
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
			brand: chain ? { name: data.brand.name, postsNamingNoBranch: data.brand.brandOnlyPosts } : undefined,
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
