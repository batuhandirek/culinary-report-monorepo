<script lang="ts">
	import type { SVGAttributes } from 'svelte/elements';

	// Line-art Instagram mark for the ink footer's outlined stickers. The solid brand
	// glyph in `instagram.svelte` stays for the share flows, where the recognisable
	// logo matters; on ink at sticker size it renders as a blob next to the other
	// stroked marks, so the footer uses this one.
	interface Props extends SVGAttributes<SVGSVGElement> {
		size?: number;
	}
	const { size = 24, class: className, ...rest }: Props = $props();
</script>

<svg
	role="img"
	aria-label="Instagram"
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
	<rect x="3" y="3" width="18" height="18" rx="5" />
	<circle cx="12" cy="12" r="4" />
	<path d="M17.5 6.5h.01" />
</svg>
