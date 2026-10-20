<script lang="ts">
	import type { Component } from 'svelte';

	import ButtonBody from './ButtonBody.svelte';

	import { trackEvent as trackAnalyticsEvent } from '#stores/AnalyticsStore.svelte.js';
	import { cn } from '#ui/lib/utils.js';
	import { Button, type ButtonProps } from '#ui/primitives-new/button/index.js';

	export interface WrappedButtonProps extends ButtonProps {
		icon?: Component;
		suffixIcon?: Component;
		/** Shows a spinner and blocks the click; the button keeps its width. */
		loading?: boolean | undefined;
		iconClass?: string;
		newTab?: boolean;
		trackEvent?: { name: string; params?: Record<string, string | number> };
		children?: import('svelte').Snippet;
	}

	let {
		icon = undefined,
		suffixIcon = undefined,
		loading = undefined,
		iconClass = '',
		size = 'default',
		newTab = false,
		trackEvent = undefined,
		class: className,
		children,
		...rest
	}: WrappedButtonProps = $props();
	let isOnlyIcon = $derived((size ?? 'default').startsWith('icon'));
	let disabled = $derived(rest.disabled || loading);

	let target = $derived(newTab ? '_blank' : undefined);

	const onclick = (e: MouseEvent) => {
		if (trackEvent) {
			trackAnalyticsEvent(trackEvent.name, trackEvent.params);
		}
		rest.onclick?.(e as Parameters<NonNullable<ButtonProps['onclick']>>[0]);
	};
</script>

<!-- `relative` only while loading: the spinner is centred over the label then, and a call
     site that positions the button itself (`absolute`, `sticky`) wins the merge. -->
<Button
	{...rest}
	{onclick}
	{size}
	{disabled}
	{target}
	aria-busy={loading || undefined}
	class={cn(loading && 'relative', className)}>
	<ButtonBody {icon} {suffixIcon} loading={!!loading} {iconClass} iconOnly={isOnlyIcon}>
		{@render children?.()}
	</ButtonBody>
</Button>
