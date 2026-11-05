import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { City } from 'src/modules/cities/entities/city.entity.js';
import { cityNames } from 'src/modules/cities/util/city.js';
import {
	type CandidateVenue,
	toCandidateVenues,
} from 'src/modules/social/services/mention-matching.service.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { cityStopwords } from 'src/modules/venues/util/venue-names.js';

/** What matching a city's places needs, read once per city: its words, names and candidate venues */
export interface EvalCity {
	city: City;
	words: ReadonlySet<string>;
	names: string[];
	venues: CandidateVenue[];
}

/** The dev DB's cities as matching reads them, for the match reference and the runs */
@Injectable()
export class EvalCitiesService {
	private readonly cache = new Map<string, Promise<EvalCity>>();
	private readonly wordsCache = new Map<string, Promise<ReadonlySet<string>>>();

	constructor(private readonly em: EntityManager) {}

	get(cityId: string): Promise<EvalCity> {
		let city = this.cache.get(cityId);
		if (!city) {
			city = this.load(cityId);
			this.cache.set(cityId, city);
		}
		return city;
	}

	/** A city's own words only (dropped from venue names: "Berlin" in "Candela Berlin"), without its venues */
	async words(cityId: string): Promise<ReadonlySet<string>> {
		let words = this.wordsCache.get(cityId);
		if (!words) {
			words = this.em
				.fork()
				.findOneOrFail(City, cityId)
				.then(city => cityStopwords(city.nameStopwords));
			this.wordsCache.set(cityId, words);
		}
		return words;
	}

	private async load(cityId: string): Promise<EvalCity> {
		const em = this.em.fork();
		const city = await em.findOneOrFail(City, cityId);
		const words = cityStopwords(city.nameStopwords);
		const venues = await em.find(Venue, { city, closed: false }, { populate: ['brand'] });
		return { city, words, names: cityNames(city), venues: toCandidateVenues(venues, words) };
	}
}
