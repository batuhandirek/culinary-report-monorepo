import { loadRecord } from '#components/admin/admin-load.js';
import { api } from '#lib/api.js';

export const ssr = false;

export async function load({ params, depends }) {
	depends(`report-config:${params.configId}`);
	const reportConfig = await loadRecord('report configuration', () =>
		api.admin.getReportConfig(params.configId)
	);
	return { reportConfig };
}
