<script lang="ts">
	import type { PostCanvasProps, PostTheme } from '../post-design.js';

	import Canvas from './parts/Canvas.svelte';
	import { fitSize } from './parts/palette.js';
	import Photo from './parts/Photo.svelte';
	import Stamp from './parts/Stamp.svelte';
	import Wordmark from './parts/Wordmark.svelte';

	// One finding, said big: a series stamp, the headline, a sentence, optionally a photo.
	// Tilts: the stamp only. Bite: the photo's, when there is one.
	interface Props extends PostCanvasProps {
		theme: PostTheme;
		label: string;
		headline: string;
		body: string;
		photo: string;
		where: string;
		handle: string;
	}

	let { format, theme, label, headline, body, photo, where, handle }: Props = $props();

	const tall = $derived(format !== 'square');
	const withPhoto = $derived(!!photo);
	const headlineSize = $derived(
		withPhoto
			? fitSize(headline, [
					[24, tall ? 112 : 96],
					[48, tall ? 96 : 80],
					[80, 80],
					[999, 64]
				])
			: fitSize(headline, [
					[24, 150],
					[48, 128],
					[80, 104],
					[999, 84]
				])
	);
</script>

{#snippet top()}
	<div class="flex items-start justify-between" style="gap: 32px;">
		{#if label}
			<Stamp tilt="left">{label}</Stamp>
		{/if}
		{#if where}
			<span
				class="ml-auto pt-[12px] text-right font-bold text-(--c-muted)"
				style="font-size: 32px;">
				{where}
			</span>
		{/if}
	</div>
{/snippet}

<Canvas {format} {theme}>
	{#if withPhoto}
		<Photo src={photo} bite class="flex-1" style="margin-bottom: 56px;" />
	{:else}
		{@render top()}
	{/if}

	<div class={['flex flex-col', !withPhoto && 'flex-1 justify-center']}>
		{#if withPhoto}
			<div class="mb-[36px]">{@render top()}</div>
		{/if}
		<h1
			class="font-display m-0 font-extrabold"
			style={`font-size: ${headlineSize}px; line-height: 0.92; letter-spacing: -0.03em; font-variation-settings: 'opsz' 96; text-wrap: balance;`}>
			{headline}
		</h1>
		{#if !withPhoto}
			<div class="bg-acid border-ink mt-[44px] h-[40px] w-[320px] border-[6px]"></div>
		{/if}
		{#if body}
			<p
				class="m-0 text-(--c-muted)"
				style={`margin-top: ${withPhoto ? 28 : 44}px; font-size: 38px; line-height: 1.3; font-weight: 500; text-wrap: pretty;`}>
				{body}
			</p>
		{/if}
	</div>

	<div
		class="mt-[56px] flex items-center justify-between border-t-[4px] border-(--c-ink) pt-[32px]">
		<Wordmark />
		{#if handle}
			<span class="font-bold" style="font-size: 34px;">{handle}</span>
		{/if}
	</div>
</Canvas>
