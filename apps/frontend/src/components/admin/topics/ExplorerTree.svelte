<script lang="ts" module>
	export interface ExplorerNode {
		key: string;
		label: string;
		parentKey?: string;
		/** The figure on its right: wordings, claims */
		count?: number;
		/** A quiet word after the label: a food topic's type when it differs from its parent's */
		tag?: string;
	}
</script>

<script lang="ts">
	import { ChevronRight, Dot } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	import { SvelteSet } from 'svelte/reactivity';

	// A tree read like a file explorer: each row its own page, a branch opened or closed with its
	// chevron, the branches on the way to the open page opened by themselves and that page marked
	// in ink. The rows are whatever the page hands in; a node whose parent is not among them is a
	// top row. Counts sit right-aligned so a column of them reads at a glance.
	interface Props {
		nodes: ExplorerNode[];
		current: string;
		href: (key: string) => string;
		/** What the counts are, for their tooltip */
		countLabel: string;
		/** Above the rows: a link up, a title */
		head?: Snippet;
		/** No frame of its own: inside a panel */
		bare?: boolean;
	}

	let { nodes, current, href, countLabel, head, bare = false }: Props = $props();

	const keys = $derived(new Set(nodes.map((n) => n.key)));
	const byKey = $derived(new Map(nodes.map((n) => [n.key, n])));
	const childrenOf = (key: string | undefined) =>
		nodes
			.filter((n) => (key === undefined ? !n.parentKey || !keys.has(n.parentKey) : n.parentKey === key))
			.sort((a, b) => a.label.localeCompare(b.label));

	const open = new SvelteSet<string>();
	// The way down to the open page is opened, and stays open when it changes
	$effect(() => {
		for (let k: string | undefined = current; k; k = byKey.get(k)?.parentKey) open.add(k);
	});
	const toggle = (key: string) => (open.has(key) ? open.delete(key) : open.add(key));
	const n = (v: number) => v.toLocaleString('en-GB');
</script>

{#snippet branch(parent: string | undefined, depth: number)}
	<ul class={['m-0 list-none p-0', depth > 0 && 'border-line ml-[0.8rem] border-l pl-1.5']}>
		{#each childrenOf(parent) as node (node.key)}
			{@const kids = childrenOf(node.key).length}
			{@const here = node.key === current}
			<li>
				<div
					class={[
						'group flex h-8 items-center gap-0.5 rounded-sm pr-2 text-sm',
						here ? 'bg-ink text-paper' : 'hover:bg-wash'
					]}>
					{#if kids}
						<button
							type="button"
							class="flex size-6 shrink-0 items-center justify-center rounded-sm"
							aria-label={open.has(node.key) ? `Close ${node.label}` : `Open ${node.label}`}
							aria-expanded={open.has(node.key)}
							onclick={() => toggle(node.key)}>
							<ChevronRight class={['size-3.5 transition-transform', open.has(node.key) && 'rotate-90']} />
						</button>
					{:else}
						<span class="flex size-6 shrink-0 items-center justify-center opacity-40" aria-hidden="true"><Dot class="size-4" /></span>
					{/if}
					<a
						href={href(node.key)}
						aria-current={here ? 'page' : undefined}
						class={['min-w-0 flex-1 truncate no-underline', here ? 'text-paper font-semibold' : 'text-ink']}
						title={node.label}>
						{node.label}{#if node.tag}<span class={['ml-1.5 text-xs font-normal', here ? 'text-paper/70' : 'text-muted-foreground']}>{node.tag}</span>{/if}
					</a>
					{#if node.count !== undefined}
						<span
							class={['shrink-0 text-xs tabular-nums', here ? 'text-paper/80' : 'text-muted-foreground']}
							title={`${n(node.count)} ${countLabel}`}>{node.count ? n(node.count) : '–'}</span>
					{/if}
				</div>
				{#if kids && open.has(node.key)}
					{@render branch(node.key, depth + 1)}
				{/if}
			</li>
		{/each}
	</ul>
{/snippet}

<nav class={['flex min-h-0 flex-col', !bare && 'bg-paper border-line rounded-md border']} aria-label="Tree">
	{#if head}
		<div class="border-line border-b px-3 py-2.5">{@render head()}</div>
	{/if}
	<div class={['min-h-0 overflow-y-auto', !bare && 'p-1.5']}>
		{@render branch(undefined, 0)}
	</div>
</nav>
