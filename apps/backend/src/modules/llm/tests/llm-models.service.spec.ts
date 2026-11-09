import { describe, expect, it } from '@jest/globals';

import { isFatalProviderError } from 'src/shared/util/pool.js';

import {
	defineLlmAccount,
	type LlmAccountLimit,
	requestsPerDay,
	tokensPerDay,
} from '../accounts/llm-account.js';
import { modelsFor } from '../constants/llm-models.constant.js';
import { LlmAccountQuotas } from '../services/llm-account-quotas.service.js';
import {
	LlmModelKey,
	LlmModelsOptions,
	LlmModelsService,
	OPENROUTER_TRIES,
} from '../services/llm-models.service.js';
import { OpenAIAccountsService } from '../services/openai-accounts.service.js';
import { llmPaid } from '../util/llm-scope.js';
import { OPENROUTER_UPSTREAM_WAIT_MS, openRouterLimitOf } from '../util/openrouter-limits.js';

const HOUR = 3_600_000;
const MINI = 'openai/gpt-5.4-mini';
const HAIKU = 'anthropic/claude-haiku-5-5';
const FULL = 'openai/gpt-5.4';
const SONNET = 'anthropic/claude-sonnet-5-5';
const OPUS = 'anthropic/claude-opus-5-5';
const FREE = 'openrouter/nvidia/nemotron-3.5-super-vl:free';

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
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
/** OpenRouter's answer, as the AI SDK throws it inside Mastra's own error */
const openRouterError = (
	statusCode: number,
	message: string,
	responseHeaders: Record<string, string> = {},
) =>
	Object.assign(new Error('Mastra: generate failed'), {
		cause: Object.assign(new Error(message), {
			statusCode,
			url: OPENROUTER_URL,
			responseHeaders,
		}),
	});
const MIDNIGHT = Date.parse('2026-11-02T00:00:00Z');
const dayUsedUp = () =>
	openRouterError(
		429,
		'Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day',
		{ 'x-ratelimit-reset': String(MIDNIGHT) },
	);
const busyUpstream = () =>
	openRouterError(429, `${FREE} is temporarily rate-limited upstream. Please retry shortly`, {
		'x-openrouter-error-origin': 'provider',
	});

type SetupOptions = Pick<LlmModelsOptions, 'disabled' | 'agentModels'> & {
	/** The accounts' keys; unset leaves the provider out */
	anthropicApiKey?: string;
	openRouterApiKey?: string;
	/** Each account's daily limits */
	limits?: { openai?: LlmAccountLimit[]; openrouter?: LlmAccountLimit[] };
};

const setup = (opts: SetupOptions = { anthropicApiKey: 'sk-ant-xxxx' }) => {
	let now = Date.parse('2026-11-01T12:00:00Z');
	/** Every wait the service sat out; the clock moves by it instead of the test waiting */
	const slept: number[] = [];
	const { anthropicApiKey, openRouterApiKey, limits, ...rest } = opts;
	const quotas = new LlmAccountQuotas({ now: () => now });
	const openai = defineLlmAccount({
		id: 'openai-a',
		provider: 'openai',
		apiKey: 'sk-aaaa',
		limits: limits?.openai ?? [],
	});
	const openAIAccounts = new OpenAIAccountsService({
		accounts: [{ ...openai, apiKey: 'sk-aaaa' }],
		quotas,
		rotateAfterRequests: 100,
		blockMs: 24 * HOUR,
		now: () => now,
	});
	const service = new LlmModelsService({
		openAIAccounts,
		quotas,
		anthropic: defineLlmAccount({
			id: 'anthropic',
			provider: 'anthropic',
			apiKey: anthropicApiKey,
			limits: [],
		}),
		openRouter: defineLlmAccount({
			id: 'openrouter',
			provider: 'openrouter',
			apiKey: openRouterApiKey,
			limits: limits?.openrouter ?? [],
		}),
		...rest,
		blockMs: 24 * HOUR,
		now: () => now,
		sleep: async ms => {
			slept.push(ms);
			now += ms;
		},
	});
	/**
	 * Which models a call was tried on, in order; `fail` decides per model. Inside `llmPaid`, where
	 * the roster's Claude models serve too
	 */
	const call = async (
		choice: Parameters<LlmModelsService['run']>[0],
		fail: (model: LlmModelKey) => Error | null = () => null,
		/** The tokens each answer counts against its account's day */
		tokens = 0,
	) => {
		const tried: string[] = [];
		const served = await llmPaid(() =>
			service.run(
				choice,
				async model => {
					tried.push(model.id);
					const error = fail(model);
					if (error) throw error;
					return model;
				},
				{ tokensOf: () => tokens },
			),
		).catch((e: Error) => e);
		if (served instanceof Error) return { tried, out: served, account: undefined };
		const { account, ...out } = served;
		return { tried, out, account };
	};
	return {
		service,
		quotas,
		call,
		slept,
		advance: (ms: number) => (now += ms),
		now: () => now,
	};
};

