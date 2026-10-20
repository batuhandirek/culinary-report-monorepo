import { Injectable } from '@nestjs/common';

import { MastraModelConfig } from '@mastra/core/llm';
import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';

const suggestionSchema = z.object({
	value: z.string().describe('The hashtag without # (lowercase, no spaces) or the search query'),
	reason: z.string().describe('One line, at most 15 words: who posts or searches it and why it yields venues'),
});

const citySourceSuggestionSchema = z.object({
	tiktokHashtags: z.array(suggestionSchema).describe('Twenty TikTok hashtags, the best first'),
	tiktokSearches: z.array(suggestionSchema).describe('Twenty TikTok search queries, the best first'),
	instagramHashtags: z.array(suggestionSchema).describe('Ten Instagram hashtags, the best first'),
});

export type CitySourceSuggestions = z.infer<typeof citySourceSuggestionSchema>;

/**
 * A first list of scrape sources for a new city (`CitySuggestionService.suggestSources`): the
 * hashtags and searches food posts about its restaurants, cafés and bars use. The yield view
 * prunes it once months of posts are in.
 */
@Injectable()
export class CitySourceSuggestionAgent extends BaseMastraAgent<typeof citySourceSuggestionSchema> {
	protected readonly config: BaseMastraAgentConfig<typeof citySourceSuggestionSchema> = {
		id: 'city-source-suggestion',
		name: 'CitySourceSuggestionAgent',
		outputSchema: citySourceSuggestionSchema,
	};

	protected getModel(): MastraModelConfig {
		return 'openai/gpt-5.4';
	}

	protected getInstructions(): string {
		return (
			'You pick where a monthly scrape of TikTok and Instagram should look to find posts about the restaurants, ' +
			'cafés, bars and street food of one city: creators reviewing a place, food tours, "where to eat" lists, new openings. ' +
			'Every source is scraped for the posts of one month, so it must be specific to the city: a hashtag or query ' +
			'that also matches the whole country or the world fills the budget with posts from elsewhere. ' +
			'Write sources in the city\'s language and in English, about half each, using the spellings locals and tourists ' +
			'actually type (with and without umlauts or accents where both are common). ' +
			'TikTok hashtags: the city name joined with food words (e.g. <city>food, eat<city>, <city>foodie, <city>brunch, ' +
			'<city>streetfood), the local words for eating out, and the two or three cuisines the city is known for. ' +
			'TikTok searches: two to four words as people type them into TikTok search, e.g. "<city> restaurant", ' +
			'"best ramen <city>", "<district> cafe", "new restaurant <city>" in both languages; include the best-known food ' +
			'districts or neighbourhoods by name, and cuisines from `cuisineNotes` when given. ' +
			'Instagram hashtags: the city\'s food, foodie, brunch, café, coffee, bakery and restaurant tags that food bloggers use. ' +
			'Never repeat a value from `existing`, never return the same value twice, no generic tags without the city ' +
			'(#food, #foodie, #restaurant), no hashtags of other cities, no brand or chain names. ' +
			'Each reason is one short line saying who posts or searches it.'
		);
	}
}
