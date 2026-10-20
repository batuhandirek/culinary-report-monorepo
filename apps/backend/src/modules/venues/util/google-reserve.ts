// Google's own booking page (Reserve with Google), read from its server-rendered HTML: the page
// carries the date it shows, a grid of quarter-hour slot buttons per bookable area around the
// asked time, and the partner platform behind it ("Booking times are provided in partnership with
// OpenTable"). Pure: the provider (`GoogleReserveAvailabilityService`) fetches, these read.

import _ from 'lodash';

import { EVENING_FROM_MINUTES, EVENING_TO_MINUTES, RESERVATION_PARTY_SIZE, SLOT_MINUTES } from './reservations.js';

/** One bookable area's grid ("Restaurant", "Hochtisch"): a slot's label when bookable, null when closed. */
export interface GoogleReserveGrid {
	title: string | null;
	slots: (string | null)[];
}

/** What one load of the page shows. */
export interface GoogleReservePage {
	/**
	 * The platform the footer names ("OpenTable"), or the several it lists, alphabetically
	 * ("Lightspeed Commerce, resmio"); null when it names none
	 */
	partner: string | null;
	/** The date the page shows, as Google writes it in English ("Fri, Oct 23"); null when none */
	date: string | null;
	grids: GoogleReserveGrid[];
}

// The two loads per evening, centred on 19:00 and 21:00 local: each grid spans an hour either
// side, so together they cover 18:00–22:00
export const GOOGLE_RESERVE_WINDOWS_MINUTES = [19 * 60, 21 * 60];

/** The page's URL for a merchant, date and time. `ld` is read as UTC, so it is the local time's instant. */
export const googleReserveUrl = (merchantId: string, forDate: string, minutes: number, timeZone: string): string => {
	const ld = zonedTimeToUtc(forDate, minutes, timeZone)
		.toISOString()
		.replace(/[-:]/g, '')
		.replace(/\.\d{3}Z$/, '');
	return `https://www.google.com/maps/reserve/dine?c=${encodeURIComponent(merchantId)}&ld=${ld}&ps=${RESERVATION_PARTY_SIZE}&hl=en`;
};

/** The instant a local date and time (minutes after midnight) is in `timeZone`. */
export const zonedTimeToUtc = (date: string, minutes: number, timeZone: string): Date => {
	const [y, m, d] = date.split('-').map(Number);
	const wall = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
	// The zone's offset at a guess, applied twice so a guess across a DST switch settles
	let utc = wall - offsetMs(new Date(wall), timeZone);
	utc = wall - offsetMs(new Date(utc), timeZone);
	return new Date(utc);
};

const offsetMs = (at: Date, timeZone: string): number => {
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat('en-US', {
			timeZone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hourCycle: 'h23',
		})
			.formatToParts(at)
			.map(p => [p.type, p.value]),
	);
	const asUtc = Date.UTC(
		Number(parts.year),
		Number(parts.month) - 1,
		Number(parts.day),
		Number(parts.hour),
		Number(parts.minute),
		Number(parts.second),
	);
	return asUtc - Math.floor(at.getTime() / 1000) * 1000;
};

/**
 * A slot label's start in minutes after midnight: "8:15 PM", "Selected: 8:00 PM" (the asked time)
 * or a 24-hour "20:15". Null for anything else.
 */
export const slotLabelMinutes = (label: string): number | null => {
	const m = /(\d{1,2}):(\d{2})\s*([AP]M)?/i.exec(label);
	if (!m) return null;
	let hour = Number(m[1]);
	const minute = Number(m[2]);
	const meridiem = m[3]?.toUpperCase();
	if (meridiem) {
		if (hour < 1 || hour > 12) return null;
		hour = (hour % 12) + (meridiem === 'PM' ? 12 : 0);
	}
	if (hour > 23 || minute > 59) return null;
	return hour * 60 + minute;
};

/** How Google writes a date on the page in English: `2026-10-23` → "Fri, Oct 23". */
export const googleDateLabel = (date: string): string =>
	new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }).format(
		new Date(`${date}T12:00:00Z`),
	);

/**
 * The open evening slots of one date from its loads (one per window): a quarter hour is open
 * when any area lists it in any load. Null when no load shows that date (not sampled); 0 when
 * one shows it with no slot (closed that day, or not taking bookings).
 */
