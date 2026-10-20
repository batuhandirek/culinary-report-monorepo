import { BadGatewayException, Injectable } from '@nestjs/common';

import {
	parseTrendsAutocomplete,
	trendsAutocompleteUrl,
	TrendsTopicSuggestion,
} from '../util/trends-autocomplete.js';

/**
 * Google Trends topic ids for some words, from Trends' own autocomplete: free, no Apify. The
 * admin picks one for a `FoodTopic` (check the type: "Cuisine", "Dish", not a restaurant of
 * that name elsewhere).
 */
@Injectable()
export class TrendsTopicLookupService {
	async lookup(q: string): Promise<TrendsTopicSuggestion[]> {
		const res = await fetch(trendsAutocompleteUrl(q), {
			headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
			signal: AbortSignal.timeout(10_000),
		}).catch((e: Error) => {
			throw new BadGatewayException(`Google Trends unreachable: ${e.message}`);
		});
		if (!res.ok) throw new BadGatewayException(`Google Trends answered ${res.status}`);
		return parseTrendsAutocomplete(await res.text());
	}
}
