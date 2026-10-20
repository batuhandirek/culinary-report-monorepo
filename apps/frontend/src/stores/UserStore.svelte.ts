import dayjs from 'dayjs';

import { type GetMeData, GetMeOutputDtoRolesEnum, type LoginOutputDto } from 'client';
import { ExceptionCodes } from 'exceptions/src';

import { turnstileStore } from './TurnstileStore.svelte';

import { api, createUnauthenticatedApi, exceptionCodeOf } from '#lib/api.js';
import { notificationManager } from '#ui/lib/notification-manager.js';

// `app.html` reads this key too, to hold back the visitor-only header buttons
const SESSION_STORAGE_KEY = 'session';

interface PersistedAccount {
	accessToken: string;
	refreshToken: string;
	accessTokenExpiresAt: string;
	expiresAt: string;
}

class UserStore {
	tryingInitialising = $state(false);
	triedInitialising = $state(false);
	user = $state<GetMeData | null>(null);
	accessToken = $state<string | null>(null);
	refreshToken = $state<string | null>(null);
	accessTokenExpiresAt = $state<string | null>(null);
	expiresAt = $state<string | null>(null);
	userId = $derived(this.user?.id);
	isLoggedIn = $derived(!!this.user);
	isLoggedOut = $derived(!this.user);
	hasMobileNumber = $derived(!!this.user?.mobileNumber && !!this.user.mobileNumberVerifiedAt);
	hasEmail = $derived(!!this.user?.mobileNumber && !!this.user.mobileNumberVerifiedAt);
	isAdmin = $derived(this.user?.roles.includes(GetMeOutputDtoRolesEnum.Admin));
	/** The brands whose portal they may open, by name (admins open any without one). */
	brandMemberships = $derived(this.user?.brandMemberships ?? []);

	getAccessToken = async (): Promise<string> => {
		try {
			// Load from secure storage if not in memory
			if (!this.accessToken || !this.accessTokenExpiresAt) {
				await this.loadTokensFromStorage();
			}

			if (!this.accessToken || !this.accessTokenExpiresAt) {
				throw new Error('No access token available');
			}

			// Check if token needs refresh
			const expiresIn = dayjs(this.accessTokenExpiresAt).diff(dayjs(), 'minute');
			if (expiresIn < 2) {
				await this.refreshAccessToken();
			}

			return this.accessToken!;
		} catch (e) {
			if (exceptionCodeOf(e) === ExceptionCodes.SESSION_NOT_FOUND) {
				await this.handleSessionExpire();
			}
			throw e;
		}
	};

	refreshMe = async () => {
		try {
			const meRes = await api.auth.getMe();
			this.user = meRes;
			this.triedInitialising = true;
		} catch {}
	};

	tryInitialiseStoreIfNotTriedBefore = async () => {
		if (this.triedInitialising) return;
		return this.tryInitialiseStore();
	};

	tryInitialiseStore = async () => {
		if (this.tryingInitialising) return;

		this.tryingInitialising = true;
		try {
			await this.loadTokensFromStorage();
			if (!this.accessToken) {
				this.user = null;
				this.triedInitialising = true;
				this.tryingInitialising = false;
				return;
			}
			const meRes = await api.auth.getMe();

			this.user = meRes;
			this.triedInitialising = true;
			this.tryingInitialising = false;
		} catch {
			this.triedInitialising = true;
			this.tryingInitialising = false;
			this.user = null;
		}
	};

	/**
	 * Logs in, or throws the API's error (`{ code }`) so a form can say what is wrong next
	 * to the field. An account whose e-mail was never verified answers with a
	 * `verificationToken` instead of a session: a fresh code is on its way.
	 */
	loginWithEmail = async (email: string, password: string) => {
		const res = await api.auth.loginWithEmail(
			{ email, password },
			await turnstileStore.getHeaders('login')
		);
		if ('accessToken' in res) {
			await this.handleLogin(res);
			await this.tryInitialiseStore();
		}
		return res;
	};

	/** The portal's passwordless login, first half: mails a code, answers its token. */
	requestLoginCode = async (email: string) => {
		const res = await api.auth.requestLoginCode(
			{ email },
			await turnstileStore.getHeaders('login-code')
		);
		return res.verificationToken;
	};

	/** Second half: the code opens a session. Throws the API's error for the code step. */
	loginWithCode = async (verificationToken: string, code: string) => {
		const res = await api.auth.loginWithCode(
			{ token: verificationToken, code },
			await turnstileStore.getHeaders('login-code-verify')
		);
		await this.handleLogin(res);
		await this.tryInitialiseStore();
	};

	setUser = (userData: GetMeData) => {
		this.user = { ...userData };
	};

	logout = async () => {
		await api.auth.logout();
		await this.handleSessionExpire();
		location.href = `${location.href}`;
	};

	private handleLogin = async (res: LoginOutputDto) => {
		this.accessToken = res.accessToken;
		this.refreshToken = res.refreshToken;
		this.accessTokenExpiresAt = res.accessTokenExpiresAt;
		this.expiresAt = res.expiresAt;

		await this.persistAccount();
	};

	private handleSessionExpire = async () => {
		this.accessToken = null;
		this.refreshToken = null;
		this.accessTokenExpiresAt = null;
		this.expiresAt = null;

		localStorage.removeItem(SESSION_STORAGE_KEY);

		this.user = null;
	};

	private loadTokensFromStorage = async () => {
		let account: PersistedAccount | null = null;
		try {
			account = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) ?? 'null');
		} catch {
			localStorage.removeItem(SESSION_STORAGE_KEY);
		}
		this.accessToken = account?.accessToken ?? null;
		this.refreshToken = account?.refreshToken ?? null;
		this.accessTokenExpiresAt = account?.accessTokenExpiresAt ?? null;
		this.expiresAt = account?.expiresAt ?? null;
	};

	private refreshAccessToken = async () => {
		if (!this.refreshToken) {
			await this.loadTokensFromStorage();
		}

		const apiOnce = createUnauthenticatedApi();
		const res = await apiOnce.auth.refreshToken({ refreshToken: this.refreshToken! });

		this.accessToken = res.accessToken;
		this.accessTokenExpiresAt = res.accessTokenExpiresAt;

		await this.persistAccount();
	};

	private persistAccount = async () => {
		if (
			!this.accessToken ||
			!this.refreshToken ||
			!this.accessTokenExpiresAt ||
			!this.expiresAt
		) {
			return;
		}
		const data: PersistedAccount = {
			accessToken: this.accessToken,
			refreshToken: this.refreshToken,
			accessTokenExpiresAt: this.accessTokenExpiresAt,
			expiresAt: this.expiresAt
		};
		localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
	};
}

export const userStore = new UserStore();
