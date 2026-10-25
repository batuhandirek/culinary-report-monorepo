import { loadRecord } from '#components/admin/admin-load.js';
import { api } from '#lib/api.js';

export const ssr = false;

export async function load({ params, depends }) {
	depends(`report-template:${params.templateId}`);
	const reportTemplate = await loadRecord('report template', () =>
		api.admin.getReportTemplate(params.templateId)
	);
	return { reportTemplate };
}
