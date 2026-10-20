<script lang="ts">
	import { cn } from "#ui/lib/utils.js";
	import { Popover as PopoverPrimitive } from "bits-ui";

	let {
		ref = $bindable(null),
		class: className,
		sideOffset = 4,
		align = "center",
		portalProps,
		// bits-ui defaults popovers to non-modal (`preventScroll: false`), and its
		// outside-interaction handling only *closes* the layer — the same pointer event
		// still reaches whatever is underneath, so dismissing a popover by tapping an ad
		// row also opened that ad. `preventScroll` puts `pointer-events: none` on the
		// body while the popover is open (the content itself opts back in), which is how
		// the menus/dialogs already behave. Pass `preventScroll={false}` at a call site
		// that genuinely wants the page to stay interactive underneath.
		preventScroll = true,
		...restProps
	}: PopoverPrimitive.ContentProps & {
		portalProps?: PopoverPrimitive.PortalProps;
	} = $props();
</script>

<PopoverPrimitive.Portal {...portalProps}>
	<PopoverPrimitive.Content
		bind:ref
		data-slot="popover-content"
		{sideOffset}
		{align}
		{preventScroll}
		class={cn(
			"bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--bits-popover-content-transform-origin) outline-hidden z-50 w-72 rounded-md border p-4 shadow-md",
			className
		)}
		{...restProps}
	/>
</PopoverPrimitive.Portal>
