import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import _ from 'lodash';

import { Review, ReviewPlatformEnum } from 'src/modules/venues/entities/review.entity.js';
import { ReservationPlatformEnum } from 'src/modules/venues/entities/venue-reservation-sample.entity.js';
import type { Venue } from 'src/modules/venues/entities/venue.entity.js';
import {
	DeliveryPlatformEnum,
	VenueDeliveryListing,
} from 'src/modules/venues/entities/venue-delivery-listing.entity.js';
import { VenueBusynessService } from 'src/modules/venues/services/venue-busyness.service.js';
import { VenueDeliveryService } from 'src/modules/venues/services/venue-delivery.service.js';
import { VenueReservationService } from 'src/modules/venues/services/venue-reservation.service.js';
import { busiestHour, meanHistogram } from 'src/modules/venues/util/busyness.js';
import { pricePosition } from 'src/modules/venues/util/delivery.js';
import { monthRange, previousMonth } from 'src/modules/venues/util/month.js';
import { bookedMedian, bookedPercent, eveningsBooked, meanBooked } from 'src/modules/venues/util/reservations.js';
import { addDays, monthWeeks, weekStart } from 'src/modules/venues/util/week.js';

import type { ReportCompetitor, ReportData } from '../interfaces/report-data.interface.js';
import type {
	ReportBusyness,
	ReportBusynessWeek,
	ReportCorrelations,
	ReportDeliveryListing,
	ReportDemand,
	ReportPrices,
} from '../interfaces/report-signals.interface.js';
import { buzzToReviews, complaintTimes, paidVsOrganic } from '../util/correlations.js';

/** Signature dishes compared on price: the report's most talked-about ones. */
const PRICE_DISHES = 5;
/** Competitors' price-complaint shares count from this many written reviews, as elsewhere. */
const MIN_WRITTEN_FOR_SHARE = 5;
const round1 = (n: number) => Math.round(n * 10) / 10;

const monthsBefore = (month: string, n: number): string => {
	let m = month;
	for (let i = 0; i < n; i++) m = previousMonth(new Date(`${m}-01T00:00:00Z`));
	return m;
};

/**
 * The report's demand, price and correlation sections, read from what the pipeline stored:
 * busyness and reservation samples, delivery listings and menus, the venue's posts and reviews.
 * No LLM call, no scrape.
 */
@Injectable()
export class ReportSignalsService {
	constructor(
		private readonly em: EntityManager,
		private readonly venueBusynessService: VenueBusynessService,
		private readonly venueReservationService: VenueReservationService,
		private readonly venueDeliveryService: VenueDeliveryService,
	) {}

	/** Every section this venue has data for; the absent ones are left out. */
	async sections(
		venue: Venue,
		month: string,
		data: Pick<ReportData, 'posts' | 'reviews' | 'dishes' | 'competitors'>,
	): Promise<Pick<ReportData, 'busyness' | 'demand' | 'prices' | 'correlations' | 'competitors'>> {
		const timeZone = venue.city.timezone;
		const demand = await this.demand(venue, month);
		const competitors = await this.competitorSignals(data.competitors, month);
		const busyness = await this.busyness(venue, month, timeZone, data.posts, demand);
		const prices = await this.prices(venue, month, data);
		const correlations = await this.correlations(venue, month, timeZone, data);
		return {
			...(busyness && { busyness }),
			...(demand && { demand }),
			...(prices && { prices }),
			...(correlations && { correlations }),
			competitors,
		};
	}

	/**
	 * The competitors with their month's booked-out share (from their reservation samples) and
	 * busyness index next to the month before's (from their popular times), where sampled.
	 */
	async competitorSignals(competitors: ReportCompetitor[], month: string): Promise<ReportCompetitor[]> {
		if (competitors.length === 0) return competitors;
		const ids = competitors.map(c => c.venueId);
		const next = addDays(`${month}-01`, 40).slice(0, 7);
		const before = previousMonth(new Date(`${month}-01T00:00:00Z`));
		const samples = _.groupBy(await this.venueReservationService.between(ids, `${month}-01`, `${next}-01`), s => s.venue.id);
		const busy = (await this.venueBusynessService.between(ids, monthRange(before).start, monthRange(month).end)).filter(
			s => s.busynessIndex != null,
		);
		const indexOf = (venueId: string, m: string) => {
			const list = busy.filter(s => s.venue.id === venueId && s.sampledAt.toISOString().slice(0, 7) === m);
			return list.length ? round1(_.meanBy(list, s => s.busynessIndex!)) : undefined;
		};
		return competitors.map(c => {
			const evenings = eveningsBooked(samples[c.venueId] ?? []);
			const booked = meanBooked(evenings);
			const index = indexOf(c.venueId, month);
			const previousIndex = indexOf(c.venueId, before);
			return {
				...c,
				...(booked !== null && { demand: { booked, evenings: evenings.length } }),
				...(index !== undefined && { busyness: { index, ...(previousIndex !== undefined && { previousIndex }) } }),
			};
		});
	}

