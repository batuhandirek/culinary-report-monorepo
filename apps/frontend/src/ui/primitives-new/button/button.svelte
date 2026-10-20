<script lang="ts" module>
	import { tv, type VariantProps } from 'tailwind-variants';

	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	import { cn, type WithElementRef } from '#ui/lib/utils.js';

	export const buttonVariants = tv({
		// The focus ring is the app-wide one (3px, `--ring` at half strength) and leaves the
		// border alone: on the stamp and the outline pill the ink frame *is* the shape.
		base: "focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap text-sm font-medium outline-none transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-100 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
		variants: {
			variant: {
				// The stamp: orange, a 2px ink frame and a hard ink offset that the press
				// sinks into. Kept for the one action a page exists for (buy, publish, send),
				// which is why it is the only button with a frame and a shadow.
				default:
					'bg-primary text-primary-foreground border-ink shadow-stamp rounded-lg border-2 font-semibold hover:bg-primary-lighter active:translate-x-0.5 active:translate-y-0.5 active:shadow-stamp-sm',
				destructive:
					'bg-destructive text-white rounded-full font-semibold hover:bg-destructive/90 active:opacity-85 focus-visible:ring-destructive/20',
				success:
					'bg-success text-white rounded-full font-semibold hover:bg-success/90 active:opacity-85 focus-visible:ring-success/20',
				outline:
					'border-ink bg-paper text-ink rounded-full border font-semibold hover:bg-sand active:opacity-85',
				// Ink pill: the strong neutral action beside a primary one (make an offer, follow).
				secondary: 'bg-ink text-sand rounded-full font-semibold hover:bg-ink/85 active:opacity-85',
				ghost: 'text-ink rounded-full hover:bg-ink/5 active:opacity-85',
				link: 'text-ink underline underline-offset-4 decoration-line hover:decoration-ink'
			},
			// Sizes set height and padding only; the shape belongs to the variant. The ones
			// under 44px reach it on a touch screen through an `::after` that extends past the
			// box (`pointer-coarse:after:-inset-*`): a bigger target, the same layout.
			size: {
				xs: "h-7 gap-1 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3.5 relative after:absolute after:inset-x-0 after:content-[''] pointer-coarse:after:-inset-y-2",
				sm: "h-9 gap-1.5 px-3.5 text-sm [&_svg:not([class*='size-'])]:size-4 relative after:absolute after:inset-x-0 after:content-[''] pointer-coarse:after:-inset-y-1",
				default: 'h-10 px-4 text-sm',
				lg: 'h-11 px-5 text-[0.9375rem]',
				xl: 'h-12 px-6 text-base',
				'icon-xs':
					"size-7 [&_svg:not([class*='size-'])]:size-3.5 relative after:absolute after:content-[''] pointer-coarse:after:-inset-2",
				'icon-sm':
					"size-9 [&_svg:not([class*='size-'])]:size-4 relative after:absolute after:content-[''] pointer-coarse:after:-inset-1",
				icon: 'size-10',
				'icon-lg': 'size-11'
			}
		},
		compoundVariants: [
			// An icon-only outline button is the round warm-white key from the header and
			// the photo overlay: hairline, not the ink frame.
			{
				variant: 'outline',
				size: ['icon-xs', 'icon-sm', 'icon', 'icon-lg'],
				class: 'border-line hover:border-ink/30'
			}
		],
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	});

	export type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
	export type ButtonSize = VariantProps<typeof buttonVariants>['size'];

	export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
		WithElementRef<HTMLAnchorAttributes> & {
			variant?: ButtonVariant;
			size?: ButtonSize;
		};
</script>

<script lang="ts">
	let {
		class: className,
		variant = 'default',
		size = 'default',
		ref = $bindable(null),
		href = undefined,
		type = 'button',
		disabled,
		children,
		...restProps
	}: ButtonProps = $props();
</script>

{#if href}
	<a
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size }), className)}
		href={disabled ? undefined : href}
		aria-disabled={disabled}
		role={disabled ? 'link' : undefined}
		tabindex={disabled ? -1 : undefined}
		{...restProps}>
		{@render children?.()}
	</a>
{:else}
	<button
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size }), className)}
		{type}
		{disabled}
		{...restProps}>
		{@render children?.()}
	</button>
{/if}
