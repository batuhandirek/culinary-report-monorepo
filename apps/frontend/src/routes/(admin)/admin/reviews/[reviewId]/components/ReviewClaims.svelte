<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import {
		amountLabel,
		aspectHref,
		aspectOf,
		foodPartsOf,
		foodsOf,
		KIND_ICONS,
		KIND_LABELS,
		linkTopicOf,
		sentimentLook,
		sideOf,
		type Statement,
		themeSideOf
	} from '#lib/statements.js';
	import { topicHref } from '#lib/topic-format.js';
	import { cn } from '#ui/lib/utils.js';

	// Every claim a review made, in the order it said them, each on a row faintly tinted by its
	// sentiment with its dot: the claim in full, the reviewer's own words under it, then its kind
	// when it is news, its aspect (to the aspect's claims that month in Explore) and its food
	// wordings (each to its topic once decided), its number at the end. Each row is `#claim-<id>`,
	// so a link with that hash (the claims table's row) lands on it, and `selected` outlines it. The
	// foods the review only listed, which no claim names, close the list.
	interface Props {
		statements: Statement[];
		/** The claim a link came for: outlined (the browser scrolls to it by the hash) */
		selected?: number;
		/** The review's city and month: where the aspect links open */
		cityId?: string;
		month?: string;
	}

	let { statements, selected, cityId, month }: Props = $props();

	const claims = $derived(statements.filter((s) => s.text));
	// The page renders after the browser looked for the hash on a fresh load: land on the claim here
	afterNavigate(() => {
		if (selected) document.getElementById(`claim-${selected}`)?.scrollIntoView({ block: 'center' });
	});
	const listedOnly = $derived(foodsOf(statements).filter((food) => food.listedOnly));
</script>

{#if !claims.length && !listedOnly.length}
	<p class="text-muted-foreground m-0 text-sm">No claim yet: agent A reads a written review once the pipeline gets to it.</p>
{:else}
	<ul class="m-0 flex list-none flex-col gap-1.5 p-0">
		{#each claims as claim (claim.id)}
			{@const look = sentimentLook(claim.sentiment)}
			{@const aspect = aspectOf(claim)}
			{@const foods = foodPartsOf(claim)}
			{@const KindIcon = claim.kind ? KIND_ICONS[claim.kind] : undefined}
			<li
				id={`claim-${claim.id}`}
				class={cn(
					'border-line flex scroll-mt-28 items-start gap-3 rounded-md border px-3 py-2.5 text-sm',
					look.tint || 'bg-paper',
					claim.id === selected && 'ring-ink ring-2 ring-offset-1'
				)}>
				<span class={['mt-1.5 block size-2.5 shrink-0 rounded-full', look.dot]} title={look.label}><span class="sr-only">{look.label}</span></span>
				<div class="flex min-w-0 flex-1 flex-col gap-1">
					<p class="m-0">{claim.text}</p>
					{#if claim.quote}<p class="text-muted-foreground m-0 text-xs italic">“{claim.quote}”</p>{/if}
					{#if KindIcon || aspect || foods.length}
						<div class="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
							{#if KindIcon}
								<span class="text-beet inline-flex items-center gap-1"><KindIcon class="size-3.5" aria-hidden="true" />{KIND_LABELS[claim.kind!] ?? claim.kind}</span>
							{/if}
							{#if aspect}
								<a
									class="text-ink decoration-line hover:decoration-ink underline underline-offset-4"
									href={aspectHref(aspect.key, themeSideOf(sideOf(claim) ?? 'noted'), { cityId, month })}
									title="This aspect's claims that month">{aspect.root !== aspect.key ? `${aspect.rootLabel} › ${aspect.label}` : aspect.label}</a>
							{/if}
							{#each foods as food (food.key)}
								{@const topic = linkTopicOf(food)}
								{#if topic}
									<a class="hover:text-ink underline-offset-4 hover:underline" href={topicHref(topic.key)} title={topic.label}>{food.name}</a>
								{:else}
									<span title="Not linked to a topic yet">{food.name}</span>
								{/if}
							{/each}
						</div>
					{/if}
				</div>
				{#if claim.amount != null && claim.unit}
					<span class="bg-wash text-ink shrink-0 rounded px-1.5 text-xs font-medium tabular-nums">{amountLabel(claim.amount, claim.unit)}</span>
				{/if}
			</li>
		{/each}
	</ul>
	{#if listedOnly.length}
		<p class="text-muted-foreground m-0 mt-3 text-xs">
			Also listed:
			{#each listedOnly as food, i (food.key)}
				{@const topic = linkTopicOf(food)}
				{#if topic}<a class="hover:text-ink underline-offset-4 hover:underline" href={topicHref(topic.key)}>{food.name}</a>{:else}{food.name}{/if}{i < listedOnly.length - 1 ? ', ' : ''}
			{/each}
		</p>
	{/if}
{/if}
