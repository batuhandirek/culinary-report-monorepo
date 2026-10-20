<script lang="ts">
	import type { IconNode } from '@lucide/svelte';
	import type { Component, Snippet } from 'svelte';

	import Icon from '#ui/components/Icon.svelte';
	import { cn } from '#ui/lib/utils.js';

	interface Props {
		/** One line: what is missing ("Henüz siparişin yok"). */
		title: string;
		/** One quieter line: what will show up here, or what to do next. */
		hint?: string;
		icon?: Component | IconNode;
		/**
		 * `wash` is a well on the page (the default: a section that turned up empty);
		 * `none` paints nothing, for a card or pane that is already the surface;
		 * `paper` is a hairline card, for an empty state that stands alone on sand.
		 */
		ground?: 'wash' | 'none' | 'paper';
		size?: 'sm' | 'md' | 'lg';
		/** `danger` tints the icon well red — a failed load rather than nothing to show. */
		tone?: 'neutral' | 'danger';
		/** Grow to fill a flex pane and centre in it (an empty inbox, an unpicked thread). */
		fill?: boolean;
		class?: string;
		/** The one action — a `Button`, or two at most. */
		children?: Snippet;
		[key: string]: unknown;
	}

	let {
		title,
		hint,
		icon,
		ground = 'wash',
		size = 'md',
		tone = 'neutral',
		fill = false,
		class: className = '',
		children,
		...restProps
	}: Props = $props();

	const PADDING = {
		sm: { bare: 'py-8', withAction: 'py-6' },
		md: { bare: 'py-14', withAction: 'py-10' },
		lg: { bare: 'py-20', withAction: 'py-16' }
	};
	const WELL = { sm: 'size-10', md: 'size-14', lg: 'size-16' };
	const ICON = { sm: 18, md: 24, lg: 28 };
</script>

<div
	class={cn(
		'text-ink flex w-full flex-col items-center justify-center px-6 text-center',
		ground === 'wash' && 'bg-wash rounded-md',
		ground === 'paper' && 'bg-paper border-line rounded-md border',
		PADDING[size][children ? 'withAction' : 'bare'],
		fill && 'min-h-0 flex-1',
		className
	)}
	{...restProps}
>
	{#if icon}
		<div
			class={cn(
				'grid shrink-0 place-items-center rounded-full',
				WELL[size],
				tone === 'danger'
					? 'bg-destructive/10 text-destructive'
					: ground === 'wash'
						? 'bg-paper text-ink shadow-sm'
						: 'bg-wash text-ink',
				size === 'sm' ? 'mb-3' : 'mb-4'
			)}
		>
			<Icon {icon} size={ICON[size]} />
		</div>
	{/if}

	<p class={cn('m-0 text-balance font-semibold', size === 'sm' ? 'text-sm' : 'text-base')}>
		{title}
	</p>

	{#if hint}
		<p class="text-muted-foreground m-0 mt-1 max-w-[42ch] text-pretty text-sm">
			{hint}
		</p>
	{/if}

	{#if children}
		<div
			class={cn(
				'flex flex-wrap items-center justify-center gap-2',
				size === 'sm' ? 'mt-3' : 'mt-5'
			)}
		>
			{@render children()}
		</div>
	{/if}
</div>
