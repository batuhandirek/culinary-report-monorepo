<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * The reading column of a long-form page (`/s/*`, `/legal/*`). Pages under it are bare
	 * markup — `<h1>`, `<h2>`, `<p>`, lists — and are set here, by element, so every such
	 * page reads the same. The column is the measure: give it its width at the call site.
	 *
	 * A designed block inside the text (a `Panel`, a row list, buttons) goes in a
	 * `.not-prose` wrapper; nothing in there is restyled.
	 */
	interface Props {
		/** Legal documents: body type one step smaller, for texts that are read in full. */
		dense?: boolean;
		class?: string;
		children?: Snippet;
	}

	let { dense = false, class: className = '', children }: Props = $props();
</script>

<article class={['prose-sheet w-full', dense && 'prose-sheet-dense', className]}>
	{@render children?.()}
</article>

<style>
	.prose-sheet {
		--prose-body: var(--text-lg);
		--prose-title: var(--text-4xl);
	}

	.prose-sheet-dense {
		--prose-body: var(--text-base);
		--prose-title: var(--text-3xl);
	}

	.prose-sheet :global(h1:not(.not-prose *)) {
		margin-bottom: 1.5rem;
		color: var(--ink);
		font-size: var(--prose-title);
		font-weight: 700;
		letter-spacing: -0.025em;
		line-height: 1.12;
		text-wrap: balance;
	}

	/* A line right under the title is the document's dateline ("Son güncelleme: …"). */
	.prose-sheet :global(h1 + span) {
		display: block;
		margin-top: -0.75rem;
		margin-bottom: 2rem;
		color: var(--muted-foreground);
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
	}

	.prose-sheet :global(h2:not(.not-prose *)) {
		margin-top: 2.25rem;
		margin-bottom: 0.75rem;
		color: var(--ink);
		font-size: var(--text-2xl);
		font-weight: 600;
		letter-spacing: -0.012em;
		line-height: 1.25;
	}

	.prose-sheet :global(h3:not(.not-prose *)) {
		margin-top: 1.5rem;
		margin-bottom: 0.5rem;
		color: var(--ink);
		font-size: var(--text-lg);
		font-weight: 600;
		line-height: 1.35;
	}

	/* A heading someone can be sent to must clear the sticky header when it is. */
	.prose-sheet :global([id]) {
		scroll-margin-top: 1rem;
	}

	@media (min-width: 1024px) {
		.prose-sheet :global([id]) {
			scroll-margin-top: 8rem;
		}
	}

	.prose-sheet :global(p:not(.not-prose *)),
	.prose-sheet :global(li:not(.not-prose *)) {
		color: var(--reading-ink);
		font-size: var(--prose-body);
		line-height: 1.65;
	}

	.prose-sheet :global(p:not(.not-prose *) + p) {
		margin-top: 0.875rem;
	}

	.prose-sheet :global(ul:not(.not-prose *)),
	.prose-sheet :global(ol:not(.not-prose *)) {
		margin: 0.75rem 0 1rem 1.25rem;
		list-style: disc;
	}

	.prose-sheet :global(ol:not(.not-prose *)) {
		list-style: decimal;
	}

	.prose-sheet :global(li:not(.not-prose *) + li) {
		margin-top: 0.375rem;
	}

	/* Definition lists — the legal pages' `Tanımlar` sections. */
	.prose-sheet :global(dl:not(.not-prose *)) {
		margin: 0.75rem 0 1rem;
	}

	.prose-sheet :global(dt:not(.not-prose *)) {
		margin-top: 0.875rem;
		color: var(--ink);
		font-weight: 600;
	}

	.prose-sheet :global(dd:not(.not-prose *)) {
		margin: 0.125rem 0 0;
		color: var(--reading-ink);
		font-size: var(--prose-body);
		line-height: 1.65;
	}

	.prose-sheet :global(strong:not(.not-prose *)) {
		color: var(--ink);
		font-weight: 600;
	}

	.prose-sheet :global(a:not(.not-prose *)) {
		color: var(--ink);
		font-weight: 500;
		text-decoration: underline;
		text-underline-offset: 3px;
		text-decoration-color: var(--line);
		overflow-wrap: anywhere;
	}

	.prose-sheet :global(a:not(.not-prose *):hover) {
		text-decoration-color: var(--ink);
	}

	@media print {
		.prose-sheet {
			--prose-body: 11pt;
			--prose-title: 20pt;
		}

		.prose-sheet :global(h2),
		.prose-sheet :global(h3) {
			break-after: avoid;
		}

		.prose-sheet :global(p),
		.prose-sheet :global(li),
		.prose-sheet :global(dd) {
			orphans: 3;
			widows: 3;
		}
	}
</style>
