import { loadRecord } from '#components/admin/admin-load.js';
import { api } from '#lib/api.js';

export const ssr = false;

export async function load({ params, depends }) {
	const report = await loadRecord('report', () => api.admin.getReport(params.reportId));
	depends(`report:${params.reportId}`);
	return { report };
}
