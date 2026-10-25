<script lang="ts">
	import { ArrowRight } from '@lucide/svelte';

	import type { PostCanvasProps, PostTheme } from '../post-design.js';

	import Canvas from './parts/Canvas.svelte';
	import { fitSize } from './parts/palette.js';
	import Photo from './parts/Photo.svelte';
	import Stamp from './parts/Stamp.svelte';
	import Wordmark from './parts/Wordmark.svelte';

	// The brand's carousel (`brand` skill): the cover, one slide per place, the method in one
	// line, the follow card. The cover is the series' acid field by day, deep grape by night.
	// Each slide keeps to one tilt and one bite of its own.
	interface Item {
		name: string;
		area: string;
		stat: string;
		credit: string;
		photo: string;
	}
	interface Props extends PostCanvasProps {
		theme: PostTheme;
		series: string;
		title: string;
		period: string;
		items: Item[];
		method: string;
		handle: string;
		cta: string;
	}

	let { format, slide, theme, series, title, period, items, method, handle, cta }: Props =
		$props();

	const night = $derived(theme === 'night');
	const last = $derived(items.length + 2);
	const item = $derived(slide >= 1 && slide <= items.length ? items[slide - 1] : undefined);
	const titleSize = $derived(
		fitSize(title, [
			[24, 140],
			[44, 120],
			[70, 100],
			[999, 84]
		])
	);
	const nameSize = $derived(
		item
			? fitSize(item.name, [
					[14, 96],
					[24, 80],
					[999, 64]
				])
			: 0
	);
</script>

{#if slide === 0}
	<Canvas {format} {theme} ground={night ? 'grape-deep' : 'acid'}>
		<div class="flex items-start justify-between">
			<Stamp tone={night ? 'acid' : 'ink'} tilt="hard">{series}</Stamp>
			<span class="font-pixel uppercase" style="font-size: 26px; letter-spacing: 0.06em;"
				>{period}</span>
		</div>
		<div class="flex flex-1 flex-col justify-end">
			<h1
				class="font-display m-0 font-extrabold"
				style={`font-size: ${titleSize}px; line-height: 0.9; letter-spacing: -0.035em; font-variation-settings: 'opsz' 96; text-wrap: balance;`}>
				{title}
			</h1>
			<div
				class={[
					'mt-[56px] flex items-center justify-between border-t-[8px] pt-[32px]',
					night ? 'border-[#f2ede3]' : 'border-ink'
				]}>
				<Wordmark ink={!night} />
				<span class="flex items-center font-bold" style="font-size: 36px; gap: 12px;">
					Swipe <ArrowRight size={40} strokeWidth={3} />
				</span>
			</div>
		</div>
	</Canvas>
{:else if item}
	<Canvas {format} {theme}>
		<div class="relative flex min-h-0 flex-1">
			<Photo src={item.photo} alt={item.name} bite class="flex-1" />
			<!-- The rank as a graphic over the frame's bottom-left corner -->
			<div class="absolute bottom-[-40px] left-[36px] flex">
				<span
					class="bg-acid border-ink font-display border-[6px] font-extrabold text-ink"
					style="font-size: 150px; line-height: 0.82; letter-spacing: -0.05em; padding: 20px 28px 12px;">
					{slide}
				</span>
			</div>
		</div>
		<div class="mt-[84px] flex flex-col">
			<h2
				class="font-display m-0 font-extrabold"
				style={`font-size: ${nameSize}px; line-height: 0.95; letter-spacing: -0.025em; font-variation-settings: 'opsz' 96;`}>
				{item.name}
			</h2>
			<div
				class="mt-[18px] flex flex-wrap items-baseline"
				style="column-gap: 24px; row-gap: 8px;">
				{#if item.area}
					<span class="font-bold text-(--c-muted)" style="font-size: 36px;"
						>{item.area}</span>
				{/if}
				{#if item.stat}
					<span class="font-bold text-(--c-green)" style="font-size: 36px;"
						>{item.stat}</span>
				{/if}
			</div>
			{#if item.credit}
				<div class="mt-[24px] text-(--c-muted)" style="font-size: 32px;">
					Photo {item.credit}
				</div>
			{/if}
		</div>
	</Canvas>
{:else if slide === items.length + 1}
	<Canvas {format} {theme}>
		<Stamp tone={night ? 'acid' : 'oat'} tilt="left">How we counted</Stamp>
		<div class="flex flex-1 flex-col justify-center">
			<p
				class="font-display m-0 font-extrabold"
				style="font-size: 76px; line-height: 1; letter-spacing: -0.025em; text-wrap: balance;">
				{method}
			</p>
		</div>
		<div
			class="bg-ink flex flex-col rounded-none text-[#f2ede3]"
			style={`padding: 40px 44px; gap: 12px; ${night ? 'outline: 4px solid #f2ede3;' : ''}`}>
			<span
				class="font-pixel text-acid uppercase"
				style="font-size: 26px; letter-spacing: 0.06em;">{series} · {period}</span>
			{#if handle}
				<span class="font-bold" style="font-size: 36px;">{handle}</span>
			{/if}
		</div>
	</Canvas>
{:else if slide === last}
	<Canvas {format} {theme} ground={night ? 'grape' : 'acid'}>
		<div class="flex flex-1 flex-col justify-center">
			<Wordmark ink={!night} size={72} />
			<div
				class="font-display mt-[64px] font-extrabold"
				style="font-size: 120px; line-height: 0.9; letter-spacing: -0.035em;">
				What the city's munching.
			</div>
			{#if cta}
				<p class="m-0 mt-[48px] font-semibold" style="font-size: 44px; line-height: 1.25;">
					{cta}
				</p>
			{/if}
		</div>
		<div
			class={[
				'flex items-center justify-between border-t-[8px] pt-[32px]',
				night ? 'border-[#f2ede3]' : 'border-ink'
			]}>
			<span
				class="font-display font-extrabold"
				style="font-size: 56px; letter-spacing: -0.02em;">Follow {handle}</span>
		</div>
	</Canvas>
{/if}
