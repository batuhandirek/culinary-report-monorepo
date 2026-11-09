// import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
//
// import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
// import { entityManagerManager } from 'src/shared/util/em.js';
// import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';
//
// import { CreditSnapshotSourceEnum, LlmCallProviderEnum } from '../constants/llm-calls.constant.js';
// import { LlmCall } from '../entities/llm-call.entity.js';
// import { ProviderCreditSnapshot } from '../entities/provider-credit-snapshot.entity.js';
// import { LlmCallsService } from '../services/llm-calls.service.js';
// import { withLlmCallContext } from '../util/llm-call-context.js';
//
// const DAY = 86_400_000;
//
// /*
//  * Money: every LLM call filed with what it was for, summed any way the admin asks; a provider's
//  * room anchored on its newest credit snapshot minus the spend recorded since.
//  */
// describe('Spend (pglite)', () => {
// 	let harness: PgliteTestingModule;
// 	let service: LlmCallsService;
//
// 	beforeAll(async () => {
// 		harness = await createPgliteTestingModule({ providers: [LlmCallsService] });
// 		entityManagerManager.setEntityManager(harness.orm.em);
// 		service = harness.moduleRef.get(LlmCallsService);
// 	});
//
// 	afterAll(async () => {
// 		await harness.stop();
// 	});
//
// 	beforeEach(async () => {
// 		const em = harness.orm.em.fork();
// 		await em.nativeDelete(LlmCall, {});
// 		await em.nativeDelete(ProviderCreditSnapshot, {});
// 	});
//
// 	it('files LLM calls with the context around them and sums them by agent, provider and day', async () => {
// 		const em = harness.orm.em.fork();
// 		const city = cityFactory.build({}, { transient: { em } });
// 		await em.flush();
//
// 		await withLlmCallContext({ cityId: city.id, purpose: 'ingest' }, () =>
// 			service.recordLlmCall({
// 				kind: 'generate',
// 				agentId: 'post-claims',
// 				model: 'openai/gpt-5.4-mini',
// 				usage: { inputTokens: 1200, outputTokens: 300, cachedInputTokens: 1000 },
// 				usd: 0,
// 				durationMs: 800,
// 				ok: true,
// 			}),
// 		);
// 		await service.recordLlmCall({
// 			kind: 'generate',
// 			agentId: 'report-editor',
// 			model: 'anthropic/claude-sonnet-5-5',
// 			usage: { inputTokens: 5000, outputTokens: 1000 },
// 			usd: 0.12,
// 			ok: true,
// 		});
// 		await service.recordLlmCall({
// 			kind: 'generate',
// 			agentId: 'post-claims',
// 			model: null,
// 			usage: { inputTokens: 0, outputTokens: 0 },
// 			usd: 0,
// 			ok: false,
// 			error: 'No model can serve mini',
// 		});
// 		await service.recordLlmCall({
// 			kind: 'decide',
// 			agentId: 'claim-labels',
// 			model: 'typesafe-ai/jev',
// 			usage: { inputTokens: 400, outputTokens: 0 },
// 			usd: 0.0000168,
// 			ok: true,
// 		});
//
// 		const filed = await harness.orm.em
// 			.fork()
// 			.find(LlmCall, { agentId: 'post-claims', ok: true }, { populate: ['city'] });
// 		expect(filed).toHaveLength(1);
// 		expect([
// 			filed[0].provider,
// 			filed[0].purpose,
// 			filed[0].city?.id,
// 			filed[0].cachedInputTokens,
// 		]).toEqual([LlmCallProviderEnum.OPENAI, 'ingest', city.id, 1000]);
//
// 		const from = new Date(Date.now() - DAY);
// 		const to = new Date(Date.now() + DAY);
// 		const byAgent = await service.llmSpend(from, to, 'agent');
// 		expect(byAgent.map(r => [r.key, r.calls, r.failed, r.inputTokens, r.usd])).toEqual([
// 			['report-editor', 1, 0, 5000, 0.12],
// 			['claim-labels', 1, 0, 400, 0.0000168],
// 			['post-claims', 2, 1, 1200, 0],
// 		]);
// 		const byProvider = await service.llmSpend(from, to, 'provider');
// 		expect(byProvider.map(r => r.key).sort()).toEqual([
// 			'anthropic',
// 			'none',
// 			'openai',
// 			'typesafe',
// 		]);
// 		const byDay = await service.llmSpend(from, to, 'day');
// 		expect(byDay).toHaveLength(1);
// 		expect(byDay[0].key).toBe(new Date().toISOString().slice(0, 10));
// 		expect(await service.llmSpend(new Date(Date.now() - 3 * DAY), from, 'agent')).toEqual([]);
// 	});
//
// 	it("anchors a provider's room on its newest snapshot and takes the spend recorded since off it", async () => {
// 		const t0 = new Date(Date.now() - 60_000);
// 		await service.snapshotCredit(
// 			LlmCallProviderEnum.ANTHROPIC,
// 			{ limitUsd: 100, usedUsd: 40 },
// 			CreditSnapshotSourceEnum.MANUAL,
// 			'topped up',
// 			t0,
// 		);
// 		await service.recordLlmCall({
// 			kind: 'generate',
// 			agentId: 'report-editor',
// 			model: 'anthropic/claude-opus-5-5',
// 			usage: { inputTokens: 100_000, outputTokens: 50_000 },
// 			usd: 2.5,
// 			ok: true,
// 		});
//
// 		const anthropic = await service.remaining(LlmCallProviderEnum.ANTHROPIC);
// 		expect(anthropic.snapshot?.note).toBe('topped up');
// 		expect(anthropic.spentSinceUsd).toBeCloseTo(2.5);
// 		expect(anthropic.remainingUsd).toBeCloseTo(57.5);
// 		expect([anthropic.stale, anthropic.canRefresh]).toEqual([false, false]);
//
// 		// A provider with no snapshot has nothing to judge by
// 		expect(await service.remaining(LlmCallProviderEnum.OPENROUTER)).toMatchObject({
// 			snapshot: null,
// 			remainingUsd: null,
// 		});
// 		await expect(service.refreshCredit(LlmCallProviderEnum.OPENAI)).rejects.toThrow(
// 			/no provider registered a reader/,
// 		);
// 	});
//
// 	it("reads a registered provider's account through its hooks and counts its own spend", async () => {
// 		const cycleEnd = new Date(Date.now() + 10 * DAY);
// 		service.registerProvider(LlmCallProviderEnum.APIFY, {
// 			read: async () => ({
// 				limitUsd: 250,
// 				usedUsd: 212,
// 				cycleStart: new Date(Date.now() - 20 * DAY),
// 				cycleEnd,
// 			}),
// 			spentSince: async () => 3.25,
// 		});
//
// 		const snapshot = await service.refreshCredit(LlmCallProviderEnum.APIFY);
// 		expect([snapshot.source, snapshot.limitUsd, snapshot.usedUsd, snapshot.cycleEnd]).toEqual([
// 			CreditSnapshotSourceEnum.API,
// 			250,
// 			212,
// 			cycleEnd,
// 		]);
// 		const apify = await service.remaining(LlmCallProviderEnum.APIFY);
// 		expect(apify.remainingUsd).toBeCloseTo(250 - 212 - 3.25);
// 		expect([apify.stale, apify.canRefresh]).toEqual([false, true]);
//
// 		// Once the snapshot's cycle ended it says nothing about the new one
// 		await service.snapshotCredit(
// 			LlmCallProviderEnum.APIFY,
// 			{ limitUsd: 250, usedUsd: 240, cycleEnd: new Date(Date.now() - DAY) },
// 			CreditSnapshotSourceEnum.MANUAL,
// 		);
// 		expect((await service.remaining(LlmCallProviderEnum.APIFY)).stale).toBe(true);
//
// 		const credits = await service.credits();
// 		expect(credits.map(c => c.provider).slice(0, 1)).toEqual([LlmCallProviderEnum.APIFY]);
// 		expect(credits).toHaveLength(Object.values(LlmCallProviderEnum).length);
// 	});
// });

import { describe, it } from '@jest/globals';

// Kept visible as skipped while the suite above stays commented out
describe.skip('llm-calls.pglite.spec (commented out)', () => {
	it.todo('port the suite above');
});
