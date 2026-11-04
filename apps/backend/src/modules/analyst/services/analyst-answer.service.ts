import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { User } from 'src/modules/auth/entities/user.entity.js';
import { answerUsd, usageOf } from 'src/modules/llm/util/llm-cost.js';

import { AnalystAgent } from '../agents/analyst.agent.js';
import { ANALYST_TIMEOUT_MS } from '../constants/analyst.constant.js';
import { AnalystMessageStatusEnum } from '../constants/analyst-message-status.enum.constant.js';
import { AnalystMessage } from '../entities/analyst-message.entity.js';
import { AnalystMessagePart } from '../entities/analyst-message-part.entity.js';
import { AnalystRun } from '../tools/analyst-run.js';
import { findTool } from '../tools/find.tool.js';
import { planTool } from '../tools/plan.tool.js';
import { schemaTool } from '../tools/schema.tool.js';
import { sqlTool } from '../tools/sql.tool.js';
import { historyMessages } from '../util/history.js';

import { AnalystSqlService } from './analyst-sql.service.js';
import { AnalystThreadService } from './analyst-thread.service.js';

/**
 * Writes one answer (`AnalystAnswerJob`): the thread so far to the model, its text streamed into
 * parts and each tool call kept as a part (`AnalystRun`), then the model, tokens and dollars on
 * the message. A failure ends the answer `failed` with the error as its last part; nothing is
 * retried. At boot, answers a restart cut off (`running`) are failed, since their job is gone.
 */
@Injectable()
export class AnalystAnswerService implements OnApplicationBootstrap {
	private readonly logger = new Logger(AnalystAnswerService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly agent: AnalystAgent,
		private readonly threadService: AnalystThreadService,
		private readonly sqlService: AnalystSqlService,
	) {}

	async onApplicationBootstrap() {
		const em = this.em.fork();
		const cut = await em.find(AnalystMessage, { status: AnalystMessageStatusEnum.RUNNING });
		for (const message of cut) {
			message.status = AnalystMessageStatusEnum.FAILED;
			message.finishedAt = new Date();
			em.create(AnalystMessagePart, {
				message,
				position: 10_000,
				data: { type: 'error', message: 'Interrupted by a restart: ask again.' },
			});
		}
		if (cut.length) {
			await em.flush();
			this.logger.warn(`Failed ${cut.length} answer(s) a restart cut off`);
		}
	}

	async answer(messageId: string) {
		const loaded = await this.threadService.loadForAnswer(messageId);
		if (!loaded) return;
		const { answer, history } = loaded;
		if (answer.status !== AnalystMessageStatusEnum.QUEUED) return;

		await this.threadService.setStatus(answer, AnalystMessageStatusEnum.RUNNING);
		const run = new AnalystRun(answer, this.threadService);
		const tools = {
			plan: planTool(run),
			schema: schemaTool(run, this.sqlService),
			find: findTool(run, this.sqlService),
			run_sql: sqlTool(run, this.sqlService),
		};
		const cities = await this.em.execute<{ name: string; id: string }[]>(
			`select name, id from cities where deleted_at is null and active order by name`,
		);
		const input = historyMessages(
			history.map(m => ({
				fromAnalyst: (m.author as User).roles.includes(UserRoleEnum.SYSTEM),
				status: m.status,
				parts: m.parts
					.getItems()
					.sort((a, b) => a.position - b.position)
					.map(p => p.data),
			})),
			{
				today: new Date().toISOString().slice(0, 10),
				cities: cities.map(c => `${c.name} (${c.id})`).join(', ') || 'none',
			},
		);

		try {
			const res = await this.agent.generate(
				input,
				{ tools },
				{
					abortSignal: AbortSignal.timeout(ANALYST_TIMEOUT_MS),
					onChunk: run.onChunk as never,
					onStepFinish: run.onStepFinish as never,
				},
			);
			await run.settle();
			// A provider that sent no deltas still has the text
			if (!run.textParts && res.text?.trim())
				await run.addPart({ type: 'text', text: res.text.trim() });
			await run.settle();
			const usage = usageOf(res);
			await this.threadService.setStatus(answer, AnalystMessageStatusEnum.DONE, {
				model: res.model,
				usd: answerUsd(res),
				usage: { ...usage, steps: res.steps?.length ?? 0, queries: run.queries },
			});
		} catch (e) {
			const message = (e as Error).message ?? String(e);
			this.logger.error(`Answer ${answer.id} failed: ${message}`);
			await run.settle();
			await run.addPart({ type: 'error', message: errorText(message) });
			await run.settle();
			await this.threadService.setStatus(answer, AnalystMessageStatusEnum.FAILED, {
				usage: {
					inputTokens: 0,
					outputTokens: 0,
					cachedInputTokens: 0,
					cacheWriteTokens: 0,
					steps: 0,
					queries: run.queries,
				},
			});
		}
	}
}

const errorText = (message: string): string =>
	/abort|timeout/i.test(message) ?
		'The answer took too long and was stopped: ask a narrower question.'
	: /No model can serve/.test(message) ? `No model could answer: ${message}`
	: `The answer failed: ${message}`;
