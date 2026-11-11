<script lang="ts">
	import { CircleDashed, Minus, Scale, ThumbsDown, ThumbsUp, TriangleAlert } from '@lucide/svelte';
	import type { AdminDigestionStatementOutputDto } from 'client';
	import type { Component, Snippet } from 'svelte';

	import { quoteFound } from '#lib/digestion.js';
	import { amountLabel, aspectHref, aspectOf, foodPartsOf, KIND_LABELS, sideOf, themeSideOf, withoutPlace } from '#lib/statements.js';
	import { topicPageHref } from '#lib/topic-format.js';
	import Badge from '#ui/wrapped/Badge.svelte';

	// The claims agent A took from a post about one thing (a place it names, the city, nothing in
	// particular), as one card: its head, a line on how they count and a filter by sentiment, then a
	// row per claim in the order said. A row: the labeller's sentiment as its icon; the claim (said
	// without the place when it opens with its name) and its number, the source's own words under it
	// (flagged when they aren't in the text); its aspect (to Explore on that aspect, side, city and
	// month) and kind when it isn't an opinion; the food wordings, each to the topics it is linked
	// to, or to the Terms tab while it is linked to none. Each row is `#claim-<id>`: a claims
	// table's link lands on it and `selected` marks it.
	interface Props {
		statements: AdminDigestionStatementOutputDto[];
		/** The place they are about: a claim opening with its name is shown without it */
		place?: string;
		/** The post's texts, each quote checked against them */
		texts: (string | undefined)[];
		cityId: string;
		/** The post's month, `YYYY-MM`: where the aspect links open Explore */
		month: string;
		selected?: number;
		/** Left of the filter: how these claims count */
		note?: string;
		head: Snippet;
		actions?: Snippet;
	}

	let { statements, place, texts, cityId, month, selected, note, head, actions }: Props = $props();

	type Group = 'positive' | 'negative' | 'mixed' | 'neutral' | 'unread';
	const GROUPS: { key: Group; label: string; icon: Component; tone: string }[] = [
		{ key: 'positive', label: 'Positive', icon: ThumbsUp, tone: 'text-success' },
		{ key: 'negative', label: 'Negative', icon: ThumbsDown, tone: 'text-destructive' },
		{ key: 'mixed', label: 'Mixed', icon: Scale, tone: 'text-[hsl(30_85%_30%)]' },
		{ key: 'neutral', label: 'Neutral', icon: Minus, tone: 'text-muted-foreground' },
		{ key: 'unread', label: 'Not read', icon: CircleDashed, tone: 'text-faint' }
	];
	const LOOKS = Object.fromEntries(GROUPS.map((g) => [g.key, g])) as Record<Group, (typeof GROUPS)[number]>;
	// A claim the labeller hasn't read has no sentiment yet; one it read without one says nothing either way
	const groupOf = (s: AdminDigestionStatementOutputDto): Group =>
		!s.partsAt ? 'unread' : ((s.sentiment as Group | undefined) ?? 'neutral');

	let filter = $state<Group | 'all'>('all');
	const counts = $derived(
		GROUPS.map((g) => ({ ...g, n: statements.filter((s) => groupOf(s) === g.key).length })).filter((g) => g.n)
	);
	const rows = $derived(
		statements.map((s) => ({ s, short: place && s.text ? withoutPlace(s.text, place) : undefined }))
	);
	const shown = $derived(filter === 'all' ? rows : rows.filter((r) => groupOf(r.s) === filter));
	const trimmed = $derived(rows.some((r) => r.short));

	const termsHref = (wording: string) =>
		`/admin/trends?tab=terms&cityId=${encodeURIComponent(cityId)}&status=all&q=${encodeURIComponent(wording)}`;
</script>

