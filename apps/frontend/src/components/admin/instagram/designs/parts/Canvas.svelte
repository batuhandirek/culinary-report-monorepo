<script lang="ts">
	import type { Snippet } from 'svelte';

	import { POST_FORMATS, type PostFormat, type PostTheme } from '../../post-design.js';

	import { paletteStyle } from './palette.js';

	// Every design's root: the canvas at its true size, the theme's colours as `--c-*`, the
	// 72px gutter and, on a story, the 250px top and bottom kept clear of text (`brand`).
	// `ground` swaps the theme's ground for a brand field; a field carries its own text colour.
	interface Props {
		format: PostFormat;
		theme?: PostTheme;
		ground?: 'theme' | 'acid' | 'grape' | 'grape-deep' | 'ink';
		/** No gutter: the design places everything itself (a bleeding field). */
		bleed?: boolean;
		class?: string;
		children: Snippet;
	}

	let {
		format,
		theme = 'day',
		ground = 'theme',
		bleed = false,
		class: className = '',
		children
	}: Props = $props();

	const size = $derived(POST_FORMATS[format]);
	const GROUNDS = {
		theme: 'bg-(--c-ground) text-(--c-ink)',
		acid: 'bg-acid text-ink',
		grape: 'bg-grape text-[#f2ede3]',
		'grape-deep': 'bg-grape-deep text-[#f2ede3]',
		ink: 'bg-ink text-[#f2ede3]'
	};
	const padding = $derived(bleed ? '0' : format === 'story' ? '250px 72px' : '72px');
</script>

<div
	class={[
		'relative flex flex-col overflow-hidden font-sans antialiased',
		GROUNDS[ground],
		className
	]}
	style={`${paletteStyle(theme)} width: ${size.width}px; height: ${size.height}px; padding: ${padding}; font-size: 36px; line-height: 1.3; letter-spacing: 0;`}>
	{@render children()}
</div>
