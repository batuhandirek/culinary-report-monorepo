<script lang="ts">
	import { aspectHref,linkTopicOf, type Statement, talksAbout } from '#lib/statements.js';
	import { topicHref } from '#lib/topic-format.js';

	// What a post's mention or a review talks about: each aspect it raises once, complaints then
	// praise, linked to the theme's page for the source's city and month; then its foods as the
	// source spelled them, each linked to its topic's page once the wording is decided. Nothing
	// when it raises nothing.
	interface Props {
		statements: Statement[] | undefined;
		/** The source's city and month (YYYY-MM): where the theme links open */
		cityId?: string;
		month?: string;
		/** A table cell: no "Talks about" label */
		compact?: boolean;
	}

	let { statements, cityId, month, compact = false }: Props = $props();

	const about = $derived(talksAbout(statements));
	const empty = $derived(!about.complaints.length && !about.praise.length && !about.foods.length);
</script>

{#if !empty}
	<p class={['m-0 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 text-xs', compact && 'leading-5']}>
		{#if !compact}<span class="text-muted-foreground">Talks about</span>{/if}
		{#each about.complaints as theme (theme.key)}
			<a
				class="text-destructive underline-offset-2 hover:underline"
				href={aspectHref(theme.key, 'complaints', { cityId, month })}
				title="Criticised: every sentence filed under the aspect this month">
				− {theme.label}
			</a>
		{/each}
		{#each about.praise as theme (theme.key)}
			<a
				class="text-success underline-offset-2 hover:underline"
				href={aspectHref(theme.key, 'praise', { cityId, month })}
				title="Praised: every sentence filed under the aspect this month">
				+ {theme.label}
			</a>
		{/each}
		{#each about.foods as food (food.key)}
			{@const topic = linkTopicOf(food)}
			{#if topic}
				<a class="text-beet underline-offset-2 hover:underline" href={topicHref(topic.key)} title={topic.label}>{food.name}</a>
			{:else}
				<span class="text-muted-foreground" title="Linked to no topic yet">{food.name}</span>
			{/if}
		{/each}
	</p>
{/if}
