import { EntityManager } from '@mikro-orm/postgresql';

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import type { AnalystMention, AnalystPartData } from 'sdk';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { UserService } from 'src/modules/auth/services/user.service.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';

import { AnalystMessageStatusEnum } from '../constants/analyst-message-status.enum.constant.js';
import type {
	AdminAnalystMessageOutputDto,
	AdminAnalystPartOutputDto,
	AdminAnalystThreadOutputDto,
} from '../dto/admin-analyst.dto.js';
import { AnalystMessage, type AnalystUsage } from '../entities/analyst-message.entity.js';
import { AnalystMessagePart } from '../entities/analyst-message-part.entity.js';
import { AnalystThread } from '../entities/analyst-thread.entity.js';
import { AnalystMessageCreatedEvent } from '../events/analyst-message-created.event.js';
import { AnalystMessageUpdatedEvent } from '../events/analyst-message-updated.event.js';
import { AnalystPartChangedEvent } from '../events/analyst-part-changed.event.js';
import { AnalystPartDeltaEvent } from '../events/analyst-part-delta.event.js';
import { AnalystThreadUpdatedEvent } from '../events/analyst-thread-updated.event.js';
import { AnalystAnswerJob } from '../jobs/analyst-answer.job.js';
import { AnalystMessageRepository } from '../repositories/analyst-message.repository.js';
import { AnalystMessagePartRepository } from '../repositories/analyst-message-part.repository.js';
import { AnalystThreadRepository } from '../repositories/analyst-thread.repository.js';
import { parseMentions } from '../util/mentions.js';

import { AnalystSqlService } from './analyst-sql.service.js';

const TITLE_CHARS = 80;
const OPEN_ANSWER = [AnalystMessageStatusEnum.QUEUED, AnalystMessageStatusEnum.RUNNING];

/** A thread's title from its first question: mentions as their labels, cut on a word */
export const titleOf = (text: string, mentions: AnalystMention[]): string => {
	let title = text;
	for (const m of mentions) {
		const label = m.label ?? m.ref;
		title = title.replace(new RegExp(`@[A-Za-z]+:${m.ref}\\b`, 'g'), label);
	}
	title = title.replace(/\s+/g, ' ').trim();
	if (title.length <= TITLE_CHARS) return title;
	const cut = title.slice(0, TITLE_CHARS);
	return `${cut.slice(0, cut.lastIndexOf(' ') > 40 ? cut.lastIndexOf(' ') : TITLE_CHARS)}…`;
};

/**
 * The one writer of the analyst's threads, messages and parts. Every change it makes is told to
 * the page through an in-memory event the gateway turns into a socket event (`AnalystGateway`):
 * a question and its queued answer, each part an answer adds or rewrites, the text streaming into
 * a part, the answer's status. A question queues `AnalystAnswerJob` in its own transaction.
 */
@Injectable()
export class AnalystThreadService {
	constructor(
		private readonly em: EntityManager,
		private readonly eventEmitter: EventEmitter2,
		private readonly pgBossService: PgBossService,
		private readonly userService: UserService,
		private readonly sqlService: AnalystSqlService,
		private readonly threadRepository: AnalystThreadRepository,
		private readonly messageRepository: AnalystMessageRepository,
		private readonly partRepository: AnalystMessagePartRepository,
	) {}

	async list(page: number, size: number, q?: string) {
		const [threads, total] = await this.threadRepository.findAndCount(
			q ? { title: { $ilike: `%${q.replace(/[%_\\]/g, m => `\\${m}`)}%` } } : {},
			{
				populate: ['owner'],
				orderBy: { lastMessageAt: 'desc' },
				offset: (page - 1) * size,
				limit: size,
			},
		);
		return { items: threads.map(threadOutput), total };
	}

	async get(threadId: string) {
		const thread = await this.threadRepository.findOne(
			{ id: threadId },
			{ populate: ['owner'] },
		);
		if (!thread) throw new NotFoundException('No such thread');
		const messages = await this.messageRepository.find(
			{ thread: threadId },
			{ populate: ['author', 'parts'], orderBy: { createdAt: 'asc', id: 'asc' } },
		);
		return { thread: threadOutput(thread), messages: messages.map(messageOutput) };
	}

