import type { AnalystMessageStatus } from 'sdk';

/** An answer's status, model or cost changed */
export class AnalystMessageUpdatedEvent {
	public static readonly type = 'analyst.message.updated';
	constructor(
		public payload: {
			threadId: string;
			messageId: string;
			status: AnalystMessageStatus;
			model?: string;
			usd?: number;
		},
	) {}
}
