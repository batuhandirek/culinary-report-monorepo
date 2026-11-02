import { CHANGE_RULE } from './change.constant.js';

/**
 * What sort of thing a claim says (`Statement.kind`), beside what it is about (its aspect and
 * foods) and how it judges (its sentiment): the user's decision of 2026-10-31 (`claim-model-v2`).
 * One per claim, set by agent B and final, so a rule change is fixed by re-reading the claims.
 */
export const STATEMENT_KINDS = [
	'opinion',
	'fact',
	'change',
	'new_item',
	'deal',
	'event',
	'question',
	'verdict',
] as const;

export type StatementKind = (typeof STATEMENT_KINDS)[number];

/** How agent B tells the kinds apart, in its instructions */
export const KIND_RULES =
	'The kind of the claim, exactly one: opinion (a judgement of the food, drinks, service, place or prices: "the döner ' +
	'was damn good", "too pricey"); fact (neutral information with no judgement: "fries for 10 euros", "open until 22", ' +
	'"we came on a Tuesday"); change (' +
	CHANGE_RULE +
	'); new_item (a dish, drink or menu added: "meet our new Mint & Ginger hot drink", "three new flavours"; a new item ' +
	'is not a change); deal (a limited offer: a discount, happy hour, 2-for-1, a free item, a price with dates, hours or a ' +
	'condition: "baklava 20 € a kilo from 15 to 25 March"; a permanent price is a fact); event (an anniversary, a ' +
	'pop-up, a party, a tasting, a live night: "30 years in Moabit, two days of celebration"); question (something asked, ' +
	'not said: "how long is the wait?", "is it halal?"); verdict (a recommendation either way, about the place as a whole: ' +
	'"highly recommend", "avoid at all costs", "will be back", "best kebab in Berlin").';
