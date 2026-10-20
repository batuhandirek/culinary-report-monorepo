import { loadRecord } from '#components/admin/admin-load.js';
import { api } from '#lib/api.js';

export const ssr = false;

export async function load({ params, url }) {
	const month = url.searchParams.get('month') ?? undefined;
	const creator = await loadRecord('creator', () => api.admin.getCreator(params.creatorId, { month }));
	return { creator };
}
