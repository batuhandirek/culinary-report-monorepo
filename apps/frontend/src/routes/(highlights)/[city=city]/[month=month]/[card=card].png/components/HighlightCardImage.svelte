<svelte:options css="injected" />

<script lang="ts">
	import type { CityHighlightOutputDto } from 'client';

	import { compact, monthLabel } from '#lib/culinary.js';
	import { type HighlightCard, highlightPath } from '#lib/highlights.js';
	import { ogBite, ogWordmark } from '#lib/og-image.js';

	// Heat Check, the month's share image. Satori renders this statically: plain flex, literal
	// colours from the brand tokens (oat ground, plum ink, acid, grape text), the faces from
	// `ogFonts`. One layout per size: the link card puts the list beside the title, the
	// Instagram ones under it, inside the 72px canvas gutter.
	interface Props {
		highlight: CityHighlightOutputDto;
		card: HighlightCard;
	}

	let { highlight, card }: Props = $props();

	const INK = '#1f1724';
	const DISPLAY = "font-family: 'Bricolage Grotesque'; font-weight: 800;";

	const wide = $derived(card === 'og');
	const rows = $derived(highlight.data.brands.slice(0, card === 'portrait' ? 8 : 5));
	const maxPosts = $derived(Math.max(1, ...rows.map((b) => b.posts)));
	const address = $derived(`munchwerk.com${highlightPath(highlight.city.slug, highlight.month)}`);
	const pad = $derived(wide ? 56 : 72);
	const titleSize = $derived(wide ? 64 : 88);
	const rowSize = $derived(wide ? 30 : 40);
	const metaSize = $derived(wide ? 22 : 32);
	const stroke = $derived(wide ? 4 : 6);
	const bite = $derived(ogBite('#f2ede3', wide ? 34 : 50, 0.4));
	const logo = $derived(ogWordmark(INK, wide ? 26 : 34));
</script>

<div
	class="flex h-full w-full bg-[#f2ede3]"
	style={`flex-direction: ${wide ? 'row' : 'column'}; padding: ${pad}px; font-family: 'Onest'; color: ${INK};`}>
	<div class="flex flex-col justify-between" style={wide ? 'width: 440px; padding-right: 44px;' : 'margin-bottom: 52px;'}>
		<div class="flex flex-col items-start">
			<div
				class="flex bg-[#c6f135]"
				style={`border: ${stroke}px solid ${INK}; border-radius: 12px; padding: ${wide ? '8px 16px' : '10px 22px'}; transform: rotate(-6deg); margin-bottom: ${wide ? 30 : 40}px; font-size: ${wide ? 22 : 30}px; font-weight: 700; letter-spacing: 0.08em;`}>
				HEAT CHECK · {highlight.city.name.toUpperCase()}
			</div>
			<div class="flex" style={`${DISPLAY} font-size: ${titleSize}px; line-height: 0.92; letter-spacing: -0.03em;`}>
				Most talked-about places
			</div>
			<div class="flex text-[#5e556a]" style={`font-size: ${wide ? 30 : 40}px; margin-top: 16px; font-weight: 700;`}>
				{monthLabel(highlight.month)}
			</div>
		</div>
		{#if wide}
			<div class="flex flex-col" style={`font-size: ${metaSize}px;`}>
				<img src={logo.src} alt="Munchwerk" style={`${logo.style} margin-bottom: 18px;`} />
				<div class="flex text-[#5e556a]">
					{highlight.data.totals.posts.toLocaleString('en')} posts by others · {compact(highlight.data.totals.views)} views
				</div>
				<div class="flex text-[#6a2bea]" style="margin-top: 6px; font-weight: 700;">{address}</div>
			</div>
		{/if}
	</div>

	<div class="flex flex-1" style="position: relative;">
		<div
			class="flex flex-1 flex-col bg-[#fbf9f4]"
			style={`border: ${stroke}px solid ${INK}; box-shadow: ${wide ? 8 : 16}px ${wide ? 8 : 16}px 0 ${INK}; padding: ${wide ? '10px 26px' : '14px 32px'};`}>
			{#each rows as brand, i (brand.brandId)}
				<div
					class="flex items-center"
					style={`flex: 1; ${i < rows.length - 1 ? 'border-bottom: 2px solid rgba(31, 23, 36, 0.15);' : ''}`}>
					<div class="flex" style={`${DISPLAY} width: ${rowSize * 1.7}px; font-size: ${rowSize * 1.15}px; letter-spacing: -0.05em;`}>
						{String(brand.rank).padStart(2, '0')}
					</div>
					<div class="flex flex-1 flex-col" style="min-width: 0;">
						<div
							class="flex"
							style={`${DISPLAY} font-size: ${rowSize}px; line-height: 1.05; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`}>
							{brand.name}
						</div>
						<div class="flex" style="margin-top: 10px;">
							<div
								class="flex"
								style={`height: ${wide ? 10 : 14}px; width: ${Math.max(4, (brand.posts / maxPosts) * 100)}%; background: ${i === 0 ? '#c6f135' : INK}; ${i === 0 ? `border: 3px solid ${INK};` : ''}`}>
							</div>
						</div>
					</div>
					<div class="flex text-[#5e556a]" style={`font-size: ${metaSize}px; margin-left: 20px; font-weight: 700;`}>
						{brand.posts} posts
					</div>
				</div>
			{/each}
		</div>
		<!-- The bite: the brand's tooth-marked shape in the ground colour over the panel's top-right corner. -->
		<img src={bite.src} alt="" style={bite.style} />
	</div>

	{#if !wide}
		<div class="flex items-end justify-between" style={`margin-top: 48px; font-size: ${metaSize}px;`}>
			<div class="flex flex-col">
				<div class="flex text-[#5e556a]">{highlight.data.totals.posts.toLocaleString('en')} posts by others on TikTok and Instagram</div>
				<div class="flex text-[#6a2bea]" style="margin-top: 6px; font-weight: 700;">{address}</div>
			</div>
			<img src={logo.src} alt="Munchwerk" style={logo.style} />
		</div>
	{/if}
</div>
