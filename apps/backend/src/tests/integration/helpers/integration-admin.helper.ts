import { SimulatingUser } from 'src/shared/helpers/simulating-user.helper.js';

import { integrationBaseUrl } from './integration-env.helper.js';

let admin: Promise<SimulatingUser> | undefined;

/**
 * An existing admin account on the target backend, logged in. No API makes someone an
 * admin (by design), so suites that need one are given its credentials: in the cloned
 * run, any admin of the dev database the clone came from. One login per run, shared by
 * every caller.
 */
export function loginAdmin(): Promise<SimulatingUser> {
	const { INTEGRATION_ADMIN_EMAIL, INTEGRATION_ADMIN_PASSWORD } = process.env;
	if (!INTEGRATION_ADMIN_EMAIL || !INTEGRATION_ADMIN_PASSWORD) {
		throw new Error(
			'This suite acts as an admin: set INTEGRATION_ADMIN_EMAIL and INTEGRATION_ADMIN_PASSWORD',
		);
	}
	admin ??= (async () => {
		const user = new SimulatingUser(
			INTEGRATION_ADMIN_EMAIL,
			INTEGRATION_ADMIN_PASSWORD,
			integrationBaseUrl,
		);
		await user.login();
		return user;
	})();
	return admin;
}

/** Accounts whose name or e-mail holds `q`, as the admin users list finds them. */
export async function listUsers(q: string) {
	const { items } = await (await loginAdmin()).api.admin.listUsers({ q, page: 1, size: 50 });
	return items;
}

/** The account with exactly this e-mail, or `undefined`. */
export async function findUserByEmail(email: string) {
	const wanted = email.toLowerCase();
	return (await listUsers(email)).find(user => user.email?.toLowerCase() === wanted);
}
