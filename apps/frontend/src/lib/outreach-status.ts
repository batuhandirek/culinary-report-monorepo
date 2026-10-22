import {
	ArrowRightLeft,
	Footprints,
	Mail,
	MessageCircle,
	Phone,
	Reply,
	StickyNote
} from '@lucide/svelte';
import type { Component } from 'svelte';

// The one place outreach stages and log entries get their words. Stage colours are in
// `admin-format.ts` (`prospectStageVariant`), with the other admin states.

export type ProspectStage =
	| 'TO_CONTACT'
	| 'CONTACTED'
	| 'REPLIED'
	| 'MEETING'
	| 'WON'
	| 'LOST'
	| 'OPTED_OUT';

export type OutreachTouchKind = 'EMAIL' | 'DM' | 'CALL' | 'VISIT' | 'REPLY' | 'NOTE' | 'STAGE';

/** In pipeline order. */
export const PROSPECT_STAGES: { value: ProspectStage; label: string; hint: string }[] = [
	{ value: 'TO_CONTACT', label: 'To contact', hint: 'Not contacted yet' },
	{ value: 'CONTACTED', label: 'Waiting', hint: 'Contacted, no answer yet' },
	{ value: 'REPLIED', label: 'Replied', hint: 'They answered: your move' },
	{ value: 'MEETING', label: 'Meeting', hint: 'A call or visit is set' },
	{ value: 'WON', label: 'Won', hint: 'A paying customer' },
	{ value: 'LOST', label: 'Lost', hint: 'Not interested, for now' },
	{
		value: 'OPTED_OUT',
		label: 'Opted out',
		hint: 'Asked not to be contacted: never write to them again'
	}
];

export const stageLabel = (stage: string) =>
	PROSPECT_STAGES.find((s) => s.value === stage)?.label ?? stage;

export const TOUCH_KINDS: Record<OutreachTouchKind, { label: string; icon: Component }> = {
	EMAIL: { label: 'Email sent', icon: Mail },
	DM: { label: 'DM sent', icon: MessageCircle },
	CALL: { label: 'Call', icon: Phone },
	VISIT: { label: 'Visit', icon: Footprints },
	REPLY: { label: 'They replied', icon: Reply },
	NOTE: { label: 'Note', icon: StickyNote },
	STAGE: { label: 'Moved', icon: ArrowRightLeft }
};

/** What an admin can add to the log by hand, the likeliest first. */
export const LOGGABLE_KINDS: { value: Exclude<OutreachTouchKind, 'STAGE'>; label: string }[] = [
	{ value: 'REPLY', label: 'They replied' },
	{ value: 'CALL', label: 'Call' },
	{ value: 'VISIT', label: 'Visit' },
	{ value: 'EMAIL', label: 'Email sent' },
	{ value: 'DM', label: 'DM sent' },
	{ value: 'NOTE', label: 'Note' }
];

export type OutreachTouchOutcome = 'spoke_to_owner' | 'spoke_to_staff' | 'closed' | 'nobody';

/** What a visit or a call came to, the likeliest first. */
export const TOUCH_OUTCOMES: { value: OutreachTouchOutcome; label: string }[] = [
	{ value: 'spoke_to_owner', label: 'Spoke to the owner' },
	{ value: 'spoke_to_staff', label: 'Spoke to staff' },
	{ value: 'nobody', label: 'Nobody there' },
	{ value: 'closed', label: 'Closed' }
];

export const outcomeLabel = (outcome: string) =>
	TOUCH_OUTCOMES.find((o) => o.value === outcome)?.label ?? outcome;

/** The kinds that happen in person or on the phone: the only ones logged with an outcome, a come-back time and consent. */
export const IN_PERSON_KINDS: OutreachTouchKind[] = ['VISIT', 'CALL'];

/**
 * Whether a cold e-mail would go out without their OK: no consent on record (a visit or call
 * logged with it, or set by hand) and no reply from them yet. German law (UWG §7) asks for
 * consent before a promotional e-mail to a business; a reply from them makes it a conversation.
 */
export const needsEmailConsent = (prospect: {
	emailConsentAt?: string | Date | null;
	touches: { kind: string }[];
}) => !prospect.emailConsentAt && !prospect.touches.some((t) => t.kind === 'REPLY');

export const touchLabel = (touch: { kind: string; stage?: string }) =>
	touch.kind === 'STAGE'
		? `Moved to ${stageLabel(touch.stage ?? '')}`
		: (TOUCH_KINDS[touch.kind as OutreachTouchKind]?.label ?? touch.kind);

/** Whether a follow-up falls due by the end of today, local time. */
export const isDueToday = (at?: string | Date | null) => {
	if (!at) return false;
	const now = new Date();
	return new Date(at) < new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
};
