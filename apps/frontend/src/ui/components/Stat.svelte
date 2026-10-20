<script lang="ts">
	import type { IconNode } from '@lucide/svelte';
	import type { Component } from 'svelte';

	import Icon from '#ui/components/Icon.svelte';
	import { cn } from '#ui/lib/utils.js';
	import Skeleton from '#ui/primitives-new/skeleton/skeleton.svelte';

	/** One figure with its pixel label: a count, a sum, a rate. A link when `href` is set. */
	interface Props {
		title: string;
		value: number | string;
		/** A quieter line under the figure: what it counts, since when. */
		description?: string;
		/** A quieter note beside the figure ("3 satıştan"). */
		hint?: string;
		href?: string;
		/** With `href`: handle the click yourself (call `preventDefault` to stay on the page). */
		onclick?: (event: MouseEvent) => void;
		/** `sm` is the compact tile of a dashboard rail: several across a phone's width. */
		size?: 'sm' | 'md';
		icon?: Component | IconNode;
		/** `danger` and `success` colour the figure, for a number that is itself a verdict. */
		tone?: 'default' | 'success' | 'danger';
		/** Hold the tile's shape while the figure is on its way. */
		loading?: boolean;
		class?: string;
	}

	let {
		title,
		value,
		description = undefined,
		hint = undefined,
		href = undefined,
		onclick = undefined,
		size = 'md',
		icon = undefined,
		tone = 'default',
		loading = false,
		class: className = ''
	}: Props = $props();

	const TONE = { default: 'text-ink', success: 'text-success', danger: 'text-destructive' };
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<svelte:element
	this={href ? 'a' : 'div'}
	{href}
	onclick={href ? onclick : undefined}
	class={cn(
		'bg-paper border-line flex min-w-0 flex-col gap-2 rounded-md border',
		size === 'sm' ? 'h-full min-h-16 justify-between px-3 py-2.5' : 'p-4',
		href &&
			'hover:border-ink/30 focus-visible:ring-ring transition-colors outline-none focus-visible:ring-2',
		className
	)}>
	<div class="eyebrow text-muted-foreground flex items-center gap-2">
		{#if icon}
			<Icon {icon} size={14} />
		{/if}
		{title}
	</div>
	{#if loading}
		<Skeleton class={cn('bg-wash w-24 rounded', size === 'sm' ? 'h-6' : 'h-8')} />
	{:else}
		<div class="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
			<span
				class={cn(
					'type-meta truncate font-semibold leading-none',
					size === 'sm' ? 'text-2xl' : 'text-3xl',
					TONE[tone]
				)}>
				{value}
			</span>
			{#if hint}
				<span class="font-term text-muted-foreground text-base leading-none whitespace-nowrap">
					{hint}
				</span>
			{/if}
		</div>
	{/if}
	{#if description}
		<div class="text-muted-foreground text-sm">{description}</div>
	{/if}
</svelte:element>
