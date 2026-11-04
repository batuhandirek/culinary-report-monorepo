<script lang="ts">
	import { markdownHtml } from '#lib/markdown.js';

	interface Props {
		text: string;
		/** Streaming: a caret at the end */
		streaming?: boolean;
	}

	let { text, streaming = false }: Props = $props();
	const html = $derived(markdownHtml(text));
</script>

<div class={['ask-markdown text-sm leading-relaxed text-ink', streaming && 'is-streaming']}>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitised by markdownHtml -->
	{@html html}
</div>

<style>
	.ask-markdown :global(p) {
		margin: 0 0 0.6em;
	}
	.ask-markdown :global(p:last-child) {
		margin-bottom: 0;
	}
	.ask-markdown :global(ul),
	.ask-markdown :global(ol) {
		margin: 0 0 0.6em;
		padding-left: 1.25em;
	}
	.ask-markdown :global(ul) {
		list-style: disc;
	}
	.ask-markdown :global(ol) {
		list-style: decimal;
	}
	.ask-markdown :global(li) {
		margin: 0.15em 0;
	}
	.ask-markdown :global(h1),
	.ask-markdown :global(h2),
	.ask-markdown :global(h3),
	.ask-markdown :global(h4) {
		margin: 0.8em 0 0.3em;
		font-size: 0.95rem;
		font-weight: 600;
	}
	.ask-markdown :global(strong) {
		font-weight: 600;
	}
	.ask-markdown :global(code) {
		border-radius: 4px;
		background: var(--wash);
		padding: 0 0.25em;
		font-size: 0.85em;
	}
	.ask-markdown :global(pre) {
		overflow-x: auto;
		border-radius: 6px;
		background: var(--wash);
		padding: 0.5em;
	}
	.ask-markdown :global(table) {
		margin: 0.4em 0 0.8em;
		border-collapse: collapse;
		font-size: 0.8rem;
	}
	.ask-markdown :global(th),
	.ask-markdown :global(td) {
		border: 1px solid var(--line);
		padding: 0.25em 0.5em;
		text-align: left;
	}
	.ask-markdown :global(th) {
		background: var(--wash);
		font-weight: 600;
	}
	.ask-markdown :global(a) {
		color: var(--grape);
		text-decoration: underline;
	}
	.ask-markdown :global(blockquote) {
		border-left: 3px solid var(--line);
		margin: 0 0 0.6em;
		padding-left: 0.75em;
		color: var(--muted-foreground);
	}
	.is-streaming :global(> :last-child)::after {
		content: '▍';
		margin-left: 1px;
		color: var(--muted-foreground);
		animation: ask-blink 1s steps(2) infinite;
	}
	@keyframes ask-blink {
		50% {
			opacity: 0;
		}
	}
</style>
