import { Injectable } from '@nestjs/common';

import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';
import type { LlmModelChoice } from 'src/modules/llm/constants/llm-models.constant.js';
import {
	CLAIM_AMOUNT_RULE,
	CLAIM_FOODS_COACHING,
	CLAIM_FOODS_RULE,
} from 'src/modules/statements/constants/claim-copied.constant.js';

/**
 * One claim as agent A answers it: one thing said, in English, with the source's own words and the
 * foods it names as spelled. Its sentiment, aspect, kind and number are agent B's (or the
 * claim-labels classifier's)
 */
export const claimSchema = z.object({
	text: z
		.string()
		.describe(
			'One thing the text says, as a short English phrase keeping the words that matter ("waited 50 minutes", "the döner was damn good", "döner for 15 euros"); it names what it is about, never "it" or "both"',
		),
	quote: z
		.string()
		.nullable()
		.describe(
			'The exact words of the source this claim comes from, copied character for character in the source\'s language ("Die Pommes waren matschig"), the shortest span that says it; null when no span says it on its own',
		),
	foods: z
		.array(z.string())
		.describe(
			'The dishes, drinks, ingredients or kinds of food the claim names, each spelled exactly as the source spells it, from the quote in its language, never translated; empty when it names none',
		),
	amount: z
		.number()
		.nullable()
		.describe('The minutes waited or the price the claim states; null when it states none'),
	unit: z
		.enum(['minutes', 'money'])
		.nullable()
		.describe('What the amount measures: minutes waited, or a price; null with amount null'),
});

const reviewClaimsSchema = z.object({
	claims: z
		.array(claimSchema)
		.describe(
			'Everything the review says, one claim each. Empty only for a review that says nothing',
		),
});

/** Agent A's answer on one review */
export type ReviewClaimsAnswer = z.infer<typeof reviewClaimsSchema>;

/**
 * Agent A for reviews: splits one Google or TripAdvisor review (one a call) into claims
 * (one thing said each, neutral facts kept, every dish named kept), each with its quote in the
 * review's own words, its foods as spelled (`CLAIM_FOODS_RULE`) and the number it states (`CLAIM_AMOUNT_RULE`). No sentiment, aspect or kind
 * here: agent B (or the claim-labels classifier) reads those from the claims; a review's
 * overall view is its stars. Production stores B's foods and amounts until the user switches to A's.
 */
@Injectable()
export class ReviewClaimsAgent extends BaseMastraAgent<typeof reviewClaimsSchema> {
	protected readonly config: BaseMastraAgentConfig<typeof reviewClaimsSchema> = {
		id: 'review-claims',
		name: 'ReviewClaimsAgent',
		outputSchema: reviewClaimsSchema,
	};

	// Thousands of reviews a month: mini, whose daily complimentary allowance is 10M tokens (the
	// full model's is 1M, and one month's reviews used it up)
	protected getModel(): LlmModelChoice {
		return 'mini';
	}

	protected getInstructions(): string {
		return (
			'You read one Google or TripAdvisor review of a restaurant, bar or café for a monthly report to its owner. It comes ' +
			'with its original text and, when it is in another language, an English translation to read it by. ' +
			'Split what it says into claims: one thing said per claim, as a short English phrase that keeps the words that matter — what ' +
			'was eaten or drunk, spelled as the reviewer spells it ("Pommes" stays "Pommes"), the numbers stated (minutes waited, prices), ' +
			'who or what it is about. "Damn good döner, but 15 euros" is two claims: "the döner was damn good" and "the döner cost 15 euros". ' +
			'Keep neutral facts with no judgement ("fries for 10 euros", "came on a Tuesday evening") and every dish or drink named, as a ' +
			'claim of its own when no other claim names it ("had the lahmacun"). A claim names what it is about: "the Gemüse kebab is ' +
			'incredibly delicious", never "it is incredibly delicious"; "the dürüm and the box were delicious", never "both were". With ' +
			"each claim give its quote: the exact words of the review it comes from, copied character for character in the review's " +
			'language (the original text, not a translation), the shortest span that says it. ' +
			CLAIM_FOODS_RULE +
			' ' +
			CLAIM_AMOUNT_RULE +
			' Only what the review says: never add, judge or summarise. Never drop a claim because it fits no category.'
		);
	}

	// Worked examples (invented): they teach the cases a quick model gets wrong, and keep the fixed
	// instructions past the 1,024 tokens a provider caches from
	protected getCoaching(): string {
		return (
			'Never start a claim with "it", "this", "that" or "they" for a thing: name what it is about every time, the dish, drink, place or part of the visit, even when the text only points at it ("schmeckt fast wie Karamell" after the creator holds up a sweet they never name is "the sweet tastes almost like caramel", never "it tastes almost like caramel"; "it tasted meaty" after "the jackfruit burger" is "the jackfruit burger tasted meaty"). ' +
			'Phrase a claim by what is meant, never word for word: an idiom says its meaning ("das war ein Griff ins Klo" is ' +
			'"the visit was a bad choice"). ' +
			'Examples. Review (German, 2 stars): "Lange gewartet, fast 40 Minuten, aber die Pommes waren knusprig. Leider war das ' +
			'Schnitzel trocken und mit 18 € viel zu teuer. Früher war es hier besser." Claims: "waited almost 40 minutes" (quote ' +
			'"fast 40 Minuten"); "the Pommes were crispy" ("die Pommes waren knusprig"); "the Schnitzel was dry" ("das Schnitzel war ' +
			'trocken"); "the Schnitzel cost 18 €, far too expensive" ("mit 18 € viel zu teuer"); "it used to be better here" ("Früher ' +
			'war es hier besser"). Review (English, 5 stars): "Came with my parents on a Sunday. Friendly staff, the lamb tagine was ' +
			'amazing and they had gluten-free bread. Will be back!" Claims: "came with parents on a Sunday"; "the staff were ' +
			'friendly"; "the lamb tagine was amazing"; "they had gluten-free bread"; "will be back". Review (Turkish, 4 stars): ' +
			'"Lahmacun çok lezzetliydi ama servis biraz yavaştı" with an English translation. Claims: "the Lahmacun was very tasty" ' +
			'(quote "Lahmacun çok lezzetliydi"); "the service was a bit slow" ("servis biraz yavaştı"). Review (5 stars, no text but ' +
			'"Top!"): one claim, "top" ("Top!"). What these show: one thing a claim, a judgement split from a price ("dry" and "18 €" ' +
			'are two claims), a dish kept as the reviewer spells it (Pommes, Schnitzel, Lahmacun), the minutes and the price kept, a ' +
			'neutral fact kept ("came on a Sunday"), a comparison with before kept ("it used to be better"), quotes in the review\'s own ' +
			'language and never the translation\'s, and no claim the review does not make (no "the place is popular" from a wait). ' +
			'Their foods: Pommes, then Schnitzel and Schnitzel; lamb tagine, gluten-free bread; Lahmacun; none for the wait, the ' +
			'staff, the visit or "top". ' +
			CLAIM_FOODS_COACHING
		);
	}
}
