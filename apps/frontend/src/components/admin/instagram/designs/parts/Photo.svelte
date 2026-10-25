<script lang="ts">
	import { ImageIcon } from '@lucide/svelte';

	// A photo frame on a canvas: square, a 6px ink outline and a 16px hard offset (ink by day,
	// acid by night, from `--c-shadow`). `bite` cuts the composition's one bite from its
	// top-right corner; the shadow sits on a wrapper so the mask doesn't eat it. No photo
	// yet draws a placeholder, so the layout reads before one is picked.
	interface Props {
		src?: string;
		alt?: string;
		bite?: boolean;
		shadow?: boolean;
		class?: string;
		style?: string;
	}

	let {
		src = '',
		alt = '',
		bite = false,
		shadow = true,
		class: className = '',
		style = ''
	}: Props = $props();
	let height = $state(0);
	// The brand's bite: 16% of the shape's height, capped so a tall frame isn't half eaten
	const biteRadius = $derived(Math.min(110, Math.round(height * 0.16)));
</script>

<div class={['relative min-h-0', className]} {style} bind:clientHeight={height}>
	{#if shadow}
		<div
			class={['absolute inset-0 bg-(--c-shadow)', bite && 'bite']}
			style={`translate: 16px 16px; --bite: ${biteRadius}px;`}>
		</div>
	{/if}
	<div
		class={['bg-ink absolute inset-0 p-[6px]', bite && 'bite']}
		style={`--bite: ${biteRadius}px;`}>
		{#if src}
			<img {src} {alt} class="block h-full w-full object-cover" />
		{:else}
			<div class="flex h-full w-full items-center justify-center bg-[#e8e1d3] text-[#766b79]">
				<ImageIcon size={120} strokeWidth={1.25} />
			</div>
		{/if}
	</div>
</div>
