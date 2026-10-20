<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import { cn } from "#ui/lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: DialogPrimitive.TitleProps = $props();
</script>

<!-- Y2K: the dialog heading is a page heading — extrabold, tight tracking, ink.
     `pr-7` keeps it clear of the absolutely-positioned close button. -->
<DialogPrimitive.Title
	bind:ref
	data-slot="dialog-title"
	class={cn(
		"text-ink pr-7 text-xl font-semibold leading-tight",
		className
	)}
	{...restProps}
/>
