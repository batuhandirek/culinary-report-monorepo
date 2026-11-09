import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import { currentWorkflowId } from 'src/modules/durable-workflows/util/workflow-context.js';

import { LlmCallKindEnum, llmCallProviderOf } from '../constants/llm-calls.constant.js';
import { LlmCall } from '../entities/llm-call.entity.js';
import type {
	LlmAccountUsageReader,
	LlmAccountUsageRow,
	LlmCallRecord,
	LlmCallRecorder,
} from '../interfaces/llm-call-record.interface.js';
import { currentLlmCallContext } from '../util/llm-call-context.js';

export type LlmSpendGroup =
	'agent' | 'model' | 'provider' | 'day' | 'city' | 'purpose' | 'workflow';

export interface LlmSpendRow {
	key: string;
	calls: number;
	failed: number;
	inputTokens: number;
	outputTokens: number;
	cachedInputTokens: number;
	usd: number;
}

const GROUP_SQL: Record<LlmSpendGroup, string> = {
	agent: 'agent_id',
	model: `coalesce(model, 'none')`,
	provider: `coalesce(provider::text, 'none')`,
	day: `to_char(created_at at time zone 'UTC', 'YYYY-MM-DD')`,
	city: `coalesce(city_id::text, 'none')`,
	purpose: `coalesce(purpose, 'none')`,
	workflow: `coalesce(workflow_id, 'none')`,
};

/**
 * The LLM call ledger (`LlmCall`): its one writer, and the reader that says what was spent on
 * what. Apify's spend and credit are the Apify module's own (`apify_runs`, `ApifyService.credit`).
 */
@Injectable()
export class LlmCallsService implements LlmCallRecorder, LlmAccountUsageReader {
	private readonly logger = new Logger(LlmCallsService.name);

	constructor(private readonly em: EntityManager) {}

	/** Files a call in the background; bookkeeping never fails or slows the call */
	record(call: LlmCallRecord): void {
		void this.recordLlmCall(call).catch(e =>
			this.logger.warn(`LLM call of ${call.agentId} not recorded: ${(e as Error).message}`),
		);
	}

	async recordLlmCall(call: LlmCallRecord): Promise<LlmCall> {
		const em = this.em.fork();
		const context = currentLlmCallContext();
		const row = em.create(LlmCall, {
			kind: call.kind as LlmCallKindEnum,
			agentId: call.agentId,
			model: call.model,
			account: call.account ?? null,
			provider: llmCallProviderOf(call.model),
			inputTokens: Math.round(call.usage.inputTokens ?? 0),
			outputTokens: Math.round(call.usage.outputTokens ?? 0),
			cachedInputTokens: Math.round(call.usage.cachedInputTokens ?? 0),
			cacheWriteTokens: Math.round(call.usage.cacheWriteTokens ?? 0),
			usd: call.usd,
			durationMs: call.durationMs ?? null,
			ok: call.ok,
			error: call.error?.slice(0, 1000) ?? null,
			workflowId: currentWorkflowId() ?? null,
			city: context.cityId ?? null,
			purpose: context.purpose ?? null,
		});
		await em.flush();
		return row;
	}

	/**
	 * What each account's agent calls used since `from`, by model: the calls answered and their
	 * tokens, input and output together. What `LlmAccountQuotas` counts an account's day from.
	 */
	async accountUsageSince(from: Date): Promise<LlmAccountUsageRow[]> {
		const rows: Record<string, unknown>[] = await this.em.getConnection().execute(
			`select account, model, count(*)::int as requests,
				coalesce(sum(input_tokens + output_tokens), 0)::bigint as tokens
			from llm_calls
			where kind = 'generate' and account is not null and model is not null and created_at >= ?
			group by account, model`,
			[from],
		);
		return rows.map(row => ({
			account: String(row.account),
			model: String(row.model),
			requests: Number(row.requests),
			tokens: Number(row.tokens),
		}));
	}

	/** The ledger between `from` (inclusive) and `to` (exclusive), summed by `groupBy`, the dearest first */
	async llmSpend(from: Date, to: Date, groupBy: LlmSpendGroup): Promise<LlmSpendRow[]> {
		const rows: Record<string, unknown>[] = await this.em.getConnection().execute(
			`select ${GROUP_SQL[groupBy]} as key,
				count(*)::int as calls,
				sum(case when ok then 0 else 1 end)::int as failed,
				coalesce(sum(input_tokens), 0)::bigint as input_tokens,
				coalesce(sum(output_tokens), 0)::bigint as output_tokens,
				coalesce(sum(cached_input_tokens), 0)::bigint as cached_input_tokens,
				coalesce(sum(usd), 0)::float as usd
			from llm_calls where created_at >= ? and created_at < ?
			group by 1 order by usd desc, calls desc, key asc`,
			[from, to],
		);
		return rows.map(r => ({
			key: String(r.key),
			calls: Number(r.calls),
			failed: Number(r.failed),
			inputTokens: Number(r.input_tokens),
			outputTokens: Number(r.output_tokens),
			cachedInputTokens: Number(r.cached_input_tokens),
			usd: Number(r.usd),
		}));
	}
}
