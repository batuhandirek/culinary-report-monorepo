<script lang="ts">
	import type { AdminCreatorRowOutputDto } from 'client';

	import { PLATFORM_LABELS } from '#lib/culinary.js';

	// A creator in the list: the name, then each of their accounts (a venue's own says whose).
	interface Props {
		row: AdminCreatorRowOutputDto;
	}

	let { row }: Props = $props();

	const accounts = $derived(
		row.accounts
			.map((a) => `${PLATFORM_LABELS[a.platform]} @${a.handle}${a.brand ? ` (${a.brand.name}'s own)` : ''}`)
			.join(' · ')
	);
</script>

<a href={`/admin/creators/${row.id}`} class="flex min-w-0 flex-col py-0.5 leading-tight">
	<span class="max-w-[22rem] truncate font-medium hover:underline" title={row.name}>{row.name}</span>
	<span class="text-muted-foreground max-w-[22rem] truncate text-xs" title={accounts}>{accounts}</span>
</a>
