export interface ReviewAlertEventPayload {
	/** The `Review` row's id */
	reviewId: string;
}

/**
 * The weekly review watch found a new critical review of a subscribed venue
 * (`ReviewService.claimAlerts`). The outreach side mails the owner: the venues module
 * never imports outreach.
 */
export class ReviewAlertEvent {
	public static readonly eventName = 'review-alert';
	constructor(public payload: ReviewAlertEventPayload) {}
}
