import { loadRecord } from '#components/admin/admin-load.js';
import { api } from '#lib/api.js';

export const ssr = false;

export async function load({ params }) {
	const post = await loadRecord('post', () => api.admin.getPost(params.postId));
	return { post };
}
