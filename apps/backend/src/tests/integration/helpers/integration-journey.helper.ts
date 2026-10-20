import { SimulatingUser } from 'src/shared/helpers/simulating-user.helper.js';

import { findUserByEmail } from './integration-admin.helper.js';
import { integrationBaseUrl, verificationCode } from './integration-env.helper.js';

export { integrationBaseUrl } from './integration-env.helper.js';

/**
 * Helpers for the on-demand integration (user-journey) suites — see
 * `bin/run-integration-tests.sh`, which boots the server these helpers talk to
 * and sets INTEGRATION_BASE_URL / VERIFICATION_DEFAULT_CODE.
 *
 * Everything here is black-box: only the public API via the generated client.
 */

/** Every journey account's password: log in as one with it. */
export const INTEGRATION_PASSWORD = 'Str0ngIntegration!';

// Unique per run so re-runs against a reused clone never collide on
// emails/mobile numbers.
const runId = Date.now();
let userSeq = 0;

/** Verifies a mobile number for the user. */
async function verifyMobile(user: SimulatingUser, mobileNumber: string): Promise<void> {
	const { verificationToken } = await user.api.auth.changeMobileNumber({ mobileNumber });
	await user.api.auth.verifyChangeMobileNumber({
		token: verificationToken,
		code: verificationCode,
	});
}

/**
 * Signs up a fresh user and verifies a unique mobile number. Every call is a new account:
 * for a journey that needs a blank one. `reuseVerifiedUser` keeps a database from filling
 * up with them.
 */
export async function createVerifiedUser(label: string): Promise<SimulatingUser> {
	const seq = userSeq++;
	const email = `it-${runId}-${seq}-${label}@example.com`.toLowerCase();
	const user = new SimulatingUser(email, INTEGRATION_PASSWORD, integrationBaseUrl);
	await user.signup(`It${label}`, `Journey${runId}`);

	// Unique, libphonenumber-valid TR mobile (536 xxx xx xx)
	await verifyMobile(user, `+90536${String((runId % 10_000_000) + seq).padStart(7, '0')}`);
	return user;
}

/** A TR mobile number of its own for each reused account (537 xxx xx xx), the same every run. */
const stableMobileNumber = (label: string) => {
	let hash = 0;
	for (const char of label) hash = (hash * 31 + char.charCodeAt(0)) % 10_000_000;
	return `+90537${String(hash).padStart(7, '0')}`;
};

/**
 * The journey account `label` names (`it-<label>@example.com`), logged in. Made and
 * verified on first use; on every later run the admin users list finds it and it is only
 * logged into, so a journey run again against the same database adds no accounts. Such a
 * journey inherits what its earlier runs left behind and clears what its assertions
 * depend on. Needs the admin credentials (`loginAdmin`).
 */
export async function reuseVerifiedUser(label: string): Promise<SimulatingUser> {
	const email = `it-${label}@example.com`.toLowerCase();
	const user = new SimulatingUser(email, INTEGRATION_PASSWORD, integrationBaseUrl);
	const existing = await findUserByEmail(email);
	if (existing) {
		await user.login();
	} else {
		await user.signup('Journey', label.replace(/[^a-z0-9]/gi, ''));
	}
	if (!existing?.mobileNumberVerifiedAt) await verifyMobile(user, stableMobileNumber(label));
	return user;
}

/** Polls `fn` until it returns a truthy value; throws after `timeoutMs`. */
export async function waitFor<T>(
	fn: () => Promise<T | false | undefined>,
	description: string,
	{ timeoutMs = 180_000, intervalMs = 3_000 } = {},
): Promise<T> {
	const deadline = Date.now() + timeoutMs;
	for (;;) {
		const result = await fn();
		if (result) {
			return result;
		}
		if (Date.now() > deadline) {
			throw new Error(`Timed out after ${timeoutMs}ms waiting for: ${description}`);
		}
		await new Promise(resolve => setTimeout(resolve, intervalMs));
	}
}
