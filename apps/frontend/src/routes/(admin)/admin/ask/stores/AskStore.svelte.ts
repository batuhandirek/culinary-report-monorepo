import {
	ANALYST_SOCKET_NAMESPACE,
	ANALYST_SUBSCRIBE_THREAD,
	ANALYST_UNSUBSCRIBE_THREAD,
	AnalystMessageCreatedSocketEvent,
	type AnalystMessagePayload,
	AnalystMessageUpdatedSocketEvent,
	AnalystPartCreatedSocketEvent,
	AnalystPartDeltaSocketEvent,
	type AnalystPartPayload,
	AnalystPartUpdatedSocketEvent,
	AnalystThreadUpdatedSocketEvent,
	SOCKET_IO_PATH
} from 'sdk/src';
import { io, type Socket } from 'socket.io-client';

import { api, isNotFoundError } from '#lib/api.js';
import { userStore } from '#stores/UserStore.svelte.js';
import { logFactory } from '#ui/lib/logger.js';

const logger = logFactory.create('AskStore');

export interface AskThreadRow {
	id: string;
	title: string;
	owner: { id: string; firstName: string };
	usd: number;
	lastMessageAt: string;
	createdAt: string;
}

const THREADS_PAGE = 50;

/** Parts in their order, one per id */
const withPart = (parts: AnalystPartPayload[], part: AnalystPartPayload) =>
	[...parts.filter((p) => p.id !== part.id), part].sort((a, b) => a.position - b.position);

/**
 * The Ask page's state: the thread list, the open thread's messages, and the `analyst` socket that
 * keeps both live (`AnalystGateway`). Socket events are applied in place; a part's streamed text is
 * appended until its update brings the stored whole. Joining a thread's room re-reads the thread,
 * so nothing written before the join is missed.
 */
export class AskStore {
	threads = $state<AskThreadRow[]>([]);
	threadsLoading = $state(true);
	threadsFailed = $state(false);

	threadId = $state<string | null>(null);
	messages = $state<AnalystMessagePayload[]>([]);
	threadLoading = $state(false);
	threadFailed = $state(false);
	threadMissing = $state(false);

	connected = $state(false);
	sending = $state(false);

	private socket: Socket | null = null;

	/** The answer being written in the open thread, if any */
	get busy() {
		return this.messages.some((m) => m.status === 'queued' || m.status === 'running');
	}

	connect = async () => {
		if (this.socket) return;
		const token = await userStore.getAccessToken().catch(() => null);
		const socket = io(ANALYST_SOCKET_NAMESPACE, {
			path: SOCKET_IO_PATH,
			auth: token ? { token } : {},
			transports: ['websocket']
		});
		this.socket = socket;
		socket.on('connect', () => {
			this.connected = true;
			if (this.threadId) this.join(this.threadId);
		});
		socket.on('disconnect', () => (this.connected = false));
		socket.on('connect_error', (e) => logger.warn('Analyst socket', e.message));
		socket.on(AnalystMessageCreatedSocketEvent.type, this.onMessageCreated);
		socket.on(AnalystMessageUpdatedSocketEvent.type, this.onMessageUpdated);
		socket.on(AnalystPartCreatedSocketEvent.type, this.onPart);
		socket.on(AnalystPartUpdatedSocketEvent.type, this.onPart);
		socket.on(AnalystPartDeltaSocketEvent.type, this.onDelta);
		socket.on(AnalystThreadUpdatedSocketEvent.type, this.onThread);
	};

	disconnect = () => {
		this.socket?.disconnect();
		this.socket = null;
		this.connected = false;
	};

	loadThreads = async () => {
		this.threadsFailed = false;
		try {
			const res = await api.admin.listAnalystThreads({ page: 1, size: THREADS_PAGE });
			this.threads = res.items as unknown as AskThreadRow[];
		} catch (e) {
			logger.error('Analyst threads', e);
			this.threadsFailed = true;
		} finally {
			this.threadsLoading = false;
		}
	};

