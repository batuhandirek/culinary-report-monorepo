import 'reflect-metadata';

import { jest } from '@jest/globals';

import { turnstileConfig } from '../../config/turnstile.config.js';
import { TurnstileService } from '../../services/turnstile.service.js';

const siteverifyResponse = (body: unknown, status = 200): Response =>
	({
		ok: status >= 200 && status < 300,
		status,
		json: async () => body,
	}) as Response;

describe('TurnstileService', () => {
	const service = new TurnstileService();
	const originalSecret = turnstileConfig.TURNSTILE_SECRET_KEY;
	const originalFetch = globalThis.fetch;
	let fetchMock: jest.Mock<() => Promise<Response>>;

	beforeEach(() => {
		turnstileConfig.TURNSTILE_SECRET_KEY = 'test-secret';
		fetchMock = jest.fn<() => Promise<Response>>();
		globalThis.fetch = fetchMock as unknown as typeof fetch;
	});

	afterEach(() => {
		turnstileConfig.TURNSTILE_SECRET_KEY = originalSecret;
		globalThis.fetch = originalFetch;
	});

	it('isEnabled follows TURNSTILE_SECRET_KEY presence', () => {
		expect(service.isEnabled).toBe(true);
		turnstileConfig.TURNSTILE_SECRET_KEY = undefined;
		expect(service.isEnabled).toBe(false);
	});

	it('returns pass on a successful siteverify and sends secret/response/remoteip', async () => {
		fetchMock.mockResolvedValue(siteverifyResponse({ success: true }));

		const verdict = await service.verifyToken('cf-token', '1.2.3.4');
		expect(verdict).toEqual({ outcome: 'pass', errorCodes: [] });

		const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		expect(JSON.parse(init.body as string)).toEqual({
			secret: 'test-secret',
			response: 'cf-token',
			remoteip: '1.2.3.4',
		});
	});

	it('returns fail with the error codes when siteverify rejects the token', async () => {
		fetchMock.mockResolvedValue(
			siteverifyResponse({ success: false, 'error-codes': ['timeout-or-duplicate'] }),
		);

		await expect(service.verifyToken('used-token')).resolves.toEqual({
			outcome: 'fail',
			errorCodes: ['timeout-or-duplicate'],
		});
	});

	it('returns unavailable on a non-2xx siteverify response', async () => {
		fetchMock.mockResolvedValue(siteverifyResponse({}, 503));

		await expect(service.verifyToken('cf-token')).resolves.toEqual({
			outcome: 'unavailable',
			errorCodes: ['http-503'],
		});
	});

	it('returns unavailable when siteverify is unreachable', async () => {
		fetchMock.mockRejectedValue(new Error('network down'));

		await expect(service.verifyToken('cf-token')).resolves.toEqual({
			outcome: 'unavailable',
			errorCodes: ['siteverify-unreachable'],
		});
	});
});
