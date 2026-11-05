import type { AdminDigestedPostOutputDto } from 'client';

import { loadRecord } from '#components/admin/admin-load.js';
import { api } from '#lib/api.js';

export const ssr = false;

export async function load({ params }) {
	// The post, and what the pipeline made of it (drawn as the Digestion page draws an opened row)
	const [post, digested] = await Promise.all([
		loadRecord('post', () => api.admin.getPost(params.postId)),
		loadRecord('post', () => api.admin.getDigestedPost(params.postId) as Promise<AdminDigestedPostOutputDto>)
	]);
	return { post, digested };
}
