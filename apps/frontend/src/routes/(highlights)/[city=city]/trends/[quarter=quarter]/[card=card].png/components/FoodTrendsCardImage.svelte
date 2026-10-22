<svelte:options css="injected" />

<script lang="ts">
	import type { FoodTrendsReportOutputDto } from 'client';

	import { foodTrendsPath, percentUp, quarterLabel } from '#lib/food-trends.js';
	import type { HighlightCard } from '#lib/highlights.js';

	// Satori renders this statically: plain flex and the palette as literal colours (oat ground,
	// plum ink, beet label, the acid block, olive bars), no tokens; the city month's card layout.
	// It leads with what rose on a year earlier, else the most searched, else the most talked about.
	interface Props {
		report: FoodTrendsReportOutputDto;
		card: HighlightCard;
	}

	let { report, card }: Props = $props();

	const wide = $derived(card === 'og');
	const count = $derived(card === 'portrait' ? 8 : 5);
	const { searches, talked } = $derived(report.data);
	const list = $derived.by(() => {
		if (searches?.rising.length)
			return {
				title: 'Searched more than a year ago',
				rows: searches.rising.slice(0, count).map((t) => ({ label: t.label, value: t.change ?? 0, text: percentUp(t.change ?? 0) }))
			};
		if (searches?.top.length)
			return {
				title: 'Most searched kinds of food',
				rows: searches.top.slice(0, count).map((t) => ({ label: t.label, value: t.level, text: `${Math.round(t.level)}` }))
			};
		return {
			title: 'Most talked-about kinds of food',
			rows: (talked?.topics ?? []).slice(0, count).map((t) => ({ label: t.label, value: t.share, text: `${t.share.toFixed(0)} %` }))
		};
	});
	const max = $derived(Math.max(0.01, ...list.rows.map((r) => r.value)));
	const address = $derived(`culinaryreport.com${foodTrendsPath(report.city.slug, report.quarter)}`);
	const pad = $derived(wide ? 56 : 72);
	const titleSize = $derived(wide ? 56 : 72);
	const rowSize = $derived(wide ? 30 : 38);
</script>

<div
	class="flex h-full w-full bg-[#f2ede3]"
	style={`flex-direction: ${wide ? 'row' : 'column'}; padding: ${pad}px;`}>
	<div class="flex flex-col justify-between" style={wide ? 'width: 470px; padding-right: 40px;' : 'margin-bottom: 48px;'}>
		<div class="flex flex-col">
			<div class="flex items-center" style="margin-bottom: 28px;">
				<div class="flex bg-[#c6f135] border-2 border-[#1f1724]" style="width: 26px; height: 26px; margin-right: 16px;"></div>
				<div class="flex font-semibold text-[#8c2d5c]" style={`font-size: ${wide ? 26 : 32}px;`}>
					Culinary Report · {report.city.name}
				</div>
			</div>
			<div class="flex font-semibold text-[#1f1724]" style={`font-size: ${titleSize}px; line-height: 1.08;`}>
				Food trends {quarterLabel(report.quarter)}
			</div>
			<div class="flex text-[#5e5466]" style={`font-size: ${wide ? 30 : 40}px; margin-top: 14px;`}>
				{list.title}
			</div>
		</div>
		{#if wide}
			<div class="flex flex-col text-[#8c2d5c]" style="font-size: 22px;">
				<div class="flex">culinaryreport.com</div>
				<div class="flex">{foodTrendsPath(report.city.slug, report.quarter)}</div>
			</div>
		{/if}
	</div>

	<div class="flex flex-1 flex-col bg-[#fbf9f4] border-2 border-[#ded7c9]" style="border-radius: 14px; padding: 12px 28px;">
		{#each list.rows as row, i (row.label)}
			<div
				class="flex items-center"
				style={`flex: 1; ${i < list.rows.length - 1 ? 'border-bottom: 2px solid #ded7c9;' : ''}`}>
				<div class="flex flex-col flex-1" style="min-width: 0;">
					<div
						class="flex text-[#1f1724] font-semibold"
						style={`font-size: ${rowSize}px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`}>
						{row.label}
					</div>
					<div class="flex bg-[#e8e1d3]" style="height: 8px; border-radius: 4px; margin-top: 8px;">
						<div class="flex bg-[#4d7612]" style={`height: 8px; border-radius: 4px; width: ${Math.max(4, (row.value / max) * 100)}%;`}></div>
					</div>
				</div>
				<div
					class="flex justify-end text-[#4d7612] font-semibold"
					style={`font-size: ${rowSize * 0.8}px; width: ${rowSize * 3.4}px; margin-left: 20px;`}>
					{row.text}
				</div>
			</div>
		{/each}
	</div>

	{#if !wide}
		<div class="flex flex-col text-[#5e5466]" style="font-size: 28px; margin-top: 36px;">
			<div class="flex">{searches ? 'Google searches' : 'TikTok and Instagram posts'} in {report.city.name}</div>
			<div class="flex text-[#8c2d5c]" style="margin-top: 6px;">{address}</div>
		</div>
	{/if}
</div>
