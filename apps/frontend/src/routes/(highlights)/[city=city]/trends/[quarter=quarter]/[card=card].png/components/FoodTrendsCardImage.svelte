<svelte:options css="injected" />

<script lang="ts">
	import type { FoodTrendsReportOutputDto } from 'client';

	import { foodTrendsPath, percentUp, quarterLabel } from '#lib/food-trends.js';
	import type { HighlightCard } from '#lib/highlights.js';
	import { ogWordmark } from '#lib/og-image.js';

	// Munchwerk Trends, the quarter's share image, in the city month's layout. Satori renders this
	// statically: plain flex, literal brand colours, the faces from `ogFonts`. A grape field with
	// oat and acid on it (the brand's evening side) to tell it apart from Heat Check's oat. It
	// leads with what rose on a year earlier, else the most searched, else the most talked about.
	interface Props {
		report: FoodTrendsReportOutputDto;
		card: HighlightCard;
	}

	let { report, card }: Props = $props();

	const INK = '#1f1724';
	const OAT = '#f2ede3';
	const ACID = '#c6f135';
	const DISPLAY = "font-family: 'Bricolage Grotesque'; font-weight: 800;";

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
			rows: (talked?.topics ?? []).slice(0, count).map((t) => ({ label: t.label, value: t.share, text: `${t.share.toFixed(0)}%` }))
		};
	});
	const max = $derived(Math.max(0.01, ...list.rows.map((r) => r.value)));
	const address = $derived(`munchwerk.com${foodTrendsPath(report.city.slug, report.quarter)}`);
	const pad = $derived(wide ? 56 : 72);
	const titleSize = $derived(wide ? 64 : 88);
	const rowSize = $derived(wide ? 30 : 40);
	const metaSize = $derived(wide ? 22 : 32);
	const stroke = $derived(wide ? 4 : 6);
	const logo = $derived(ogWordmark(OAT, wide ? 26 : 34));
</script>

<div
	class="flex h-full w-full bg-[#6a2bea]"
	style={`flex-direction: ${wide ? 'row' : 'column'}; padding: ${pad}px; font-family: 'Onest'; color: ${OAT};`}>
	<div class="flex flex-col justify-between" style={wide ? 'width: 440px; padding-right: 44px;' : 'margin-bottom: 52px;'}>
		<div class="flex flex-col items-start">
			<div
				class="flex"
				style={`background: ${ACID}; color: ${INK}; border: ${stroke}px solid ${INK}; border-radius: 12px; padding: ${wide ? '8px 16px' : '10px 22px'}; transform: rotate(-6deg); margin-bottom: ${wide ? 30 : 40}px; font-size: ${wide ? 22 : 30}px; font-weight: 700; letter-spacing: 0.08em;`}>
				TRENDS · {report.city.name.toUpperCase()}
			</div>
			<div class="flex" style={`${DISPLAY} font-size: ${titleSize}px; line-height: 0.92; letter-spacing: -0.03em;`}>
				Food trends {quarterLabel(report.quarter)}
			</div>
			<div class="flex" style={`font-size: ${wide ? 30 : 40}px; margin-top: 16px; font-weight: 700; color: ${ACID};`}>
				{list.title}
			</div>
		</div>
		{#if wide}
			<div class="flex flex-col" style={`font-size: ${metaSize}px; font-weight: 700;`}>
				<img src={logo.src} alt="Munchwerk" style={`${logo.style} margin-bottom: 18px;`} />
				<div class="flex">munchwerk.com</div>
				<div class="flex">{foodTrendsPath(report.city.slug, report.quarter)}</div>
			</div>
		{/if}
	</div>

	<div
		class="flex flex-1 flex-col bg-[#fbf9f4]"
		style={`color: ${INK}; border: ${stroke}px solid ${INK}; box-shadow: ${wide ? 8 : 16}px ${wide ? 8 : 16}px 0 ${INK}; padding: ${wide ? '10px 26px' : '14px 32px'};`}>
		{#each list.rows as row, i (row.label)}
			<div
				class="flex items-center"
				style={`flex: 1; ${i < list.rows.length - 1 ? 'border-bottom: 2px solid rgba(31, 23, 36, 0.15);' : ''}`}>
				<div class="flex flex-1 flex-col" style="min-width: 0;">
					<div
						class="flex"
						style={`${DISPLAY} font-size: ${rowSize}px; line-height: 1.05; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`}>
						{row.label}
					</div>
					<div class="flex" style="margin-top: 10px;">
						<div
							class="flex"
							style={`height: ${wide ? 10 : 14}px; width: ${Math.max(4, (row.value / max) * 100)}%; background: ${i === 0 ? ACID : INK}; ${i === 0 ? `border: 3px solid ${INK};` : ''}`}>
						</div>
					</div>
				</div>
				<div
					class="flex justify-end text-[#4d7612]"
					style={`${DISPLAY} font-size: ${rowSize * 0.9}px; width: ${rowSize * 3.4}px; margin-left: 20px;`}>
					{row.text}
				</div>
			</div>
		{/each}
	</div>

	{#if !wide}
		<div class="flex items-end justify-between" style={`font-size: ${metaSize}px; margin-top: 48px;`}>
			<div class="flex flex-col">
				<div class="flex">{searches ? 'Google searches' : 'TikTok and Instagram posts'} in {report.city.name}</div>
				<div class="flex" style={`margin-top: 6px; font-weight: 700; color: ${ACID};`}>{address}</div>
			</div>
			<img src={logo.src} alt="Munchwerk" style={logo.style} />
		</div>
	{/if}
</div>
