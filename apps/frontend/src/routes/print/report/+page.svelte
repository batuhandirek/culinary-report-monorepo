<script lang="ts">
	import type { AdminReportOutputDto } from 'client';

	import { onMount, tick } from 'svelte';

	import { monthLabel } from '#lib/culinary.js';
	import ReportView from '#views/report/ReportView.svelte';

	// The page the backend's headless Chrome prints to PDF (`ReportPdfService`). It holds no
	// data: the backend hands the report over on `window.__REPORT__` before the page loads, so
	// printing needs no session. `data-report-ready` tells the backend the layout is done.
	const report = (globalThis as { __REPORT__?: AdminReportOutputDto }).__REPORT__;

	let ready = $state(false);
	onMount(async () => {
		await tick();
		await document.fonts.ready;
		ready = true;
	});

	// The running footer lives in the page margin, where only a CSS string reaches
	const cssString = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
	const pageStyle = $derived(
		report
			? `<style>@page { @bottom-left { content: ${cssString(`Culinary Report · ${report.brand.name} · ${report.city?.name ?? 'All cities'} · ${monthLabel(report.month)}`)}; } }</style>`
			: ''
	);
</script>

<svelte:head>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- built from escaped strings above -->
	{@html pageStyle}
</svelte:head>

{#if report}
	<main class="print-sheet" data-report-ready={ready || undefined}>
		<ReportView {report} />
	</main>
{:else}
	<p class="p-10">Nothing to print.</p>
{/if}

<style>
	/* The page box carries the oat itself: the body's background stops at the margins */
	@page {
		size: A4;
		margin: 15mm 14mm 17mm;
		background: #fbf9f4;

		@bottom-left {
			font-family: 'Onest', sans-serif;
			font-size: 7.5pt;
			color: #766b79;
			vertical-align: top;
			padding-top: 4mm;
		}
		@bottom-right {
			content: counter(page) ' / ' counter(pages);
			font-family: 'Onest', sans-serif;
			font-size: 7.5pt;
			color: #766b79;
			vertical-align: top;
			padding-top: 4mm;
		}
	}

	:global(html),
	:global(body) {
		background: var(--paper) !important;
		background-image: none !important;
	}

	.print-sheet {
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
	}

	@media screen {
		.print-sheet {
			max-width: 182mm;
			margin: 0 auto;
			padding: 15mm 0;
		}
	}
</style>