	private async busynessWeeks(venueId: string, month: string, timeZone: string) {
		const { start, end } = monthRange(month);
		const samples = (await this.venueBusynessService.between(venueId, start, end)).filter(
			s => s.busynessIndex != null,
		);
		if (samples.length === 0) return null;
		const byWeek = _.groupBy(samples, s => weekStart(s.sampledAt, timeZone));
		const weeks: ReportBusynessWeek[] = monthWeeks(month).map(week => ({
			week,
			...(byWeek[week] && { index: round1(_.meanBy(byWeek[week], s => s.busynessIndex!)) }),
		}));
		const peak = busiestHour(meanHistogram(samples.map(s => s.histogram)));
		const live = samples.filter(s => s.livePercent != null);
		return {
			weeks,
			index: round1(_.meanBy(samples, s => s.busynessIndex!)),
			samples: samples.length,
			...(peak && { peak }),
			...(live.length && { livePercent: Math.round(_.meanBy(live, s => s.livePercent!)) }),
		};
	}

	/** Busyness by week with the month's views beside it; null without a sample with popular times. */
	async busyness(
		venue: Venue,
		month: string,
		timeZone: string,
		posts: ReportData['posts'],
		demand: ReportDemand | null,
	): Promise<ReportBusyness | null> {
		const current = await this.busynessWeeks(venue.id, month, timeZone);
		if (!current) return null;
		const postsByWeek = _.groupBy(posts, p => weekStart(new Date(p.postedAt), timeZone));
		const bookedByWeek = _.groupBy(demand?.evenings ?? [], e => weekStart(new Date(`${e.date}T12:00:00Z`), timeZone));
		for (const week of current.weeks) {
			week.posts = postsByWeek[week.week]?.length ?? 0;
			week.views = _.sumBy(postsByWeek[week.week] ?? [], p => p.views);
			if (bookedByWeek[week.week]) week.booked = round1(_.meanBy(bookedByWeek[week.week], e => e.booked));
		}
		const before = previousMonth(new Date(`${month}-01T00:00:00Z`));
		const previous = await this.busynessWeeks(venue.id, before, timeZone);
		const { livePercent, ...rest } = current;
		return {
			...rest,
			...(livePercent !== undefined && { livePercent }),
			...(previous && {
				previous: {
					month: before,
					weeks: previous.weeks,
					index: previous.index,
					samples: previous.samples,
					...(previous.peak && { peak: previous.peak }),
				},
			}),
		};
	}

	/** How booked out the sampled Friday and Saturday evenings were; null when none was sampled. */
	async demand(venue: Venue, month: string): Promise<ReportDemand | null> {
		const next = addDays(`${month}-01`, 40).slice(0, 7);
		const samples = await this.venueReservationService.between(venue.id, `${month}-01`, `${next}-01`);
		// The latest sample of each evening counts (two days ahead beats a week ahead)
		const evenings = eveningsBooked(samples);
		if (evenings.length === 0) return null;
		// The district's and the city's other venues sampled on the same evenings
		const others = await this.venueReservationService.cityEvenings(
			venue.city.id,
			evenings.map(e => e.date),
			venue.id,
		);
		const district = venue.district ? bookedMedian(others.filter(o => o.district === venue.district)) : null;
		const city = bookedMedian(others);
		const before = previousMonth(new Date(`${month}-01T00:00:00Z`));
		const previousSamples = await this.venueReservationService.between(venue.id, `${before}-01`, `${month}-01`);
		const previousBooked = bookedPercent(previousSamples);
		const platform = _.head(_.orderBy(Object.entries(_.countBy(samples, s => s.platform)), 1, 'desc'))![0];
		return {
			platform,
			...(platform === ReservationPlatformEnum.GOOGLE && venue.reservationPartner && { partner: venue.reservationPartner }),
			booked: meanBooked(evenings)!,
			evenings,
			...(previousBooked !== null && { previousBooked }),
			...(district && { district }),
			...(city && { city }),
		};
	}

