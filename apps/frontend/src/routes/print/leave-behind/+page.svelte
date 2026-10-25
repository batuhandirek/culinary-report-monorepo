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
		<!-- The report's cover block in small: deep grape, oat / acid / lavender on it, the one
		     bite in its top-right corner -->
		<div
			class="bite bg-grape-deep text-sand flex flex-col gap-4 rounded-[12px] px-5 pt-5 pb-5"
			style="--bite: 1.75rem;"
		>
			<div class="flex items-center gap-2.5 pr-9">
				<span
					class="bg-acid text-ink font-display inline-block rounded-[6px] px-1.5 pt-[0.3em] pb-[0.32em] text-[15px] leading-none font-extrabold tracking-[-0.03em] whitespace-nowrap"
				>
					Munchwerk
				</span>
				<span class="stamp text-lavender text-[9px]">{monthLabel(data.month)}</span>
			</div>

			<div class="flex flex-col gap-1.5">
				<p class="stamp text-acid m-0 text-[9px]">
					Your month on social media{data.city ? ` · ${data.city}` : ''}
				</p>
				<h1 class="type-hero text-sand m-0 text-[32px] text-balance">
					{data.brand}
				</h1>
			</div>

			<div class="border-sand/25 border-t pt-3">
				<p class="stamp text-lavender m-0 mb-1.5 text-[9px]">What stood out</p>
				<p class="type-display text-acid m-0 text-[21px] text-balance">
					{data.title}
				</p>
				<p class="text-sand/85 m-0 mt-2 text-[12px] leading-snug">{data.headline}</p>
			</div>
		</div>

		<ol class="m-0 flex list-none flex-col p-0">
			{#each data.findings as point, i (i)}
				<li
					class="border-line grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-2 border-t py-2.5"
				>
					<span class="number-hero text-ink text-[22px]"
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

		<div class="border-ink mt-auto flex items-center gap-4 border-t-[3px] pt-4">
			<div class="qr bg-paper border-line shrink-0 rounded-md border p-2">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- an SVG the server drew from the link, no user text -->
				{@html data.qrSvg}
			</div>
			<div class="flex min-w-0 flex-col gap-1.5">
				<p class="m-0 text-[13px] leading-snug font-semibold">
					Scan for the full report: what guests praise, what keeps them from five stars,
					and what to try next month.
				</p>
				<p class="text-grape m-0 text-[12px] leading-tight font-semibold break-all">
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
