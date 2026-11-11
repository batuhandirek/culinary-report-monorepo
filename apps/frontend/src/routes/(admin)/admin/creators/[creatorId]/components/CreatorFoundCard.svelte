<script lang="ts">
	import type { AdminCreatorFindOutputDto } from 'client';

	import {
		FIND_GROUPS,
		findHref,
		findTip,
		findValue,
		PROFILE_FINDS,
		profileFindLabel,
		profileFindNote,
		shortDay
	} from './creator-text.js';

	import DetailCard from '#components/admin/detail/DetailCard.svelte';
	import Tooltip from '#ui/wrapped/Tooltip.svelte';

	// What found their posts (the most posts first, 15 at most): their own profile as a row with its
	// posts and last day, then the searches, hashtags, venue searches and blogs as chips, each with
	// its city, posts and last day on hover. The two most recent chips show their day.
	interface Props {
		finds: AdminCreatorFindOutputDto[];
	}

	let { finds }: Props = $props();

	const profiles = $derived(finds.filter((f) => PROFILE_FINDS.includes(f.kind)));
	const groups = $derived(
		FIND_GROUPS.map((g) => ({ ...g, finds: finds.filter((f) => g.kinds.includes(f.kind)) })).filter((g) => g.finds.length)
	);
	// The two latest of the chips carry their day
	const latest = $derived(
		new Set(
			finds
				.filter((f) => !PROFILE_FINDS.includes(f.kind))
				.sort((a, b) => +new Date(b.lastPostedAt) - +new Date(a.lastPostedAt))
				.slice(0, 2)
		)
	);
</script>

<DetailCard title="Found through" flush>
	{#snippet aside()}<span class="text-muted-foreground">posts</span>{/snippet}
	{#if !finds.length}
		<p class="text-muted-foreground m-0 px-3.5 pb-3 text-xs">None of their stored posts has a find on record.</p>
	{/if}
	{#if profiles.length}
		<table class="w-full border-collapse text-xs tabular-nums">
			<tbody>
				{#each profiles as find, i (i)}
					<tr>
						<td class="w-full max-w-0 truncate py-1 pr-3.5 pl-3.5">
							{#if findHref(find)}<a href={findHref(find)} class="text-beet">{profileFindLabel(find)}</a>{:else}{profileFindLabel(find)}{/if}
							<span class="text-muted-foreground">{profileFindNote(find)}</span>
						</td>
						<td class="py-1 pr-3.5 text-right">{find.posts}</td>
						<td class="text-muted-foreground py-1 pr-3.5 text-right whitespace-nowrap">{shortDay(find.lastPostedAt)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
	{#each groups as group, i (group.label)}
		<div class={['px-3.5 pt-2', i === groups.length - 1 ? 'pb-3' : 'pb-1', i === 0 && profiles.length && 'border-line/60 mt-1.5 border-t']}>
			<div class="eyebrow text-muted-foreground mb-1.5 text-[7.5px]">{group.label} · {group.finds.length}</div>
			<div class="flex flex-wrap gap-1">
				{#each group.finds as find, j (j)}
					<Tooltip text={findTip(find)}>
						<svelte:element
							this={findHref(find) ? 'a' : 'span'}
							href={findHref(find)}
							class="border-line text-ink inline-flex h-[22px] items-center gap-1 rounded-full border bg-white px-2 text-xs hover:no-underline">
							{findValue(find)}
							{#if latest.has(find)}<span class="text-faint text-[11px]">{shortDay(find.lastPostedAt)}</span>{/if}
						</svelte:element>
					</Tooltip>
				{/each}
			</div>
		</div>
	{/each}
</DetailCard>
