<script lang="ts">
	import type { Component, Snippet } from 'svelte';

	import type { HTMLAttributes } from 'svelte/elements';

	import ButtonBody from './ButtonBody.svelte';

	import { cn, type WithElementRef } from '#ui/lib/utils.js';
	import { type ButtonSize, type ButtonVariant, buttonVariants } from '#ui/primitives-new/button/index.js';

	/**
	 * A button's face on a `<div>`. It exists for one place: the inside of a trigger —
	 * `Popover.Trigger`, `DropdownMenu.Trigger`, a `ResponsivePopover`/`ResponsiveModal`
	 * `trigger` snippet — which already renders the real `<button>`, so a `Button` there
	 * would nest one button in another. Anywhere else, use `Button`.
	 *
	 * It has no behaviour of its own: `disabled` only paints the state (`aria-disabled`),
	 * the trigger around it has to be disabled too.
	 */
	export type ButtonishProps = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		variant?: ButtonVariant;
		size?: ButtonSize;
		icon?: Component;
		suffixIcon?: Component;
		loading?: boolean;
		iconClass?: string;
		disabled?: boolean;
		children?: Snippet;
	};

	let {
		class: className,
		variant = 'default',
		size = 'default',
		ref = $bindable(null),
		icon = undefined,
		suffixIcon = undefined,
		loading = undefined,
		iconClass = '',
		disabled = false,
		children,
		...rest
	}: ButtonishProps = $props();

	let isOnlyIcon = $derived((size ?? 'default').startsWith('icon'));
	let isDisabled = $derived(disabled || loading);
</script>

<div
	bind:this={ref}
	data-slot="button"
	class={cn(buttonVariants({ variant, size }), loading && 'relative', className)}
	aria-disabled={isDisabled || undefined}
	aria-busy={loading || undefined}
	{...rest}>
	<ButtonBody {icon} {suffixIcon} loading={!!loading} {iconClass} iconOnly={isOnlyIcon}>
		{@render children?.()}
	</ButtonBody>
</div>
