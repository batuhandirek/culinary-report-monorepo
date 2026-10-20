import posthog from 'posthog-js';

import { browser } from '$app/env';
import {
	PUBLIC_IS_ANALYTICS_DISABLED,
	PUBLIC_POSTHOG_HOST,
	PUBLIC_POSTHOG_KEY
} from '$app/env/public';

export const ssr = false;

export function load() {
	if (browser && PUBLIC_IS_ANALYTICS_DISABLED === 'false' && PUBLIC_POSTHOG_KEY) {
		posthog.init(PUBLIC_POSTHOG_KEY, {
			api_host: PUBLIC_POSTHOG_HOST,
			defaults: '2026-01-30'
		});
	}
}
