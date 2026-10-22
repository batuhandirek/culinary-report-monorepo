import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CitySourceSuggestionAgent } from '../agents/city-source-suggestion.agent.js';
import { CitySource, CitySourceKindEnum } from '../entities/city-source.entity.js';
import { DistrictPostalCount, suggestDistricts, SuggestedDistrict } from '../util/suggest-districts.js';

import { CityService } from './city.service.js';

// What one suggestion run asks for, per kind
const SUGGESTION_COUNTS: Record<CitySourceKindEnum, number> = {
	[CitySourceKindEnum.TIKTOK_HASHTAG]: 20,
	[CitySourceKindEnum.TIKTOK_SEARCH]: 20,
	[CitySourceKindEnum.INSTAGRAM_HASHTAG]: 10,
	// Never suggested: a model's blog URLs are guesses; an admin adds blogs they have read
	[CitySourceKindEnum.BLOG]: 0,
};

/** First guesses for a new city: scrape sources from an LLM, districts from its venue scrape. */
@Injectable()
export class CitySuggestionService {
	constructor(
		private readonly em: EntityManager,
		private readonly cityService: CityService,
		private readonly agent: CitySourceSuggestionAgent,
	) {}

	/**
	 * One `CitySourceSuggestionAgent` call: hashtags and searches in the city's language and
	 * English, stored as disabled sources marked `suggested` with the reason as their note, for
	 * an admin to enable. Values the city already has are skipped, so a second run only adds.
	 */
	async suggestSources(
		cityId: string,
		opts: { cuisineNotes?: string } = {},
	): Promise<{ added: CitySource[]; skipped: number }> {
		const city = await this.cityService.getById(cityId);
		const existing = await this.cityService.sources(cityId);
		const { object } = await this.agent.generate(
			JSON.stringify({
				city: city.name,
				otherNames: city.aliases,
				country: city.country,
				language: city.language,
				districts: city.districts.map(d => d.name),
				cuisineNotes: opts.cuisineNotes?.trim() || undefined,
				existing: existing.map(s => `${s.kind}: ${s.value}`),
			}),
		);
		const lists: [CitySourceKindEnum, { value: string; reason: string }[]][] = [
			[CitySourceKindEnum.TIKTOK_HASHTAG, object.tiktokHashtags],
			[CitySourceKindEnum.TIKTOK_SEARCH, object.tiktokSearches],
			[CitySourceKindEnum.INSTAGRAM_HASHTAG, object.instagramHashtags],
		];
		const items = lists.flatMap(([kind, list]) =>
			(list ?? []).slice(0, SUGGESTION_COUNTS[kind]).map(s => ({
				kind,
				// A hashtag has no spaces, whatever the model wrote
				value: kind === CitySourceKindEnum.TIKTOK_SEARCH ? s.value : s.value.replace(/\s+/g, ''),
				note: `Suggested: ${s.reason}`.slice(0, 500),
			})),
		);
		const added = await this.cityService.addSuggestedSources(cityId, items);
		return { added, skipped: items.length - added.length };
	}

	/**
	 * The city's districts with postal codes, read from its venues (`suggestDistricts`): useful
	 * once a first Google Maps scrape is in. Nothing is saved; the admin applies the list.
	 */
	async suggestDistricts(cityId: string): Promise<SuggestedDistrict[]> {
		const city = await this.cityService.getById(cityId);
		const rows: { postal_code: string; district: string; venues: number }[] = await this.em
			.getConnection()
			.execute(
				`select postal_code, district, count(*)::int as venues from venues
				where city_id = ? and postal_code is not null and postal_code <> ''
					and district is not null and district <> ''
				group by postal_code, district`,
				[cityId],
			);
		const counts: DistrictPostalCount[] = rows.map(r => ({
			postalCode: r.postal_code,
			district: r.district,
			venues: r.venues,
		}));
		return suggestDistricts(counts, city.districts);
	}
}
