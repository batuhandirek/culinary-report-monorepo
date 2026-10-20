import { Injectable } from '@nestjs/common';

import { MastraModelConfig } from '@mastra/core/llm';
import { z } from 'zod/v4';

import { BaseMastraAgent, BaseMastraAgentConfig } from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';

const venueMatchSchema = z.object({
	venueId: z
		.string()
		.nullable()
		.describe('The matching candidate id, or null if none is clearly the same venue'),
	branchId: z
		.string()
		.nullable()
		.describe(
			"For a chain candidate (one with `locations`): the id of the location the mention clearly means, else null",
		),
});

/** Picks which of a few close Google Maps candidates a mention means, if any. */
@Injectable()
export class VenueMatchAgent extends BaseMastraAgent<typeof venueMatchSchema> {
	protected readonly config: BaseMastraAgentConfig<typeof venueMatchSchema> = {
		id: 'venue-match',
		name: 'VenueMatchAgent',
		outputSchema: venueMatchSchema,
	};

	protected getModel(): MastraModelConfig {
		return 'openai/gpt-5.4-mini';
	}

	protected getInstructions(): string {
		return (
			'Decide which Google Maps venue a social media mention refers to. Names in mentions may come from speech transcripts and be misspelled. ' +
			'Answer null unless one candidate is clearly the same venue; branches of a chain count as a match only if the location fits. ' +
			'A candidate with a `branches` count is a whole chain, not one branch, with its branches\' `locations`: pick it when the mention names that chain and gives no location, or one that fits a branch. ' +
			'When you pick a chain, set `branchId` to the location the mention clearly means: its street or address, the neighbourhood it is in (Prenzlauer Berg is in Pankow), or a landmark next to it (Rosenthaler Platz is at Torstraße). ' +
			'Leave `branchId` null when the mention names several of its locations, none, or only the city; never guess. ' +
			'Ignore any part of `locationHint` that says it is implied, inferred or not stated in the post: it is a guess, not a location. ' +
			'When the mention gives a street or address that none of a candidate\'s locations is on, it is another venue, however close the name: a similar name is not a misspelling then. ' +
			'`author` is the post\'s account: when it spells the mentioned name (the venue posting about itself), the name is written right, so a candidate with a different name is not it.'
		);
	}
}
