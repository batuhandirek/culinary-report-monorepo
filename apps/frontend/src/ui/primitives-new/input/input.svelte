<script lang="ts">
	import type { HTMLInputAttributes, HTMLInputTypeAttribute } from 'svelte/elements';

	import { cn, type WithElementRef } from '#ui/lib/utils.js';

	type InputType = Exclude<HTMLInputTypeAttribute, 'file'>;

	type Props = WithElementRef<
		Omit<HTMLInputAttributes, 'type'> &
			({ type: 'file'; files?: FileList } | { type?: InputType; files?: undefined })
	>;

	let {
		ref = $bindable(null),
		value = $bindable(),
		type,
		files = $bindable(),
		class: className,
		'data-slot': dataSlot = 'input',
		...restProps
	}: Props = $props();
</script>

{#if type === 'file'}
	<input
		bind:this={ref}
		data-slot={dataSlot}
		class={cn(
			'selection:bg-primary dark:bg-input/30 selection:text-primary-foreground border-input ring-offset-background placeholder:text-faint flex h-(--field-height) w-full min-w-0 rounded-md border bg-paper px-3 pt-2 text-sm font-medium outline-none transition-[color,box-shadow,border-color] disabled:cursor-not-allowed disabled:opacity-50 md:pt-1.5',
			'focus-visible:border-ink focus-visible:ring-ring/50 focus-visible:ring-[3px]',
			'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
			className
		)}
		type="file"
		bind:files
		bind:value
		{...restProps} />
{:else}
	<input
		bind:this={ref}
		data-slot={dataSlot}
		class={cn(
			// One class per property, no `md:` twins: a `text-*` or `h-*` passed by a call site
			// wins at every breakpoint. The height steps down on desktop through the
			// `--field-height` token instead.
			'border-input bg-paper selection:bg-primary dark:bg-input/30 selection:text-primary-foreground ring-offset-background placeholder:text-faint flex h-(--field-height) w-full min-w-0 rounded-md border px-3.5 py-1 text-sm outline-none transition-[color,box-shadow,border-color] read-only:bg-wash/40 enabled:hover:border-ink/35 disabled:cursor-not-allowed disabled:opacity-50',
			'focus-visible:border-ink focus-visible:ring-ring/50 focus-visible:ring-[3px]',
			'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
			className
		)}
		{type}
		bind:value
		{...restProps} />
{/if}
