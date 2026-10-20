<script lang="ts">
	import type { SVGAttributes } from 'svelte/elements';

	// Line-art LinkedIn mark for the ink footer's outlined stickers — see
	// `instagram-outline.svelte` for why the footer avoids the solid brand glyphs.
	interface Props extends SVGAttributes<SVGSVGElement> {
		size?: number;
	}
	const { size = 24, class: className, ...rest }: Props = $props();
</script>

<svg
	role="img"
	aria-label="LinkedIn"
	viewBox="0 0 24 24"
	width={size}
	height={size}
	fill="none"
	stroke="currentColor"
	stroke-width="1.9"
	stroke-linecap="round"
	stroke-linejoin="round"
	xmlns="http://www.w3.org/2000/svg"
	class={className}
	{...rest}>
	<rect x="3" y="3" width="18" height="18" rx="4" />
	<path d="M7 10v7M7 6.5h.01M11 17v-4a2.5 2.5 0 0 1 5 0v4" />
</svg>
