import { Injectable } from '@nestjs/common';

import { MastraModelConfig } from '@mastra/core/llm';
import { z } from 'zod/v4';

import { BaseMastraAgent, BaseMastraAgentConfig } from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';
import {
	feedbackDishSchema,
	FEEDBACK_POINT_INSTRUCTION,
	feedbackPointSchema,
	FEEDBACK_SENTIMENTS,
	FEEDBACK_THEMES_INSTRUCTION,
} from 'src/modules/venues/agents/review-analysis.agent.js';

const mentionExtractionSchema = z.object({
	isPromotional: z.boolean().describe('Paid partnership, ad, gifted meal, "invited by", or collab signals'),
	mentions: z
		.array(
			z.object({
				venueName: z
					.string()
					.describe('Venue name, with obvious transcription errors fixed using the caption and hashtags'),
				locationHint: z
					.string()
					.nullable()
					.describe(
						'Neighborhood, street, station or landmark the post itself gives for this venue; null when it gives none. Never fill it in from what you know about the venue',
					),
				cuisine: z
					.string()
					.nullable()
					.describe('The kinds of food it serves, comma-separated, most specific first, e.g. "Pho, Vietnamese" or "Vegan, Döner & kebab"'),
				city: z
					.string()
					.nullable()
					.describe('City the venue is in, if stated or clearly implied, e.g. "Berlin", "London"'),
				visited: z.boolean().describe('False if the creator says they have not been there themselves'),
				isNewOpening: z
					.boolean()
					.describe(
						'True only when the post itself says this venue has opened or is opening (eröffnet, Neueröffnung, grand opening, just opened, soft opening, opening week). Calling it "new", "neu", "a new spot" or "a new foodspot" is not enough: that is how places get promoted. False for a new dish, menu or branch of an old place, a reopening or new concept of an existing place, a place telling how long it has been open ("six months already"), a #new hashtag alone, for "new to me", and for anything you know about the venue but the post does not say',
					),
				sentiment: z.enum(FEEDBACK_SENTIMENTS),
				summary: z.string().describe('One sentence in English on what was said about this venue'),
				dishes: z.array(feedbackDishSchema).describe('Specific dishes or drinks named'),
				praise: z.array(feedbackPointSchema),
				complaints: z.array(feedbackPointSchema),
			}),
		)
		.describe('Every specific food or drink venue talked about. Empty if none.'),
});

/** The city whose scrape found the post (`City.name`), and the food topics' labels. */
export interface MentionExtractionContext {
	cityName: string;
	/** `FoodTopic` labels: the cuisine words the reports group by */
	foodTopics?: string[];
}

/** The venues a post talks about, with what it says about each. */
@Injectable()
export class MentionExtractionAgent extends BaseMastraAgent<
	typeof mentionExtractionSchema,
	MentionExtractionContext
> {
	protected readonly config: BaseMastraAgentConfig<typeof mentionExtractionSchema> = {
		id: 'mention-extraction',
		name: 'MentionExtractionAgent',
		outputSchema: mentionExtractionSchema,
	};

	// Hundreds of posts a month (~3,000 tokens each with the theme legend and topic labels): mini, whose daily complimentary allowance
	// is 10M tokens; 641 posts used 0.9M of the full model's 1M
	protected getModel(): MastraModelConfig {
		return 'openai/gpt-5.4-mini';
	}

	protected getInstructions(context?: MentionExtractionContext): string {
		const city = context?.cityName;
		return (
			`You extract restaurant, bar and café mentions from ${city ? `${city} ` : ''}social media posts and food blog articles for a report to venue owners. ` +
			`For a post you get the caption, hashtags, tagged location and, when available, the speech transcript; for a blog article its title and text, where a link to a social profile follows the linked words in parentheses ("Kaffeebar (instagram.com/kaffeebar)"): an account linked from a venue's name is that venue's and confirms its spelling. ` +
			`A blog article or list may name many venues: include each one it says something about, with what it says about that one. ` +
			`Transcripts are machine-generated and often misspell names; prefer spellings from the caption, hashtags or tagged location. ` +
			`Hashtags of a city also attract posts about other cities, so record the venue's city when known. ` +
			`A post tagged at a venue that describes a visit there counts as a mention of that venue, even if the caption does not repeat its name. ` +
			`Only include venues that are specifically named or tagged. Do not invent dishes, praise or complaints that are not stated. ` +
			FEEDBACK_THEMES_INSTRUCTION +
			FEEDBACK_POINT_INSTRUCTION +
			`Mark a venue as a new opening only when the post itself says it is new or has just opened; a new dish, a new menu or a creator's first visit is not an opening. ` +
			(context?.foodTopics?.length ?
				`For cuisine, use these words where one fits: ${context.foodTopics.join(', ')}. Use another short English word only when none fits. `
			:	'') +
			`Write everything in concise English.`
		);
	}
}
