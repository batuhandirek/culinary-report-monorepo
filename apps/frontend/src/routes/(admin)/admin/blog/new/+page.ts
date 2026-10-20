import { api } from '#lib/api.js';

export const ssr = false;

export async function load() {
	const tags = await api.admin.listTags();
	return { tags };
}
