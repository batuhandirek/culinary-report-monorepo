import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	PUBLIC_API_INTERNAL_URL: { public: true, static: true },
	PUBLIC_APP_URL: { public: true, static: true },
	PUBLIC_IS_DEBUG_ENABLED: { public: true, static: true },
	PUBLIC_WS_URL: { public: true, static: true },
	PUBLIC_TURNSTILE_SITE_KEY: { public: true, static: true },
	PUBLIC_IS_ANALYTICS_DISABLED: { public: true, static: true },
	PUBLIC_POSTHOG_KEY: { public: true, static: true },
	PUBLIC_POSTHOG_HOST: { public: true, static: true },
	PUBLIC_API_URL: { public: true, static: true }
});
