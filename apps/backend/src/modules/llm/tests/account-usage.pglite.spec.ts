import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';

import { defineLlmAccount, tokensPerDay } from 'src/modules/llm/accounts/llm-account.js';
import { LlmAccountQuotas } from 'src/modules/llm/services/llm-account-quotas.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { LlmCall } from '../entities/llm-call.entity.js';
import type { LlmCallRecord } from '../interfaces/llm-call-record.interface.js';
import { LlmCallsService } from '../services/llm-calls.service.js';

const MINI = 'openai/gpt-5.4-mini';

const call = (over: Partial<LlmCallRecord> = {}): LlmCallRecord => ({
	kind: 'generate',
	agentId: 'post-claims',
	model: MINI,
	account: 'openai-primary',
	usage: { inputTokens: 1_000, outputTokens: 200 },
	usd: 0,
	ok: true,
	...over,
});

/*
 * An account's day is counted from the ledger: its agent calls since 00:00 UTC, by model, so a
 * restart picks up where the day stood. Embeddings, decisions and calls no account answered pass by.
 */
describe('LLM account usage (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: LlmCallsService;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({ providers: [LlmCallsService] });
		entityManagerManager.setEntityManager(harness.orm.em);
		service = harness.moduleRef.get(LlmCallsService);
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(async () => {
		await harness.orm.em.fork().nativeDelete(LlmCall, {});
	});

	it("sums each account's agent calls since a time, by model", async () => {
		await service.recordLlmCall(call());
		await service.recordLlmCall(call({ usage: { inputTokens: 500, outputTokens: 100 } }));
		await service.recordLlmCall(call({ account: 'openrouter', model: 'openrouter/x/y:free' }));
		// Not counted: an embedding, a decision, a call no account answered
		await service.recordLlmCall(call({ kind: 'embed', agentId: 'embeddings', account: null }));
		await service.recordLlmCall(
			call({
				kind: 'decide',
				agentId: 'claim-labels',
				model: 'typesafe-ai/jev',
				account: null,
			}),
		);
		await service.recordLlmCall(call({ model: null, account: null, ok: false }));
		// Yesterday's call is out of today's count
		const em = harness.orm.em.fork();
		const old = await service.recordLlmCall(call());
		await em.nativeUpdate(LlmCall, { id: old.id }, { createdAt: new Date('2026-01-01') });

		const rows = await service.accountUsageSince(new Date(Date.now() - 3_600_000));
		expect(rows.sort((a, b) => a.account.localeCompare(b.account))).toEqual([
			{ account: 'openai-primary', model: MINI, requests: 2, tokens: 1_800 },
			{ account: 'openrouter', model: 'openrouter/x/y:free', requests: 1, tokens: 1_200 },
		]);
	});

	it('hands the quotas a day already under way', async () => {
		await service.recordLlmCall(call({ usage: { inputTokens: 900, outputTokens: 200 } }));
		const quotas = new LlmAccountQuotas({ reader: service });
		await quotas.sync();
		const account = defineLlmAccount({
			id: 'openai-primary',
			provider: 'openai',
			apiKey: 'sk-test',
			limits: [tokensPerDay(1_000)],
		});
		expect(quotas.blockOf(account, MINI)).toMatchObject({
			reason: expect.stringContaining('openai-primary used 1,100 of its 1,000 tokens a day'),
		});
	});
});