	/**
	 * An admin's question: in a new thread, or as a follow-up when its last answer is finished
	 * (409 while one is being written). The `@` mentions are resolved and stored with it, and the
	 * answer is queued as a message of the system account, so the page shows it waiting at once.
	 */
	async ask(userId: string, text: string, threadId?: string) {
		const mentions = await this.sqlService.resolve(parseMentions(text));
		const system = await this.userService.getSystemUser();
		const author = this.em.getReference(User, userId);

		const { thread, question, answer, isNew } = await this.em.transactional(async em => {
			let thread: AnalystThread;
			let isNew = false;
			if (threadId) {
				const found = await em.findOne(AnalystThread, { id: threadId });
				if (!found) throw new NotFoundException('No such thread');
				const open = await em.count(AnalystMessage, {
					thread: threadId,
					status: { $in: OPEN_ANSWER },
				});
				if (open)
					throw new ConflictException('The analyst is still answering the last question');
				thread = found;
			} else {
				thread = em.create(AnalystThread, {
					title: titleOf(text, mentions),
					owner: author,
				});
				isNew = true;
			}
			// Stamped here, not by the database: one transaction gives both rows the same now(), and
			// the thread is read in this order
			const now = Date.now();
			thread.lastMessageAt = new Date(now);

			const question = em.create(AnalystMessage, {
				thread,
				author,
				status: AnalystMessageStatusEnum.DONE,
				createdAt: new Date(now),
				finishedAt: new Date(now),
			});
			em.create(AnalystMessagePart, {
				message: question,
				position: 0,
				data: { type: 'text', text: text.trim() },
			});
			if (mentions.length)
				em.create(AnalystMessagePart, {
					message: question,
					position: 1,
					data: { type: 'mentions', mentions },
				});

			const answer = em.create(AnalystMessage, {
				thread,
				author: system,
				status: AnalystMessageStatusEnum.QUEUED,
				createdAt: new Date(now + 1),
			});
			await em.flush();
			await this.pgBossService.sendJobWithEm(
				em,
				AnalystAnswerJob.jobName,
				new AnalystAnswerJob({ messageId: answer.id }),
			);
			return { thread, question, answer, isNew };
		});

		await this.em.populate(thread, ['owner']);
		await this.em.populate([question, answer], ['author', 'parts']);
		const out = {
			thread: threadOutput(thread),
			question: messageOutput(question),
			answer: messageOutput(answer),
		};
		this.eventEmitter.emit(
			AnalystMessageCreatedEvent.type,
			new AnalystMessageCreatedEvent({ message: out.question }),
		);
		this.eventEmitter.emit(
			AnalystMessageCreatedEvent.type,
			new AnalystMessageCreatedEvent({ message: out.answer }),
		);
		this.emitThread(thread, isNew);
		return out;
	}

	async rename(threadId: string, title: string) {
		const thread = await this.threadRepository.findOne(
			{ id: threadId },
			{ populate: ['owner'] },
		);
		if (!thread) throw new NotFoundException('No such thread');
		thread.title = title.trim();
		await this.em.flush();
		this.emitThread(thread, true);
		return threadOutput(thread);
	}

	async remove(threadId: string) {
		const thread = await this.threadRepository.findOne({ id: threadId });
		if (!thread) throw new NotFoundException('No such thread');
		await this.em.nativeDelete(AnalystThread, { id: threadId });
	}

	// --- The answer's side: `AnalystAnswerService` writes through these ---

	/** The answer with its thread's earlier messages (oldest first), for the model */
	async loadForAnswer(messageId: string) {
		const answer = await this.messageRepository.findOne(
			{ id: messageId },
			{ populate: ['thread', 'parts'] },
		);
		if (!answer) return null;
		const history = await this.messageRepository.find(
			{
				thread: answer.thread.id,
				createdAt: { $lte: answer.createdAt },
				id: { $ne: answer.id },
			},
			{ populate: ['author', 'parts'], orderBy: { createdAt: 'asc', id: 'asc' } },
		);
		return { answer, history };
	}

