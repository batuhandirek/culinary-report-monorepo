<script lang="ts">
	import { Download, FileText } from '@lucide/svelte';
	import type { PortalReportListItemOutputDto, PortalReportsOutputDto } from 'client';

	import { downloadPortalPdf } from '../components/portal-pdf.js';

	import { page } from '$app/state';
	import { api } from '#lib/api.js';
	import { monthLabel } from '#lib/culinary.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import IconButton from '#ui/wrapped/IconButton.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// Every month with a report, newest first, each with its PDF.
	const brandId = $derived(page.params.brandId!);
	let request = $state<Promise<PortalReportsOutputDto>>(new Promise(() => {}));
	const load = () => (request = api.portal.listPortalReports(brandId) as Promise<PortalReportsOutputDto>);
	$effect(() => {
		load();
	});

	let downloading = $state<string | null>(null);
	const pdfAction = createAction(
		async (report: PortalReportListItemOutputDto) => {
			downloading = report.id;
			try {
				const brand = await api.portal.getPortalBrand(brandId);
				await downloadPortalPdf(brandId, report, `${brand.name} ${report.city?.name ?? 'all cities'}`);
			} finally {
				downloading = null;
			}
		},
		{ successNotification: { title: 'PDF ready', text: 'It is in your downloads' } }
	);
</script>

{#await request}
	<SkeletonRows count={4} lines={3} boxed />
{:then { items }}
	{@const cities = new Set(items.map((r) => r.city?.id ?? 'all')).size}
	{#if items.length}
		<ul class="bg-paper border-line m-0 flex list-none flex-col rounded-md border p-0">
			{#each items as report, index (report.id)}
				<li
					class={[
						'flex items-center gap-2 py-1 pr-2 pl-4',
						index > 0 && 'border-line border-t'
					]}>
					<a href={`/portal/${brandId}/months/${report.id}`} class="flex min-w-0 flex-1 flex-col gap-0.5 py-3">
						<span class="eyebrow text-beet"
							>{monthLabel(report.month)}{cities > 1 ? ` · ${report.city?.name ?? 'All cities'}` : ''}</span>
						<span class="text-ink font-semibold">{report.title}</span>
						<span class="text-muted-foreground line-clamp-2 text-sm">{report.headline}</span>
						<span class="font-term text-muted-foreground text-base">
							{report.postCount} {report.postCount === 1 ? 'post' : 'posts'} · {report.reviewCount}
							{report.reviewCount === 1 ? 'review' : 'reviews'}
						</span>
					</a>
					<IconButton
						icon={Download}
						label={`Download the ${monthLabel(report.month)} PDF`}
						variant="ghost"
						loading={downloading === report.id}
						onclick={() => pdfAction.execute(report)} />
				</li>
			{/each}
		</ul>
	{:else}
		<EmptyState
			ground="paper"
			icon={FileText}
			title="No months yet"
			hint="Each month's report lands here once it is out." />
	{/if}
{:catch}
	<ErrorState ground="paper" onRetry={load} />
{/await}
