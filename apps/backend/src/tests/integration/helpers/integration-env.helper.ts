/**
 * What the integration suites are pointed at, as `bin/run-integration-tests.sh` sets it:
 * the server's API and the verification code it sends. Its own module so the user and
 * admin helpers can both read it without importing each other.
 */
export const integrationBaseUrl = process.env.INTEGRATION_BASE_URL ?? 'http://localhost:3010/api';

export const verificationCode = process.env.VERIFICATION_DEFAULT_CODE ?? '111111';
