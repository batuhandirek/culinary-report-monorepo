<script lang="ts">
	import { cn } from '#ui/lib/utils.js';
	import Skeleton from '#ui/primitives-new/skeleton/skeleton.svelte';

	/**
	 * The loading twin of a photo card (`ListingCard`): the same paper card, photo well
	 * and three text bars, so the grid does not move when the real cards arrive. Renders
	 * `count` cards with no wrapper — drop it inside the grid the loaded list uses.
	 */
	interface Props {
		count?: number;
		/** Tailwind aspect class of the photo well. */
		aspect?: string;
		class?: string;
	}

	let { count = 1, aspect = 'aspect-[4/5]', class: className = '' }: Props = $props();
</script>

{#each Array(count), i (i)}
	<div
		class={cn(
			'bg-paper border-line flex min-w-0 flex-col overflow-hidden rounded-md border',
			className
		)}
		aria-hidden="true"
	>
		<Skeleton class={cn('bg-wash w-full rounded-none', aspect)} />
		<!-- Line for line the body of `ListingCard`: category label, a two-line title,
		     the price and the meta note. Change one, change the other. -->
		<div class="flex flex-col px-2.5 pb-2.5 pt-2">
			<div class="flex h-[0.8rem] items-center">
				<Skeleton class="bg-wash h-2 w-1/3 rounded-sm" />
			</div>
			<div class="mt-1 flex h-9 flex-col justify-center gap-1.5">
				<Skeleton class="bg-wash h-3 w-11/12 rounded-sm" />
				<Skeleton class="bg-wash h-3 w-3/5 rounded-sm" />
			</div>
			<div class="mt-1 flex h-5 items-center">
				<Skeleton class="bg-wash h-4 w-2/5 rounded-sm" />
			</div>
			<div class="mt-0.5 flex h-4 items-center">
				<Skeleton class="bg-wash h-2.5 w-1/2 rounded-sm" />
			</div>
		</div>
	</div>
{/each}
