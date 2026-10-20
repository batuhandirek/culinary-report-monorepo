import { api } from '#lib/api.js';
import { monthLabel } from '#lib/culinary.js';

/** Downloads a report's PDF (headless Chrome prints it on the server: a few seconds). */
export const downloadReportPdf = async (report: { id: string; month: string }, venueName: string) => {
	const blob = (await api.admin.getReportPdf(report.id, { format: 'blob' })) as unknown as Blob;
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${venueName} – ${monthLabel(report.month)}.pdf`;
	a.click();
	URL.revokeObjectURL(url);
};
