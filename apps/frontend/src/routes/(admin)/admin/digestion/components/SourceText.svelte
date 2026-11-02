<script lang="ts">
	import { markQuotes } from '#lib/digestion.js';

	// One of a source's texts (a caption, a transcript, an article, a review or its translation) in
	// full, under its label, with the claims' quotes marked where they were taken from it.
	interface Props {
		label: string;
		/** A quieter word after the label: a language, a length */
		note?: string;
		text: string | undefined;
		quotes?: (string | undefined)[];
	}

	let { label, note, text, quotes = [] }: Props = $props();

	const runs = $derived(text ? markQuotes(text, quotes) : []);
</script>

<section class="flex min-w-0 flex-col gap-1">
	<h4 class="eyebrow text-muted-foreground m-0">
		{label}{#if note}<span class="text-faint ml-2 normal-case">{note}</span>{/if}
	</h4>
	{#if text}
		<p class="bg-paper border-line m-0 max-h-80 overflow-y-auto rounded-md border px-3 py-2 text-sm leading-6 break-words whitespace-pre-wrap">
			{#each runs as run, i (i)}{#if run.mark}<mark class="bg-primary/40 text-ink rounded-sm">{run.text}</mark>{:else}{run.text}{/if}{/each}
		</p>
	{:else}
		<p class="text-muted-foreground m-0 text-sm">None.</p>
	{/if}
</section>
