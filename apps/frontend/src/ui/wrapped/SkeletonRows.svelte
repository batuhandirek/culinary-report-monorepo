<script lang="ts">
	import { cn } from '#ui/lib/utils.js';
	import Skeleton from '#ui/primitives-new/skeleton/skeleton.svelte';

	interface Props {
		count?: number;
		/** What leads each row: nothing, a round avatar or icon well, or a square photo. */
		leading?: 'none' | 'avatar' | 'thumb';
		/** Text lines per row. A third line is drawn as a pill, where a status badge sits. */
		lines?: 1 | 2 | 3;
		/** A short bar at the far end, where a price, a count or a chevron sits. */
		trailing?: boolean;
		/** The paper panel with hairline dividers that the loaded list uses. */
		boxed?: boolean;
		class?: string;
	}

	let {
		count = 3,
		leading = 'none',
		lines = 2,
		trailing = false,
		boxed = true,
		class: className = ''
	}: Props = $props();

	// Rows never end on the same width, or the block reads as a table rather than as text.
	const TITLE = ['w-2/3', 'w-1/2', 'w-3/5', 'w-3/4'];
	const HINT = ['w-1/3', 'w-2/5', 'w-1/4', 'w-1/3'];
</script>

<div
	class={cn(
		'flex w-full flex-col',
		boxed
			? 'bg-paper border-line divide-line divide-y overflow-hidden rounded-md border'
			: 'gap-1',
		className
	)}
	role="status"
	aria-label="Yükleniyor"
>
	{#each Array(count), i (i)}
		<div
			class={cn(
				'flex items-center',
				leading === 'thumb' ? 'gap-4 py-3.5' : 'min-h-14 gap-3 py-3',
				boxed ? 'px-4' : ''
			)}
		>
			{#if leading === 'avatar'}
				<Skeleton class="bg-wash size-9 shrink-0 rounded-full" />
			{:else if leading === 'thumb'}
				<Skeleton class="bg-wash size-16 shrink-0 rounded-lg" />
			{/if}
			<div class="flex min-w-0 flex-1 flex-col gap-2">
				<Skeleton class={cn('bg-wash h-4 rounded', TITLE[i % TITLE.length])} />
				{#if lines >= 2}
					<Skeleton class={cn('bg-wash h-3 rounded', HINT[i % HINT.length])} />
				{/if}
				{#if lines >= 3}
					<Skeleton class="bg-wash h-5 w-24 rounded-full" />
				{/if}
			</div>
			{#if trailing}
				<Skeleton class="bg-wash h-4 w-12 shrink-0 rounded" />
			{/if}
		</div>
	{/each}
</div>
