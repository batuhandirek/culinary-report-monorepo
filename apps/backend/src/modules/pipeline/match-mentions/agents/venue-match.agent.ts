import { Injectable } from '@nestjs/common';

import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';
import type { LlmModelChoice } from 'src/modules/llm/constants/llm-models.constant.js';

const venueMatchSchema = z.object({
	venueId: z
		.string()
		.nullable()
		.describe('The matching candidate id, or null if none is clearly the same venue'),
	branchId: z
		.string()
		.nullable()
		.describe(
			'For a chain candidate (one with `locations`): the id of the location the mention clearly means, else null',
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

	protected getModel(): LlmModelChoice {
		return 'mini';
	}

	protected getInstructions(): string {
		return (
			'Decide which Google Maps venue a social media mention refers to. Names in mentions may come from speech transcripts and be misspelled. ' +
			'Answer null unless one candidate is clearly the same venue; branches of a chain count as a match only if the location fits. ' +
			"A candidate with a `branches` count is a whole chain, not one branch, with its branches' `locations`: pick it when the mention names that chain and gives no location, or one that fits a branch. " +
			'When you pick a chain, set `branchId` to the location the mention clearly means: its street or address, the neighbourhood it is in (Prenzlauer Berg is in Pankow), or a landmark next to it (Rosenthaler Platz is at Torstraße). ' +
			'Leave `branchId` null when the mention names several of its locations, none, or only the city; never guess. ' +
			'Ignore any part of `locationHint` that says it is implied, inferred or not stated in the post: it is a guess, not a location. ' +
			"When the mention gives a street or address that none of a candidate's locations is on, it is another venue, however close the name: a similar name is not a misspelling then. " +
			"`author` is the post's account: when it spells the mentioned name (the venue posting about itself), the name is written right, so a candidate with a different name is not it."
		);
	}

	// Worked examples (invented): they teach the cases a quick model gets wrong, and keep the fixed
	// instructions past the 1,024 tokens a provider caches from
	protected getCoaching(): string {
		return (
			'Examples. Mention "Mustafas" with hint "Mehringdamm" and a candidate chain Mustafa\'s Gemüse Kebap with a branch on ' +
			'Mehringdamm: pick it, branchId that branch. Mention "Burger Meister" with no hint and the chain Burgermeister: pick the ' +
			'chain, branchId null (no location: the brand only). Mention "Five Elephants" from a transcript, candidate "Five Elephant" ' +
			'café: pick it (a transcript misspelling). Mention "Bonanza" with hint "Oderberger Straße" and the only candidate Bonanza ' +
			'Coffee Roasters on Adalbertstraße: null (an address none of its locations is on is another venue). Mention "Café Lotte", ' +
			'author "cafe.lotte.official", candidates "Café Lotte" and "Lotte Bar": pick Café Lotte (the venue posting about itself ' +
			'spells its name). Mention "Sushi Place" with no hint and five unrelated sushi candidates: null (a generic name is no ' +
			'match). Mention "Hokey Pokey" with hint "near Rosenthaler Platz" and a chain whose branch is on Torstraße next to it: ' +
			'pick the chain and that branch (a square names the street beside it). Mention "Kaffee Pur" with hint "Kreuzberg (implied ' +
			'from the hashtags)": ignore the hint, decide by the name. Mention "The Bowl" said to be "the vegan bowl place near the ' +
			'canal" and two candidates The Bowl (vegan, Neukölln) and The Bowl Bar (cocktails, Mitte): pick the vegan one by what was ' +
			'said. When two candidates are equally likely and nothing in the mention tells them apart, answer null: a wrong match ' +
			'files the post under the wrong owner, a missing one is looked up again.'
		);
	}
}
