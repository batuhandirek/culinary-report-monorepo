import 'reflect-metadata';

import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { COOKIE_ACCESS_TOKEN } from '../../constants/auth-cookie.constant.js';
import { UserRoleEnum } from '../../constants/user-role.enum.constant.js';
import { AuthenticationGuard } from '../../guards/authentication.guard.js';
import { OptionalAuthenticationGuard } from '../../guards/optional-authentication.guard.js';
import { JwtService } from '../../services/jwt.service.js';

const USER_ID = '3f7c8f4e-1111-4e0e-9d3a-000000000001';
const OTHER_USER_ID = '3f7c8f4e-2222-4e0e-9d3a-000000000002';
const SESSION_ID = '3f7c8f4e-3333-4e0e-9d3a-000000000003';

type GuardedRequest = {
	headers: Record<string, string | undefined>;
	cookies?: Record<string, string | undefined>;
	userId?: string;
	sessionId?: string;
	userRef?: unknown;
	userRoles?: UserRoleEnum[];
};

const httpContext = (request: GuardedRequest): ExecutionContext =>
	({
		switchToHttp: () => ({ getRequest: () => request }),
	}) as unknown as ExecutionContext;

// Only `getReference` is exercised; the guards never load the user.
const userRepository = { getReference: (id: string) => ({ id }) } as any;
// `OptionalAuthenticationGuard` takes a reflector and a session repository it doesn't touch
// on any path under test.
const reflector = {} as any;
const userSessionRepository = {} as any;

describe('auth guards — token source', () => {
	const jwtService = new JwtService();
	const guard = new AuthenticationGuard(userRepository, jwtService);
	const optionalGuard = new OptionalAuthenticationGuard(
		reflector,
		userRepository,
		userSessionRepository,
		jwtService,
	);

	const mintFor = async (userId: string) => {
		const { accessToken } = await jwtService.createAccessToken({
			userId,
			sessionId: SESSION_ID,
			roles: [UserRoleEnum.USER],
		});
		return accessToken;
	};

	describe('AuthenticationGuard', () => {
		it('accepts a bearer token from the Authorization header', async () => {
			const request: GuardedRequest = {
				headers: { authorization: `Bearer ${await mintFor(USER_ID)}` },
			};

			await expect(guard.canActivate(httpContext(request))).resolves.toBe(true);
			expect(request.userId).toBe(USER_ID);
			expect(request.sessionId).toBe(SESSION_ID);
		});

		it('accepts a token from the access-token cookie when there is no header', async () => {
			const request: GuardedRequest = {
				headers: {},
				cookies: { [COOKIE_ACCESS_TOKEN]: await mintFor(USER_ID) },
			};

			await expect(guard.canActivate(httpContext(request))).resolves.toBe(true);
			expect(request.userId).toBe(USER_ID);
		});

		// The header is an explicit act by the caller; the cookie rides along automatically.
		// An explicit token must never be silently overridden by an ambient one.
		it('prefers the header over the cookie when both are present', async () => {
			const request: GuardedRequest = {
				headers: { authorization: `Bearer ${await mintFor(USER_ID)}` },
				cookies: { [COOKIE_ACCESS_TOKEN]: await mintFor(OTHER_USER_ID) },
			};

			await expect(guard.canActivate(httpContext(request))).resolves.toBe(true);
			expect(request.userId).toBe(USER_ID);
		});

		it('rejects when neither header nor cookie carries a token', async () => {
			await expect(guard.canActivate(httpContext({ headers: {} }))).rejects.toThrow(
				UnauthorizedException,
			);
		});

		// `cookieParser()` leaves `req.cookies` undefined on requests it never parsed, and the
		// websocket/test paths construct requests by hand.
		it('rejects without throwing when the request has no cookies object at all', async () => {
			await expect(
				guard.canActivate(httpContext({ headers: {}, cookies: undefined })),
			).rejects.toThrow(UnauthorizedException);
		});

		it('does not authenticate a malformed cookie token', async () => {
			const request: GuardedRequest = {
				headers: {},
				cookies: { [COOKIE_ACCESS_TOKEN]: 'not-a-jwt' },
			};

			await expect(guard.canActivate(httpContext(request))).resolves.toBe(false);
			expect(request.userId).toBeUndefined();
		});
	});

	describe('OptionalAuthenticationGuard', () => {
		it('attaches the user from the access-token cookie', async () => {
			const request: GuardedRequest = {
				headers: {},
				cookies: { [COOKIE_ACCESS_TOKEN]: await mintFor(USER_ID) },
			};

			await expect(optionalGuard.canActivate(httpContext(request))).resolves.toBe(true);
			expect(request.userId).toBe(USER_ID);
		});

		it('prefers the header over the cookie when both are present', async () => {
			const request: GuardedRequest = {
				headers: { authorization: `Bearer ${await mintFor(USER_ID)}` },
				cookies: { [COOKIE_ACCESS_TOKEN]: await mintFor(OTHER_USER_ID) },
			};

			await expect(optionalGuard.canActivate(httpContext(request))).resolves.toBe(true);
			expect(request.userId).toBe(USER_ID);
		});

		// The whole point of the optional guard: anonymous requests still pass through.
		it('passes an anonymous request through with no user attached', async () => {
			const request: GuardedRequest = { headers: {} };

			await expect(optionalGuard.canActivate(httpContext(request))).resolves.toBe(true);
			expect(request.userId).toBeUndefined();
		});
	});
});
