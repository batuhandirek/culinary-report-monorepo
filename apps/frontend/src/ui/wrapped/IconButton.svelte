<script lang="ts">
	import type { Component } from 'svelte';

	import { trackEvent as trackAnalyticsEvent } from '#stores/AnalyticsStore.svelte.js';
	import { cn } from '#ui/lib/utils.js';
	import { Button, type ButtonProps } from '#ui/primitives-new/button/index.js';
	import { Spinner } from '#ui/primitives-new/spinner/index.js';

	/**
	 * A compact glyph key for rows, toolbars and the corners of cards — smaller on screen
	 * than `Button size="icon"` (which is the 40px header key), but never smaller to the
	 * finger: on a touch screen the hit area reaches 44px past the visible box.
	 *
	 * It has no text, so it needs a name: pass `label` (becomes `aria-label` and the hover
	 * title) or an `aria-label` of your own.
	 */
	export interface WrappedIconButtonProps extends ButtonProps {
		icon?: Component;
		/** The accessible name, also shown as the hover title. */
		label?: string;
		loading?: boolean;
		/** 20px box. */
		xs?: boolean;
		/** 24px box. */
		sm?: boolean;
		/** 48px box. */
		lg?: boolean;
		iconClass?: string;
		circle?: boolean;
		class?: string;
		trackEvent?: { name: string; params?: Record<string, string | number> };
	}

	let {
		icon = undefined,
		label = undefined,
		loading = undefined,
		xs = undefined,
		sm = undefined,
		lg = undefined,
		circle = false,
		iconClass = '',
		class: className = '',
		trackEvent = undefined,
		...restProps
	}: WrappedIconButtonProps = $props();

	const onclick = (e: MouseEvent) => {
		if (trackEvent) {
			trackAnalyticsEvent(trackEvent.name, trackEvent.params);
		}
		restProps.onclick?.(e as Parameters<NonNullable<ButtonProps['onclick']>>[0]);
	};

	// Box, glyph, and how far the touch target has to reach past the box to make 44px.
	const scale = $derived(
		sm
			? { box: 'w-6 h-6', glyph: 'size-3.5', reach: 'pointer-coarse:after:-inset-2.5' }
			: xs
				? { box: 'w-5 h-5', glyph: 'size-3', reach: 'pointer-coarse:after:-inset-3' }
				: lg
					? { box: 'w-12 h-12', glyph: 'size-5', reach: '' }
					: { box: 'w-8 h-8', glyph: 'size-4', reach: 'pointer-coarse:after:-inset-1.5' }
	);
	const roundClass = $derived(
		circle
			? 'rounded-full'
			: sm
				? 'rounded-sm'
				: xs
					? 'rounded-xs'
					: lg
						? 'rounded-lg'
						: 'rounded-md'
	);
	let disabled = $derived(restProps.disabled || loading);
</script>

<Button
	aria-label={label}
	title={label}
	{...restProps}
	{onclick}
	{disabled}
	aria-busy={loading || undefined}
	size="icon"
	class={cn(
		scale.box,
		roundClass,
		scale.reach && ['relative after:absolute after:content-[""]', scale.reach],
		className
	)}>
	{#if loading}
		<Spinner class={scale.glyph} />
	{:else if icon}
		{@const IconComponent = icon}
		<IconComponent class={cn(scale.glyph, iconClass)} />
	{/if}
</Button>
