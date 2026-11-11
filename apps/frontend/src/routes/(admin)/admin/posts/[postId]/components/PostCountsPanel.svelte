<script lang="ts">
	import type { AdminSocialPostOutputDto } from 'client';

	import { onDay } from '#components/admin/admin-format.js';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { compact } from '#lib/culinary.js';

	// Every read of the post's counts, oldest first, each with how long after posting it was; the one
	// at seven days is kept as the post's counts (`#counts`, the Views hint links here).
	interface Props {
		post: AdminSocialPostOutputDto;
	}

	let { post }: Props = $props();

	const afterPosting = (date: Date | string) => {
		const days = Math.floor((new Date(date).getTime() - new Date(post.postedAt).getTime()) / 86_400_000);
		return days < 1 ? 'the day it was posted' : `${days} day${days === 1 ? '' : 's'} after posting`;
	};
	const isKept = (snapshot: { at: Date | string }) =>
		!!post.countsFinalAt && new Date(snapshot.at).getTime() === new Date(post.countsFinalAt).getTime();
</script>

<div id="counts" class="scroll-mt-28">
	<AdminPanel title="Counts over time" note="Every read; the one at seven days is kept">
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="text-muted-foreground text-left text-xs">
						<th class="py-1 font-medium">Read</th>
						<th class="px-2 py-1 text-right font-medium">Views</th>
						<th class="px-2 py-1 text-right font-medium">Likes</th>
						<th class="px-2 py-1 text-right font-medium">Comments</th>
						<th class="px-2 py-1 text-right font-medium">Shares</th>
					</tr>
				</thead>
				<tbody class="divide-line divide-y">
					{#each post.snapshots as snapshot (snapshot.id)}
						<tr>
							<td class="py-2 pr-2">
								<span class="block whitespace-nowrap">{onDay(snapshot.at)}</span>
								<span class="text-muted-foreground block text-xs">
									{afterPosting(snapshot.at)}{isKept(snapshot) ? ' · kept' : ''}
								</span>
							</td>
							<td class="px-2 py-2 text-right tabular-nums">{compact(snapshot.views)}</td>
							<td class="px-2 py-2 text-right tabular-nums">{compact(snapshot.likes)}</td>
							<td class="px-2 py-2 text-right tabular-nums">{compact(snapshot.comments)}</td>
							<td class="px-2 py-2 text-right tabular-nums">{compact(snapshot.shares)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</AdminPanel>
</div>
