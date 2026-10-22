<svelte:options css="injected" />

<script lang="ts">
	import type { CityHighlightOutputDto } from 'client';

	import { compact, monthLabel } from '#lib/culinary.js';
	import { type HighlightCard,highlightPath } from '#lib/highlights.js';

	// Satori renders this statically: plain flex and the palette as literal colours (oat ground,
	// plum ink, beet label, the acid block, olive bars), no tokens. One layout per size: the link
	// card puts the list beside the title, the Instagram ones under it.
	interface Props {
		highlight: CityHighlightOutputDto;
		card: HighlightCard;
	}

	let { highlight, card }: Props = $props();

	const wide = $derived(card === 'og');
	const rows = $derived(highlight.data.brands.slice(0, card === 'portrait' ? 8 : 5));
	const maxPosts = $derived(Math.max(1, ...rows.map((b) => b.posts)));
	const address = $derived(`culinaryreport.com${highlightPath(highlight.city.slug, highlight.month)}`);
	const pad = $derived(wide ? 56 : 72);
	const titleSize = $derived(wide ? 60 : 76);
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
					Culinary Report · {highlight.city.name}
				</div>
			</div>
			<div class="flex font-semibold text-[#1f1724]" style={`font-size: ${titleSize}px; line-height: 1.08;`}>
				Most talked-about places
			</div>
			<div class="flex text-[#5e5466]" style={`font-size: ${wide ? 34 : 44}px; margin-top: 14px;`}>
				{monthLabel(highlight.month)}
			</div>
		</div>
		{#if wide}
			<div class="flex flex-col text-[#5e5466]" style="font-size: 22px;">
				<div class="flex">{highlight.data.totals.posts.toLocaleString('en')} posts by others · {compact(highlight.data.totals.views)} views</div>
				<div class="flex text-[#8c2d5c]" style="margin-top: 6px;">{address}</div>
			</div>
		{/if}
	</div>

	<div class="flex flex-1 flex-col bg-[#fbf9f4] border-2 border-[#ded7c9]" style="border-radius: 14px; padding: 12px 28px;">
		{#each rows as brand, i (brand.brandId)}
			<div
				class="flex items-center"
				style={`flex: 1; ${i < rows.length - 1 ? 'border-bottom: 2px solid #ded7c9;' : ''}`}>
				<div class="flex text-[#1f1724] font-semibold" style={`width: ${rowSize * 1.8}px; font-size: ${rowSize}px;`}>
					{brand.rank}
				</div>
				<div class="flex flex-col flex-1" style="min-width: 0;">
					<div
						class="flex text-[#1f1724] font-semibold"
						style={`font-size: ${rowSize}px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`}>
						{brand.name}
					</div>
					<div class="flex bg-[#e8e1d3]" style="height: 8px; border-radius: 4px; margin-top: 8px;">
						<div class="flex bg-[#4d7612]" style={`height: 8px; border-radius: 4px; width: ${Math.max(4, (brand.posts / maxPosts) * 100)}%;`}></div>
					</div>
				</div>
				<div class="flex text-[#5e5466]" style={`font-size: ${rowSize * 0.72}px; margin-left: 20px;`}>
					{brand.posts} posts
				</div>
			</div>
		{/each}
	</div>

	{#if !wide}
		<div class="flex flex-col text-[#5e5466]" style="font-size: 28px; margin-top: 36px;">
			<div class="flex">{highlight.data.totals.posts.toLocaleString('en')} posts by others on TikTok and Instagram</div>
			<div class="flex text-[#8c2d5c]" style="margin-top: 6px;">{address}</div>
		</div>
	{/if}
</div>
