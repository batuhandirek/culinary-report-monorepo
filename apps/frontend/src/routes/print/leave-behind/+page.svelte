<script lang="ts">
	import { onMount, tick } from 'svelte';

	import { monthLabel } from '#lib/culinary.js';

	// The A5 page a salesperson leaves at the counter: the report's cover title and headline,
	// three findings, and a QR code to the report's private link. Printed by the backend's
	// headless Chrome (`ReportPdfService.renderLeaveBehind`), which hands the data over on
	// `window.__LEAVE_BEHIND__`, so the page holds no data and needs no session.
	// Mirrors the backend's `LeaveBehindData` (`reports/interfaces/leave-behind.interface.ts`).
	interface LeaveBehindData {
		reportId: string;
		month: string;
		brand: string;
		city?: string;
		title: string;
		headline: string;
		findings: { title: string; text: string }[];
		shareUrl: string;
		/** An inline SVG drawn on the server from `shareUrl`; nothing else goes in here */
		qrSvg: string;
		contact: { name: string; email?: string; phone?: string };
	}

	const data = (globalThis as { __LEAVE_BEHIND__?: LeaveBehindData }).__LEAVE_BEHIND__;

	let ready = $state(false);
	onMount(async () => {
		await tick();
		await document.fonts.ready;
		ready = true;
	});

	const linkText = $derived(data ? data.shareUrl.replace(/^https?:\/\//, '') : '');
</script>

{#if data}
	<main
		class="print-sheet text-ink flex flex-col gap-4 text-sm"
		data-report-ready={ready || undefined}
	>
		<div class="flex items-start justify-between gap-4">
			<span
				class="bg-primary border-ink text-ink inline-block rounded-md border-2 px-2 py-1 text-[14px] leading-none font-semibold tracking-tight whitespace-nowrap"
			>
				Culinary Report
			</span>
			<div class="text-right">
				<p class="eyebrow text-muted-foreground m-0">Your month on social media</p>
				<p class="eyebrow text-ink m-0">{monthLabel(data.month)}</p>
			</div>
		</div>

		<div class="border-ink border-t-2 pt-3">
			{#if data.city}<p class="eyebrow text-beet m-0 mb-1.5">{data.city}</p>{/if}
			<h1 class="m-0 text-[30px] leading-[0.95] font-bold tracking-tight text-balance">
				{data.brand}
			</h1>
		</div>

		<div class="bg-ink text-sand relative overflow-hidden rounded-md px-5 pt-4 pb-5">
			<span class="bg-acid absolute top-0 left-5 h-1.5 w-12"></span>
			<p class="eyebrow text-acid m-0 mb-2">What stood out</p>
			<p
				class="text-acid m-0 text-[22px] leading-[1.08] font-semibold tracking-tight text-balance"
			>
				{data.title}
			</p>
			<p class="text-sand/80 m-0 mt-2 text-[12px] leading-snug">{data.headline}</p>
		</div>

		<ol class="m-0 flex list-none flex-col p-0">
			{#each data.findings as point, i (i)}
				<li
					class="border-line grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-2 border-t py-2.5"
				>
					<span class="font-pixel text-beet pt-1 text-[10px]"
						>{String(i + 1).padStart(2, '0')}</span
					>
					<div>
						<p class="m-0 text-[13px] leading-snug font-semibold">{point.title}</p>
						<p class="text-reading-ink m-0 mt-0.5 text-[11.5px] leading-normal">
							{point.text}
						</p>
					</div>
				</li>
			{/each}
		</ol>

		<div class="border-ink mt-auto flex items-center gap-4 border-t-2 pt-4">
			<div class="qr bg-paper border-line shrink-0 rounded-md border p-2">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- an SVG the server drew from the link, no user text -->
				{@html data.qrSvg}
			</div>
			<div class="flex min-w-0 flex-col gap-1.5">
				<p class="m-0 text-[13px] leading-snug font-semibold">
					Scan for the full report: what guests praise, what keeps them from five stars,
					and what to try next month.
				</p>
				<p class="text-muted-foreground font-term m-0 text-[13px] leading-tight break-all">
					{linkText}
				</p>
				<p class="text-muted-foreground m-0 text-[11px] leading-snug">
					Questions, or a monthly report? {data.contact.name}{data.contact.email
						? ` · ${data.contact.email}`
						: ''}{data.contact.phone ? ` · ${data.contact.phone}` : ''}
				</p>
			</div>
		</div>
	</main>
{:else}
	<p class="p-10">Nothing to print.</p>
{/if}

<style>
	/* One A5 sheet, no running footer: the contact line is the footer */
	@page {
		size: A5;
		margin: 10mm 11mm;
		background: #fbf9f4;
	}

	:global(html),
	:global(body) {
		background: var(--paper) !important;
		background-image: none !important;
	}

	.print-sheet {
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
		/* A5 less the margins: the page is exactly one sheet, the footer at its foot */
		min-height: calc(210mm - 20mm);
		box-sizing: border-box;
	}

	.qr :global(svg) {
		display: block;
		width: 30mm;
		height: 30mm;
	}

	@media screen {
		.print-sheet {
			width: 126mm;
			margin: 0 auto;
			padding: 10mm 0;
		}
	}
</style>
