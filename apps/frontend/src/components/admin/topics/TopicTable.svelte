<script lang="ts">
	import type { AdminTopicInsightRowOutputDto } from 'client';

	import { kindLabel } from '#lib/food-topic-kinds.js';
	import { change, points, tone, topicHref } from '#lib/topic-format.js';

	import SearchSpark from './SearchSpark.svelte';

	// Topics side by side: supply (venues tagged), buzz (the month's posts by others and their
	// share) and demand (Google searches, a line per topic on its own axis). Each row opens the topic
	interface Props {
		rows: AdminTopicInsightRowOutputDto[];
		months: string[];
		/** Labels of topics not in `rows`, for "in …" */
		labelOf: (key: string) => string;
	}

	let { rows, months, labelOf }: Props = $props();
</script>

<div class="overflow-x-auto">
	<table class="w-full text-sm">
		<thead class="text-muted-foreground text-left text-xs">
			<tr>
				<th class="py-1.5 pr-3 font-normal">Topic</th>
				<th class="py-1.5 pr-3 text-right font-normal">Venues</th>
				<th class="py-1.5 pr-3 text-right font-normal">Posts</th>
				<th class="py-1.5 pr-3 text-right font-normal">Share of posts</th>
				<th class="py-1.5 pr-3 font-normal">Google searches, 12 months</th>
				<th class="py-1.5 text-right font-normal">vs last month</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.key)}
				<tr class="border-t">
					<td class="py-2 pr-3">
						<a class="font-medium" href={topicHref(row.key)}>{row.label}</a>
						<div class="text-muted-foreground text-xs">
							{kindLabel(row.kind)}{#if row.parentKey}&nbsp;· in {labelOf(row.parentKey)}{/if}{#if row.children}&nbsp;· {row.children} under it{/if}
						</div>
					</td>
					<td class="py-2 pr-3 text-right tabular-nums">
						{row.venues}
						{#if row.primaryVenues && row.primaryVenues !== row.venues}
							<div class="text-muted-foreground text-xs">{row.primaryVenues} mainly</div>
						{/if}
					</td>
					<td class="py-2 pr-3 text-right tabular-nums">{row.posts}</td>
					<td class="py-2 pr-3 text-right tabular-nums">
						{row.share === null ? '—' : `${row.share} %`}
						<div class="text-xs {tone(row.shareChange, 1)}">{points(row.shareChange)}</div>
					</td>
					<td class="py-2 pr-3"><SearchSpark values={row.searches} {months} label={row.label} /></td>
					<td class="py-2 text-right tabular-nums {tone(row.searchChange, 0.05)}">{change(row.searchChange)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
