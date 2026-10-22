import { renderSVG } from 'uqr';

import type { Report } from '../entities/report.entity.js';
import type { LeaveBehindContact, LeaveBehindData } from '../interfaces/leave-behind.interface.js';

/** How many findings the A5 page has room for. */
export const LEAVE_BEHIND_FINDINGS = 3;

/**
 * The share link as a QR code, an SVG with no quiet zone (the page pads it). Drawn locally at
 * print time, so printing needs no network and the link never leaves the server.
 */
export const leaveBehindQr = (url: string) =>
	renderSVG(url, { ecc: 'M', border: 0, pixelSize: 1 });

/** What the leave-behind page prints for a report, given its live share link. */
export const leaveBehindData = (
	report: Report,
	shareUrl: string,
	contact: LeaveBehindContact,
): LeaveBehindData => ({
	reportId: report.id,
	month: report.month,
	brand: report.brand.name,
	...(report.city && { city: report.city.name }),
	title: report.highlights.title,
	headline: report.highlights.headline,
	findings: report.highlights.highlights
		.slice(0, LEAVE_BEHIND_FINDINGS)
		.map(point => ({ title: point.title, text: point.text })),
	shareUrl,
	qrSvg: leaveBehindQr(shareUrl),
	contact,
});
