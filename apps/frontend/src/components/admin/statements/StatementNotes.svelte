<script lang="ts">
	import {
		amountLabel,
		aspectHref,
		aspectOf,
		foodPartsOf,
		foodsOf,
		linkTopicOf,
		sideOf,
		type Statement,
		type StatementSide,
		themeSideOf
	} from '#lib/statements.js';
	import { topicHref } from '#lib/topic-format.js';

	// Every claim a review or a post's mention made: its praise, its complaints, the facts it noted
	// ("fries for 10 euros"), the changes it noticed, then what agent B has not read yet. Each with
	// the aspect it is filed under (a link to the theme's page for the source's city and month),
	// its food wordings as the source spelled them (each a link to its topic's page once the wording
	// is decided) and the number it states; then the foods it listed that no claim names.
	interface Props {
		statements: Statement[] | undefined;
		/** The source's city and month (YYYY-MM): where the theme links open */
		cityId?: string;
		month?: string;
	}

	let { statements, cityId, month }: Props = $props();

	const SIDES: { side: StatementSide; sign: string; tone: string; title: string }[] = [
		{ side: 'praise', sign: '+', tone: 'text-success', title: 'Praised' },
		{ side: 'complaints', sign: '−', tone: 'text-destructive', title: 'Criticised' },
		{ side: 'noted', sign: '·', tone: 'text-ink', title: 'Noted: said, neither praise nor complaint' },
		{ side: 'changes', sign: '~', tone: 'text-muted-foreground', title: 'Noticed a change' },
		{ side: 'unread', sign: '?', tone: 'text-muted-foreground', title: 'Not read yet: its sentiment, aspect and foods come once agent B reads it' }
	];
	const claims = $derived((statements ?? []).filter((s) => s.text));
	// The foods the source listed that no claim names
	const listedOnly = $derived(foodsOf(statements).filter((food) => food.listedOnly));
</script>

{#if claims.length || listedOnly.length}
	<ul class="m-0 flex list-none flex-col gap-1 p-0 text-sm">
		{#each SIDES as s (s.side)}
			{#each claims.filter((claim) => sideOf(claim) === s.side) as claim (claim.id)}
				{@const aspect = aspectOf(claim)}
				<li class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
					<span class={['w-3 shrink-0 text-center font-semibold', s.tone]} title={s.title}>{s.sign}</span>
					{#if aspect}
						<a
							class={['shrink-0 text-xs font-medium underline-offset-2 hover:underline', s.tone]}
							href={aspectHref(aspect.key, themeSideOf(s.side), { cityId, month })}
							title="Every sentence filed under this aspect this month">
							{aspect.label}
						</a>
					{:else if s.side !== 'unread'}
						<span class="text-muted-foreground shrink-0 text-xs" title="About no aspect in particular">No aspect</span>
					{/if}
					<span class="min-w-0"
						>{claim.text}{#if claim.quote}<span class="text-muted-foreground"> · “{claim.quote}”</span>{/if}</span>
					{#if claim.amount !== undefined && claim.unit}
						<span class="text-ink text-xs font-semibold tabular-nums">{amountLabel(claim.amount, claim.unit)}</span>
					{/if}
					{#each foodPartsOf(claim) as food (food.key)}
						{@const topic = linkTopicOf(food)}
						{#if topic}
							<a class="text-beet text-xs underline-offset-2 hover:underline" href={topicHref(topic.key)} title={topic.label}>
								{food.name}
							</a>
						{:else}
							<span class="text-muted-foreground text-xs" title="Linked to no topic yet">{food.name}</span>
						{/if}
					{/each}
				</li>
			{/each}
		{/each}
		{#if listedOnly.length}
			<li class="text-muted-foreground flex flex-wrap items-baseline gap-x-2 text-xs">
				<span class="w-3 shrink-0"></span>
				<span>Also names</span>
				{#each listedOnly as food (food.key)}
					{@const topic = linkTopicOf(food)}
					{#if topic}
						<a class="text-beet underline-offset-2 hover:underline" href={topicHref(topic.key)} title={topic.label}>{food.name}</a>
					{:else}
						<span title="Linked to no topic yet">{food.name}</span>
					{/if}
				{/each}
			</li>
		{/if}
	</ul>
{:else}
	<p class="text-muted-foreground m-0 text-xs">No claims yet: not read, or nothing said about it in particular.</p>
{/if}
