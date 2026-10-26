import type { ReportAnalysisPublic } from '../interfaces/report-analysis.interface.js';

import type { AdminReportOutputDto } from './admin-report.output.dto.js';

/** A private link to a report, as the admin report page lists it. */
export interface AdminReportShareOutputDto {
	id: string;
	createdAt: Date;
	token: string;
	/** The page the link opens, `<app>/r/<token>` */
	url: string;
	/** Opens in a browser by someone who is not an admin */
	openCount: number;
	lastOpenedAt?: Date;
	/** Set once the link is turned off; it then answers 404 */
	revokedAt?: Date;
	createdBy?: { id: string; firstName: string; lastName: string };
}

/**
 * A report opened through a private link: the same document the admin sees, without its delivery
 * record and without the analysis's trace (`toPublicOutput`).
 */
export interface SharedReportOutputDto extends Omit<AdminReportOutputDto, 'sentAt' | 'analysis'> {
	/** What moved, and why it might have; absent for reports built before it */
	analysis?: ReportAnalysisPublic;
}
