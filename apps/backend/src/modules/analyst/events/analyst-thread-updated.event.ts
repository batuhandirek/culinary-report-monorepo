/** A thread's title or last activity changed: every admin's list */
export class AnalystThreadUpdatedEvent {
	public static readonly type = 'analyst.thread.updated';
	constructor(public payload: { threadId: string; title?: string; lastMessageAt: string }) {}
}
