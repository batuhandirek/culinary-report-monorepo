export interface AnalystAnswerJobPayload {
	/** The answer to write (status `queued`, authored by the system account) */
	messageId: string;
}

/**
 * Writes one answer (`AnalystAnswerService.answer`), queued with the question in its transaction
 * (`AnalystThreadService.ask`). Never retried: a retry would pay again and the answer's parts so
 * far would be doubled; a failed answer says so and the admin asks again.
 */
export class AnalystAnswerJob {
	public static readonly jobName = 'analyst-answer';
	constructor(public payload: AnalystAnswerJobPayload) {}
}