	async setStatus(
		message: AnalystMessage,
		status: AnalystMessageStatusEnum,
		extra: { model?: string; usd?: number; usage?: AnalystUsage } = {},
	) {
		message.status = status;
		if (extra.model) message.model = extra.model;
		if (extra.usage) message.usage = extra.usage;
		if (extra.usd !== undefined) {
			message.usd = extra.usd;
			const thread = message.thread as AnalystThread;
			thread.usd = (thread.usd ?? 0) + extra.usd;
		}
		if (status === AnalystMessageStatusEnum.DONE || status === AnalystMessageStatusEnum.FAILED)
			message.finishedAt = new Date();
		await this.em.flush();
		this.eventEmitter.emit(
			AnalystMessageUpdatedEvent.type,
			new AnalystMessageUpdatedEvent({
				threadId: message.thread.id,
				messageId: message.id,
				status: message.status,
				model: message.model ?? undefined,
				usd: message.usd ?? undefined,
			}),
		);
		if (
			status === AnalystMessageStatusEnum.DONE ||
			status === AnalystMessageStatusEnum.FAILED
		) {
			const thread = message.thread as AnalystThread;
			thread.lastMessageAt = new Date();
			await this.em.flush();
			this.emitThread(thread, false);
		}
	}

	async addPart(message: AnalystMessage, data: AnalystPartData, streaming = false) {
		const position =
			message.parts.isInitialized() ?
				message.parts.length
			:	await this.partRepository.count({ message });
		const part = this.partRepository.create({ message, position, data, streaming });
		await this.em.flush();
		this.emitPart(message, part, 'created');
		return part;
	}

	async updatePart(
		message: AnalystMessage,
		part: AnalystMessagePart,
		patch: { data?: AnalystPartData; streaming?: boolean },
	) {
		if (patch.data) part.data = patch.data;
		if (patch.streaming !== undefined) part.streaming = patch.streaming;
		await this.em.flush();
		this.emitPart(message, part, 'updated');
	}

	/** Text streamed into a part: the page appends it; the part itself is stored when it ends */
	emitDelta(message: AnalystMessage, part: AnalystMessagePart, delta: string) {
		this.eventEmitter.emit(
			AnalystPartDeltaEvent.type,
			new AnalystPartDeltaEvent({
				threadId: message.thread.id,
				messageId: message.id,
				partId: part.id,
				delta,
			}),
		);
	}

	private emitPart(
		message: AnalystMessage,
		part: AnalystMessagePart,
		change: 'created' | 'updated',
	) {
		this.eventEmitter.emit(
			AnalystPartChangedEvent.type,
			new AnalystPartChangedEvent({
				threadId: message.thread.id,
				messageId: message.id,
				part: partOutput(part),
				change,
			}),
		);
	}

	private emitThread(thread: AnalystThread, withTitle: boolean) {
		this.eventEmitter.emit(
			AnalystThreadUpdatedEvent.type,
			new AnalystThreadUpdatedEvent({
				threadId: thread.id,
				title: withTitle ? thread.title : undefined,
				lastMessageAt: thread.lastMessageAt.toISOString(),
			}),
		);
	}
}

export const partOutput = (part: AnalystMessagePart): AdminAnalystPartOutputDto => ({
	id: part.id,
	position: part.position,
	streaming: part.streaming,
	data: part.data,
	createdAt: part.createdAt ?? new Date(),
});

/**
 * A message as the page reads it, over HTTP and the socket alike. Built by hand, not serialized:
 * the socket has no DTO to drop the author's other fields, and the parts come in their order.
 */
export const messageOutput = (message: AnalystMessage): AdminAnalystMessageOutputDto => {
	const author = message.author as User;
	return {
		id: message.id,
		thread: { id: message.thread.id },
		author: { id: author.id, firstName: author.firstName, roles: author.roles },
		status: message.status,
		model: message.model ?? undefined,
		usd: message.usd ?? undefined,
		usage: message.usage ?? undefined,
		createdAt: message.createdAt ?? new Date(),
		finishedAt: message.finishedAt ?? undefined,
		parts: message.parts
			.getItems()
			.sort((a, b) => a.position - b.position)
			.map(partOutput),
	};
};

export const threadOutput = (thread: AnalystThread): AdminAnalystThreadOutputDto => {
	const owner = thread.owner as User;
	return {
		id: thread.id,
		title: thread.title,
		owner: { id: owner.id, firstName: owner.firstName },
		usd: thread.usd ?? 0,
		lastMessageAt: thread.lastMessageAt,
		createdAt: thread.createdAt ?? new Date(),
	};
};
