<script lang="ts">
	import { Download, Network, RefreshCw } from '@lucide/svelte';
	import type { AdminReportOutputDto } from 'client';

	import ReportDeliveryPanel from './components/ReportDeliveryPanel.svelte';
	import ReportSharePanel from './components/ReportSharePanel.svelte';

	import { goto } from '$app/navigation';
	import { at } from '#components/admin/admin-format.js';
	import AdminPageHeader from '#components/admin/admin-page-header.svelte';
	import { api } from '#lib/api.js';
	import { monthLabel } from '#lib/culinary.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';
	import ReportView from '#views/report/ReportView.svelte';

	let { data } = $props();
	let report: AdminReportOutputDto = $derived(data.report);

	const rebuildAction = createAction(
		() =>
			api.admin.buildReport({ brandId: report.brand.id, cityId: report.city?.id, month: report.month }),
		{
			onSuccess: (rebuilt) => goto(`/admin/reports/${rebuilt.id}`, { invalidateAll: true }),
			successNotification: { title: 'Report rebuilt', text: 'With the data as it is now' }
		}
	);

	// The server prints the PDF in headless Chrome, so it matches this page
	const pdfAction = createAction(
		() => api.admin.getReportPdf(report.id, { format: 'blob' }) as Promise<Blob>,
		{
			onSuccess: (blob) => {
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `${report.brand.name} ${report.city?.name ?? 'all cities'} – ${monthLabel(report.month)}.pdf`;
				a.click();
				URL.revokeObjectURL(url);
			},
			successNotification: { title: 'PDF ready', text: 'It is in your downloads' }
		}
	);
</script>

<AdminPageHeader title={report.brand.name}>
	{#snippet aboveTitle()}
		<span class="text-muted-foreground text-xs">
			Report · {report.city?.name ?? 'All cities'} · {monthLabel(report.month)} · built {at(report.updatedAt)}
		</span>
	{/snippet}
	{#snippet rightTitle()}
		<div class="flex shrink-0 items-center gap-2">
			<Button size="sm" variant="outline" icon={Network} href={`/admin/brands/${report.brand.id}`}
				>Brand</Button>
			<Button
				size="sm"
				variant="outline"
				icon={RefreshCw}
				loading={rebuildAction.executing}
				onclick={() => rebuildAction.execute()}>
				Rebuild
			</Button>
			<Button
				size="sm"
				icon={Download}
				loading={pdfAction.executing}
				onclick={() => pdfAction.execute()}>
				Download PDF
			</Button>
		</div>
	{/snippet}
</AdminPageHeader>

<div class="pb-12">
	<div class="mx-auto mb-5 flex max-w-[56rem] flex-col gap-5">
		{#key report.id}
			<ReportDeliveryPanel {report} />
			<ReportSharePanel {report} />
		{/key}
	</div>
	<div
		class="bg-paper border-line shadow-sticker mx-auto max-w-[56rem] rounded-md border px-5 py-8 sm:px-12 sm:py-12">
		<ReportView {report} />
	</div>
</div>
