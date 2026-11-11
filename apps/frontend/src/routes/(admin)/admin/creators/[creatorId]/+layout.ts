import { loadRecord } from '#components/admin/admin-load.js';
import { api } from '#lib/api.js';

export const ssr = false;

export async function load({ params }) {
	const creator = await loadRecord('creator', () => api.admin.getCreator(params.creatorId, {}));
	return { creator };
}
