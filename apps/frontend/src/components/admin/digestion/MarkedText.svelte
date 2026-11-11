<script lang="ts">
	import { type CaptionPart, captionParts } from '#lib/caption-links.js';
	import { markQuotes } from '#lib/digestion.js';

	// A source's text as inline runs, the claims' quotes marked where they were taken from it. Given
	// the post's platform, its links, @handles and #tags are linked (`captionParts`). The caller
	// gives the box: it keeps line breaks only under `whitespace-pre-wrap`.
	interface Props {
		text: string;
		quotes?: (string | undefined)[];
		/** A post's platform: link what the text points at. */
		platform?: string;
		/** One claim's quote, marked louder than the rest (an opened claim row) */
		focus?: string;
	}

	let { text, quotes = [], platform, focus }: Props = $props();

	const runs = $derived(
		markQuotes(text, quotes, focus).map((run) => ({
			mark: run.mark,
			focus: run.focus,
			parts: platform ? captionParts(run.text, platform) : [{ text: run.text, href: undefined, external: false }]
		}))
	);
</script>

{#snippet parts(list: CaptionPart[])}{#each list as part, i (i)}{#if part.href}<a
				class="text-beet underline-offset-2 hover:underline"
				href={part.href}
				target={part.external ? '_blank' : undefined}
				rel={part.external ? 'noopener noreferrer' : undefined}>{part.text}</a>{:else}{part.text}{/if}{/each}{/snippet}

{#each runs as run, i (i)}{#if run.mark}<mark
			class={['text-ink rounded-sm', run.focus ? 'bg-primary outline-ink/60 outline-1 outline-offset-1' : focus ? 'bg-primary/20' : 'bg-primary/40']}
			data-focus={run.focus || undefined}>{@render parts(run.parts)}</mark>{:else}{@render parts(run.parts)}{/if}{/each}