	/** Delivery listings and the menu's price position; null when the venue has no listing. */
	async prices(
		venue: Venue,
		month: string,
		data: Pick<ReportData, 'reviews' | 'dishes' | 'competitors'>,
	): Promise<ReportPrices | null> {
		const competitorIds = data.competitors.map(c => c.venueId);
		const menus = await this.venueDeliveryService.menus([venue.id, ...competitorIds], month);
		const own = menus.filter(m => m.venueId === venue.id);
		if (own.length === 0) return null;
		const listing = (l: VenueDeliveryListing): ReportDeliveryListing => ({
			platform: l.platform,
			url: l.url,
			...(l.rating != null && { rating: Math.round(l.rating * 10) / 10 }),
			...(l.reviewsCount != null && { reviewsCount: l.reviewsCount }),
			...(l.deliveryFee != null && { deliveryFee: l.deliveryFee }),
			...(l.minOrder != null && { minOrder: l.minOrder }),
			...(l.currency && { currency: l.currency }),
		});
		const names = new Map(data.competitors.map(c => [c.venueId, c.name]));
		const prices: ReportPrices = {
			listings: _.sortBy(own, m => (m.listing.platform === DeliveryPlatformEnum.WOLT ? 0 : 1)).map(m => listing(m.listing)),
			competitorListings: menus
				.filter(m => m.venueId !== venue.id)
				.map(m => ({ name: names.get(m.venueId) ?? '', ...listing(m.listing) })),
		};

		// The menu against competitors' menus, else against menus of the same district
		const ownMenu = own.find(m => m.items.length);
		if (ownMenu) {
			let othersAre: 'competitors' | 'district' = 'competitors';
			let others = menus.filter(m => m.venueId !== venue.id && m.items.length);
			if (others.length === 0 && venue.district) {
				othersAre = 'district';
				const nearby = await this.em.find(
					VenueDeliveryListing,
					{ venue: { city: venue.city, district: venue.district, id: { $ne: venue.id } } },
					{ fields: ['venue'] },
				);
				others = (await this.venueDeliveryService.menus(_.uniq(nearby.map(l => l.venue.id)), month)).filter(
					m => m.items.length,
				);
			}
			const position = pricePosition(
				{ venueId: venue.id, name: venue.name, items: ownMenu.items },
				others.map(m => ({ venueId: m.venueId, name: '', items: m.items })),
				data.dishes.slice(0, PRICE_DISHES).map(d => d.name),
			);
			if (position)
				prices.menu = {
					platform: ownMenu.listing.platform,
					currency: ownMenu.listing.currency ?? 'EUR',
					month: ownMenu.month!,
					median: position.median,
					...(position.othersMedian !== null && { othersMedian: position.othersMedian }),
					othersWithMenu: position.othersWithMenu,
					othersAre,
					...(position.diff !== null && { diff: position.diff }),
					dishes: position.dishes,
				};
		}

		if (data.reviews.written >= MIN_WRITTEN_FOR_SHARE) {
			const share = (data.reviews.complaints.price ?? 0) / data.reviews.written;
			const otherShares = data.competitors
				.filter(c => c.reviewsTracked && c.reviews.written >= MIN_WRITTEN_FOR_SHARE)
				.map(c => (c.reviews.complaints.price ?? 0) / c.reviews.written);
			const sorted = [...otherShares].sort((a, b) => a - b);
			const mid = Math.floor(sorted.length / 2);
			const othersMedian = !sorted.length ? null : sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
			prices.priceComplaints = {
				share: Math.round(share * 1000) / 1000,
				written: data.reviews.written,
				...(othersMedian !== null && { othersMedian: Math.round(othersMedian * 1000) / 1000 }),
				others: otherShares.length,
			};
		}
		const sentence = priceSentence(prices);
		if (sentence) prices.sentence = sentence;
		return prices;
	}

