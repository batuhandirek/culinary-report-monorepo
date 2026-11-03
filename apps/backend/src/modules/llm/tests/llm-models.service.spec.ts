import { describe, expect, it } from '@jest/globals';

import { isFatalProviderError } from 'src/shared/util/pool.js';

import { modelsFor } from '../constants/llm-models.constant.js';
import { LlmModelKey, LlmModelsOptions, LlmModelsService } from '../services/llm-models.service.js';
import { OpenAIAccountsService } from '../services/openai-accounts.service.js';
import { llmPaid } from '../util/llm-scope.js';

const HOUR = 3_600_000;
const MINI = 'openai/gpt-5.4-mini';
const HAIKU = 'anthropic/claude-haiku-5-5';
const FULL = 'openai/gpt-5.4';
const SONNET = 'anthropic/claude-sonnet-5-5';
const OPUS = 'anthropic/claude-opus-5-5';

/** The shape the AI SDK throws for a provider's answer */
const providerError = (url: string, message: string, statusCode = 400) =>
	Object.assign(new Error(message), { statusCode, url });
const openAIOut = () =>
	providerError(
		'https://api.openai.com/v1/responses',
		'You have no credits remaining. Add credits to continue using the API',
		429,
	);
const anthropicOut = () =>
	providerError(
		'https://api.anthropic.com/v1/messages',
		'Your credit balance is too low to access the Anthropic API.',
	);

type SetupOptions = Pick<LlmModelsOptions, 'anthropicApiKey' | 'disabled' | 'agentModels'>;

const setup = (opts: SetupOptions = { anthropicApiKey: 'sk-ant-xxxx' }) => {
	let now = Date.parse('2026-11-01T12:00:00Z');
	const openAIAccounts = new OpenAIAccountsService({
		apiKeys: ['sk-aaaa'],
		rotateAfterRequests: 100,
		blockMs: 24 * HOUR,
		now: () => now,
	});
	const service = new LlmModelsService({
		openAIAccounts,
		...opts,
		blockMs: 24 * HOUR,
		now: () => now,
	});
	/**
	 * Which models a call was tried on, in order; `fail` decides per model. Inside `llmPaid`, where
	 * the roster's Claude models serve too
	 */
	const call = async (
		choice: Parameters<LlmModelsService['run']>[0],
		fail: (model: LlmModelKey) => Error | null = () => null,
	) => {
		const tried: string[] = [];
		const out = await llmPaid(() =>
			service.run(choice, async model => {
				tried.push(model.id);
				const error = fail(model);
				if (error) throw error;
				return model;
			}),
		).catch((e: Error) => e);
		return { tried, out };
	};
	return { service, call, advance: (ms: number) => (now += ms) };
};

describe('modelsFor', () => {
	it('gives a tier its roster, free first', () => {
		expect(modelsFor('mini')).toEqual([MINI, HAIKU]);
		expect(modelsFor('full')).toEqual([FULL, SONNET]);
		expect(modelsFor('high')).toEqual([OPUS, FULL]);
	});

	it('puts a chosen model first, the rest of its tier behind it', () => {
		expect(modelsFor(SONNET)).toEqual([SONNET, FULL]);
		expect(modelsFor(OPUS)).toEqual([OPUS, FULL]);
		expect(modelsFor('anthropic/claude-fable-5-1')).toEqual(['anthropic/claude-fable-5-1']);
	});
});

