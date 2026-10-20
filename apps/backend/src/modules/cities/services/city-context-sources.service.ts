import { Injectable } from '@nestjs/common';

/** One day's weather as Open-Meteo gives it. */
export interface DailyWeather {
	date: string;
	tMax: number | null;
	rainMm: number | null;
}

/** One public holiday as Nager.Date gives it. */
export interface PublicHoliday {
	date: string;
	/** English name */
	name: string;
	/** Nationwide; otherwise only in `counties` */
	global: boolean;
	/** ISO 3166-2 subdivisions it applies in, when not global */
	counties: string[] | null;
}

const TIMEOUT_MS = 20_000;

/**
 * The two free sources of a city's day context, no key needed: Open-Meteo's historical
 * weather (its archive API, which also has the last few days, revised later) and Nager.Date's
 * public holidays. Only `CityDayService` calls it; tests mock it.
 */
@Injectable()
export class CityContextSourcesService {
	/** Max temperature (°C) and precipitation (mm) per local day, `from`–`to` inclusive. */
	async weather(
		place: { lat: number; lng: number; timezone: string },
		from: string,
		to: string,
	): Promise<DailyWeather[]> {
		const url = new URL('https://archive-api.open-meteo.com/v1/archive');
		url.search = new URLSearchParams({
			latitude: String(place.lat),
			longitude: String(place.lng),
			start_date: from,
			end_date: to,
			daily: 'temperature_2m_max,precipitation_sum',
			timezone: place.timezone,
		}).toString();
		const body = (await this.get(url)) as {
			daily?: {
				time: string[];
				temperature_2m_max: (number | null)[];
				precipitation_sum: (number | null)[];
			};
		};
		const daily = body.daily;
		if (!daily) return [];
		return daily.time.map((date, i) => ({
			date,
			tMax: daily.temperature_2m_max[i] ?? null,
			rainMm: daily.precipitation_sum[i] ?? null,
		}));
	}

	/** A country's public holidays in a year. */
	async publicHolidays(country: string, year: number): Promise<PublicHoliday[]> {
		const url = new URL(`https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`);
		const body = (await this.get(url)) as PublicHoliday[];
		return body.map(h => ({ date: h.date, name: h.name, global: h.global, counties: h.counties }));
	}

	private async get(url: URL): Promise<unknown> {
		const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
		if (!res.ok) throw new Error(`${url.host} answered ${res.status}: ${await res.text()}`);
		return res.json();
	}
}
