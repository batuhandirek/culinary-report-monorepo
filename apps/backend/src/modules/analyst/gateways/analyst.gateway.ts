import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
	ConnectedSocket,
	MessageBody,
	OnGatewayConnection,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from '@nestjs/websockets';

import {
	ANALYST_SUBSCRIBE_THREAD,
	ANALYST_UNSUBSCRIBE_THREAD,
	AnalystMessageCreatedSocketEvent,
	AnalystMessageUpdatedSocketEvent,
	AnalystPartCreatedSocketEvent,
	AnalystPartDeltaSocketEvent,
	AnalystPartUpdatedSocketEvent,
	AnalystThreadUpdatedSocketEvent,
	SOCKET_IO_PATH,
} from 'sdk';
import type { Server, Socket } from 'socket.io';

import { COOKIE_ACCESS_TOKEN } from 'src/modules/auth/constants/auth-cookie.constant.js';
import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import type { AccessTokenPayload } from 'src/modules/auth/interfaces/access-token-payload.interface.js';
import { JwtService } from 'src/modules/auth/services/jwt.service.js';

import { AnalystMessageCreatedEvent } from '../events/analyst-message-created.event.js';
import { AnalystMessageUpdatedEvent } from '../events/analyst-message-updated.event.js';
import { AnalystPartChangedEvent } from '../events/analyst-part-changed.event.js';
import { AnalystPartDeltaEvent } from '../events/analyst-part-delta.event.js';
import { AnalystThreadUpdatedEvent } from '../events/analyst-thread-updated.event.js';

const ADMINS_ROOM = 'analyst-admins';
const threadRoom = (threadId: string) => `analyst-thread:${threadId}`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The token as `AuthenticationGuard` reads it: the handshake's auth, else the session cookie */
const tokenOf = (client: Socket): string | undefined => {
	const auth = client.handshake.auth as { token?: string } | undefined;
	if (auth?.token) return auth.token.replace(/^Bearer\s+/i, '');
	const cookie = client.handshake.headers.cookie ?? '';
	const match = cookie.split(/;\s*/).find(c => c.startsWith(`${COOKIE_ACCESS_TOKEN}=`));
	return match ? decodeURIComponent(match.slice(COOKIE_ACCESS_TOKEN.length + 1)) : undefined;
};

/**
 * The analyst's live side (`/admin/ask`), namespace `analyst` under `/api/socket.io`. Admins only:
 * the token is checked once, at the handshake. Every admin socket joins the admins' room (the
 * thread list); a page joins a thread's room for its messages, parts and streamed text. What it
 * sends is what `AnalystThreadService` emitted, already in the page's shapes (`sdk`).
 */
@WebSocketGateway({ namespace: 'analyst', path: SOCKET_IO_PATH })
export class AnalystGateway implements OnGatewayConnection {
	private readonly logger = new Logger(AnalystGateway.name);
	@WebSocketServer() io!: Server;

	constructor(private readonly jwtService: JwtService) {}

	async handleConnection(client: Socket) {
		const token = tokenOf(client);
		let payload: AccessTokenPayload | null = null;
		try {
			payload = token ? this.jwtService.decode<AccessTokenPayload>(token) : null;
		} catch {
			payload = null;
		}
		if (!payload?.roles?.includes(UserRoleEnum.ADMIN)) {
			client.emit('unauthorized');
			client.disconnect(true);
			return;
		}
		await client.join(ADMINS_ROOM);
	}

	@SubscribeMessage(ANALYST_SUBSCRIBE_THREAD)
	async subscribe(@MessageBody() body: { threadId?: string }, @ConnectedSocket() client: Socket) {
		if (!body?.threadId || !UUID.test(body.threadId)) return { ok: false };
		await client.join(threadRoom(body.threadId));
		return { ok: true };
	}

	@SubscribeMessage(ANALYST_UNSUBSCRIBE_THREAD)
	async unsubscribe(
		@MessageBody() body: { threadId?: string },
		@ConnectedSocket() client: Socket,
	) {
		if (body?.threadId) await client.leave(threadRoom(body.threadId));
		return { ok: true };
	}

	@OnEvent(AnalystMessageCreatedEvent.type)
	onMessageCreated({ payload }: AnalystMessageCreatedEvent) {
		const threadId = payload.message.thread.id;
		// Dates go out as ISO strings, the sdk's shape
		this.io
			?.to(threadRoom(threadId))
			.emit(AnalystMessageCreatedSocketEvent.type, { threadId, message: payload.message });
	}

	@OnEvent(AnalystMessageUpdatedEvent.type)
	onMessageUpdated({ payload }: AnalystMessageUpdatedEvent) {
		this.io
			?.to(threadRoom(payload.threadId))
			.emit(AnalystMessageUpdatedSocketEvent.type, payload);
	}

	@OnEvent(AnalystPartChangedEvent.type)
	onPartChanged({ payload }: AnalystPartChangedEvent) {
		const { change, ...rest } = payload;
		const type =
			change === 'created' ?
				AnalystPartCreatedSocketEvent.type
			:	AnalystPartUpdatedSocketEvent.type;
		this.io?.to(threadRoom(payload.threadId)).emit(type, rest);
	}

	@OnEvent(AnalystPartDeltaEvent.type)
	onPartDelta({ payload }: AnalystPartDeltaEvent) {
		this.io?.to(threadRoom(payload.threadId)).emit(AnalystPartDeltaSocketEvent.type, payload);
	}

	@OnEvent(AnalystThreadUpdatedEvent.type)
	onThreadUpdated({ payload }: AnalystThreadUpdatedEvent) {
		this.io?.to(ADMINS_ROOM).emit(AnalystThreadUpdatedSocketEvent.type, payload);
	}
}
