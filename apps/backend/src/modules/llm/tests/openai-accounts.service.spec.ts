import { describe, expect, it } from '@jest/globals';

import { isFatalProviderError } from 'src/shared/util/pool.js';

import {
	isOpenAIAccountError,
	OpenAIAccountsService,
} from '../services/openai-accounts.service.js';

const HOUR = 3_600_000;
const MINI = 'openai/gpt-5.4-mini';
const FULL = 'openai/gpt-5.4';

/** The shape the AI SDK throws for an OpenAI answer */
const openAIError = (message: string, statusCode = 429) =>
	Object.assign(new Error(message), { statusCode, url: 'https://api.openai.com/v1/responses' });
const noCredits = () =>
	openAIError('You have no credits remaining. Add credits to continue using the API');

const setup = (opts: { keys?: string[]; rotateAfter?: number } = {}) => {
	let now = Date.parse('2026-10-19T12:00:00Z');
	const service = new OpenAIAccountsService({
		apiKeys: opts.keys ?? ['sk-aaaa', 'sk-bbbb'],
		rotateAfterRequests: opts.rotateAfter ?? 2,
		blockMs: 24 * HOUR,
		now: () => now,
	});
	const keyFor = (model = MINI) => service.run(model, async account => account.apiKey);
	return { service, keyFor, advance: (ms: number) => (now += ms) };
};

describe('OpenAIAccountsService', () => {
	it('moves to the next account after N calls and wraps around', async () => {
		const { keyFor } = setup({ rotateAfter: 2 });
		const keys: string[] = [];
		for (let i = 0; i < 6; i++) keys.push(await keyFor());
		expect(keys).toEqual(['sk-aaaa', 'sk-aaaa', 'sk-bbbb', 'sk-bbbb', 'sk-aaaa', 'sk-aaaa']);
	});

	it('blocks an account out of credits for that model and retries the call on the next', async () => {
		const { service, keyFor } = setup({ rotateAfter: 100 });
		const tried: string[] = [];
		const result = await service.run(MINI, async account => {
			tried.push(account.apiKey);
			if (account.apiKey === 'sk-aaaa') throw noCredits();
			return 'ok';
		});
		expect(result).toBe('ok');
		expect(tried).toEqual(['sk-aaaa', 'sk-bbbb']);

		// Mini skips the blocked account; the full model, a separate allowance, still uses it
		expect(await keyFor(MINI)).toBe('sk-bbbb');
		expect(await keyFor(FULL)).toBe('sk-aaaa');
		expect(service.status()).toEqual([
			expect.objectContaining({ account: '#1 (…aaaa)', model: MINI }),
		]);
	});

	it('takes the account back once the block runs out', async () => {
		const { service, keyFor, advance } = setup({ rotateAfter: 100 });
		await service.run(MINI, async account => {
			if (account.apiKey === 'sk-aaaa') throw noCredits();
		});
		advance(23 * HOUR);
		expect(await keyFor()).toBe('sk-bbbb');
		advance(1 * HOUR);
		expect(await keyFor()).toBe('sk-aaaa');
		expect(service.status()).toEqual([]);
	});

	it('blocks a rejected key too', async () => {
		const { service, keyFor } = setup({ rotateAfter: 100 });
		await service.run(MINI, async account => {
			if (account.apiKey === 'sk-aaaa')
				throw openAIError('Incorrect API key provided: sk-aaaa.', 401);
		});
		expect(await keyFor()).toBe('sk-bbbb');
	});

	it('fails with a fatal provider error once every account is blocked', async () => {
		const { service } = setup();
		const attempt = service.run(MINI, async () => {
			throw noCredits();
		});
		await expect(attempt).rejects.toThrow('no credits remaining');

		// Later calls fail before reaching OpenAI, naming every account and when it comes back
		let called = false;
		const error = await service
			.run(MINI, async () => {
				called = true;
			})
			.catch((e: Error) => e);
		expect(called).toBe(false);
		expect((error as Error).message).toMatch(
			/No OpenAI account can serve openai\/gpt-5.4-mini/,
		);
		expect((error as Error).message).toMatch(/#1 \(…aaaa\) until 2026-10-20T12:00:00.000Z/);
		expect(isFatalProviderError(error)).toBe(true);
	});

	it('rethrows any other error without blocking', async () => {
		const { service, keyFor } = setup({ rotateAfter: 100 });
		await expect(
			service.run(MINI, async () => {
				throw openAIError('Rate limit reached for gpt-5.4-mini', 429);
			}),
		).rejects.toThrow('Rate limit reached');
		expect(await keyFor()).toBe('sk-aaaa');
		expect(service.status()).toEqual([]);
	});
});

describe('isOpenAIAccountError', () => {
	it('recognises OpenAI out of credits, also wrapped in a retry error', () => {
		expect(isOpenAIAccountError(noCredits())).toBe(true);
		const retryError = Object.assign(new Error('Failed after 3 attempts.'), {
			lastError: noCredits(),
		});
		expect(isOpenAIAccountError(retryError)).toBe(true);
	});

	it('ignores a 401 from another API (a tool calling Apify)', () => {
		const apify = Object.assign(
			new Error('User was not found or authentication token is not valid'),
			{
				statusCode: 401,
				url: 'https://api.apify.com/v2/acts',
			},
		);
		expect(isOpenAIAccountError(apify)).toBe(false);
	});
});
