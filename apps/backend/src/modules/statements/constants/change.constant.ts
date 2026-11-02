/**
 * What a noticed change is: the definition of the kind `change` inside `KIND_RULES`, told to agent B,
 * whose answer is final. Measured on dev Berlin (2026-10-31): without the
 * "not a change" half, a third to two thirds of the flags were consistency ("delicious as always",
 * "tasted delicious again"), another branch, an opening or a wish.
 */
export const CHANGE_RULE =
	'A change is something that is now different from before at this place: a new owner or new staff, prices went up, ' +
	'smaller or bigger portions, renovated, something taken off the menu, now card only, worse or ' +
	'better than on an earlier visit ("the meat wasn\'t as juicy this time", "has really improved"). Not a change: something that ' +
	'stayed the same ("delicious as always", "still top-notch", "tasted great again", "hasn\'t lost its taste", "every time we ' +
	'come back"), a return visit, another branch or location, a newly opened place (that is an opening, not a change), a dish or drink added (that is a new item), a wish ' +
	'or a hope ("hope they improve"), something that changed during one visit ("after we complained they checked on us"), a ' +
	'price or a fact with no before ("all wraps cost 7€ in April"), and anything about the city as a whole.';
