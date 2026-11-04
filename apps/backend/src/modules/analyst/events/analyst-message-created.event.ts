import type { AdminAnalystMessageOutputDto as AnalystMessagePayload } from '../dto/admin-analyst.dto.js';

/** A question or an answer was stored; the gateway tells the thread's room */
export class AnalystMessageCreatedEvent {
	public static readonly type = 'analyst.message.created';
	constructor(public payload: { message: AnalystMessagePayload }) {}
}