	/** The three relations over the venue's posts and reviews; null when all are below the floors. */
	async correlations(
		venue: Venue,
		month: string,
		timeZone: string,
		data: Pick<ReportData, 'posts' | 'reviews'>,
	): Promise<ReportCorrelations | null> {
		const { start, end } = monthRange(month);
		const baselineFrom = monthRange(monthsBefore(month, 6)).start;
		const complaintsFrom = monthRange(monthsBefore(month, 5)).start;
		const weekAfter = new Date(end.getTime() + 7 * 86_400_000);
		const reviews = await this.em.find(
			Review,
			// Google's only: the correlations read Google's review pace
			{ venue, platform: ReviewPlatformEnum.GOOGLE, publishedAt: { $gte: baselineFrom, $lt: weekAfter } },
			{ fields: ['publishedAt', 'stars', 'text', 'complaints'] },
		);
		const asInput = (r: Review) => ({
			publishedAt: r.publishedAt.toISOString(),
			stars: r.stars,
			complaints: (r.complaints ?? []).map(c => c.topic),
			written: !!r.text?.trim(),
		});
		const baseline = reviews.filter(r => r.publishedAt < start).map(asInput);
		const monthAndAfter = reviews.filter(r => r.publishedAt >= start).map(asInput);
		const window = reviews.filter(r => r.publishedAt >= complaintsFrom && r.publishedAt < end).map(asInput);
		const posts = data.posts.map(p => ({ postedAt: p.postedAt, views: p.views, promotional: p.promotional }));

		const samples = await this.venueBusynessService.between(venue.id, start, end);
		const histogram = meanHistogram(samples.map(s => s.histogram)) ?? venue.details?.popularTimesHistogram ?? null;

		const buzz = buzzToReviews({ month, timeZone, posts, reviews: monthAndAfter, baseline });
		const times = complaintTimes({ timeZone, reviews: window, histogram });
		const paid = paidVsOrganic({ month, posts, reviews: monthAndAfter, baseline });
		if (!buzz && !times && !paid) return null;
		return {
			...(buzz && { buzzToReviews: buzz }),
			...(times && { complaintTimes: times }),
			...(paid && { paidVsOrganic: paid }),
		};
	}
}

const PLATFORM_NAMES: Record<string, string> = {
	wolt: 'Wolt',
	lieferando: 'Lieferando',
	thefork: 'TheFork',
	opentable: 'OpenTable',
	google: 'Reserve with Google',
};

/** "Reserve with Google (via OpenTable)", "TheFork". */
export const reservationPlatformName = (d: Pick<ReportDemand, 'platform' | 'partner'>): string =>
	`${PLATFORM_NAMES[d.platform] ?? d.platform}${d.partner ? ` (via ${d.partner})` : ''}`;

const money = (n: number, currency: string) =>
	n.toLocaleString('en', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** One line the prompt may quote: where the prices sit and how price is criticised. */
export const priceSentence = (prices: ReportPrices): string | undefined => {
	const parts: string[] = [];
	const menu = prices.menu;
	if (menu?.othersMedian !== undefined && menu.diff !== undefined) {
		const who = menu.othersAre === 'competitors' ? 'your competitors' : 'menus in your district';
		const pct = Math.round(Math.abs(menu.diff) * 100);
		parts.push(
			`Your median main course on ${PLATFORM_NAMES[menu.platform] ?? menu.platform} is ${money(menu.median, menu.currency)}, ` +
				(pct < 3
					? `about the same as ${who} (${money(menu.othersMedian, menu.currency)})`
					: `${pct} % ${menu.diff > 0 ? 'above' : 'below'} ${who} (${money(menu.othersMedian, menu.currency)})`),
		);
		const dish = menu.dishes.find(d => d.othersMedian !== undefined);
		if (dish)
			parts.push(
				`your ${dish.dish} costs ${money(dish.price, menu.currency)} against ${money(dish.othersMedian!, menu.currency)}`,
			);
	}
	const pc = prices.priceComplaints;
	if (pc && pc.others > 0 && pc.othersMedian !== undefined)
		parts.push(
			`price is criticised in ${Math.round(pc.share * 100)} % of your written reviews, ${Math.round(pc.othersMedian * 100)} % at your competitors' median`,
		);
	return parts.length ? `${parts.join('; ')}.` : undefined;
};

const DAY_NAMES: Record<string, string> = {
	Mo: 'Monday',
	Tu: 'Tuesday',
	We: 'Wednesday',
	Th: 'Thursday',
	Fr: 'Friday',
	Sa: 'Saturday',
	Su: 'Sunday',
};

const signedPoints = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '±0');

