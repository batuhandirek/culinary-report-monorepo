import { loadRecord } from '#components/admin/admin-load.js';
import { api } from '#lib/api.js';

export const ssr = false;

export async function load({ params }) {
	const [entry, tags] = await Promise.all([
		loadRecord('article', () => api.admin.getEntry(params.entryId)),
		api.admin.listTags()
	]);

	return { entry, tags };
}
