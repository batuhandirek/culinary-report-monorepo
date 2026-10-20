<script lang="ts">
	import { Download } from '@lucide/svelte';
	import type { AdminProspectOutputDto } from 'client';

	import { downloadReportPdf } from './report-pdf.js';

	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { monthLabel } from '#lib/culinary.js';
	import { compactCount } from '#lib/outreach-template.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';

	// The pitch is their own report: what the emails quote, and the PDF they get.
	interface Props {
		prospect: AdminProspectOutputDto;
	}

	let { prospect }: Props = $props();

	const report = $derived(prospect.latestReport);
	const stats = $derived(
		report
			? [
					`${report.posts} ${report.posts === 1 ? 'post' : 'posts'} by others`,
					`${report.creators} ${report.creators === 1 ? 'creator' : 'creators'}`,
					`${compactCount(report.views)} views`,
					`${report.reviews} Google ${report.reviews === 1 ? 'review' : 'reviews'}`,
					report.replyRate !== undefined
						? `${Math.round(report.replyRate * 100)}% answered`
						: undefined
				].filter(Boolean)
			: []
	);

	const pdfAction = createAction(() => downloadReportPdf(report!, prospect.brand.name), {
		successNotification: { title: 'PDF ready', text: 'It is in your downloads' }
	});
</script>

<AdminPanel title="Their report" note={report ? monthLabel(report.month) : undefined}>
	{#snippet action()}
		{#if report}
			<Button variant="link" size="sm" href={`/admin/reports/${report.id}`}>Open</Button>
		{/if}
	{/snippet}
	{#if report}
		<div class="flex flex-col gap-3">
			<p class="m-0 font-semibold">{report.title}</p>
			<p class="text-muted-foreground m-0 text-sm">{report.headline}</p>
			<p class="font-term text-muted-foreground m-0 text-base">{stats.join(' · ')}</p>
			<div>
				<Button
					variant="outline"
					size="sm"
					icon={Download}
					loading={pdfAction.executing}
					onclick={() => pdfAction.execute()}>
					Download PDF
				</Button>
			</div>
		</div>
	{:else}
		<EmptyState
			title="No report yet"
			hint="The emails quote it and the pitch is the PDF: build one on the venue page first."
			ground="none"
			size="sm">
			{#if prospect.venue}
				<Button variant="outline" size="sm" href={`/admin/venues/${prospect.venue.id}`}>
					Venue page
				</Button>
			{/if}
		</EmptyState>
	{/if}
</AdminPanel>