/**
 * The venue's booked-out share next to its competitors' and the district's median: only when all
 * three exist, since a comparison missing one side reads as a verdict it isn't.
 */
export const weekendTablesSentence = (
	data: Pick<ReportData, 'demand'> & Partial<Pick<ReportData, 'competitors'>>,
): string | undefined => {
	const d = data.demand;
	const sampled = (data.competitors ?? []).filter(c => c.demand);
	if (!d?.district || sampled.length === 0) return undefined;
	const rivals = sampled.map(c => `${c.name} ${c.demand!.booked} %`).join(', ');
	const city = d.city ? `; across the city ${d.city.median} % (median of ${d.city.venues} venues)` : '';
	return (
		`Friday and Saturday evenings booked out: yours ${d.booked} %; your competitors' ${rivals}; ` +
		`your district's ${d.district.median} % (median of ${d.district.venues} venues)${city}. ` +
		'The same question (a table for two, 18:00–22:00) was asked of every venue, so these compare directly.'
	);
};

/**
 * Busyness change on the month before for the venue and its competitors, in points: Google scales
 * each venue to its own peak, so only changes compare, never levels.
 */
export const competitorFootTrafficSentence = (
	data: Pick<ReportData, 'busyness'> & Partial<Pick<ReportData, 'competitors'>>,
): string | undefined => {
	const changes = (data.competitors ?? [])
		.filter(c => c.busyness?.previousIndex !== undefined)
		.map(c => `${c.name} ${signedPoints(Math.round(c.busyness!.index - c.busyness!.previousIndex!))}`);
	if (changes.length === 0) return undefined;
	const b = data.busyness;
	const own = b?.previous ? `yours ${signedPoints(Math.round(b.index - b.previous.index))}, ` : '';
	return (
		`Google busyness index change on the month before, in points: ${own}${changes.join(', ')}. ` +
		'Each index is relative to that venue\'s own peak: compare the changes, never the levels.'
	);
};

/** What the highlights prompt gets of these sections: sentences with their numbers, nothing to compute. */
export const signalsPromptInput = (
	data: Pick<ReportData, 'busyness' | 'demand' | 'prices' | 'correlations'> & Partial<Pick<ReportData, 'competitors'>>,
): Record<string, string> | undefined => {
	const out: Record<string, string> = {};
	const b = data.busyness;
	if (b) {
		const peak = b.peak ? `, busiest on ${DAY_NAMES[b.peak.day]}s at ${b.peak.hour}:00` : '';
		const before = b.previous ? ` (${b.previous.index} the month before)` : '';
		out.footTraffic =
			`Google popular-times busyness index ${b.index} of 100 over ${b.samples} samples${before}${peak}. ` +
			'The index is the mean of the week\'s ten busiest hours, relative to the venue\'s own peak.';
	}
	const d = data.demand;
	if (d) {
		const before = d.previousBooked !== undefined ? ` (${d.previousBooked} % the month before)` : '';
		out.openTables = `Friday and Saturday evenings on ${reservationPlatformName(d)} were ${d.booked} % booked out on average over ${d.evenings.length} sampled evenings${before}.`;
	}
	const tables = weekendTablesSentence(data);
	if (tables) out.weekendTables = tables;
	const traffic = competitorFootTrafficSentence(data);
	if (traffic) out.competitorFootTraffic = traffic;
	if (data.prices?.sentence) out.prices = data.prices.sentence;
	const c = data.correlations;
	if (c?.buzzToReviews) out.buzzToReviews = c.buzzToReviews.sentence;
	if (c?.complaintTimes) out.complaintTimes = c.complaintTimes.sentence;
	if (c?.paidVsOrganic) out.paidVsOrganic = c.paidVsOrganic.sentence;
	return Object.keys(out).length ? out : undefined;
};
