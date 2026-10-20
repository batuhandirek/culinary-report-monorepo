<script lang="ts">
	import { Download } from '@lucide/svelte';
	import type { AdminReportOutputDto } from 'client';

	import { onMount } from 'svelte';

	import { PUBLIC_API_URL } from '$app/env/public';
	import Logo from '#components/Logo.svelte';
	import { api } from '#lib/api.js';
	import Button from '#ui/wrapped/Button.svelte';
	import ReportView from '#views/report/ReportView.svelte';

	let { data } = $props();
	let report: AdminReportOutputDto = $derived(data.report);

	// Counted from the browser only: link previews and the server render never run this, and the
	// API leaves out an admin checking the link
	onMount(() => {
		api.reports.recordSharedReportOpen(data.token).catch(() => undefined);
	});

	// A plain link: the API answers with an attachment, which a phone saves or opens on its own
	const pdfHref = $derived(`${PUBLIC_API_URL}/reports/shared/${data.token}/pdf`);
</script>

<div class="flex min-h-dvh flex-col">
	<header class="mx-auto flex h-16 w-full max-w-[56rem] items-center justify-between gap-3 px-4">
		<Logo width={104} />
		<Button icon={Download} href={pdfHref} download>Download PDF</Button>
	</header>

	<main class="flex-1 px-4 pb-12">
		<div
			class="bg-paper border-line shadow-sticker mx-auto max-w-[56rem] rounded-md border px-5 py-8 sm:px-12 sm:py-12">
			<ReportView {report} />
		</div>
		<p class="text-muted-foreground mx-auto mt-6 max-w-[56rem] text-center text-xs">
			This report was shared with you by a private link. The PDF takes a few seconds to
			prepare.
		</p>
	</main>
</div>
