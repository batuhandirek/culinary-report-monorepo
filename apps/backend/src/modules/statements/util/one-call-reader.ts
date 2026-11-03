/** One step's instructions, quoted under its title: how composed prompts (the one-call readers, the eval's references) carry another agent's rules */
export const stepBlock = (title: string, instructions: string) =>
	`\n\n=== ${title} ===\n${instructions}`;

/**
 * What a one-call reader is (`ReviewReaderAgent`, `PostReaderAgent`): agent A's work and agent B's
 * in one answer, each step's rules quoted as the agent's own (`rulesFor`), so A's and B's rules
 * stay the single source and the reader only says how the two fit together.
 */
export const READER_PREAMBLE =
	'You read one source for a monthly report to the owner of a restaurant, bar or café, doing in one answer the work of ' +
	'two steps whose instructions are quoted below. Step A says what the source is split into: its claims, each with the ' +
	"source's own words for it (and for a post, the places it talks about and what each claim is about). Step B says what " +
	'parts each claim has: its sentiment, its aspect, the foods it names, the number it states and its kind. Step B was ' +
	'written for a reader given one claim at a time with the place and the other claims beside it; here you write the ' +
	'claims yourself, so give each claim its parts as you write it, reading it against the source and the claims around ' +
	"it. A claim's text follows step A whatever its parts turn out to be: never merge, drop or reword a claim to make its " +
	'parts easier.';

/** The coaching of both steps, each under its step: a reader is coached as its two agents are */
export const readerCoaching = (coachingA: string, coachingB: string) =>
	[
		coachingA && stepBlock('How to read step A closely', coachingA),
		coachingB && stepBlock('How to read step B closely', coachingB),
	]
		.filter(Boolean)
		.join('')
		.trim();