<section class="bg-paper border-line min-w-0 overflow-hidden rounded-md border">
	<div class="flex min-h-10 flex-wrap items-center gap-x-2 gap-y-1 px-3.5 pt-2.5 pb-2 text-[13px] font-semibold">
		{@render head()}
		{#if actions}<span class="ml-auto flex items-center gap-1.5 font-normal">{@render actions()}</span>{/if}
	</div>

	{#if !statements.length}
		<p class="text-muted-foreground m-0 px-3.5 pb-3 text-xs">No claim about it.</p>
	{:else}
		{#if note || counts.length > 1}
			<div class="flex flex-wrap items-center justify-between gap-2 px-3.5 pb-2">
				<p class="text-muted-foreground m-0 text-xs">{note ?? ''}</p>
				{#if counts.length > 1}
					<div class="border-input inline-flex overflow-hidden rounded-lg border" role="group" aria-label="Filter claims by sentiment">
						<button type="button" class={['cursor-pointer px-2.5 py-[3px] text-xs font-medium', filter === 'all' ? 'bg-ink text-sand' : 'text-muted-foreground hover:text-ink']} aria-pressed={filter === 'all'} onclick={() => (filter = 'all')}>
							All {statements.length}
						</button>
						{#each counts as group (group.key)}
							<button type="button" class={['cursor-pointer px-2.5 py-[3px] text-xs font-medium', filter === group.key ? 'bg-ink text-sand' : 'text-muted-foreground hover:text-ink']} aria-pressed={filter === group.key} onclick={() => (filter = group.key)}>
								{group.label} {group.n}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		<div class="border-line overflow-x-auto border-t">
			<table class="w-full border-collapse text-[13px]">
				<thead>
					<tr class="text-muted-foreground bg-sand/50 text-left text-[11.5px] whitespace-nowrap">
						<th class="border-line w-7 border-b py-1.5 pr-0 pl-2.5 font-medium"><span class="sr-only">Sentiment</span></th>
						<th class="border-line border-b px-2.5 py-1.5 font-medium">
							Claim{#if trimmed}<span class="font-normal">&nbsp;· subject “{place}” hidden</span>{/if}
						</th>
						<th class="border-line w-[170px] border-b px-2.5 py-1.5 font-medium">Aspect</th>
						<th class="border-line w-[150px] border-b px-2.5 py-1.5 font-medium">Linked to</th>
					</tr>
				</thead>
				<tbody>
					{#each shown as { s, short } (s.id)}
						{@const look = LOOKS[groupOf(s)]}
						{@const aspect = aspectOf(s)}
						{@const foods = foodPartsOf(s)}
						{@const found = s.quote ? quoteFound(s.quote, texts) : true}
						<tr
							id={`claim-${s.id}`}
							class={['border-line/60 scroll-mt-28 border-b align-top last:border-b-0', s.id === selected ? 'bg-tint outline-ink -outline-offset-2 outline-2' : 'hover:bg-sand/50']}>
							<td class="py-1.5 pr-0 pl-2.5">
								<span class={['mt-px inline-flex', look.tone]} title={look.label === 'Not read' ? 'Not labelled yet' : look.label}>
									<look.icon class="size-3.5" aria-label={look.label} />
								</span>
							</td>
							<!-- The rest of the row's width, its text cut to one line; on a phone wide enough to read, the table scrolling sideways -->
							<td class="w-full max-w-px min-w-56 px-2.5 py-1.5">
								<div class="flex min-w-0 items-center gap-1.5">
									{#if s.text}
										<span class="truncate" title={s.text}>{short ?? s.text}</span>
									{:else}
										<span class="text-muted-foreground italic">named a dish</span>
									{/if}
									{#if s.amount != null && s.unit}
										<Badge pill variant="default" class="h-[18px] px-1.5 tabular-nums">{amountLabel(s.amount, s.unit)}</Badge>
									{/if}
								</div>
								{#if s.quote}
									<div class="text-muted-foreground flex min-w-0 items-center gap-1 text-[11.5px] italic">
										{#if !found}
											<span class="text-[hsl(30_85%_30%)] shrink-0" title="Not found in the post's text"><TriangleAlert class="size-3" aria-label="Not found in the post's text" /></span>
										{/if}
										<span class="truncate" title={s.quote}>“{s.quote}”</span>
									</div>
								{/if}
							</td>
							<td class="px-2.5 py-1.5 whitespace-nowrap">
								{#if !s.partsAt}
									<span class="text-faint text-xs">Not labelled yet</span>
								{:else if aspect}
									<a
										class="text-ink decoration-line hover:decoration-ink text-xs underline underline-offset-4"
										href={aspectHref(aspect.key, themeSideOf(sideOf(s) ?? 'noted'), { cityId, month })}
										title="This aspect's claims that month, in Explore">{aspect.root !== aspect.key ? `${aspect.rootLabel} › ${aspect.label}` : aspect.label}</a>
								{:else}
									<span class="text-muted-foreground text-xs">No aspect</span>
								{/if}
								{#if s.kind && s.kind !== 'opinion'}
									<div class="text-muted-foreground text-[11.5px]">{KIND_LABELS[s.kind] ?? s.kind}</div>
								{/if}
							</td>
							<td class="px-2.5 py-1.5 text-xs">
								{#each foods as food (food.key)}
									<div class="whitespace-nowrap">
										{#if !food.topics.length}
											<span>{food.name}</span>
											<a class="text-[hsl(30_85%_30%)] underline-offset-2 hover:underline" href={termsHref(food.name)} title="Not linked to a topic yet: decide it on the Terms tab">· link</a>
										{:else}
											{#if !food.exact}<span class="text-muted-foreground" title="The wording, narrower than its topic">{food.name} →</span>{/if}
											{#each food.topics as topic, i (topic.key)}{#if i}<span class="text-muted-foreground">, </span>{/if}<a
													class="text-beet underline-offset-2 hover:underline"
													href={topicPageHref(topic.key, topic.kind)}
													title={food.exact ? `“${food.name}”` : undefined}>{topic.label}</a
												>{/each}
										{/if}
									</div>
								{/each}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>
