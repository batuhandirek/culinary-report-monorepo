import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { OpenAIAccountsService } from 'src/modules/llm/services/openai-accounts.service.js';

import type { EmbeddingRepository } from '../repositories/embedding.repository.js';
import { EmbeddingsService } from '../services/embeddings.service.js';

/*
 * `embedManyUncached` through Mastra's `ModelRouterEmbeddingModel`, with the network replaced by a
 * fake `fetch`: the asked dimensions reach OpenAI's request body (`providerOptions.openai.dimensions`
 * in the AI SDK), the call goes through the accounts' key, and a vector of another length throws
 * before anything could store it.
 */
describe('EmbeddingsService.embedManyUncached', () => {
	const realFetch = globalThis.fetch;
	let bodies: { model: string; input: string[]; dimensions?: number }[];
	let headers: Headers[];
	let length: number;

	beforeEach(() => {
		bodies = [];
		headers = [];
		length = 1024;
		globalThis.fetch = jest.fn(async (_url: unknown, init?: RequestInit) => {
			const body = JSON.parse(String(init!.body));
			bodies.push(body);
			headers.push(new Headers(init!.headers));
			return new Response(
				JSON.stringify({
					object: 'list',
					data: body.input.map((_: string, i: number) => ({
						object: 'embedding',
						index: i,
						embedding: Array.from({ length }, () => 0.01),
					})),
					model: body.model,
					usage: { prompt_tokens: 7 * body.input.length, total_tokens: 7 * body.input.length },
				}),
				{ status: 200, headers: { 'content-type': 'application/json' } },
			);
		}) as typeof fetch;
	});

	afterEach(() => {
		globalThis.fetch = realFetch;
	});

	const service = () =>
		new EmbeddingsService(
			{} as EmbeddingRepository,
			new OpenAIAccountsService({ apiKeys: ['sk-test-abcd'], rotateAfterRequests: 100, blockMs: 1000 }),
		);

	it('asks OpenAI for the dimensions and returns one vector per value with the usage', async () => {
		const res = await service().embedManyUncached(['prices went up', 'cash only'], { dimensions: 1024 });
		expect(bodies).toEqual([
			expect.objectContaining({ model: 'text-embedding-3-large', input: ['prices went up', 'cash only'], dimensions: 1024 }),
		]);
		expect(headers[0].get('authorization')).toBe('Bearer sk-test-abcd');
		expect(res.embeddings).toHaveLength(2);
		expect(res.embeddings.every(e => e.length === 1024)).toBe(true);
		expect(res.tokens).toBe(14);
	});

	it('throws on a vector of another length', async () => {
		length = 3072;
		await expect(service().embedManyUncached(['x'], { dimensions: 1024 })).rejects.toThrow(
			'Embedding returned a vector of 3072 values, asked for 1024',
		);
	});

	it('asks nothing for no values', async () => {
		expect(await service().embedManyUncached([], { dimensions: 1024 })).toEqual({ embeddings: [], tokens: 0 });
		expect(bodies).toHaveLength(0);
	});
});
