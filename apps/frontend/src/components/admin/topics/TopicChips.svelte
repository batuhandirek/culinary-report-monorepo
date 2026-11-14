<script lang="ts">
	import Pill from '#components/admin/detail/Pill.svelte';
	import { topicPageHref } from '#lib/topic-format.js';

	// A place's or a brand's food topics as pills, each opening its topic's page: what its Google
	// categories, posts, menu and review tags say it is, the primary first and in ink. `source` (the
	// raw Google category it was read from) is on every pill's hover.
	interface Props {
		topics: { key: string; label: string; kind: string; primary?: boolean }[];
		/** Google's category, shown on hover */
		source?: string;
	}

	let { topics, source }: Props = $props();

	const hint = (label: string) => (source ? `${label} · Google: ${source}` : label);
</script>

<span class="inline-flex flex-wrap items-center gap-1 align-middle">
	{#each topics as topic (topic.key)}
		<Pill tone="outline" href={topicPageHref(topic.key, topic.kind)} title={hint(topic.label)} class={topic.primary ? 'font-semibold' : ''}
			>{topic.label}</Pill>
	{/each}
</span>
