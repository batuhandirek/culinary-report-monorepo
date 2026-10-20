import { Logger } from '@nestjs/common';

import dayjs from 'dayjs';

import { Api, GetMeOutputDto } from 'client';

export class SimulatingUser {
	private static readonly baseUrl = 'http://localhost:3000/api';
	public api: Api<''>;
	private accessToken: string | undefined = undefined;
	private refreshToken: string | undefined = undefined;
	private accessTokenExpiresAt: Date | undefined = undefined;
	private expiresAt: Date | undefined = undefined;
	private me: GetMeOutputDto;
	private readonly logger: Logger;
	constructor(
		// Public so a journey run against the dev server can say which accounts it left there.
		readonly email: string,
		private readonly password: string,
		private readonly baseUrl = SimulatingUser.baseUrl,
	) {
		this.logger = new Logger(`[User:${this.email}]`);
		this.api = new Api({
			baseUrl,
			customFetch: this.customFetch.bind(this),
		});
	}

	/**
	 * Registers a fresh account (email signup → OTP verification → login).
	 * The server must run with VERIFICATION_DEFAULT_CODE so the OTP is known
	 * (the integration harness `bin/run-integration-tests.sh` sets it).
	 */
	async signup(firstName: string, lastName: string) {
		const verificationCode = process.env.VERIFICATION_DEFAULT_CODE;
		if (!verificationCode) {
			throw new Error('signup() needs VERIFICATION_DEFAULT_CODE in the environment');
		}

		const apiOnce = new Api({ baseUrl: this.baseUrl });
		const { verificationToken } = await apiOnce.auth.signupWithEmail({
			email: this.email,
			password: this.password,
			firstName,
			lastName,
			acceptedTerms: true,
		});
		await apiOnce.auth.verifySignup({ token: verificationToken, code: verificationCode });
		this.logger.debug(`Signed up`);

		await this.login();
	}

	async login() {
		const apiOnce = new Api({ baseUrl: this.baseUrl });
		const res = await apiOnce.auth.loginWithEmail({
			email: this.email,
			password: this.password,
		});

		if (!('accessToken' in res)) {
			throw new Error('This user needs verification');
		}

		this.logger.debug(`Logged in`);
		this.accessToken = res.accessToken;
		this.refreshToken = res.refreshToken;
		this.accessTokenExpiresAt = new Date(res.accessTokenExpiresAt);
		this.expiresAt = new Date(res.expiresAt);

		const meRes = await this.api.auth.getMe();
		this.me = meRes;
	}

	private async customFetch(input: URL | RequestInfo, init: RequestInit) {
		const accessToken = await this.getAccessToken();
		init.headers!['Authorization'] = `Bearer ${accessToken}`;
		return fetch(input, init);
	}

	private async getAccessToken() {
		try {
			// Check if token needs refresh
			const expiresIn = dayjs(this.accessTokenExpiresAt).diff(dayjs(), 'minute');
			if (expiresIn < 2) {
				await this.refreshAccessToken();
			}

			return this.accessToken!;
		} catch (e) {
			console.error('Failed to get access token', e);
			throw e;
		}
	}

	private async refreshAccessToken() {
		const apiOnce = new Api({ baseUrl: this.baseUrl });
		const res = await apiOnce.auth.refreshToken({ refreshToken: this.refreshToken! });

		this.accessToken = res.accessToken;
		this.accessTokenExpiresAt = new Date(res.accessTokenExpiresAt);
	}

	// ACCESSORS

	get id() {
		if (!this.me) {
			throw new Error('Not initialised');
		}
		return this.me.id;
	}
}