describe('modelsFor', () => {
	it('gives a tier its roster, free first', () => {
		expect(modelsFor('mini')).toEqual([MINI, FREE, HAIKU]);
		expect(modelsFor('full')).toEqual([FULL, FREE, SONNET]);
		expect(modelsFor('high')).toEqual([OPUS, FULL, FREE]);
	});

	it('puts a chosen model first, the rest of its tier behind it', () => {
		expect(modelsFor(SONNET)).toEqual([SONNET, FULL, FREE]);
		expect(modelsFor(OPUS)).toEqual([OPUS, FULL, FREE]);
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

	it("moves an agent with paidFallback to its tier's Claude model outside llmPaid", async () => {
		const { service } = setup();
		const tried: string[] = [];
		const out = await service.run(
			'mini',
			async model => {
				tried.push(model.id);
				if (model.id.startsWith('openai/')) throw openAIOut();
				return model.id;
			},
			{ paidFallback: true },
		);
		expect(tried).toEqual([MINI, HAIKU]);
		expect(out.model).toBe(HAIKU);
		// Without it, the same call fails rather than paying
		const fresh = setup().service;
		const refused = await fresh
			.run('mini', async model => {
				if (model.id.startsWith('openai/')) throw openAIOut();
				return model.id;
			})
			.catch((e: Error) => e);
		expect(isFatalProviderError(refused)).toBe(true);
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
		const { call } = setup({
			anthropicApiKey: 'sk-ant-xxxx',
			disabled: { openai: true, anthropic: true },
		});
		const out = await call('mini');
		expect(out.tried).toEqual([]);
		expect((out.out as Error).message).toBe(
			`No model can serve mini: openai/gpt-5.4-mini disabled; ${FREE} no OPENROUTER_AI_API_KEY; anthropic/claude-haiku-5-5 disabled`,
		);
		expect(isFatalProviderError(out.out)).toBe(true);
	});

	it('puts an agent on its LLM_AGENT_MODELS choice, still free outside llmPaid', async () => {
		const { service } = setup({
			anthropicApiKey: 'sk-ant-xxxx',
			agentModels: { 'term-topic': 'high' },
		});
		expect(service.choiceFor('term-topic', 'mini')).toBe('high');
		expect(service.choiceFor('post-gate', 'mini')).toBe('mini');

		expect((await service.run('high', async model => model.id)).model).toBe(FULL);
		expect((await llmPaid(() => service.run('high', async model => model.id))).model).toBe(
			OPUS,
		);
	});
});

describe('LlmModelsService on OpenRouter', () => {
	const withKey = { anthropicApiKey: 'sk-ant-xxxx', openRouterApiKey: 'sk-or-xxxx' };
	const openAIFails = (m: LlmModelKey) => (m.id.startsWith('openai/') ? openAIOut() : null);

	it("moves to OpenRouter's free model once OpenAI is out, outside llmPaid, with its key", async () => {
		const { service } = setup(withKey);
		const tried: string[] = [];
		const out = await service.run('mini', async model => {
			tried.push(model.id);
			const error = openAIFails(model);
			if (error) throw error;
			return model;
		});
		expect(tried).toEqual([MINI, FREE]);
		expect(out).toEqual({
			result: { id: FREE, apiKey: 'sk-or-xxxx' },
			model: FREE,
			account: 'openrouter',
		});
	});

	it('spaces its calls to the per-minute cap', async () => {
		const { service, slept, advance } = setup(withKey);
		for (let i = 0; i < 3; i++) await service.run(FREE, async model => model.id);
		// 20 a minute, 5% under: one start every 3.15 s
		expect(slept).toEqual([3150, 3150]);
		advance(10_000);
		await service.run(FREE, async model => model.id);
		expect(slept).toHaveLength(2);
	});

	it('waits out a model busy upstream and tries it again, without blocking the account', async () => {
		const { call, service, slept } = setup(withKey);
		let failures = 1;
		const out = await call('mini', m =>
			m.id === FREE && failures-- > 0 ? busyUpstream() : openAIFails(m),
		);
		expect(out.tried).toEqual([MINI, FREE, FREE]);
		expect(out.out).toMatchObject({ model: FREE });
		expect(slept).toContain(OPENROUTER_UPSTREAM_WAIT_MS);
		expect(service.status().openrouter).toBeNull();
	});

	it(`moves on after ${OPENROUTER_TRIES} tries of a model that stays busy`, async () => {
		const { call } = setup(withKey);
		const out = await call('mini', m => (m.id === FREE ? busyUpstream() : openAIFails(m)));
		expect(out.tried).toEqual([MINI, ...Array(OPENROUTER_TRIES).fill(FREE), HAIKU]);
		expect(out.out).toMatchObject({ model: HAIKU });
	});

	it("blocks OpenRouter until the day's reset once its free requests are used up", async () => {
		const { service, call, advance, now } = setup(withKey);
		const tried: string[] = [];
		const run = () =>
			service
				.run('mini', async model => {
					tried.push(model.id);
					if (model.id === FREE && now() < MIDNIGHT) throw dayUsedUp();
					const error = openAIFails(model);
					if (error) throw error;
					return model.id;
				})
				.catch((e: Error) => e);

		const first = await run();
		expect(tried).toEqual([MINI, FREE]);
		expect((first as Error).message).toBe('Mastra: generate failed');
		expect(service.status().openrouter).toEqual({
			until: new Date(MIDNIGHT),
			reason: expect.stringMatching(/free-models-per-day/),
		});

		// The next call skips both without calling either, and fails fatally: the step stops
		tried.length = 0;
		const second = await run();
		expect(tried).toEqual([]);
		expect(isFatalProviderError(second)).toBe(true);

		// Inside llmPaid it moves to Claude instead
		expect((await call('mini')).tried).toEqual([HAIKU]);

		advance(MIDNIGHT - now());
		tried.length = 0;
		expect(await run()).toMatchObject({ model: FREE });
		expect(tried).toEqual([MINI, FREE]);
		expect(service.status().openrouter).toBeNull();
	});

	it('leaves a model OpenRouter no longer serves alone, the account still serving the others', async () => {
		const { service } = setup(withKey);
		const GONE = 'openrouter/google/gemma-4-31b-it:free';
		const gone = () => openRouterError(404, `No endpoints found for ${GONE}.`);
		const first = await service
			.run(GONE, async model => {
				if (model.id === GONE) throw gone();
				return model.id;
			})
			.catch((e: Error) => e);
		expect((first as Error).message).toBe('Mastra: generate failed');

		const again = await service.run(GONE, async model => model.id).catch((e: Error) => e);
		expect((again as Error).message).toMatch(
			new RegExp(`No model can serve ${GONE}: ${GONE} blocked: No endpoints found`),
		);
		expect((await service.run(FREE, async model => model.id)).model).toBe(FREE);
	});

	it('leaves OpenRouter out without a key or when disabled', async () => {
		for (const opts of [
			{ anthropicApiKey: 'sk-ant-xxxx' },
			{ ...withKey, disabled: { openrouter: true } },
		]) {
			const { service } = setup(opts);
			const tried: string[] = [];
			const out = await service
				.run('mini', async model => {
					tried.push(model.id);
					throw openAIOut();
				})
				.catch((e: Error) => e);
			expect(tried).toEqual([MINI]);
			expect(isFatalProviderError(out)).toBe(true);
		}
	});
});

describe('openRouterLimitOf', () => {
	const NOW = Date.parse('2026-11-01T12:00:00Z');
	const BLOCK = 24 * HOUR;

	it("blocks the account until the day's reset, from the header or the next UTC midnight", () => {
		expect(openRouterLimitOf(dayUsedUp(), NOW, BLOCK)).toMatchObject({
			scope: 'account',
			until: MIDNIGHT,
		});
		const noHeader = openRouterError(429, 'Rate limit exceeded: free-models-per-day.');
		expect(openRouterLimitOf(noHeader, NOW, BLOCK)?.until).toBe(MIDNIGHT);
	});

	it("blocks the account for the minute's cap, a model busy upstream for a minute", () => {
		const minute = openRouterError(429, 'Rate limit exceeded: free-models-per-min.', {
			'x-ratelimit-reset': String(NOW + 20_000),
		});
		expect(openRouterLimitOf(minute, NOW, BLOCK)).toMatchObject({
			scope: 'account',
			until: NOW + 20_000,
		});
		expect(openRouterLimitOf(busyUpstream(), NOW, BLOCK)).toMatchObject({
			scope: 'model',
			until: NOW + OPENROUTER_UPSTREAM_WAIT_MS,
		});
	});

	it('blocks the account for a refused key or credit, a model that is gone, for the longest block', () => {
		for (const status of [401, 402])
			expect(openRouterLimitOf(openRouterError(status, 'No'), NOW, BLOCK)).toMatchObject({
				scope: 'account',
				until: NOW + BLOCK,
			});
		expect(openRouterLimitOf(openRouterError(404, 'No endpoints'), NOW, BLOCK)).toMatchObject({
			scope: 'model',
			until: NOW + BLOCK,
		});
	});

	it("is null for the call's own errors and for other providers", () => {
		expect(openRouterLimitOf(openRouterError(400, 'Invalid schema'), NOW, BLOCK)).toBeNull();
		expect(openRouterLimitOf(openRouterError(500, 'Internal'), NOW, BLOCK)).toBeNull();
		expect(openRouterLimitOf(openAIOut(), NOW, BLOCK)).toBeNull();
		expect(openRouterLimitOf(new Error('boom'), NOW, BLOCK)).toBeNull();
	});
});

describe('LlmModelsService.availability', () => {
	it('says a tier can be served while a free account is open', () => {
		const { service } = setup();
		expect(service.availability('mini')).toEqual({ available: true, until: 0, reason: '' });
	});

	it('names when the roster serves again once every model is blocked', async () => {
		const { service, call } = setup({
			anthropicApiKey: 'sk-ant-xxxx',
			openRouterApiKey: 'sk-or-xxxx',
		});
		// OpenAI out of credit (an hour), OpenRouter's day used up (until its reset), Claude blocked (a day)
		await call('mini', model =>
			model.id === MINI ? openAIOut()
			: model.id === FREE ? dayUsedUp()
			: anthropicOut(),
		);

		const outside = service.availability('mini');
		expect(outside.available).toBe(false);
		expect(outside.until).toBe(Date.parse('2026-11-01T13:00:00Z'));
		expect(outside.reason).toContain(MINI);
		expect(outside.reason).toContain(FREE);
		// Inside llmPaid Claude counts too, blocked the longest; the earliest end still wins
		expect(await llmPaid(async () => service.availability('mini').until)).toBe(
			Date.parse('2026-11-01T13:00:00Z'),
		);
	});

	it('says nothing will ever serve when no model of the choice is configured', () => {
		const { service } = setup({ disabled: { openai: true } });
		// OpenRouter has no key, Claude is paid outside llmPaid
		expect(service.availability('mini')).toEqual({
			available: false,
			until: null,
			reason: expect.stringContaining('no OPENROUTER_AI_API_KEY'),
		});
		const none = setup({
			disabled: { openai: true, anthropic: true, openrouter: true },
		}).service;
		expect(none.availability('mini')).toMatchObject({
			available: false,
			until: null,
			reason: 'no model configured for mini',
		});
	});
});

describe('LlmModelsService with daily account limits', () => {
	const NOON = Date.parse('2026-11-01T12:00:00Z');
	const MIDNIGHT_AFTER = Date.parse('2026-11-02T00:00:00Z');

	it('moves off an OpenAI account once its tokens for the day are used, back at 00:00 UTC', async () => {
		const { call, advance } = setup({
			openRouterApiKey: 'sk-or-xxxx',
			limits: { openai: [tokensPerDay(1_000)] },
		});
		expect(await call('mini', undefined, 600)).toMatchObject({
			tried: [MINI],
			account: 'openai-a',
		});
		// Under the limit before the call, so it serves: calls in flight overshoot it
		expect((await call('mini', undefined, 600)).account).toBe('openai-a');
		expect(await call('mini')).toMatchObject({ tried: [FREE], account: 'openrouter' });

		advance(MIDNIGHT_AFTER - NOON);
		expect((await call('mini')).account).toBe('openai-a');
	});

	it('stops OpenRouter after its requests for the day, failed tries counted, and names the reset', async () => {
		const { service, call } = setup({
			openRouterApiKey: 'sk-or-xxxx',
			disabled: { openai: true },
			limits: { openrouter: [requestsPerDay(2)] },
		});
		// A busy free model is tried again: both tries are requests of the day
		let tries = 0;
		const first = await call('mini', m =>
			m.id === FREE && tries++ === 0 ? busyUpstream() : null,
		);
		expect(first.tried).toEqual([FREE, FREE]);

		const out = await call('mini');
		expect(out.out).toBeInstanceOf(Error);
		expect(isFatalProviderError(out.out)).toBe(true);
		// Outside llmPaid only the free models count: what a waiting workflow sleeps on
		expect(service.availability('mini')).toMatchObject({
			available: false,
			until: MIDNIGHT_AFTER,
			reason: expect.stringContaining('openrouter used 2 of its 2 requests a day'),
		});
	});

	it('says an OpenAI account out for the day serves again at 00:00 UTC', () => {
		const { service, quotas } = setup({ limits: { openai: [tokensPerDay(1_000)] } });
		quotas.merge([{ account: 'openai-a', model: MINI, requests: 3, tokens: 1_000 }]);
		// OpenRouter has no key here: nothing else serves the free tier
		expect(service.availability('mini')).toMatchObject({
			available: false,
			until: MIDNIGHT_AFTER,
		});
	});

	it('holds a model only by a limit naming its exact id', async () => {
		const { call } = setup({
			openRouterApiKey: 'sk-or-xxxx',
			limits: {
				openai: [
					tokensPerDay(1_000, { models: [MINI] }),
					tokensPerDay(100, { models: [FULL] }),
				],
			},
		});
		await call('full', undefined, 100);
		expect((await call('full')).account).toBe('openrouter');
		expect((await call('mini')).account).toBe('openai-a');
	});

	it('counts a limit only on the models it names', async () => {
		const { call } = setup({
			openRouterApiKey: 'sk-or-xxxx',
			limits: { openai: [tokensPerDay(100, { models: [MINI] })] },
		});
		await call('mini', undefined, 100);
		expect((await call('mini')).account).toBe('openrouter');
		expect((await call('full')).account).toBe('openai-a');
	});

	it('starts from what the ledger says the account used today', async () => {
		const { quotas, call } = setup({
			openRouterApiKey: 'sk-or-xxxx',
			limits: { openai: [tokensPerDay(1_000)] },
		});
		quotas.merge([{ account: 'openai-a', model: MINI, requests: 3, tokens: 1_200 }]);
		expect((await call('mini')).account).toBe('openrouter');
	});
});
