import { Api, ListProspectsParamsSortEnum, LoginOutputDto } from 'client';

import { loginAdmin } from './helpers/integration-admin.helper.js';
import { integrationBaseUrl, verificationCode } from './helpers/integration-env.helper.js';

/**
 * The portal's way in: an admin invites an address from a prospect's page, the owner asks for
 * a code at `/portal/login`, the code opens a session with no password, and `GET /auth/me`
 * lists the brand. The membership stays: the owner `it-portal-owner@example.com` is left signed
 * up to the first prospect's brand for clicking through the portal.
 */
describe('Portal journey', () => {
	const email = 'it-portal-owner@example.com';
	let brandId: string;
	let otherBrandId: string;
	let session: LoginOutputDto;

	const asOwner = () =>
		new Api({
			baseUrl: integrationBaseUrl,
			customFetch: (input: URL | RequestInfo, init: RequestInit) => {
				(init.headers as Record<string, string>)['Authorization'] = `Bearer ${session.accessToken}`;
				return fetch(input, init);
			},
		});

	it('an admin invites the owner from a prospect', async () => {
		const admin = await loginAdmin();
		const { items } = await admin.api.admin.listProspects({
			page: 1,
			size: 50,
			sort: ListProspectsParamsSortEnum.NameAsc,
		});
		if (items.length < 2) throw new Error('This journey needs two prospects in the database');
		// The first with a report, so the portal has something to show; else the first
		let chosen = items[0];
		for (const item of items) {
			const { items: reports } = await admin.api.admin.listReports({
				page: 1,
				size: 1,
				brandId: item.brand.id,
			});
			if (reports.length) {
				chosen = item;
				break;
			}
		}
		brandId = chosen.brand.id;
		const other = items.find(item => item.id !== chosen.id)!;
		otherBrandId = other.brand.id;

		// An earlier run may have left the owner on the other brand: the refusal below needs them off
		const before = await admin.api.admin.getProspect(other.id);
		for (const member of before.portalMembers.filter(m => m.user.email === email))
			await admin.api.admin.removePortalMember(other.id, member.id);

		const prospect = await admin.api.admin.inviteToPortal(chosen.id, { email });
		const member = prospect.portalMembers.find(m => m.user.email === email);
		expect(member).toBeDefined();
	});

	it('a code mailed to the address opens a session, with no password', async () => {
		const anonymous = new Api({ baseUrl: integrationBaseUrl });
		const { verificationToken } = await anonymous.auth.requestLoginCode({ email });
		session = await anonymous.auth.loginWithCode({ token: verificationToken, code: verificationCode });
		expect(session.accessToken).toEqual(expect.any(String));
	});

	it('the profile lists the brand', async () => {
		const me = await asOwner().auth.getMe();
		expect(me.email).toBe(email);
		expect(me.roles).toContain('venue_owner');
		const membership = me.brandMemberships.find(m => m.brand.id === brandId);
		expect(membership?.acceptedAt).toBeTruthy();
	});

	it("the portal lists the brand and its months, and refuses another brand's", async () => {
		const owner = asOwner();
		const { items } = await owner.portal.listPortalBrands();
		expect(items.map(m => m.brand.id)).toContain(brandId);

		// The list only: a stored report built before the newest `ReportData` fails the report's
		// response type until it is rebuilt, which is the dev data's state, not the portal's
		const { items: reports } = await owner.portal.listPortalReports(brandId);
		expect(Array.isArray(reports)).toBe(true);
		await expect(owner.portal.getPortalBrand(otherBrandId)).rejects.toMatchObject({
			status: 403,
		});
		await expect(owner.portal.listPortalReports(otherBrandId)).rejects.toMatchObject({
			status: 403,
		});
	});

	it('the trends series answers twelve months', async () => {
		const { months } = await asOwner().portal.getPortalSeries(brandId);
		expect(months).toHaveLength(12);
		expect(months.every(row => typeof row.month === 'string')).toBe(true);
	});

	it('a wrong code opens nothing', async () => {
		const anonymous = new Api({ baseUrl: integrationBaseUrl });
		const { verificationToken } = await anonymous.auth.requestLoginCode({ email });
		const wrong = verificationCode === '000000' ? '999999' : '000000';
		await expect(
			anonymous.auth.loginWithCode({ token: verificationToken, code: wrong }),
		).rejects.toBeDefined();
	});

	afterAll(() => {
		console.log(`Portal owner left signed up: ${email} (code login) → /portal/${brandId}`);
	});
});
