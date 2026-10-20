<script lang="ts">
	import type { IconNode } from '@lucide/svelte';
	import { CircleCheck, Info, TriangleAlert, X } from '@lucide/svelte';
	import type { Component, Snippet } from 'svelte';

	import Icon from '#ui/components/Icon.svelte';
	import { getUiLabels } from '#ui/lib/ui-labels.js';
	import { cn } from '#ui/lib/utils.js';

	/**
	 * A callout inside the page: what happens next, a caveat, a problem — with room for a
	 * title, a sentence or two and an action. The state is carried by the ground (the
	 * same rule `Alert` follows); for a bare one-liner under a heading use `ink-strip`.
	 */
	interface Props {
		/**
		 * `neutral` the darker paper (a note, a next step) · `info` a hairline card ·
		 * `success` · `warning` · `danger`.
		 */
		tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
		title?: string;
		/** The body as plain text; use the default slot for anything richer. */
		text?: string;
		/** Defaults to the tone's icon (none for `neutral`). Pass `false` for no icon. */
		icon?: Component | IconNode | false;
		size?: 'sm' | 'md';
		/** Buttons or links: under the text on a phone, at the far end from `sm` up. */
		actions?: Snippet;
		/** Shows a close button. */
		onDismiss?: () => void;
		class?: string;
		children?: Snippet;
		[key: string]: unknown;
	}

	const labels = getUiLabels();

	let {
		tone = 'neutral',
		title,
		text,
		icon,
		size = 'md',
		actions,
		onDismiss,
		class: className = '',
		children,
		...restProps
	}: Props = $props();

	const GROUND = {
		neutral: 'bg-tint',
		info: 'bg-paper border-line border',
		success: 'bg-success/12',
		warning: 'bg-warning/20',
		danger: 'bg-destructive/10'
	};
	const ICON_COLOR = {
		neutral: 'text-ink',
		info: 'text-muted-foreground',
		success: 'text-success',
		warning: 'text-ink',
		danger: 'text-destructive'
	};
	const DEFAULT_ICON = {
		neutral: undefined,
		info: Info,
		success: CircleCheck,
		warning: TriangleAlert,
		danger: TriangleAlert
	};

	const resolvedIcon = $derived(icon === false ? undefined : (icon ?? DEFAULT_ICON[tone]));
</script>

<div
	role={tone === 'danger' ? 'alert' : 'note'}
	class={cn(
		'text-ink flex min-w-0 flex-col gap-3 rounded-md sm:flex-row sm:items-center',
		size === 'sm' ? 'px-3 py-2.5' : 'p-4',
		GROUND[tone],
		className
	)}
	{...restProps}
>
	<div class="flex min-w-0 flex-1 items-start gap-3">
		{#if resolvedIcon}
			<Icon
				icon={resolvedIcon}
				size={size === 'sm' ? 16 : 18}
				strokeWidth={1.8}
				class={cn('shrink-0', size === 'sm' ? 'mt-0.5' : 'mt-px', ICON_COLOR[tone])}
			/>
		{/if}
		<div class="flex min-w-0 flex-1 flex-col gap-1">
			{#if title}
				<p
					class={cn(
						'm-0 font-semibold leading-snug',
						size === 'sm' ? 'text-sm' : 'text-[0.9375rem]'
					)}
				>
					{title}
				</p>
			{/if}
			{#if text || children}
				<div class="text-reading-ink text-sm leading-relaxed">
					{#if children}
						{@render children()}
					{:else}
						{text}
					{/if}
				</div>
			{/if}
		</div>
		{#if onDismiss}
			<button
				type="button"
				aria-label={labels.close}
				onclick={onDismiss}
				class="text-muted-foreground hover:text-ink hover:bg-ink/10 focus-visible:ring-ring -m-2 grid size-9 shrink-0 cursor-pointer place-items-center rounded-full transition-colors outline-none focus-visible:ring-2"
			>
				<Icon icon={X} size={16} />
			</button>
		{/if}
	</div>
	{#if actions}
		<div
			class={cn(
				'flex shrink-0 flex-wrap items-center gap-2',
				resolvedIcon && 'pl-[30px] sm:pl-0'
			)}
		>
			{@render actions()}
		</div>
	{/if}
</div>
