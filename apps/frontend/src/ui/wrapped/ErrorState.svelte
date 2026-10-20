<script lang="ts">
	import type { IconNode } from '@lucide/svelte';
	import { CircleAlert, RotateCw } from '@lucide/svelte';
	import type { Component, Snippet } from 'svelte';

	import { getUiLabels } from '#ui/lib/ui-labels.js';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';

	interface Props {
		title?: string;
		hint?: string;
		icon?: Component | IconNode;
		/** Shows the retry button; a returned promise keeps it spinning until it settles. */
		onRetry?: () => unknown;
		retryText?: string;
		ground?: 'wash' | 'none' | 'paper';
		size?: 'sm' | 'md' | 'lg';
		fill?: boolean;
		class?: string;
		/** Extra actions next to the retry button (e.g. a link back). */
		children?: Snippet;
		[key: string]: unknown;
	}

	// The fallback words follow the part of the app this sits in (`#ui/lib/ui-labels.ts`).
	const labels = getUiLabels();

	let {
		title = labels.loadFailed,
		hint,
		icon = CircleAlert,
		onRetry,
		retryText = labels.retry,
		ground = 'wash',
		size = 'md',
		fill = false,
		class: className = '',
		children,
		...restProps
	}: Props = $props();

	let retrying = $state(false);

	const retry = async () => {
		if (!onRetry || retrying) return;
		retrying = true;
		try {
			await onRetry();
		} finally {
			retrying = false;
		}
	};

	// With a way out on offer, say what usually fixes it; without one the title stands alone.
	const resolvedHint = $derived(
		hint ?? (onRetry ? labels.retryHint : undefined)
	);
</script>

{#snippet actions()}
	{#if onRetry}
		<Button
			variant="outline"
			size={size === 'sm' ? 'sm' : 'default'}
			icon={RotateCw}
			loading={retrying}
			onclick={retry}
		>
			{retryText}
		</Button>
	{/if}
	{@render children?.()}
{/snippet}

<EmptyState
	{title}
	hint={resolvedHint}
	{icon}
	{ground}
	{size}
	{fill}
	tone="danger"
	role="alert"
	class={className}
	children={onRetry || children ? actions : undefined}
	{...restProps}
/>