	/** Opens a thread (null: a new one), leaving the room of the one before */
	open = async (threadId: string | null) => {
		if (threadId === this.threadId && (threadId === null || this.messages.length)) return;
		if (this.threadId) this.socket?.emit(ANALYST_UNSUBSCRIBE_THREAD, { threadId: this.threadId });
		this.threadId = threadId;
		this.messages = [];
		this.threadMissing = false;
		this.threadFailed = false;
		if (!threadId) return;
		this.threadLoading = true;
		await this.join(threadId);
		this.threadLoading = false;
	};

	/** Joins the thread's room, then reads the thread, so what came before the join is there */
	private join = async (threadId: string) => {
		this.socket?.emit(ANALYST_SUBSCRIBE_THREAD, { threadId });
		try {
			const res = await api.admin.getAnalystThread(threadId);
			if (this.threadId !== threadId) return;
			this.messages = res.messages as unknown as AnalystMessagePayload[];
		} catch (e) {
			if (this.threadId !== threadId) return;
			if (isNotFoundError(e)) this.threadMissing = true;
			else {
				logger.error('Analyst thread', e);
				this.threadFailed = true;
			}
		}
	};

	retry = () => (this.threadId ? this.join(this.threadId) : undefined);

	/** Asks in the open thread, or starts one; answers the thread's id */
	ask = async (text: string): Promise<string | null> => {
		this.sending = true;
		try {
			const res = await api.admin.askAnalyst({ text, ...(this.threadId && { threadId: this.threadId }) });
			const { thread, question, answer } = res as unknown as {
				thread: AskThreadRow;
				question: AnalystMessagePayload;
				answer: AnalystMessagePayload;
			};
			if (this.threadId !== thread.id) {
				this.threadId = thread.id;
				this.messages = [question, answer];
				this.join(thread.id);
			} else {
				for (const m of [question, answer]) this.addMessage(m);
			}
			this.upsertThread(thread);
			return thread.id;
		} finally {
			this.sending = false;
		}
	};

	remove = async (threadId: string) => {
		await api.admin.deleteAnalystThread(threadId);
		this.threads = this.threads.filter((t) => t.id !== threadId);
		if (this.threadId === threadId) await this.open(null);
	};

	private upsertThread = (thread: AskThreadRow) => {
		this.threads = [thread, ...this.threads.filter((t) => t.id !== thread.id)].sort((a, b) =>
			b.lastMessageAt.localeCompare(a.lastMessageAt)
		);
	};

	private addMessage = (message: AnalystMessagePayload) => {
		if (this.messages.some((m) => m.id === message.id)) return;
		this.messages = [...this.messages, message].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
	};

	private onMessageCreated = ({ threadId, message }: AnalystMessageCreatedSocketEvent['payload']) => {
		if (threadId === this.threadId) this.addMessage(message);
	};

	private onMessageUpdated = (payload: AnalystMessageUpdatedSocketEvent['payload']) => {
		if (payload.threadId !== this.threadId) return;
		this.messages = this.messages.map((m) =>
			m.id === payload.messageId ? { ...m, status: payload.status, model: payload.model, usd: payload.usd } : m
		);
	};

	private onPart = ({ threadId, messageId, part }: AnalystPartCreatedSocketEvent['payload']) => {
		if (threadId !== this.threadId) return;
		this.messages = this.messages.map((m) => (m.id === messageId ? { ...m, parts: withPart(m.parts, part) } : m));
	};

	private onDelta = ({ threadId, messageId, partId, delta }: AnalystPartDeltaSocketEvent['payload']) => {
		if (threadId !== this.threadId) return;
		this.messages = this.messages.map((m) =>
			m.id !== messageId
				? m
				: {
						...m,
						parts: m.parts.map((p) =>
							p.id === partId && p.data.type === 'text' ? { ...p, data: { ...p.data, text: p.data.text + delta } } : p
						)
					}
		);
	};

	private onThread = (payload: AnalystThreadUpdatedSocketEvent['payload']) => {
		const known = this.threads.find((t) => t.id === payload.threadId);
		if (!known) {
			void this.loadThreads();
			return;
		}
		this.upsertThread({ ...known, ...(payload.title && { title: payload.title }), lastMessageAt: payload.lastMessageAt });
	};
}
