<script lang="ts">
	import { ChevronDown, MapPin, Store } from '@lucide/svelte';
	import type { AdminBrandOutputDto } from 'client';

	import { goto } from '$app/navigation';
	import * as DropdownMenu from '#ui/primitives-new/dropdown-menu/index.js';

	// A chain's header key on its brand page and its branches' pages: "8 places", opening the brand
	// and every open place (the one shown too, closed or not), most reviewed first, a pick going
	// to that place's page. `current` is the place shown (none on the brand page).
	interface Props {
		brandId: string;
		brandName: string;
		/** Its places in all; the list may still be loading */
		count: number;
		/** Its places; null while loading */
		branches: AdminBrandOutputDto['branches'] | null;
		current?: string;
	}

	let { brandId, brandName, count, branches, current }: Props = $props();

	const places = $derived(
		(branches ?? [])
			.filter((b) => !b.closed || b.id === current)
			.sort((a, b) => (b.reviewsCount ?? -1) - (a.reviewsCount ?? -1))
	);
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger
		class="border-line bg-paper text-ink inline-flex h-[30px] cursor-pointer items-center gap-1.5 rounded-md border px-[9px] text-xs font-medium hover:bg-white">
		<MapPin class="size-3.5" strokeWidth={1.8} />{count} places
		<ChevronDown class="size-[13px]" strokeWidth={1.8} />
	</DropdownMenu.Trigger>
	<DropdownMenu.Content class="w-72" side="bottom" align="end">
		<DropdownMenu.Item disabled={!current} onclick={() => goto(`/admin/brands/${brandId}`)}>
			<Store class="size-3.5" /><span class="font-medium">{brandName}</span>
			<span class="text-faint ml-auto text-xs">the brand</span>
		</DropdownMenu.Item>
		<DropdownMenu.Separator />
		{#if !branches}
			<DropdownMenu.Label class="text-muted-foreground font-normal">Loading its places…</DropdownMenu.Label>
		{/if}
		{#each places as b (b.id)}
			<DropdownMenu.Item disabled={b.id === current} onclick={() => goto(`/admin/venues/${b.id}`)}>
				<span class="min-w-0 flex-1 truncate">{b.street ?? b.name}{b.closed ? ' (closed)' : ''}</span>
				<span class="text-faint shrink-0 text-xs">{b.district ?? b.city.name}</span>
			</DropdownMenu.Item>
		{/each}
	</DropdownMenu.Content>
</DropdownMenu.Root>
