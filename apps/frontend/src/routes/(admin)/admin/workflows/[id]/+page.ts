import type { AdminWorkflowDetailOutputDto } from 'client';

import { loadRecord } from '#components/admin/admin-load.js';
import { api } from '#lib/api.js';

export const ssr = false;

export async function load({ params }) {
	// The run with every step it finished, each with its stored result or error
	const workflow = (await loadRecord('workflow run', () =>
		api.admin.getWorkflow(params.id)
	)) as AdminWorkflowDetailOutputDto;
	return {
		workflow,
		pageMetaTags: { title: `${workflow.name} · Workflows · Admin`, robots: 'noindex, nofollow' }
	};
}
