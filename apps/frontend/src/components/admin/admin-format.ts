import {
	formatAbsolute,
	formatRelative,
	formatTime,
	formatWeekday
} from '#ui/components/paginated-data-table/format.js';
import type { BadgeVariant } from '#ui/primitives-new/badge/index.js';

// The one place admin pages get a date from. Everything is written the way the tables
// write it — English, day first, 24h — whatever locale the storefront set on dayjs. The
// table's own `date` columns come out of the same functions.

type DateInput = string | Date | null | undefined;

/** `06 Oct 2026, 17:48`; a missing one is a dash. */
export const at = (date?: DateInput) => formatAbsolute(date) || '—';

/** `06 Oct, 17:48` — the year only when it is not this one; a missing one is a dash. */
export const atShort = (date?: DateInput) => formatAbsolute(date, 'datetime', true) || '—';

/** `06 Oct 2026, 17:48:02`, for a tooltip over an event; a missing one is a dash. */
export const atExact = (date?: DateInput) =>
	date ? `${formatAbsolute(date, 'date')}, ${formatTime(date, true)}` : '—';

/** `06 Oct 2026`; a missing one is a dash. */
export const onDay = (date?: DateInput) => formatAbsolute(date, 'date') || '—';

/** `Tue, 06 Oct 2026`: the heading over a day of a timeline. */
export const dayHeading = (date?: DateInput) => formatWeekday(date);

/** `17:48`, or `17:48:02` with `seconds`. */
export const clock = (date?: DateInput, seconds = false) => formatTime(date, seconds);

/** `3h ago`, `in 2d`; empty when there is no date. */
export const ago = (date?: DateInput) => formatRelative(date);

/** "A > B > C" as the leading path and the leaf, separately. */
export const splitCategoryPath = (path: string) => {
	const parts = path.split(' > ');
	return { ancestors: parts.slice(0, -1).join(' › '), name: parts[parts.length - 1] };
};

// One colour per state, shared by a list and the page its rows open: green is live and
// well, orange is in motion, amber is waiting on somebody, red is a problem or a takedown,
// grey has ended quietly, and an outline is not started yet.

/** Listings, saved searches, blog entries and chats. */
export const stateVariant = (state: string): BadgeVariant => {
	switch (state) {
		case 'ACTIVE':
		case 'PUBLISHED':
			return 'success';
		case 'SOLD':
			return 'primary';
		case 'FLAGGED':
		case 'REMOVED':
		case 'FAILED':
			return 'destructive';
		case 'EXPIRED':
		case 'CLOSED':
			return 'secondary';
		default:
			return 'outline';
	}
};

/** Orders, on the orders list, the escrow list and the order page. */
export const orderStateVariant = (state: string): BadgeVariant => {
	switch (state) {
		case 'PAID':
		case 'ISSUE_REPORTED':
			return 'warning';
		case 'SHIPPED':
			return 'primary';
		case 'COMPLETED':
			return 'success';
		default:
			return 'secondary';
	}
};

/** Offers, on the offers list and in a conversation's rail. */
export const offerStateVariant = (state: string): BadgeVariant => {
	switch (state) {
		case 'IN_PROGRESS':
			return 'warning';
		case 'ACCEPTED':
			return 'primary';
		case 'FULFILLED':
			return 'success';
		case 'REJECTED':
			return 'destructive';
		default:
			return 'secondary';
	}
};

/** Payments, refunds and payouts alike. */
export const moneyStatusVariant = (status: string): BadgeVariant => {
	switch (status) {
		case 'SUCCEEDED':
			return 'success';
		case 'PENDING':
		case 'HELD':
			return 'warning';
		case 'FAILED':
			return 'destructive';
		default:
			return 'secondary';
	}
};

/** Outreach prospects, on the outreach list and a prospect's page. */
export const prospectStageVariant = (stage: string): BadgeVariant => {
	switch (stage) {
		case 'CONTACTED':
			return 'warning';
		case 'REPLIED':
		case 'MEETING':
			return 'primary';
		case 'WON':
			return 'success';
		case 'OPTED_OUT':
			return 'destructive';
		case 'LOST':
			return 'secondary';
		default:
			return 'outline';
	}
};

/** Pipeline runs, on the pipeline page and the overview. */
export const pipelineRunStatusVariant = (status: string): BadgeVariant => {
	switch (status) {
		case 'SUCCEEDED':
			return 'success';
		case 'FAILED':
			return 'destructive';
		case 'RUNNING':
			return 'warning';
		default:
			return 'secondary';
	}
};
