import { api } from '#lib/api.js';

export const ssr = false;

export async function load({ depends }) {
	depends('report-templates:list');
	return { templates: await api.admin.listReportTemplates() };
}
