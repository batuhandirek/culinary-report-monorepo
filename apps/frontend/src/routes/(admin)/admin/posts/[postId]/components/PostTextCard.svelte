<script lang="ts">
	import type { Snippet } from 'svelte';

	import MarkedText from '#components/admin/digestion/MarkedText.svelte';

	// One of the post's texts as scraped (the caption, the transcript, an article) in a card of its
	// own, the claims' quotes marked where agent A took them from; its length beside the label.
	interface Props {
		label: string;
		text?: string;
		quotes: (string | undefined)[];
		/** The post's platform: its links, @handles and #tags linked */
		platform?: string;
		/** A quieter word before the length: the transcript's language */
		note?: string;
		/** Right of the label: the other text's state ("Transcript: none") */
		aside?: string;
		/** Under the text: the tags */
		footer?: Snippet;
	}

	let { label, text, quotes, platform, note, aside, footer }: Props = $props();

	const length = $derived(text ? `${text.length.toLocaleString('en-GB')} chars` : undefined);
</script>

<section class="bg-paper border-line min-w-0 rounded-md border">
	<div class="flex min-h-10 items-center gap-2 px-3.5 pt-2.5 pb-2 text-[13px] font-semibold">
		{label}
		<span class="text-muted-foreground font-medium">{[note, length].filter(Boolean).join(' · ')}</span>
		{#if aside}<span class="text-muted-foreground ml-auto text-xs font-normal">{aside}</span>{/if}
	</div>
	{#if text}
		<p class="m-0 max-h-[470px] overflow-auto px-3.5 pb-2.5 text-[12.5px] leading-normal break-words whitespace-pre-wrap"><MarkedText {text} {quotes} {platform} /></p>
	{:else}
		<p class="text-muted-foreground m-0 px-3.5 pb-2.5 text-xs">None.</p>
	{/if}
	{#if footer}
		<div class="border-line/70 border-t px-3.5 pt-2 pb-2.5 text-xs">{@render footer()}</div>
	{/if}
</section>
