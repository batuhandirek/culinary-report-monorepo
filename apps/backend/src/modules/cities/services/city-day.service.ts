import { QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { City } from '../entities/city.entity.js';
import { CityDay } from '../entities/city-day.entity.js';
import { CityEvent, CityEventKindEnum } from '../entities/city-event.entity.js';
import { monthContext, MonthContext } from '../util/month-context.js';

import { CityService } from './city.service.js';
import { CityContextSourcesService } from './city-context-sources.service.js';

// The archive revises its last few days, so the daily fill fetches a week back
const REFETCH_DAYS = 7;
// One backfill call covers at most this many days
const MAX_BACKFILL_DAYS = 400;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** `date` plus `days`, as YYYY-MM-DD. */
const addDays = (date: string, days: number) => {
	const d = new Date(`${date}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
};

/** Today in a time zone, as YYYY-MM-DD. */
const localToday = (timezone: string, now: Date) =>
	new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(now);

export interface CityEventInput {
	kind: CityEventKindEnum;
	name: string;
	startDate: string;
	endDate: string;
}

/**
 * The one entry point for a city's day context: daily weather and public holidays
 * (`CityDay`, one row per city and date) and the admin's events (`CityEvent`), and the month
 * summary reports and the portal read (`month`).
 */
@Injectable()
export class CityDayService {
	private readonly logger = new Logger(CityDayService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly cityService: CityService,
		private readonly sources: CityContextSourcesService,
	) {}

	/**
	 * Fetches weather for `from`–`to` (needs the city's coordinates) and the public holidays of
	 * the years it spans (those of the city's region and the nationwide ones), and stores them,
	 * one row per day: a day fetched again is updated, not added. Flushes. Returns the days written.
	 */
	async fill(cityId: string, from: string, to: string): Promise<number> {
		if (!DATE.test(from) || !DATE.test(to) || from > to) {
			throw new BadRequestException('Give a from and to date, from first');
		}
		if (addDays(from, MAX_BACKFILL_DAYS) < to) {
			throw new BadRequestException(`At most ${MAX_BACKFILL_DAYS} days at a time`);
		}
		const city = await this.cityService.getById(cityId);
		const rows = new Map(
			(await this.em.find(CityDay, { city, date: { $gte: from, $lte: to } })).map(d => [d.date, d]),
		);
		const day = (date: string) => {
			let row = rows.get(date);
			if (!row) {
				row = this.em.create(CityDay, { city, date });
				rows.set(date, row);
			}
			return row;
		};

		if (city.lat !== null && city.lat !== undefined && city.lng !== null && city.lng !== undefined) {
			const weather = await this.sources.weather(
				{ lat: city.lat, lng: city.lng, timezone: city.timezone },
				from,
				to,
			);
			for (const w of weather) {
				// The archive's newest days can still be empty: keep what an earlier fetch had
				if (w.tMax === null && w.rainMm === null) continue;
				const row = day(w.date);
				row.tMax = w.tMax;
				row.rainMm = w.rainMm;
			}
		}

		for (let year = Number(from.slice(0, 4)); year <= Number(to.slice(0, 4)); year++) {
			const holidays = (await this.sources.publicHolidays(city.country, year)).filter(
				h =>
					h.date >= from &&
					h.date <= to &&
					(h.global || (!!city.region && !!h.counties?.includes(city.region))),
			);
			const byDate = new Map(holidays.map(h => [h.date, h.name]));
			for (const [date, row] of rows) {
				if (date.startsWith(String(year)) && !byDate.has(date)) row.holiday = null;
			}
			for (const [date, name] of byDate) day(date).holiday = name;
		}

		await this.em.flush();
		return rows.size;
	}

	/**
	 * The daily cron's work: the last `REFETCH_DAYS` local days up to yesterday, for every
	 * active city. A city that fails is logged and skipped.
	 */
	async fillRecent(now = new Date()): Promise<void> {
		for (const city of await this.cityService.active()) {
			const yesterday = addDays(localToday(city.timezone, now), -1);
			try {
				const written = await this.fill(city.id, addDays(yesterday, 1 - REFETCH_DAYS), yesterday);
				this.logger.log(`${city.name}: ${written} days up to ${yesterday}`);
			} catch (e) {
				this.logger.error(`${city.name}: day context failed: ${(e as Error).message}`);
			}
		}
	}

	/** The city's stored days `from`–`to`, oldest first. */
	async days(cityId: string, from: string, to: string): Promise<CityDay[]> {
		return this.em.find(
			CityDay,
			{ city: cityId, date: { $gte: from, $lte: to } },
			{ orderBy: { date: QueryOrder.ASC } },
		);
	}

	/** The month's weather and calendar (`monthContext`). */
	async month(cityId: string, month: string): Promise<MonthContext> {
		const first = `${month}-01`;
		const nextFirst = `${addDays(first, 31).slice(0, 7)}-01`;
		const [days, events] = await Promise.all([
			// The next month's first day closes a weekend that starts on the last Saturday
			this.days(cityId, first, nextFirst),
			this.events(cityId, { from: first, to: addDays(nextFirst, -1) }),
		]);
		return monthContext(month, days, events);
	}

	/** `month` for consecutive months, oldest first, in two queries. */
	async months(cityId: string, months: string[]): Promise<MonthContext[]> {
		if (!months.length) return [];
		const first = `${months[0]}-01`;
		const nextFirst = `${addDays(`${months.at(-1)}-01`, 31).slice(0, 7)}-01`;
		const [days, events] = await Promise.all([
			this.days(cityId, first, nextFirst),
			this.events(cityId, { from: first, to: addDays(nextFirst, -1) }),
		]);
		return months.map(month => monthContext(month, days, events));
	}

	/** The city's events overlapping `from`–`to` (all without), by start. */
	async events(cityId: string, range: { from?: string; to?: string } = {}): Promise<CityEvent[]> {
		return this.em.find(
			CityEvent,
			{
				city: cityId,
				...(range.to && { startDate: { $lte: range.to } }),
				...(range.from && { endDate: { $gte: range.from } }),
			},
			{ orderBy: { startDate: QueryOrder.ASC, name: QueryOrder.ASC } },
		);
	}

	/** Adds a school holiday or event. Flushes. */
	async addEvent(cityId: string, input: CityEventInput): Promise<CityEvent> {
		const city = await this.em.findOneOrFail(City, { id: cityId });
		this.checkRange(input.startDate, input.endDate);
		const event = this.em.create(CityEvent, { city, ...input, name: input.name.trim() });
		await this.em.flush();
		return event;
	}

	/** Changes an event. Flushes. */
	async updateEvent(
		cityId: string,
		eventId: string,
		input: Partial<CityEventInput>,
	): Promise<CityEvent> {
		const event = await this.em.findOneOrFail(CityEvent, { id: eventId, city: cityId });
		this.em.assign(event, { ...input, ...(input.name && { name: input.name.trim() }) });
		this.checkRange(event.startDate, event.endDate);
		await this.em.flush();
		return event;
	}

	/** Removes an event. Flushes. */
	async removeEvent(cityId: string, eventId: string): Promise<void> {
		const event = await this.em.findOneOrFail(CityEvent, { id: eventId, city: cityId });
		this.em.remove(event);
		await this.em.flush();
	}

	private checkRange(startDate: string, endDate: string) {
		if (endDate < startDate) throw new BadRequestException('The event ends before it starts');
	}
}
