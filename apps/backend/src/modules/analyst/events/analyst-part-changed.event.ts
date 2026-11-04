import type { AdminAnalystPartOutputDto as AnalystPartPayload } from '../dto/admin-analyst.dto.js';

/** A part was added to an answer (`created`) or written again whole (`updated`) */
export class AnalystPartChangedEvent {
	public static readonly type = 'analyst.part.changed';
	constructor(
		public payload: {
			threadId: string;
			messageId: string;
			part: AnalystPartPayload;
			change: 'created' | 'updated';
		},
	) {}
}
