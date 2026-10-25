<script lang="ts">
	import { TOPIC_LABELS } from '#lib/culinary.js';
	import { amountLabel, pointsOf, sideOf, themeHref, themeLabel, type ThemeSide } from '#lib/feedback.js';
	import { topicHref } from '#lib/topic-format.js';

	// Every note a review or a post's mention gave: its praise, its complaints and the changes it
	// noticed, each with the theme it is filed under (a link to the theme's page for the source's
	// city and month), the dish it is about (a link to the dish's food topic when it has one) and
	// the number it states; then the dishes it names that no note is about.
	interface Props {
		feedback: Parameters<typeof pointsOf>[0];
		/** The source's city and month (YYYY-MM): where the theme links open */
		cityId?: string;
		month?: string;
	}

	let { feedback, cityId, month }: Props = $props();

	const SIDES: { side: ThemeSide; sign: string; tone: string; title: string }[] = [
		{ side: 'praise', sign: '+', tone: 'text-success', title: 'Praised' },
		{ side: 'complaints', sign: '−', tone: 'text-destructive', title: 'Criticised' },
		{ side: 'changes', sign: '~', tone: 'text-muted-foreground', title: 'Noticed a change' }
	];
	const notes = $derived((feedback ?? []).filter((row) => row.detail));
	const dishOnly = $derived((feedback ?? []).filter((row) => !row.detail && row.dish));
</script>

{#if notes.length || dishOnly.length}
	<ul class="m-0 flex list-none flex-col gap-1 p-0 text-sm">
		{#each SIDES as s (s.side)}
			{#each notes.filter((row) => sideOf(row) === s.side) as note, i (`${s.side}${i}`)}
				<li class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
					<span class={['w-3 shrink-0 text-center font-semibold', s.tone]} title={s.title}>{s.sign}</span>
					{#if note.theme}
						<a
							class={['shrink-0 text-xs font-medium underline-offset-2 hover:underline', s.tone]}
							href={themeHref(note.theme, s.side, { cityId, month })}
							title="Every sentence filed under this theme this month">
							{themeLabel(note.theme)}
						</a>
					{:else}
						<span class="text-muted-foreground shrink-0 text-xs" title="Not filed under a theme yet">
							{TOPIC_LABELS[note.topic ?? 'other'] ?? note.topic ?? 'Not filed'}
						</span>
					{/if}
					<span class="min-w-0">{note.detail}</span>
					{#if note.amount !== undefined && note.unit}
						<span class="text-ink text-xs font-semibold tabular-nums">{amountLabel(note.amount, note.unit)}</span>
					{/if}
					{#if note.dish}
						{#if note.foodTopic}
							<a class="text-beet text-xs underline-offset-2 hover:underline" href={topicHref(note.foodTopic.key)} title={note.foodTopic.label}>
								{note.dish}
							</a>
						{:else}
							<span class="text-muted-foreground text-xs" title="Linked to no food topic">{note.dish}</span>
						{/if}
					{/if}
				</li>
			{/each}
		{/each}
		{#if dishOnly.length}
			<li class="text-muted-foreground flex flex-wrap items-baseline gap-x-2 text-xs">
				<span class="w-3 shrink-0"></span>
				<span>Also names</span>
				{#each dishOnly as row, i (i)}
					{#if row.foodTopic}
						<a class="text-beet underline-offset-2 hover:underline" href={topicHref(row.foodTopic.key)} title={row.foodTopic.label}>{row.dish}</a>
					{:else}
						<span title="Linked to no food topic">{row.dish}</span>
					{/if}
				{/each}
			</li>
		{/if}
	</ul>
{/if}
