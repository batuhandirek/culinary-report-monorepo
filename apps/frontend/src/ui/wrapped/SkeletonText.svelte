<script lang="ts">
	import { cn } from '#ui/lib/utils.js';
	import Skeleton from '#ui/primitives-new/skeleton/skeleton.svelte';

	interface Props {
		/** How many lines of copy this stands in for; the last one runs short. */
		lines?: number;
		class?: string;
	}

	let { lines = 3, class: className = '' }: Props = $props();

	const WIDTHS = ['w-full', 'w-11/12', 'w-4/5', 'w-full', 'w-3/4'];
</script>

<div class={cn('flex w-full flex-col gap-2', className)} role="status" aria-label="Yükleniyor">
	{#each Array(lines), i (i)}
		<Skeleton
			class={cn(
				'bg-wash h-3.5 rounded',
				lines > 1 && i === lines - 1 ? 'w-1/2' : WIDTHS[i % WIDTHS.length]
			)}
		/>
	{/each}
</div>
