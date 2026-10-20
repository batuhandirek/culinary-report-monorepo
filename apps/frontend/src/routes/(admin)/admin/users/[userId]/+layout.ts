import { loadRecord } from '#components/admin/admin-load.js';
import { api } from '#lib/api.js';

export const ssr = false;

export async function load({ params, depends }) {
	const user = await loadRecord('user', () => api.admin.getUser(params.userId));
	depends(`user:${params.userId}`);
	return { user };
}
