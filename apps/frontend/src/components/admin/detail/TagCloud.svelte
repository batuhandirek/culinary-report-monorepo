<script lang="ts">
	// Google's "people often mention" tags as a run of words with their counts: a tag naming a
	// kind of food links to its topic, the rest are plain.
	interface Props {
		tags: { title: string; count: number; href?: string; hint?: string }[];
	}

	let { tags }: Props = $props();
</script>

<p class="m-0 flex flex-wrap gap-x-2.5 gap-y-1 text-[12.5px]">
	{#each tags as tag (tag.title)}
		{#if tag.href}
			<a href={tag.href} title={tag.hint} class="text-beet">
				{tag.title}<span class="text-faint ml-[3px] text-[11.5px] tabular-nums">{tag.count}</span>
			</a>
		{:else}
			<span>{tag.title}<span class="text-faint ml-[3px] text-[11.5px] tabular-nums">{tag.count}</span></span>
		{/if}
	{/each}
</p>
