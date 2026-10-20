import type { AuthDialogProps } from './AuthDialog.svelte';

import { authDialogManager } from '#components/auth/auth-dialog-manager.svelte.js';
import { userStore } from '#stores/UserStore.svelte.js';

export type WithAuthOptions = Omit<AuthDialogProps, 'active' | 'onSuccess' | 'onCancel'>;

export function withAuth(action: () => void, opts?: WithAuthOptions): void {
	const authed = opts?.requireMobileNumberVerificationAsWell
		? userStore.isLoggedIn && userStore.hasMobileNumber
		: userStore.isLoggedIn;

	if (!authed) {
		authDialogManager.show({
			...opts,
			onSuccess: action
		});
		return;
	}

	action();
}

export function createWithAuth(action: () => void, opts?: WithAuthOptions): () => void {
	return () => withAuth(action, opts);
}

export function isAuthed(
	opts?: Pick<WithAuthOptions, 'requireMobileNumberVerificationAsWell'>
): boolean {
	return opts?.requireMobileNumberVerificationAsWell
		? userStore.isLoggedIn && userStore.hasMobileNumber
		: userStore.isLoggedIn;
}
