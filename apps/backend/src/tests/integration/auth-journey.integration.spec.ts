import { createVerifiedUser } from './helpers/integration-journey.helper.js';

/**
 * Account basics end to end: email signup with OTP, a verified mobile number,
 * reading the profile, session listing and logout.
 */
describe('Auth journey', () => {
	it('signs up, verifies, reads the profile and logs out', async () => {
		const user = await createVerifiedUser('auth');

		const me = await user.api.auth.getMe();
		expect(me.email).toBe(user.email);
		expect(me.mobileNumberVerifiedAt).toBeTruthy();

		const sessions = await user.api.auth.listSessions({ page: 1, size: 10 });
		expect(sessions.items.length).toBeGreaterThan(0);

		await user.api.auth.logout();
	});
});
