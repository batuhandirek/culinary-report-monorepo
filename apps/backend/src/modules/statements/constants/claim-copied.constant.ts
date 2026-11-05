/**
 * How agent A names a claim's foods (`claimSchema.foods`), saying what agent B's rules say
 * (`ClaimPartsAgent`): the same right answer, so either can name them. A names them while it reads
 * the whole source; a decision model (the claim-labels classifier) can't copy words out of a text.
 */
export const CLAIM_FOODS_RULE =
	'With each claim give its foods: every dish, drink, ingredient or kind of food the claim names, each spelled ' +
	'exactly as the source spells it, copied from the quote in its language (quote "die Pommes waren matschig": ' +
	'"Pommes", never "fries"), never translated, normalised or completed ("the döner" is "döner"); empty when the ' +
	'claim is about the place, the service or the food in general. A general word is never a food: "food", ' +
	'"dishes", "meal", "plate", "drinks", "snacks", "toppings", "menu".';

/** Where a quick reader goes wrong naming foods, as B's coaching has it */
export const CLAIM_FOODS_COACHING =
	'Foods: copy each food word out of the quote letter for letter, in its language (quote "zwei Stück Apfelkuchen": ' +
	'"Apfelkuchen", never "apple cake"), and use the English only when no quote names the food. Name every dish, drink, ' +
	'ingredient, sauce, side, topping or flavour the claim names, not only the main one ("a burger with Obatzda, ' +
	'radish and a pretzel bun": burger, Obatzda, radish, pretzel bun), and the food a claim is about when its words ' +
	'only point at it ("it was greasy" after "the lahmacun came cold": lahmacun). A general word is never a food in ' +
	'any language ("Getränke", "Speisen", "Spezialitäten", "yemekler").';

/**
 * How agent A gives the number a claim states (`claimSchema.amount` / `unit`), saying what agent
 * B's rules say: copied from the text, never estimated. The stored amount is A's when it gives one
 * for a unit, else the text parsed for the aspect's unit (`claimPartsOf`).
 */
export const CLAIM_AMOUNT_RULE =
	'With each claim give the number it states, with its unit, only when the text states it, never an estimate: ' +
	'for a wait the minutes ("an hour" is 60, "half an hour" 30, "30 to 40 minutes" 40), for a price the price in ' +
	'the local currency ("dürüm now €9.50" is 9.5); amount and unit null for "waited forever" or "pricey" and for a ' +
	'claim stating no wait or price.';
