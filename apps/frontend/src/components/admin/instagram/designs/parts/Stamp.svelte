<script lang="ts">
	import type { Snippet } from 'svelte';

	// The pixel-caps sticker of a canvas: one or two words ("HEAT CHECK · OCT 2026"), 26px so
	// it clears the brand's 24px minimum on a 1080 canvas. Acid with an ink frame by default;
	// `tone="ink"` (acid on ink) sits on an acid field. Tilts are rationed: two per canvas,
	// never the same angle.
	interface Props {
		tone?: 'acid' | 'ink' | 'oat';
		tilt?: 'none' | 'left' | 'right' | 'hard';
		class?: string;
		children: Snippet;
	}

	let { tone = 'acid', tilt = 'none', class: className = '', children }: Props = $props();

	const TONES = {
		acid: 'bg-acid text-ink border-ink',
		ink: 'bg-ink text-acid border-ink',
		oat: 'bg-[#f2ede3] text-ink border-ink'
	};
	const TILTS = { none: '', left: 'tilt-left', right: 'tilt-right', hard: 'tilt-hard' };
</script>

<div
	class={[
		'font-pixel w-fit rounded-[12px] border-[6px] uppercase',
		TONES[tone],
		TILTS[tilt],
		className
	]}
	style="padding: 14px 22px 12px; font-size: 26px; line-height: 1.35; letter-spacing: 0.06em;">
	{@render children()}
</div>
