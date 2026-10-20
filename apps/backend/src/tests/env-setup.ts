/**
 * Dummy env for tests. The app's config classes (main, llm, auth, image, …) validate
 * `process.env` at import time, so any test that imports app code needs these present.
 * Values are throwaway — real work (LLM, S3, queues) is mocked; the DB is pglite.
 * Wired via jest `setupFiles` so it runs before the test module graph is imported.
 */
const dummyEnv: Record<string, string> = {
	NODE_ENV: 'test',
	PORT: '3000',
	DB_HOST: '127.0.0.1',
	DB_PORT: '5432',
	DB_USERNAME: 'postgres',
	DB_PASSWORD: '',
	DB_SSL: 'false',
	DB_NAME: 'test',
	PUBLIC_API_URL: 'http://localhost',
	PUBLIC_APP_URL: 'http://localhost',
	OTEL_IS_ENABLED: 'false',
	OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'http://localhost:4318/v1/traces',
	OPENAI_API_KEYS: 'test',
	ANTHROPIC_API_KEY: 'test',
	OTA_MANIFEST_URL: 'http://localhost',
	JWT_SECRET: 'test-secret',
	REFRESH_TOKEN_EXPIRES_IN_DAYS: '30',
	REFRESH_TOKEN_EXPIRES_IN_DAYS_ON_MOBILE: '90',
	ACCESS_TOKEN_EXPIRES_IN_MINUTES: '15',
	VERIFICATION_TOKEN_EXPIRES_IN_MINUTES: '15',
	FORGOT_PASSWORD_TOKEN_EXPIRES_IN_MINUTES: '15',
	VERIMOR_USERNAME: 'test',
	VERIMOR_PASSWORD: 'test',
	VERIMOR_API_KEY: 'test',
	IMAGE_KIT_FOLDER_PREFIX: 'test',
	IMAGE_KIT_PUBLIC_KEY: 'test',
	IMAGE_KIT_PRIVATE_KEY: 'test',
	IMAGE_KIT_URL: 'http://localhost',
	TELEGRAM_BOT_TOKEN: 'test',
	TELEGRAM_CHAT_ID: 'test',
	EMAIL_SENDER_EMAIL: 'test@test.com',
	EMAIL_SENDER_NAME: 'test',
	BREVO_API_KEY: 'test',
	APNS_KEY_ID: 'test',
	APNS_TEAM_ID: 'test',
	APNS_BUNDLE_ID: 'test',
};

for (const [key, value] of Object.entries(dummyEnv)) {
	if (process.env[key] === undefined) process.env[key] = value;
}
