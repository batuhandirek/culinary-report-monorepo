import { Injectable } from '@nestjs/common';

import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';
import type { LlmModelChoice } from 'src/modules/llm/constants/llm-models.constant.js';

const profilePlaceSchema = z.object({
	venueId: z
		.string()
		.nullable()
		.describe(
			"The id of the candidate place this profile is the venue's own account of, or null",
		),
});

/**
 * Whether an Instagram business profile is the own account of one of the places at the address
 * its bio gives (`ProfilePlaceService.askPlaces`), when none of them is named like it: a market
 * hall's stall, a place Google names otherwise than its account. One profile a call. Its answer
 * is only a suggestion for an admin, never a link.
 */
@Injectable()
export class ProfilePlaceAgent extends BaseMastraAgent<typeof profilePlaceSchema> {
	protected readonly config: BaseMastraAgentConfig<typeof profilePlaceSchema> = {
		id: 'profile-place',
		name: 'ProfilePlaceAgent',
		outputSchema: profilePlaceSchema,
	};

	protected getModel(): LlmModelChoice {
		return 'mini';
	}

	protected getInstructions(): string {
		return (
			'You are given one Instagram profile (its handle, display name, bio, business category and followers) and the Google Maps ' +
			'places found at the address its bio writes out. Decide whether the profile is the own account of one of those places: the ' +
			'business itself posting as itself. Answer its id, or null. ' +
			'It is the place when the profile speaks as the business (opening hours, "book a table", "our menu", the address as its ' +
			"own location, a category that fits the place) and its name can be the place's under another spelling, a shortening, the " +
			"owner's brand or the name before a rebrand. " +
			'Answer null when the profile recommends or reviews the place rather than being it (a food blogger, a guide, a fan page: ' +
			'"fav spot", "my go-to", "where to eat"), when it is a supplier, an agency, an event or a person working there, when ' +
			'several candidates fit equally, or when nothing in the profile ties it to one candidate. Never pick a place only because ' +
			"it is the only candidate: a wrong answer makes one business another's account."
		);
	}

	// Worked examples (invented): the cases a quick model gets wrong
	protected getCoaching(): string {
		return (
			'Examples. Profile "kantine.k36", display "Kantine K36", bio "Mittagstisch Mo–Fr 12–15 · Oranienstraße 36", category ' +
			'Restaurant; candidates "Restaurant Morgenland" (Oranienstraße 36) and "Späti 36" (Oranienstraße 36, convenience store): ' +
			'null unless something ties it to Morgenland, since a canteen named for the house number may be either or neither. ' +
			'Profile "baobao.markthalle", bio "Bao buns in Markthalle Neun · Eisenbahnstraße 42"; candidates "Markthalle Neun", ' +
			'"Bao Bao Stand" and "Kaffee Neun": pick "Bao Bao Stand" (its own stall, the hall is not its account). Profile ' +
			'"berlinbrunchclub", display "Berlin Brunch Club 🥞", bio "best brunch in town · fav spot: Café Fleury, Weinbergsweg 20", ' +
			'category Blogger, 40k followers; candidate "Café Fleury": null (it recommends the café, it is not the café). Profile ' +
			'"lafamiglia.bln", display "La Famiglia", bio "Pizza napoletana since 2009 · Kastanienallee 12 · reservations via link", ' +
			'category Pizza place; candidates "Pizzeria Due Fratelli" (Kastanienallee 12) and "Kastanie Bar": pick neither unless the ' +
			'bio ties it, since a different name at the same address may be a newer tenant; but when the bio says "formerly Due ' +
			'Fratelli" pick Due Fratelli. Profile "noodlehaus", display "NOODLE HAUS", bio "Hand-pulled noodles · Torstraße 98", ' +
			'category Restaurant; candidates "Noodle House Berlin" (Torstraße 98) and "Hostel Torstraße": pick "Noodle House Berlin" ' +
			'(the same name spelled another way, a restaurant, at its address).'
		);
	}
}
