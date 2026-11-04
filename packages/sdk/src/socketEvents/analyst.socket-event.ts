// The analyst's conversations (`/admin/ask`): the backend's `AnalystGateway` (namespace `analyst`)
// emits these to the room of a thread; the page's store applies them. A message is the admin's
// question or the analyst's answer; its parts are what it is made of, in order (text, the plan,
// each query with its rows, a lookup, the referenced entities, an error).

export const ANALYST_SOCKET_NAMESPACE = '/analyst';
/** Every gateway lives under `/api` so the dev proxy and the production router pass it to Nest */
export const SOCKET_IO_PATH = '/api/socket.io';

export type AnalystMessageStatus = 'queued' | 'running' | 'done' | 'failed';

export type AnalystMentionType =
	| 'venue'
	| 'brand'
	| 'aspect'
	| 'topic'
	| 'term'
	| 'city'
	| 'creator'
	| 'post';

/** One `@Type:id` an admin wrote, as the backend resolved it */
export interface AnalystMention {
	type: AnalystMentionType;
	/** As written after the colon: an id, or a topic's key */
	ref: string;
	/** The row's id, when found */
	id?: string;
	label?: string;
	/** A line or two of what the row is, as the analyst was told */
	facts?: string;
	found: boolean;
}

export interface AnalystPlanStep {
	title: string;
	status: 'todo' | 'doing' | 'done' | 'skipped';
}

export type AnalystChartKind = 'bar' | 'line';

export interface AnalystChart {
	kind: AnalystChartKind;
	/** The column on the x axis (a category or a month) */
	x: string;
	/** The numeric columns drawn */
	y: string[];
}

export type AnalystPartData =
	| { type: 'text'; text: string }
	| { type: 'mentions'; mentions: AnalystMention[] }
	| { type: 'plan'; steps: AnalystPlanStep[] }
	| {
			type: 'query';
			/** Why the analyst ran it, in its words */
			purpose: string;
			sql: string;
			/** A result meant for the reader (`show`), drawn open under the answer */
			title?: string;
			show: boolean;
			chart?: AnalystChart;
			columns?: string[];
			rows?: (string | number | boolean | null)[][];
			/** Rows the query returned, before the stored cut */
			rowCount?: number;
			truncated?: boolean;
			error?: string;
			durationMs?: number;
	  }
	| {
			type: 'lookup';
			tool: string;
			input: Record<string, unknown>;
			summary?: string;
			error?: string;
	  }
	| { type: 'error'; message: string };

export type AnalystPartType = AnalystPartData['type'];

export interface AnalystPartPayload {
	id: string;
	position: number;
	/** Still being written (a text streaming in, a query running) */
	streaming: boolean;
	data: AnalystPartData;
	createdAt: string;
}

export interface AnalystAuthorPayload {
	id: string;
	firstName: string;
	/** `system` is the analyst (the system account) */
	roles: string[];
}

export interface AnalystUsagePayload {
	inputTokens: number;
	outputTokens: number;
	cachedInputTokens: number;
	cacheWriteTokens: number;
	steps: number;
	queries: number;
}

/** The same shape `GET /admin/analyst/threads/:id` lists a message in */
export interface AnalystMessagePayload {
	id: string;
	thread: { id: string };
	author: AnalystAuthorPayload;
	status: AnalystMessageStatus;
	model?: string;
	usd?: number;
	usage?: AnalystUsagePayload;
	createdAt: string;
	finishedAt?: string;
	parts: AnalystPartPayload[];
}

export class AnalystMessageCreatedSocketEvent {
	static readonly type = 'analyst.message.created';
	constructor(public payload: { threadId: string; message: AnalystMessagePayload }) {}
}

/** The message's own fields changed (status, model, cost); its parts come on their own events */
export class AnalystMessageUpdatedSocketEvent {
	static readonly type = 'analyst.message.updated';
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

export class AnalystPartCreatedSocketEvent {
	static readonly type = 'analyst.part.created';
	constructor(public payload: { threadId: string; messageId: string; part: AnalystPartPayload }) {}
}

/** The whole part again (a query's rows, the plan's statuses, a finished text) */
export class AnalystPartUpdatedSocketEvent {
	static readonly type = 'analyst.part.updated';
	constructor(public payload: { threadId: string; messageId: string; part: AnalystPartPayload }) {}
}

/** Text added to a streaming text part, never stored on its own: the part's update carries the whole */
export class AnalystPartDeltaSocketEvent {
	static readonly type = 'analyst.part.delta';
	constructor(
		public payload: { threadId: string; messageId: string; partId: string; delta: string },
	) {}
}

/** The thread's title or last activity changed: the list on the left */
export class AnalystThreadUpdatedSocketEvent {
	static readonly type = 'analyst.thread.updated';
	constructor(public payload: { threadId: string; title?: string; lastMessageAt: string }) {}
}

/** Client → server: join or leave a thread's room */
export const ANALYST_SUBSCRIBE_THREAD = 'subscribeThread';
export const ANALYST_UNSUBSCRIBE_THREAD = 'unsubscribeThread';
