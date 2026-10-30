<script lang="ts">
	import { talksAbout, themeHref } from '#lib/feedback.js';
	import { topicHref } from '#lib/topic-format.js';

	// What a post's mention or a review talks about: each theme it raises once, complaints then
	// praise, linked to the theme's page for the source's city and month; then its dishes, a dish
	// with a food topic linked to the topic's page. Nothing when it raises nothing.
	interface Props {
		feedback: Parameters<typeof talksAbout>[0];
		/** The source's city and month (YYYY-MM): where the theme links open */
		cityId?: string;
		month?: string;
		/** A table cell: no "Talks about" label */
		compact?: boolean;
	}

	let { feedback, cityId, month, compact = false }: Props = $props();

	const about = $derived(talksAbout(feedback));
	const empty = $derived(!about.complaints.length && !about.praise.length && !about.dishes.length);
</script>

{#if !empty}
	<p class={['m-0 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 text-xs', compact && 'leading-5']}>
		{#if !compact}<span class="text-muted-foreground">Talks about</span>{/if}
		{#each about.complaints as theme (theme.key)}
			<a
				class="text-destructive underline-offset-2 hover:underline"
				href={themeHref(theme.key, 'complaints', { cityId, month })}
				title="Criticised: every sentence filed under the theme this month">
				− {theme.label}
			</a>
		{/each}
		{#each about.praise as theme (theme.key)}
			<a
				class="text-success underline-offset-2 hover:underline"
				href={themeHref(theme.key, 'praise', { cityId, month })}
				title="Praised: every sentence filed under the theme this month">
				+ {theme.label}
			</a>
		{/each}
		{#each about.dishes as dish (dish.key ?? dish.label)}
			{#if dish.key}
				<a class="text-beet underline-offset-2 hover:underline" href={topicHref(dish.key)}>{dish.label}</a>
			{:else}
				<span class="text-muted-foreground">{dish.label}</span>
			{/if}
		{/each}
	</p>
{/if}
