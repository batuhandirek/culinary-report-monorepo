import posthog from 'posthog-js';

import { userStore } from './UserStore.svelte';

import { browser } from '$app/env';

type GtagCommand = 'config' | 'set' | 'event' | 'js';

declare global {
	interface Window {
		gtag?: (...args: [GtagCommand, ...unknown[]]) => void;
		fbq?: (...args: unknown[]) => void;
	}
}

export const trackEvent = (eventName: string, params?: Record<string, string | number>) => {
	window.gtag?.('event', eventName, params);
	posthog.capture(eventName, params);
};

export type ConsentKeys = 'hasAcceptedMarketing';

class AnalyticsStore {
	hasBeenAskedBefore = $state(false);
	isInitialized = $state(false);
	isDialogVisible = $state(false);
	hasAcceptedMarketing = $state<boolean | undefined>(undefined);

	initialize = async () => {
		const cookieConsentResult = localStorage.getItem('cookieConsent');
		if (!cookieConsentResult) {
			this.isInitialized = true;
			this.hasBeenAskedBefore = false;
			return;
		}

		let consentResult;
		try {
			consentResult = JSON.parse(cookieConsentResult);
		} catch {
			localStorage.removeItem('cookieConsent');
			this.isInitialized = true;
			this.hasBeenAskedBefore = false;
			return;
		}

		this.isInitialized = true;
		this.hasBeenAskedBefore = true;
		this.hasAcceptedMarketing = consentResult.hasAcceptedMarketing;
	};

	acceptAll = () => {
		const allAccepted = {
			hasAcceptedMarketing: true
		} as Record<ConsentKeys, true>;
		localStorage.setItem('cookieConsent', JSON.stringify(allAccepted));
		this.hasAcceptedMarketing = true;
	};

	setConsent = (key: ConsentKeys, value: boolean) => {
		if (key === 'hasAcceptedMarketing') {
			this.hasAcceptedMarketing = value;
		}

		const consents = {
			hasAcceptedMarketing: this.hasAcceptedMarketing
		};
		localStorage.setItem('cookieConsent', JSON.stringify(consents));
	};

	setHasAsked = (asked: boolean) => {
		this.hasBeenAskedBefore = asked;
	};

	toggleDialog = () => {
		this.isDialogVisible = !this.isDialogVisible;
	};
}

export const analyticsStore = new AnalyticsStore();

if (browser) {
	$effect.root(() => {
		$effect(() => {
			if (analyticsStore.hasAcceptedMarketing) posthog.opt_in_capturing();
			else posthog.opt_out_capturing();
		});

		$effect(() => {
			if (userStore.user) {
				window.gtag?.('set', { user_id: userStore.user.id });
				posthog.identify(userStore.user.id, {
					email: userStore.user.email ?? undefined,
					first_name: userStore.user.firstName,
					last_name: userStore.user.lastName,
					roles: userStore.user.roles
				});
			} else {
				window.gtag?.('set', { user_id: null });
				posthog.reset();
			}
		});
	});
}
