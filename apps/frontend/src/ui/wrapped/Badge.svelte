<script lang="ts">
	import { X } from '@lucide/svelte';
	import type { Component } from 'svelte';

	import type { HTMLAnchorAttributes } from 'svelte/elements';

	import Dot from '#ui/components/Dot.svelte';
	import Icon from '#ui/components/Icon.svelte';
	import { cn, type WithElementRef } from '#ui/lib/utils.js';
	import { Badge, type BadgeVariant } from '#ui/primitives-new/badge/index.js';
	import Spinner from '#ui/primitives-new/spinner/spinner.svelte';
	import type { PopConfirmProps } from '#ui/wrapped/PopConfirm.svelte';
	import PopConfirm from '#ui/wrapped/PopConfirm.svelte';

	interface Props {
		icon?: Component;
		close?: boolean;
		onClose?: () => void;
		iconClass?: string;
		children?: import('svelte').Snippet;
		dotted?: boolean;
		pill?: boolean;
		/**
		 * The prototype's pixel status chip — Press Start 2P caps on an outlined pill
		 * (Mesajlar screen: `İLANIN SÜRESİ DOLDU`, the date separators in the thread).
		 * Keeps whatever `variant` colour it is given; only the typography and the
		 * sticker outline change, so a status badge stays semantically coloured.
		 */
		pixel?: boolean;
		/**
		 * The prototype's outlined pill at chip scale (2px ink outline + 3px offset,
		 * semibold at `text-sm`) — the same object as the tab/nav chips, so an
		 * applied filter reads as a sibling of the row it was set from rather than as
		 * the old soft tinted tag. Pair with `variant="tint"` for a "this is set"
		 * ground; the fill states the state and the outline never changes.
		 *
		 * `close` moves to the *trailing* edge here: a chip you can take off is read
		 * label-first, and the X is the affordance you reach for after reading it.
		 */
		chip?: boolean;
		variant?: BadgeVariant;
		sm?: boolean;
		class?: string;
		loading?: boolean;
		popConfirm?: Pick<PopConfirmProps, 'confirmText' | 'cancelText' | 'title' | 'description'>;
		href?: string;
	}

	let {
		close = false,
		dotted = false,
		onClose = undefined,
		popConfirm = undefined,
		sm = false,
		children,
		class: className,
		loading,
		icon,
		pill,
		pixel = false,
		chip = false,
		...rest
	}: Props & WithElementRef<HTMLAnchorAttributes> = $props();

	function handleClose(e?: MouseEvent) {
		if (e) e.stopPropagation();
		onClose?.();
	}

	// Spelled out per variant: Tailwind only generates classes it can read in the source.
	const DOT_COLORS: Record<NonNullable<BadgeVariant>, string> = {
		default: 'bg-ink',
		primary: 'bg-primary-darker',
		secondary: 'bg-sand',
		success: 'bg-success',
		warning: 'bg-warning',
		destructive: 'bg-destructive',
		outline: 'bg-muted-foreground',
		quiet: 'bg-muted-foreground',
		tint: 'bg-ink'
	};
</script>

{#snippet closeButton(opts: { handleClose?: typeof handleClose } = {})}
	<button
		type="button"
		class={cn(
			// The glyph stays small; on a touch screen its hit area reaches 44px past it.
			'pointer-coarse:after:absolute pointer-coarse:after:-inset-[13px] relative shrink-0 cursor-pointer after:content-[""] focus:outline-none',
			chip
				? // Ink glyph on the chip's own ground, filling to ink on hover — the button
					// is the only interactive part of the chip, so it states that itself
					// instead of borrowing the brand fill the whole chip used to carry.
					'text-muted-foreground hover:text-ink hover:bg-ink/10 -mr-1 rounded-full p-0.5 transition-colors'
				: 'hover:bg-ink/10 -ml-0.5 rounded-sm p-0.5 text-current opacity-70 transition-[opacity,background-color] hover:opacity-100 focus-visible:opacity-100'
		)}
		onclick={opts?.handleClose}
		aria-label="Kaldır">
		<X class={chip ? 'h-3.5 w-3.5' : 'h-3 w-3'} />
	</button>
{/snippet}

{#snippet closeControl()}
	{#if close && onClose && !loading}
		{#if popConfirm}
			<PopConfirm
				onConfirm={() => {
					handleClose?.();
				}}
				{...popConfirm}>
				{@render closeButton()}
			</PopConfirm>
		{:else}
			{@render closeButton({ handleClose })}
		{/if}
	{/if}
{/snippet}

<Badge
	{...rest}
	class={cn(
		chip
			? // No `pop-press`: the chip itself is not pressable, only its close button is,
				// so a press animation on the pill would promise a tap target that is not there.
				'gap-1.5 rounded-full px-3 py-1 text-sm font-medium'
			: pixel
				? // Spelled out rather than reusing `eyebrow`: this chip runs a touch larger
					// than an eyebrow does, and a size utility layered over that one would be
					// settling the conflict on stylesheet order rather than on intent.
					'eyebrow rounded-sm px-2 py-1.5'
				: sm
					? 'px-2 h-5 text-xs rounded-sm'
					: 'rounded-sm px-2 py-0.5',
		!pixel && !chip && pill ? 'rounded-full' : '',
		className
	)}>
	{#if dotted}
		<Dot size={sm ? 5 : 6} color={DOT_COLORS[rest.variant ?? 'default']} class="mr-0.5" />
	{/if}
	{#if loading}
		<Spinner size={12} />
	{:else if icon && !close}
		<Icon {icon} size={12} />
	{/if}
	{#if !chip}
		{@render closeControl()}
	{/if}
	{@render children?.()}
	{#if chip}
		{@render closeControl()}
	{/if}
</Badge>
