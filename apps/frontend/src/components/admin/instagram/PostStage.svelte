<script lang="ts">
	import {
		POST_FORMATS,
		type PostDesign,
		type PostFormat,
		type PostValues
	} from './post-design.js';

	// A design drawn at its canvas's true size (1080 wide) and scaled down to the box, so the
	// preview is the PNG pixel for pixel. `maxHeight` (any CSS length) caps a tall canvas.
	interface Props {
		design: PostDesign;
		values: PostValues;
		format: PostFormat;
		slide?: number;
		maxHeight?: string;
		class?: string;
	}

	let { design, values, format, slide = 0, maxHeight, class: className = '' }: Props = $props();

	const size = $derived(POST_FORMATS[format]);
	let boxWidth = $state(0);
	const scale = $derived(boxWidth / size.width);
	const Design = $derived(design.component);
</script>

<div
	class={['relative w-full overflow-hidden', className]}
	style={`aspect-ratio: ${size.width} / ${size.height}; ${maxHeight ? `max-width: calc(${maxHeight} * ${size.width} / ${size.height});` : ''}`}
	bind:clientWidth={boxWidth}>
	{#if boxWidth}
		<div
			class="pointer-events-none absolute top-0 left-0 origin-top-left select-none"
			style={`transform: scale(${scale});`}>
			<Design {...values} {format} {slide} />
		</div>
	{/if}
</div>
