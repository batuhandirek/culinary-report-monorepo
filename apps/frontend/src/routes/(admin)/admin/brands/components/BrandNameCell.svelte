<script lang="ts">
	import type { AdminBrandRowOutputDto } from 'client';

	import VenueFavicon from '#components/admin/venues/VenueFavicon.svelte';

	// A brand in the list: its icon and name, then what it is (its food topics; Google's category on
	// hover) and where (a chain: how many places). The cell is the row's link, so no topic link inside.
	interface Props {
		row: AdminBrandRowOutputDto;
	}

	let { row }: Props = $props();

	const where = $derived(
		row.branches > 1
			? `${row.branches} places${row.districts.length ? ` · ${row.districts.slice(0, 2).join(', ')}${row.districts.length > 2 ? '…' : ''}` : ''}`
			: (row.districts[0] ?? '')
	);
	// What it is: its branches' food topics, else Google's category until those are decided
	const what = $derived(row.topics?.length ? row.topics.map((t) => t.label).join(', ') : (row.category ?? ''));
</script>

<a href={`/admin/brands/${row.id}`} class="flex min-w-0 items-center gap-2.5 py-0.5">
	<span class="flex size-6 shrink-0 items-center justify-center">
		{#if row.favicon}<VenueFavicon favicon={row.favicon} />{/if}
	</span>
	<span class="flex min-w-0 flex-col leading-tight">
		<span class="max-w-[22rem] truncate font-medium hover:underline" title={row.name}>{row.name}</span>
		<span class="text-muted-foreground max-w-[22rem] truncate text-xs" title={row.category ? `Google: ${row.category}` : undefined}>
			{[what, where].filter(Boolean).join(' · ')}
		</span>
	</span>
</a>
