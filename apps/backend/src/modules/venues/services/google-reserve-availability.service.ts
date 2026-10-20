import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import { runPool } from 'src/shared/util/pool.js';

import { ReservationPlatformEnum } from '../entities/venue-reservation-sample.entity.js';
import {
	PartialAvailabilityError,
	type ReservationAvailability,
	type ReservationAvailabilityProvider,
	type ReservationTarget,
} from '../interfaces/reservation-availability.interface.js';
import {
	GOOGLE_RESERVE_WINDOWS_MINUTES,
	type GoogleReservePage,
	googleReserveOpenSlots,
	googleReservePartner,
	googleReserveUrl,
	isGoogleBlockPage,
	parseGoogleReservePage,
} from '../util/google-reserve.js';
import { EVENING_SLOTS, googleReserveMerchantId, RESERVATION_PARTY_SIZE } from '../util/reservations.js';

// Google's EU consent wall redirects a cookie-less request from Europe to consent.google.com;
// this is the "reject all" SOCS cookie the wall itself sets, which lets the page through
const CONSENT_COOKIE = 'SOCS=CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg';
const USER_AGENT =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const LOAD_TIMEOUT_MS = 20_000;

/** How hard the sampler hits Google: loads in flight, and a jittered pause before each load. */
export interface GoogleReservePacing {
	concurrency: number;
	minPauseMs: number;
	maxPauseMs: number;
}

/**
 * Open evening tables from Google's own booking page (Reserve with Google), which every partner
 * platform (OpenTable, TheFork, resmio, Formitable, …) feeds. Free: a plain fetch of the page,
 * whose first response already holds the slot grid, with no login and the consent cookie. Two
 * loads per venue and date (grids centred on 19:00 and 21:00 local) cover 18:00–22:00 for two.
 * A load that fails, is redirected or shows Google's captcha stops the provider: the samples
 * already taken are kept (`PartialAvailabilityError`) and the run fails, never retried.
 */
@Injectable()
export class GoogleReserveAvailabilityService implements ReservationAvailabilityProvider {
	readonly platform = ReservationPlatformEnum.GOOGLE;
	readonly free = true;
	private readonly logger = new Logger(GoogleReserveAvailabilityService.name);

	// Two loads in flight, 1–2 s apart each: ~2,000 loads (500 venues, two dates, two windows)
	// take about an hour
	pacing: GoogleReservePacing = { concurrency: 2, minPauseMs: 1000, maxPauseMs: 2000 };

	async availability(targets: ReservationTarget[], dates: string[]): Promise<ReservationAvailability[]> {
		const jobs = targets.flatMap(target => {
			const merchantId = googleReserveMerchantId(target.url);
			return merchantId ? dates.map(forDate => ({ target, merchantId, forDate })) : [];
		});
		const out: ReservationAvailability[] = [];
		let stopped: Error | null = null;
		let loads = 0;
		await runPool(jobs, this.pacing.concurrency, async ({ target, merchantId, forDate }) => {
			if (stopped) return;
			const pages: GoogleReservePage[] = [];
			for (const minutes of GOOGLE_RESERVE_WINDOWS_MINUTES) {
				if (stopped) return;
				await this.pause();
				try {
					pages.push(parseGoogleReservePage(await this.load(googleReserveUrl(merchantId, forDate, minutes, target.timeZone))));
					loads++;
				} catch (e) {
					stopped ??= new Error(`${target.name}: ${(e as Error).message}`);
					return;
				}
			}
			// A page that is neither showing a date nor naming a partner is not the booking page
			if (pages.every(p => !p.date && !p.partner)) {
				stopped ??= new Error(`${target.name}: the booking page did not show (layout changed?)`);
				return;
			}
			const slotsOpen = googleReserveOpenSlots(pages, forDate);
			if (slotsOpen === null) return;
			out.push({
				venueId: target.venueId,
				forDate,
				slotsOpen,
				slotsAsked: EVENING_SLOTS,
				partySize: RESERVATION_PARTY_SIZE,
				partner: googleReservePartner(pages),
			});
		});
		this.logger.log(`Google reserve: ${loads} loads, ${out.length} samples for ${targets.length} venues`);
		if (stopped) throw new PartialAvailabilityError((stopped as Error).message, out);
		return out;
	}

	/** One load of the page; throws on anything but the page itself. */
	async load(url: string): Promise<string> {
		const res = await fetch(url, {
			redirect: 'manual',
			signal: AbortSignal.timeout(LOAD_TIMEOUT_MS),
			headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en-US,en;q=0.9', Cookie: CONSENT_COOKIE },
		});
		const html = res.status === 200 ? await res.text() : '';
		const location = res.headers.get('location') ?? '';
		if (res.status !== 200 || isGoogleBlockPage(location, html))
			throw new Error(
				isGoogleBlockPage(location, html)
					? 'Google answered with its captcha (unusual traffic)'
					: `Google answered ${res.status}${location ? ` → ${location.slice(0, 80)}` : ''}`,
			);
		return html;
	}

	private pause(): Promise<void> {
		const ms = _.random(this.pacing.minPauseMs, this.pacing.maxPauseMs);
		return ms > 0 ? new Promise(resolve => setTimeout(resolve, ms)) : Promise.resolve();
	}
}