export const googleReserveOpenSlots = (
	pages: Pick<GoogleReservePage, 'date' | 'grids'>[],
	forDate: string,
): number | null => {
	const label = googleDateLabel(forDate);
	const shown = pages.filter(p => p.date?.trim() === label);
	if (shown.length === 0) return null;
	const starts = new Set<number>();
	for (const page of shown)
		for (const grid of page.grids)
			for (const slot of grid.slots) {
				const minutes = slot === null ? null : slotLabelMinutes(slot);
				if (minutes === null || minutes < EVENING_FROM_MINUTES || minutes >= EVENING_TO_MINUTES) continue;
				starts.add(minutes - (minutes % SLOT_MINUTES));
			}
	return starts.size;
};

/** The partner the loads name, the first one that names any. */
export const googleReservePartner = (pages: Pick<GoogleReservePage, 'partner'>[]): string | null =>
	pages.find(p => p.partner)?.partner ?? null;

const decodeEntities = (text: string): string =>
	text
		.replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
		.replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCharCode(parseInt(code, 16)))
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&apos;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&');

const attribute = (tag: string, name: string): string | null => {
	const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
	return m ? decodeEntities(m[1]) : null;
};

// A slot button: `<button … aria-label="8:15 PM" data-bts="<epoch>" data-slot="…[&quot;<area id>&quot;,…">`;
// a closed one has no accessible name
const SLOT_BUTTON = /<button\b[^>]*(?:\sdata-bts="|\sdata-slot="|jsname="hNX5Yc")[^>]*>/g;

/**
 * Reads one server-rendered load of the page: the date it shows, the slot grids (one per bookable
 * area, in page order) and the footer's partner. Google gives the page in full on the first
 * response, so no browser is needed.
 */
export const parseGoogleReservePage = (html: string): GoogleReservePage => {
	const partner = footerPartner(html);

	// The date picker's label: the first "Mon, Oct 5"-shaped text of the page
	const dateMatch = />\s*((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2})\s*</.exec(
		html,
	);
	const date = dateMatch ? dateMatch[1] : null;

	const grids: (GoogleReserveGrid & { id: string | null })[] = [];
	for (const [tag] of html.matchAll(SLOT_BUTTON)) {
		const label = attribute(tag, 'aria-label');
		const slot = label && slotLabelMinutes(label) !== null ? label : null;
		const area = /^%\.@\.[^[]*\[[^[]*\[\[\s*"([^"]+)"/.exec(attribute(tag, 'data-slot') ?? '')?.[1] ?? null;
		const last = grids.at(-1);
		// A closed slot names no area: it belongs to the grid it sits in
		if (last && (area === null || last.id === area || last.id === null)) {
			last.id ??= area;
			last.slots.push(slot);
		} else grids.push({ id: area, title: null, slots: [slot] });
	}
	return {
		partner,
		date,
		grids: grids.map(({ id, slots }) => ({
			title: id ? areaTitle(html, id) : null,
			slots,
		})),
	};
};

// The footer names one partner ("Booking times are provided in partnership with" + logo and
// name) or several ("Booking providers supply these times" + a logo and name each, in random
// order, so they are sorted)
const footerPartner = (html: string): string | null => {
	const intro = /in partnership with|Booking providers supply these times/i.exec(html);
	if (!intro) return null;
	const rest = html.slice(intro.index);
	const logos = rest.indexOf('<img');
	if (logos < 0 || logos > 3000) return null;
	const block = rest.slice(logos, rest.indexOf('</div>', logos));
	const names = [...block.matchAll(/<span[^>]*>([^<]+)<\/span>/g)].map(m => decodeEntities(m[1]).trim()).filter(Boolean);
	return names.length ? _.sortBy(_.uniq(names), n => n.toLowerCase()).join(', ') : null;
};

// The area's name, from the page's initial data: `["<area id>","Restaurant",…`
const areaTitle = (html: string, id: string): string | null => {
	const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const m = new RegExp(`\\["${escaped}","([^"]*)"`).exec(html);
	return m ? decodeEntities(m[1]) || null : null;
};

/** Whether a response is Google's captcha / "unusual traffic" page rather than the booking page. */
export const isGoogleBlockPage = (url: string, html: string): boolean =>
	/\/sorry\//.test(url) || /unusual traffic|captcha-form|g-recaptcha/i.test(html);
