<script lang="ts" module>
	export interface ExplorerFact {
		value: number | string;
		label: string;
		/** What exactly is counted, as a tooltip */
		hint?: string;
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';

	// The head of a topic's or an aspect's page: what it is (its type and key in small type),
	// its name, and its figures as a row read at a glance, with the page's actions at the end.
	// The top bar already says where the page sits, so this says nothing about the path.
	interface Props {
		title: string;
		/** Its type: "Cuisine", "Aspect under Service" */
		type: string;
		/** Its stored key, shown when it differs from the name */
		code?: string;
		facts: ExplorerFact[];
		/** Right after the name: the tree's opener */
		titleAside?: Snippet;
		actions?: Snippet;
		/** Under the figures: a link, a note */
		children?: Snippet;
	}

	let { title, type, code, facts, titleAside, actions, children }: Props = $props();
	const show = (v: number | string) => (typeof v === 'number' ? v.toLocaleString('en-GB') : v);
</script>

<header class="bg-paper border-line rounded-md border">
	<div class="flex flex-wrap items-start gap-x-6 gap-y-3 px-5 pt-4">
		<div class="min-w-0 flex-1">
			<p class="text-muted-foreground m-0 text-sm">
				{type}{#if code && code !== title.toLowerCase()}<span class="text-faint ml-2 font-mono text-xs">{code}</span>{/if}
			</p>
			<div class="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
				<h1 class="text-ink m-0 min-w-0 text-3xl leading-tight font-bold tracking-tight break-words">{title}</h1>
				{@render titleAside?.()}
			</div>
		</div>
		{#if actions}<div class="flex shrink-0 flex-wrap items-center gap-2">{@render actions()}</div>{/if}
	</div>
	<dl class="m-0 mt-4 grid grid-cols-2 border-t border-line sm:flex sm:flex-wrap">
		{#each facts as fact (fact.label)}
			<!-- The figure reads first; the term stays first in the markup -->
			<div class="border-line flex min-w-0 flex-col-reverse border-r px-5 py-3 last:border-r-0 sm:min-w-28" title={fact.hint}>
				<dt class="text-muted-foreground m-0 text-xs">{fact.label}</dt>
				<dd class="text-ink m-0 text-xl font-semibold tabular-nums">{show(fact.value)}</dd>
			</div>
		{/each}
	</dl>
	{#if children}<div class="border-line border-t px-5 py-2.5 text-sm">{@render children()}</div>{/if}
</header>
