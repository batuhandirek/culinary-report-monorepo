import 'reflect-metadata';

import { CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

import { jest } from '@jest/globals';

import { ChangeEmailController } from 'src/modules/auth/controllers/change-email.controller.js';
import { ChangeMobileNumberController } from 'src/modules/auth/controllers/change-mobile-number.controller.js';
import { ForgotPasswordController } from 'src/modules/auth/controllers/forgot-password.controller.js';
import { LoginController } from 'src/modules/auth/controllers/login.controller.js';
import { SignupController } from 'src/modules/auth/controllers/signup.controller.js';

import { turnstileConfig } from '../../config/turnstile.config.js';
import { TURNSTILE_TOKEN_HEADER, TurnstileGuard } from '../../guards/turnstile.guard.js';
import { TurnstileService, TurnstileVerdict } from '../../services/turnstile.service.js';

type GuardedRequest = {
	headers: Record<string, string | undefined>;
	method?: string;
	url?: string;
};

const httpContext = (request: GuardedRequest): ExecutionContext =>
	({
		switchToHttp: () => ({ getRequest: () => request }),
	}) as unknown as ExecutionContext;

const serviceMock = (isEnabled: boolean, verdict?: TurnstileVerdict) => {
	const verifyToken = jest.fn(async (): Promise<TurnstileVerdict> => verdict!);
	return {
		service: { isEnabled, verifyToken } as unknown as TurnstileService,
		verifyToken,
	};
};

describe('TurnstileGuard', () => {
	const originalEnforce = turnstileConfig.TURNSTILE_ENFORCE;
	afterEach(() => {
		turnstileConfig.TURNSTILE_ENFORCE = originalEnforce;
	});

	it('is a no-op when no secret key is configured', async () => {
		const { service, verifyToken } = serviceMock(false);
		const guard = new TurnstileGuard(service);

		await expect(guard.canActivate(httpContext({ headers: {} }))).resolves.toBe(true);
		expect(verifyToken).not.toHaveBeenCalled();
	});

	it('allows a request whose token passes siteverify', async () => {
		const { service, verifyToken } = serviceMock(true, { outcome: 'pass', errorCodes: [] });
		const guard = new TurnstileGuard(service);
		const request: GuardedRequest = {
			headers: { [TURNSTILE_TOKEN_HEADER]: 'cf-token', 'cf-connecting-ip': '1.2.3.4' },
		};

		await expect(guard.canActivate(httpContext(request))).resolves.toBe(true);
		expect(verifyToken).toHaveBeenCalledWith('cf-token', '1.2.3.4');
	});

	describe('tolerant mode (TURNSTILE_ENFORCE=false)', () => {
		beforeEach(() => {
			turnstileConfig.TURNSTILE_ENFORCE = false;
		});

		it('allows a request without the token header', async () => {
			const guard = new TurnstileGuard(serviceMock(true).service);
			await expect(guard.canActivate(httpContext({ headers: {} }))).resolves.toBe(true);
		});

		it('allows a request whose token fails siteverify', async () => {
			const { service } = serviceMock(true, {
				outcome: 'fail',
				errorCodes: ['invalid-input-response'],
			});
			const guard = new TurnstileGuard(service);
			await expect(
				guard.canActivate(httpContext({ headers: { [TURNSTILE_TOKEN_HEADER]: 'bad' } })),
			).resolves.toBe(true);
		});
	});

	describe('enforced mode (TURNSTILE_ENFORCE=true)', () => {
		beforeEach(() => {
			turnstileConfig.TURNSTILE_ENFORCE = true;
		});

		it('rejects a request without the token header', async () => {
			const guard = new TurnstileGuard(serviceMock(true).service);
			await expect(guard.canActivate(httpContext({ headers: {} }))).rejects.toThrow(
				ForbiddenException,
			);
		});

		it.each([['ios'], ['android']])(
			'exempts native (%s) requests even without a token',
			async platform => {
				const { service, verifyToken } = serviceMock(true);
				const guard = new TurnstileGuard(service);
				await expect(
					guard.canActivate(httpContext({ headers: { 'culinary-report-sent-by': platform } })),
				).resolves.toBe(true);
				expect(verifyToken).not.toHaveBeenCalled();
			},
		);

		it('still enforces on web (culinary-report-sent-by=web) requests', async () => {
			const guard = new TurnstileGuard(serviceMock(true).service);
			await expect(
				guard.canActivate(httpContext({ headers: { 'culinary-report-sent-by': 'web' } })),
			).rejects.toThrow(ForbiddenException);
		});

		it('rejects a request whose token fails siteverify', async () => {
			const { service } = serviceMock(true, {
				outcome: 'fail',
				errorCodes: ['timeout-or-duplicate'],
			});
			const guard = new TurnstileGuard(service);
			await expect(
				guard.canActivate(httpContext({ headers: { [TURNSTILE_TOKEN_HEADER]: 'used' } })),
			).rejects.toThrow(ForbiddenException);
		});

		it('fails open when siteverify itself is unavailable', async () => {
			const { service } = serviceMock(true, {
				outcome: 'unavailable',
				errorCodes: ['siteverify-unreachable'],
			});
			const guard = new TurnstileGuard(service);
			await expect(
				guard.canActivate(httpContext({ headers: { [TURNSTILE_TOKEN_HEADER]: 'any' } })),
			).resolves.toBe(true);
		});
	});

	// Lock the bot-sensitive public auth routes to the guard.
	describe('route coverage', () => {
		const guardsOf = (proto: object, method: string): CanActivate[] =>
			Reflect.getMetadata('__guards__', (proto as Record<string, any>)[method]) ?? [];

		it.each([['loginWithEmail'], ['loginWithMobileNumber'], ['requestLoginCode'], ['loginWithCode']])(
			'login %s is guarded by TurnstileGuard',
			method => {
				expect(guardsOf(LoginController.prototype, method)).toContain(TurnstileGuard);
			},
		);

		it.each([['signupWithEmail'], ['signupWithPhone'], ['verifySignup']])(
			'signup %s is guarded by TurnstileGuard',
			method => {
				expect(guardsOf(SignupController.prototype, method)).toContain(TurnstileGuard);
			},
		);

		it.each([['forgotPassword'], ['verifyForgotPassword']])(
			'forgot-password %s is guarded by TurnstileGuard',
			method => {
				expect(guardsOf(ForgotPasswordController.prototype, method)).toContain(
					TurnstileGuard,
				);
			},
		);

		it.each([['changeMobileNumber'], ['verifyChangeMobileNumber']])(
			'change-mobile-number %s is guarded by TurnstileGuard',
			method => {
				expect(guardsOf(ChangeMobileNumberController.prototype, method)).toContain(
					TurnstileGuard,
				);
			},
		);

		it.each([['changeEmail'], ['verifyChangeEmail']])(
			'change-email %s is guarded by TurnstileGuard',
			method => {
				expect(guardsOf(ChangeEmailController.prototype, method)).toContain(TurnstileGuard);
			},
		);
	});
});
