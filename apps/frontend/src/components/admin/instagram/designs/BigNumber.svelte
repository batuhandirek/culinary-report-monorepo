<script lang="ts">
	import type { PostCanvasProps } from '../post-design.js';

	import Canvas from './parts/Canvas.svelte';
	import { fitSize } from './parts/palette.js';
	import Stamp from './parts/Stamp.svelte';
	import Wordmark from './parts/Wordmark.svelte';

	// One number on a brand field: the figure as a graphic, what it counts, one sentence of
	// context, the method line. Acid by day, grape or ink by night. One tilt: the stamp.
	interface Props extends PostCanvasProps {
		field: 'acid' | 'grape' | 'ink';
		label: string;
		figure: string;
		unit: string;
		sentence: string;
		method: string;
		handle: string;
	}

	let { format, field, label, figure, unit, sentence, method, handle }: Props = $props();

	const onAcid = $derived(field === 'acid');
	// Text on a field: ink on acid, oat on grape and ink; numbers on ink may be acid
	const figureColour = $derived(
		field === 'ink' ? 'text-acid' : onAcid ? 'text-ink' : 'text-[#f2ede3]'
	);
	const quiet = $derived(onAcid ? 'text-ink' : 'text-[#f2ede3]');
	const figureSize = $derived(
		fitSize(figure, [
			[3, format === 'square' ? 340 : 400],
			[5, 300],
			[7, 230],
			[999, 180]
		])
	);
</script>

<Canvas {format} ground={field}>
	{#if label}
		<Stamp tone={onAcid ? 'ink' : 'acid'} tilt="hard">{label}</Stamp>
	{/if}

	<div class="flex flex-1 flex-col justify-center">
		<div
			class={['font-display font-extrabold', figureColour]}
			style={`font-size: ${figureSize}px; line-height: 0.8; letter-spacing: -0.05em; font-variation-settings: 'opsz' 96;`}>
			{figure}
		</div>
		{#if unit}
			<div
				class={['font-display font-extrabold', quiet]}
				style="font-size: 88px; line-height: 0.95; letter-spacing: -0.03em; margin-top: 28px;">
				{unit}
			</div>
		{/if}
		{#if sentence}
			<p
				class={['m-0', quiet]}
				style="font-size: 42px; line-height: 1.25; font-weight: 500; margin-top: 44px; max-width: 880px; text-wrap: pretty;">
				{sentence}
			</p>
		{/if}
	</div>

	<div class="flex flex-col" style="gap: 32px;">
		{#if method}
			<p class={['m-0', quiet]} style="font-size: 32px; line-height: 1.3;">{method}</p>
		{/if}
		<div
			class={[
				'flex items-center border-t-[4px] pt-[32px]',
				onAcid ? 'border-ink' : 'border-[#f2ede3]',
				quiet
			]}>
			<Wordmark {handle} ink={onAcid} />
		</div>
	</div>
</Canvas>
