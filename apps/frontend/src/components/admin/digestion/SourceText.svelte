<script lang="ts">
	import { type CaptionPart, captionParts } from '#lib/caption-links.js';
	import { markQuotes } from '#lib/digestion.js';

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
	}

	let { label, note, text, quotes = [], platform }: Props = $props();

	const runs = $derived(
		(text ? markQuotes(text, quotes) : []).map((run) => ({
			mark: run.mark,
			parts: platform ? captionParts(run.text, platform) : [{ text: run.text, href: undefined, external: false }]
		}))
	);
</script>

{#snippet parts(list: CaptionPart[])}{#each list as part, i (i)}{#if part.href}<a
				class="text-beet underline-offset-2 hover:underline"
				href={part.href}
				target={part.external ? '_blank' : undefined}
				rel={part.external ? 'noopener noreferrer' : undefined}>{part.text}</a>{:else}{part.text}{/if}{/each}{/snippet}

<section class="flex min-w-0 flex-col gap-1">
	<h4 class="eyebrow text-muted-foreground m-0">
		{label}{#if text && note}<span class="text-faint ml-2 normal-case">{note}</span>{/if}{#if !text}<span class="text-faint ml-2 normal-case">none</span>{/if}
	</h4>
	{#if text}
		<p class="bg-paper border-line m-0 max-h-80 overflow-y-auto rounded-md border px-3 py-2 text-sm leading-6 break-words whitespace-pre-wrap">
			{#each runs as run, i (i)}{#if run.mark}<mark class="bg-primary/40 text-ink rounded-sm">{@render parts(run.parts)}</mark>{:else}{@render parts(run.parts)}{/if}{/each}
		</p>
	{/if}
</section>
