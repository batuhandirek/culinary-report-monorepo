// What the A5 leave-behind prints: the page a salesperson leaves at the counter after a visit.
// Built by `util/leave-behind.ts`, handed to the frontend's `/print/leave-behind` page on
// `window.__LEAVE_BEHIND__` (the page mirrors this shape; keep both in step).

export interface LeaveBehindFinding {
	title: string;
	text: string;
}

export interface LeaveBehindContact {
	name: string;
	email?: string;
	phone?: string;
}

export interface LeaveBehindData {
	reportId: string;
	/** `YYYY-MM` */
	month: string;
	brand: string;
	city?: string;
	/** The report's cover title and headline */
	title: string;
	headline: string;
	/** Three at most */
	findings: LeaveBehindFinding[];
	/** The private link the QR code opens (`/r/<token>`), printed under it too */
	shareUrl: string;
	/** The QR code as an inline SVG, drawn at print time */
	qrSvg: string;
	/** The salesperson, so the owner can write or call back */
	contact: LeaveBehindContact;
}
