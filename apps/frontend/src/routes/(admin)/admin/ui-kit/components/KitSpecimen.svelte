<script lang="ts">
	import type { Snippet } from 'svelte';

	import { cn } from '#ui/lib/utils.js';

	interface Props {
		/** The component or state on show, e.g. `Button · variants`. */
		label: string;
		/** Where to import it from, or when to reach for it. */
		note?: string;
		/** The ground the specimen sits on: consumer pages are sand, cards and admin are paper. */
		ground?: 'paper' | 'sand';
		/** Take both columns of the section grid. */
		wide?: boolean;
		/** Lay the examples out as a full-width column instead of a wrapping row. */
		stack?: boolean;
		class?: string;
		children: Snippet;
	}

	let {
		label,
		note,
		ground = 'sand',
		wide = false,
		stack = false,
		class: className = '',
		children
	}: Props = $props();
</script>

<div
	class={[
		'border-line flex min-w-0 flex-col overflow-hidden rounded-md border',
		wide ? 'xl:col-span-2' : ''
	]}>
	<div class="border-line bg-paper flex flex-col gap-0.5 border-b px-4 py-2.5">
		<span class="eyebrow text-beet">{label}</span>
		{#if note}
			<span class="text-muted-foreground text-xs">{note}</span>
		{/if}
	</div>
	<div
		class={cn(
			'flex min-w-0 flex-1 gap-3 p-4',
			// A `flex-col` passed by a section is the same request as `stack`.
			stack || /(^|\s)flex-col(\s|$)/.test(className)
				? 'flex-col'
				: 'flex-wrap content-start items-center',
			ground === 'sand' ? 'bg-sand checker' : 'bg-paper',
			className
		)}>
		{@render children()}
	</div>
</div>
