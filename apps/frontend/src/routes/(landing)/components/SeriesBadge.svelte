<script lang="ts">
	import type { Series } from './landing.js';

	// A series' badge: its colour and its glyph, the same wherever the series shows up.
	interface Props {
		series: Series;
		/** The 3px ring around it, in the colour of the field it sits on. */
		ring?: string;
		/** Font size in px: the badge is 2.4em square */
		size?: number;
	}

	let { series, ring, size = 22 }: Props = $props();

	const FILL: Record<Series, string> = {
		heat: 'background: var(--lp-acid); color: var(--lp-brand-ink)',
		rising: 'background: var(--lp-chili); color: var(--lp-oat)',
		new: 'background: var(--lp-grape); color: var(--lp-oat)',
		dish: 'background: var(--lp-beet); color: var(--lp-oat)',
		trends: 'background: var(--lp-grape-deep); color: var(--lp-acid)'
	};
</script>

<span
	class="lp-badge"
	style="{FILL[series]}; font-size: {size}px{ring ? `; outline: 3px solid ${ring}` : ''}"
	aria-hidden="true">
	<svg viewBox="0 0 24 24" fill="currentColor">
		{#if series === 'heat'}
			<path d="M12 2c1 4 4 5 4 9.5a4 4 0 0 1-8 0c0-1.6.6-2.8 1.5-3.8.3 1.3 1 2.1 2 2.3C10.5 7 10 4.5 12 2z" />
			<rect x="4" y="19" width="16" height="3" />
		{:else if series === 'rising'}
			<path d="M12 3l7 7h-4.5v7h-5v-7H5z" />
			<rect x="4" y="19" width="16" height="3" />
		{:else if series === 'new'}
			<path d="M12 1l2.2 7.3L22 10l-7.8 1.7L12 23l-2.2-11.3L2 10l7.8-1.7z" />
		{:else if series === 'dish'}
			<path
				d="M21 12C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3C13.2 3 14.35 3.24 15.4 3.67C15.08 4.2 14.9 4.83 14.9 5.5C14.9 7.49 16.51 9.1 18.5 9.1C19.17 9.1 19.8 8.92 20.33 8.6C20.76 9.65 21 10.8 21 12ZM17 12C17 9.24 14.76 7 12 7C9.24 7 7 9.24 7 12C7 14.76 9.24 17 12 17C14.76 17 17 14.76 17 12Z" />
		{:else}
			<path d="M3 17l5-6 4 3 5-7h-3V4h7v7h-3V8.8l-6 8.2-4-3-4 4.8z" />
		{/if}
	</svg>
</span>
