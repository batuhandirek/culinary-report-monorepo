import { api } from '#lib/api.js';
import { monthLabel } from '#lib/culinary.js';

/**
 * Saves a report's PDF. Fetched with the session's token (not a plain link, which would rely
 * on the access cookie); headless Chrome prints it on the server, so it takes a few seconds.
 */
export const downloadPortalPdf = async (
	brandId: string,
	report: { id: string; month: string },
	fileName: string
) => {
	const blob = (await api.portal.getPortalReportPdf(brandId, report.id, {
		format: 'blob'
	})) as unknown as Blob;
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${fileName} – ${monthLabel(report.month)}.pdf`;
	a.click();
	URL.revokeObjectURL(url);
};
