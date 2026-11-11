<script lang="ts">
	import MarkedText from './MarkedText.svelte';

	// One of a source's texts (a caption, a transcript, an article, a review or its translation) in
	// full, under its label, with the claims' quotes marked where they were taken from it; an empty
	// one is its label saying "none". Given the post's platform, its links, @handles and #tags are
	// linked as on the post's page (`captionParts`).
	interface Props {
		label: string;
		/** A quieter word after the label: a language, a length */
		note?: string;
		text: string | undefined;
		quotes?: (string | undefined)[];
		/** A post's platform: link what the text points at. */
		platform?: string;
		/** One claim's quote, marked louder than the rest */
		focus?: string;
	}

	let { label, note, text, quotes = [], platform, focus }: Props = $props();
</script>

<section class="flex min-w-0 flex-col gap-1">
	<h4 class="eyebrow text-muted-foreground m-0">
		{label}{#if text && note}<span class="text-faint ml-2 normal-case">{note}</span>{/if}{#if !text}<span class="text-faint ml-2 normal-case">none</span>{/if}
	</h4>
	{#if text}
		<p class="bg-paper border-line m-0 max-h-80 overflow-y-auto rounded-md border px-3 py-2 text-sm leading-6 break-words whitespace-pre-wrap"><MarkedText {text} {quotes} {platform} {focus} /></p>
	{/if}
</section>
