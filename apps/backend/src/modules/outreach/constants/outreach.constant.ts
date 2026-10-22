/** Where a prospect stands in the sales conversation. */
export enum ProspectStageEnum {
	TO_CONTACT = 'TO_CONTACT',
	// We reached out and are waiting for an answer
	CONTACTED = 'CONTACTED',
	REPLIED = 'REPLIED',
	MEETING = 'MEETING',
	WON = 'WON',
	LOST = 'LOST',
	// They asked not to be contacted: nothing may be sent to them again
	OPTED_OUT = 'OPTED_OUT',
}

/** One entry in a prospect's log. */
export enum OutreachTouchKindEnum {
	EMAIL = 'EMAIL',
	DM = 'DM',
	CALL = 'CALL',
	VISIT = 'VISIT',
	// Their answer, on any channel
	REPLY = 'REPLY',
	NOTE = 'NOTE',
	// An admin moved the prospect to another stage
	STAGE = 'STAGE',
}

/** What a visit or a call came to. The stage stays the salesperson's move. */
export enum OutreachTouchOutcomeEnum {
	SPOKE_TO_OWNER = 'spoke_to_owner',
	SPOKE_TO_STAFF = 'spoke_to_staff',
	// Shut when we came, or nobody picked up
	CLOSED = 'closed',
	NOBODY = 'nobody',
}

/** The kinds that are us reaching out. */
export const OUTGOING_TOUCH_KINDS: OutreachTouchKindEnum[] = [
	OutreachTouchKindEnum.EMAIL,
	OutreachTouchKindEnum.DM,
	OutreachTouchKindEnum.CALL,
	OutreachTouchKindEnum.VISIT,
];

/** The kinds that happen in person or on the phone: the only ones with an outcome, a come-back time and consent. */
export const IN_PERSON_TOUCH_KINDS: OutreachTouchKindEnum[] = [
	OutreachTouchKindEnum.VISIT,
	OutreachTouchKindEnum.CALL,
];

/** The stages that end the conversation, so no follow-up is due. */
export const CLOSED_STAGES: ProspectStageEnum[] = [
	ProspectStageEnum.WON,
	ProspectStageEnum.LOST,
	ProspectStageEnum.OPTED_OUT,
];

/**
 * Days until the next follow-up after the first, second… outreach that got no answer. After
 * the last one the sequence is over and no follow-up is set.
 */
export const FOLLOW_UP_DAYS = [4, 7];

/** The languages the outreach templates are written in. */
export const PROSPECT_LANGUAGES = ['en', 'de'] as const;
export type ProspectLanguage = (typeof PROSPECT_LANGUAGES)[number];
