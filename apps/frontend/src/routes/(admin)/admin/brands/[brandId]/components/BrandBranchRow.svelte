<script lang="ts">
	import type { AdminBrandBranchOutputDto } from 'client';
	import type { Snippet } from 'svelte';

	import VenueFavicon from '#components/admin/venues/VenueFavicon.svelte';
	import { branchLine } from '#lib/brands.js';
	import Badge from '#ui/wrapped/Badge.svelte';

	// One branch (or possible branch) of a brand: name, address, Google and social figures.
	interface Props {
		branch: AdminBrandBranchOutputDto;
		leading?: Snippet;
		trailing?: Snippet;
	}

	let { branch, leading, trailing }: Props = $props();
</script>

<li class="flex items-center gap-3 py-2">
	{@render leading?.()}
	<VenueFavicon favicon={branch.favicon} />
	<a href={`/admin/venues/${branch.id}`} class="min-w-0 flex-1 hover:underline">
		<span class="flex items-center gap-2">
			<span class="truncate font-medium">{branch.name}</span>
			{#if branch.closed}<Badge pill variant="destructive">Closed</Badge>{/if}
		</span>
		<span class="text-muted-foreground block truncate text-xs"
			>{branchLine(branch) || branch.category || '—'}</span>
	</a>
	<span class="text-muted-foreground hidden shrink-0 text-right text-xs tabular-nums sm:block">
		{branch.rating ? `${branch.rating.toFixed(1)} ★ · ` : ''}{(branch.reviewsCount ?? 0).toLocaleString('en')} reviews<br />
		{branch.mentions} {branch.mentions === 1 ? 'mention' : 'mentions'}
	</span>
	{@render trailing?.()}
</li>
