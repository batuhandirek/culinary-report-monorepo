<script lang="ts">
	import { ChevronRight } from '@lucide/svelte';
	import type { IconNode } from '@lucide/svelte';
	import type { Component, Snippet } from 'svelte';

	import Icon from '#ui/components/Icon.svelte';
	import { cn } from '#ui/lib/utils.js';

	/**
	 * One row of a settings menu, a category list, a set of shortcuts: leading icon,
	 * title (+ hint), trailing value and a chevron. A link with `href`, a button with
	 * `onclick`, plain otherwise. At least 48px tall. Put several in `<Panel rows>`.
	 */
	interface Props {
		title: string;
		/** A quieter second line. */
		hint?: string;
		icon?: Component | IconNode;
		/** Sit the icon in a round wash well (category lists) rather than bare (menus). */
		iconWell?: boolean;
		/** Custom leading content — an avatar, a thumbnail. Replaces `icon`. */
		leading?: Snippet;
		/** Quiet trailing text: a count, the current setting. */
		value?: string | number;
		/** Custom trailing content — a switch, a badge. Hides the chevron unless `chevron` is set. */
		trailing?: Snippet;
		href?: string;
		onclick?: (e: MouseEvent) => void;
		/** Defaults to on for links and buttons, off for plain rows. */
		chevron?: boolean;
		/** Semibold title: the "all of them" row at the top of a list. */
		strong?: boolean;
		/** The row for where you are now. */
		active?: boolean;
		disabled?: boolean;
		/** Keep the title on one line with an ellipsis instead of wrapping. */
		truncate?: boolean;
		class?: string;
		[key: string]: unknown;
	}

	let {
		title,
		hint,
		icon,
		iconWell = false,
		leading,
		value,
		trailing,
		href,
		onclick,
		chevron,
		strong = false,
		active = false,
		disabled = false,
		truncate = false,
		class: className = '',
		...restProps
	}: Props = $props();

	const element = $derived(href && !disabled ? 'a' : onclick ? 'button' : 'div');
	const interactive = $derived(element !== 'div' && !disabled);
	const showChevron = $derived(chevron ?? (interactive && !trailing));
</script>

<svelte:element
	this={element}
	href={element === 'a' ? href : undefined}
	type={element === 'button' ? 'button' : undefined}
	disabled={element === 'button' && disabled ? true : undefined}
	aria-current={active ? 'page' : undefined}
	aria-disabled={disabled ? 'true' : undefined}
	onclick={disabled ? undefined : onclick}
	class={cn(
		'text-ink flex w-full min-w-0 items-center gap-3 px-4 py-3 text-left text-[0.9375rem]',
		hint || iconWell || leading ? 'min-h-14' : 'min-h-12',
		interactive &&
			'hover:bg-wash/60 focus-visible:bg-wash/60 focus-visible:ring-ring cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset',
		active && 'bg-tint hover:bg-tint',
		disabled && 'opacity-50',
		className
	)}
	{...restProps}
>
	{#if leading}
		<span class="flex shrink-0 items-center">{@render leading()}</span>
	{:else if icon}
		{#if iconWell}
			<span class="bg-wash text-ink grid size-9 shrink-0 place-items-center rounded-full">
				<Icon {icon} size={17} />
			</span>
		{:else}
			<Icon {icon} size={19} class="text-muted-foreground shrink-0" />
		{/if}
	{/if}

	<span class="flex min-w-0 flex-1 flex-col gap-0.5">
		<span
			class={cn(
				'leading-snug',
				strong && 'font-semibold',
				truncate ? 'truncate' : 'break-words'
			)}
		>
			{title}
		</span>
		{#if hint}
			<span class={cn('text-muted-foreground text-sm leading-snug', truncate && 'truncate')}>
				{hint}
			</span>
		{/if}
	</span>

	{#if value !== undefined && value !== null && value !== ''}
		<span class="type-meta text-muted-foreground shrink-0 text-sm">{value}</span>
	{/if}
	{#if trailing}
		<span class="flex shrink-0 items-center">{@render trailing()}</span>
	{/if}
	{#if showChevron}
		<Icon icon={ChevronRight} size={16} class="text-muted-foreground shrink-0" />
	{/if}
</svelte:element>
