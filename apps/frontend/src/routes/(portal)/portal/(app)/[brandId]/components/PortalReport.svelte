<script lang="ts">
	import { Download } from '@lucide/svelte';
	import type { AdminReportOutputDto, PortalReportOutputDto } from 'client';

	import { downloadPortalPdf } from './portal-pdf.js';

	import { api } from '#lib/api.js';
	import { monthLabel } from '#lib/culinary.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import SkeletonText from '#ui/wrapped/SkeletonText.svelte';
	import ReportView from '#views/report/ReportView.svelte';

	// One month's report as the brand reads it: the month, the PDF, the document itself.
	interface Props {
		brandId: string;
		reportId: string;
		/** A line over the month ("Latest report"). */
		eyebrow?: string;
	}

	let { brandId, reportId, eyebrow }: Props = $props();

	let request = $state<Promise<PortalReportOutputDto>>(new Promise(() => {}));
	const load = () =>
		(request = api.portal.getPortalReport(brandId, reportId) as Promise<PortalReportOutputDto>);
	$effect(() => {
		load();
	});

	const pdfAction = createAction(
		(report: PortalReportOutputDto) => downloadPortalPdf(brandId, report, `${report.brand.name} ${report.city?.name ?? 'all cities'}`),
		{ successNotification: { title: 'PDF ready', text: 'It is in your downloads' } }
	);
</script>

{#await request}
	<div class="bg-paper border-line rounded-md border px-5 py-8">
		<SkeletonText lines={8} />
	</div>
{:then report}
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div class="flex flex-col gap-1">
			{#if eyebrow}<span class="eyebrow text-muted-foreground">{eyebrow}</span>{/if}
			<h2 class="type-title text-ink m-0 text-xl">{monthLabel(report.month)}</h2>
		</div>
		<Button
			variant="outline"
			icon={Download}
			loading={pdfAction.executing}
			onclick={() => pdfAction.execute(report)}>
			Download PDF
		</Button>
	</div>
	<div
		class="bg-paper border-line shadow-sticker rounded-md border px-5 py-8 sm:px-12 sm:py-12">
		<ReportView report={report as unknown as AdminReportOutputDto} />
	</div>
{:catch}
	<ErrorState ground="paper" title="We couldn't load this report" onRetry={load} />
{/await}
