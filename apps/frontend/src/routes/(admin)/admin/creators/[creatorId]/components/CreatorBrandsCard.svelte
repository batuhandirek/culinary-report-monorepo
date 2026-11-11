<script lang="ts">
	import type { AdminCreatorOutputDto } from 'client';

	import { shortDay } from './creator-text.js';

	import DetailCard from '#components/admin/detail/DetailCard.svelte';
	import { compact } from '#lib/culinary.js';
	import Tooltip from '#ui/wrapped/Tooltip.svelte';

	// The brands their posts named, all time, the most posts first: posts, views, the last post's
	// day; their own account's brand marked. The first 12 of `count`.
	interface Props {
		brands: AdminCreatorOutputDto['brands'];
		count: number;
	}

	let { brands, count }: Props = $props();
</script>

<DetailCard title="Brands they named" note={count} flush>
	{#if brands.length}
		<table class="mb-1.5 w-full border-collapse text-xs tabular-nums">
			<tbody>
				{#each brands as brand (brand.id)}
					<tr>
						<td class="w-full max-w-0 truncate py-1 pr-3.5 pl-3.5">
							<a href={`/admin/brands/${brand.id}`} class="text-beet">{brand.name}</a>
							{#if brand.own}<span class="text-faint"> · their own</span>{/if}
						</td>
						<td class="py-1 pr-3.5 text-right">
							<Tooltip text={`${brand.posts} ${brand.posts === 1 ? 'post' : 'posts'}`}>{brand.posts}</Tooltip>
						</td>
						<td class="py-1 pr-3.5 text-right">
							<Tooltip text={`${brand.views.toLocaleString('en')} views`}>{compact(brand.views)}</Tooltip>
						</td>
						<td class="text-muted-foreground py-1 pr-3.5 text-right whitespace-nowrap">
							<Tooltip text="Their last post naming it">{shortDay(brand.lastPostedAt)}</Tooltip>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
		{#if count > brands.length}
			<p class="text-muted-foreground m-0 px-3.5 pb-2.5 text-xs">and {count - brands.length} more, in their posts</p>
		{/if}
	{:else}
		<p class="text-muted-foreground m-0 px-3.5 pb-3 text-xs">Their posts named no brand we know.</p>
	{/if}
</DetailCard>
