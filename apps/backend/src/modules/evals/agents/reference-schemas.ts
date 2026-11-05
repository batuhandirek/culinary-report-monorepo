import { z } from 'zod/v4';

import { STATEMENT_KINDS } from 'src/modules/statements/constants/kind.constant.js';
import { SENTIMENTS } from 'src/modules/statements/constants/sentiment.constant.js';

/** One claim of a reference: step A's text and quote, step B's parts, and what else a careful reader may answer */
export const referenceClaimSchema = z.object({
	text: z
		.string()
		.describe(
			"The claim as step A's instructions want it: one thing said, a short English phrase",
		),
	quote: z
		.string()
		.nullable()
		.describe(
			"The source's own words for it, copied character for character; null when no span says it",
		),
	sentiment: z.enum(SENTIMENTS),
	aspect: z
		.string()
		.nullable()
		.describe("An aspect key from step B's list, or null when the claim is about none"),
	foods: z
		.array(z.string())
		.describe('The food and drink wordings the claim names, spelled as the source spells them'),
	amount: z.number().nullable(),
	unit: z.enum(['minutes', 'money']).nullable(),
	kind: z.enum(STATEMENT_KINDS),
	optional: z
		.boolean()
		.describe(
			'True for a claim it is fine to keep apart or to leave inside a neighbouring claim (a minor detail, an aside): an agent leaving it out misses nothing',
		),
	alsoAcceptable: z
		.object({
			sentiments: z.array(z.enum(SENTIMENTS)),
			aspects: z
				.array(z.string())
				.describe('Aspect keys; "none" when no aspect is also right'),
			kinds: z.array(z.enum(STATEMENT_KINDS)),
		})
		.describe(
			'Other answers the instructions allow for this claim; empty lists when yours is the only right one',
		),
});

/** The part every reference prompt shares: what a reference is and how to mark taste */
export const REFERENCE_PREAMBLE =
	'You write the reference answer an extraction pipeline is scored against. The pipeline reads its sources in steps, each ' +
	'with its own instructions, quoted below. Do every step yourself, as the most careful reader those instructions ' +
	'describe: follow them to the letter where they are clear, and where they leave room, take the reading the owner of a ' +
	'restaurant, bar or café reading the report would find right. Agents are scored against you, so mark where another ' +
	'answer is not wrong: a claim is optional when it is fine to keep it apart or to leave it inside a neighbouring claim (a ' +
	'minor detail, an aside), and alsoAcceptable lists the other sentiments, aspect keys and kinds the instructions allow ' +
	'for a claim. Keep alternatives few and honest: an alternative is a reading the instructions allow, never a mistake you ' +
	'would forgive. In notes, say in a sentence or two what the hard calls were, or null.';

/** One block of a reference model's instructions: a title, then the agent's own rules */
export const stepBlock = (title: string, instructions: string) =>
	`\n\n=== ${title} ===\n${instructions}`;
