<script lang="ts" module>
	import { tv, type VariantProps } from 'tailwind-variants';

	export const badgeVariants = tv({
		base: 'focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-semibold transition-[color,box-shadow] focus-visible:ring-[3px] [&>svg]:pointer-events-none [&>svg]:size-3',
		variants: {
			variant: {
				default:
					'bg-primary text-primary-foreground [a&]:hover:bg-primary-lighter border-transparent',
				primary: 'bg-primary/10 text-primary-darker [a&]:hover:bg-primary/20 border-transparent',
				secondary:
					'bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90 border-transparent',
				success: 'bg-success/10 text-success [a&]:hover:bg-success/20 border-transparent',
				warning:
					'bg-warning/15 text-[hsl(30_85%_30%)] [a&]:hover:bg-warning/25 border-transparent',
				destructive:
					'bg-destructive/10 text-destructive [a&]:hover:bg-destructive/20 border-transparent focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
				outline: 'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
				// A state that asks nothing of the reader ("yanıt bekleniyor"): muted ink on a
				// quiet well, where `secondary`'s ink pill would shout.
				quiet: 'bg-wash text-muted-foreground [a&]:hover:text-ink border-transparent',
				// The prototype's warm chip ground (#FFE9C7): ink label on tint, not a
				// tinted label on a tinted ground. Meant for the `chip` treatment in
				// `#ui/wrapped/Badge.svelte`, where the ink outline carries the shape and
				// the ground only has to say "this is set".
				tint: 'bg-tint text-ink [a&]:hover:bg-wash border-transparent'
			}
		},
		defaultVariants: {
			variant: 'default'
		}
	});

	export type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];
</script>

<script lang="ts">
	import type { HTMLAnchorAttributes } from 'svelte/elements';

	import { cn, type WithElementRef } from '#ui/lib/utils.js';

	let {
		ref = $bindable(null),
		href,
		class: className,
		variant = 'default',
		children,
		...restProps
	}: WithElementRef<HTMLAnchorAttributes> & {
		variant?: BadgeVariant;
	} = $props();
</script>

<svelte:element
	this={href ? 'a' : 'span'}
	bind:this={ref}
	data-slot="badge"
	{href}
	class={cn(badgeVariants({ variant }), className)}
	{...restProps}>
	{@render children?.()}
</svelte:element>
