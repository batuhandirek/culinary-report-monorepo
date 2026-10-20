<script lang="ts">
	import type { AdminBrandRowOutputDto } from 'client';

	import VenueFavicon from '#components/admin/venues/VenueFavicon.svelte';

	// A brand in the list: its icon and name, then what it is and where (a chain: how many places).
	interface Props {
		row: AdminBrandRowOutputDto;
	}

	let { row }: Props = $props();

	const where = $derived(
		row.branches > 1
			? `${row.branches} places${row.districts.length ? ` · ${row.districts.slice(0, 2).join(', ')}${row.districts.length > 2 ? '…' : ''}` : ''}`
			: (row.venue?.district ?? '')
	);
	const what = $derived(row.venue?.category ?? '');
</script>

<a href={`/admin/brands/${row.id}`} class="flex min-w-0 items-center gap-2.5 py-0.5">
	<span class="flex size-6 shrink-0 items-center justify-center">
		{#if row.venue?.favicon}<VenueFavicon favicon={row.venue.favicon} />{/if}
	</span>
	<span class="flex min-w-0 flex-col leading-tight">
		<span class="max-w-[22rem] truncate font-medium hover:underline" title={row.name}>{row.name}</span>
		<span class="text-muted-foreground max-w-[22rem] truncate text-xs">
			{[what, where].filter(Boolean).join(' · ')}
		</span>
	</span>
</a>
