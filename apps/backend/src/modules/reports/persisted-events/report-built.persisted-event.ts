export interface ReportBuiltEventPayload {
	reportId: string;
}

/**
 * A report was built or rebuilt (`ReportService.build`). The outreach side mails it to a venue
 * that subscribed: the reports module never imports outreach.
 */
export class ReportBuiltEvent {
	public static readonly eventName = 'report-built';
	constructor(public payload: ReportBuiltEventPayload) {}
}