describe('LlmModelsService', () => {
	it('serves a tier on OpenAI with its account key', async () => {
		const { call } = setup();
		const { tried, out } = await call('mini');
		expect(tried).toEqual([MINI]);
		expect(out).toEqual({ result: { id: MINI, apiKey: 'sk-aaaa' }, model: MINI });
	});

	it('moves to Claude once OpenAI is out of allowance, and stays there', async () => {
		const { call } = setup();
		const first = await call('mini', m => (m.id === MINI ? openAIOut() : null));
		expect(first.tried).toEqual([MINI, HAIKU]);
		expect(first.out).toEqual({ result: { id: HAIKU, apiKey: 'sk-ant-xxxx' }, model: HAIKU });

		// The OpenAI account is blocked for mini now, so the next call goes straight to Claude
		const second = await call('mini');
		expect(second.tried).toEqual([HAIKU]);
		// The full model is a separate allowance
		expect((await call('full')).tried).toEqual([FULL]);
	});

	it('blocks Anthropic as a whole once its credit is used up, and fails fatally when nothing is left', async () => {
		const { service, call, advance } = setup();
		const out = await call('mini', m => (m.id === MINI ? openAIOut() : anthropicOut()));
		expect(out.tried).toEqual([MINI, HAIKU]);
		expect(isFatalProviderError(out.out)).toBe(true);
		expect(service.status().anthropic?.reason).toMatch(/credit balance is too low/);

		// Sonnet shares the credit: skipped without a call
		const full = await call('full', m => (m.id === FULL ? openAIOut() : null));
		expect(full.tried).toEqual([FULL]);
		expect(isFatalProviderError(full.out)).toBe(true);

		advance(24 * HOUR);
		expect((await call('full')).tried).toEqual([FULL]);
		expect(service.status().anthropic).toBeNull();
	});

	it('lets a call choose Claude first, with OpenAI behind it', async () => {
		const { call } = setup();
		expect((await call(SONNET)).tried).toEqual([SONNET]);
		const out = await call(SONNET, m => (m.id === SONNET ? anthropicOut() : null));
		expect(out.tried).toEqual([SONNET, FULL]);
		expect(out.out).toMatchObject({ model: FULL });
	});

	it('leaves Claude out without a key', async () => {
		const { call } = setup({});
		const out = await call('mini', () => openAIOut());
		expect(out.tried).toEqual([MINI]);
		expect(isFatalProviderError(out.out)).toBe(true);
	});

	it('uses only the free models outside llmPaid, failing rather than paying', async () => {
		const { service } = setup();
		const tried: string[] = [];
		const out = await service
			.run(SONNET, async model => {
				tried.push(model.id);
				if (model.id === FULL) throw openAIOut();
				return model.id;
			})
			.catch((e: Error) => e);
		expect(tried).toEqual([FULL]);
		expect(isFatalProviderError(out)).toBe(true);
		expect((out as Error).message).toMatch(/You have no credits remaining/);

		// `high` runs on its free model; a Claude model alone serves nothing
		const fresh = setup().service;
		expect((await fresh.run('high', async model => model.id)).model).toBe(FULL);
		const claudeOnly = await fresh
			.run('anthropic/claude-fable-5-1', async model => model.id)
			.catch((e: Error) => e);
		expect((claudeOnly as Error).message).toBe(
			'No model can serve anthropic/claude-fable-5-1: anthropic/claude-fable-5-1 paid, and only free models run outside llmPaid',
		);
	});

	it('rethrows any other error without moving on', async () => {
		const { call, service } = setup();
		const out = await call('mini', () =>
			providerError('https://api.openai.com/v1/responses', 'Rate limit reached', 429),
		);
		expect(out.tried).toEqual([MINI]);
		expect((out.out as Error).message).toBe('Rate limit reached');

		const anthropic = await call(HAIKU, () =>
			providerError('https://api.anthropic.com/v1/messages', 'Overloaded', 529),
		);
		expect(anthropic.tried).toEqual([HAIKU]);
		expect(service.status().anthropic).toBeNull();
	});

	it('leaves a disabled provider out', async () => {
		const noOpenAI = setup({ anthropicApiKey: 'sk-ant-xxxx', disabled: { openai: true } });
		expect((await noOpenAI.call('mini')).tried).toEqual([HAIKU]);
		expect((await noOpenAI.call('high')).tried).toEqual([OPUS]);

		const noClaude = setup({ anthropicApiKey: 'sk-ant-xxxx', disabled: { anthropic: true } });
		expect((await noClaude.call('high')).tried).toEqual([FULL]);
		const out = await noClaude.call('mini', () => openAIOut());
		expect(out.tried).toEqual([MINI]);
		expect(isFatalProviderError(out.out)).toBe(true);
	});

	it('fails fatally, saying why, when every model is left out', async () => {
		const { call } = setup({ anthropicApiKey: 'sk-ant-xxxx', disabled: { openai: true, anthropic: true } });
		const out = await call('mini');
		expect(out.tried).toEqual([]);
		expect((out.out as Error).message).toBe(
			'No model can serve mini: openai/gpt-5.4-mini disabled; anthropic/claude-haiku-5-5 disabled',
		);
		expect(isFatalProviderError(out.out)).toBe(true);
	});

	it('puts an agent on its LLM_AGENT_MODELS choice, still free outside llmPaid', async () => {
		const { service } = setup({ anthropicApiKey: 'sk-ant-xxxx', agentModels: { 'term-topic': 'high' } });
		expect(service.choiceFor('term-topic', 'mini')).toBe('high');
		expect(service.choiceFor('post-gate', 'mini')).toBe('mini');

		expect((await service.run('high', async model => model.id)).model).toBe(FULL);
		expect((await llmPaid(() => service.run('high', async model => model.id))).model).toBe(OPUS);
	});
});
