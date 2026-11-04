/** Text streamed into an answer's text part, not stored on its own */
export class AnalystPartDeltaEvent {
	public static readonly type = 'analyst.part.delta';
	constructor(
		public payload: { threadId: string; messageId: string; partId: string; delta: string },
	) {}
}
