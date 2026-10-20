<script lang="ts">
	import { getUiLabels } from '#ui/lib/ui-labels.js';

	interface Props {
		size?: number;
		/**
		 * A token name (`primary`, `ink`, `sand`, …) or any CSS colour. Left out, the ring
		 * takes the text colour around it, so it is ink on paper and on the orange stamp,
		 * and sand on an ink pill, without the call site saying so.
		 */
		color?: string;
		/** Read out to screen readers. Pass `''` when a visible label already says it. */
		label?: string;
		class?: string;
	}

	const labels = getUiLabels();

	let {
		size = 20,
		color = undefined,
		label = labels.loading,
		class: className = ''
	}: Props = $props();

	const TOKENS = [
		'primary',
		'ink',
		'sand',
		'paper',
		'faint',
		'beet',
		'chili',
		'acid',
		'muted-foreground',
		'destructive',
		'success'
	];

	const head = $derived(
		!color ? 'currentColor' : TOKENS.includes(color) ? `var(--${color})` : color
	);
	// A quarter-rem ring swallows an 16px spinner whole; scale the stroke with the size.
	const stroke = $derived(Math.max(2, Math.round(size / 9)));
</script>

<div
	class={`spinner ${className}`}
	role={label ? 'status' : undefined}
	aria-label={label || undefined}
	aria-hidden={label ? undefined : 'true'}
	style={`width: ${size}px; height: ${size}px; border-width: ${stroke}px; --spinner-head: ${head};`}>
</div>

<style>
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.spinner {
		flex: none;
		box-sizing: border-box;
		border-radius: 50%;
		border-style: solid;
		/* The track is the head colour at low strength, so it reads on sand, paper,
		   orange and ink alike. */
		border-color: color-mix(in srgb, var(--spinner-head) 18%, transparent);
		border-top-color: var(--spinner-head);
		animation: spin 0.8s infinite linear;
	}

	/* Slowed rather than stopped: a still ring reads as a frozen page. */
	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation-duration: 2.4s;
		}
	}
</style>
