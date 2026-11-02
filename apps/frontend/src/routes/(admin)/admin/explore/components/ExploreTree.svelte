<script lang="ts">
	import { ChevronRight, Search, Tag } from '@lucide/svelte';
	import type { AdminExploreTermOutputDto, AdminExploreTreeNodeOutputDto } from 'client';

	import { SvelteSet } from 'svelte/reactivity';

	import { api } from '#lib/api.js';
	import { isTermRef } from '#lib/explore.js';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// Every topic the view's claims are about, aspects and kinds of food apart, each with its
	// reviews and posts (a source once, what is under it counted in) and its Google tag places.
	// A search finds topics by label and wordings by name; picking one sets the page's X.
	interface Props {
		nodes: AdminExploreTreeNodeOutputDto[] | null;
		selected?: string;
		onPick: (ref: string) => void;
	}

	let { nodes, selected, onPick }: Props = $props();

	const byKey = $derived(new Map((nodes ?? []).map((n) => [n.key, n])));
	const order = (a: AdminExploreTreeNodeOutputDto, b: AdminExploreTreeNodeOutputDto) =>
		b.sources - a.sources || b.tagVenues - a.tagVenues || a.label.localeCompare(b.label);
	// Each node's children, by its key; the roots under ''
	const children = $derived.by(() => {
		const out: Record<string, AdminExploreTreeNodeOutputDto[]> = {};
		for (const n of nodes ?? []) {
			const parent = n.parentKey && byKey.has(n.parentKey) ? n.parentKey : '';
			(out[parent] ??= []).push(n);
		}
		for (const list of Object.values(out)) list.sort(order);
		return out;
	});
	const roots = $derived(children[''] ?? []);
	const groups = $derived([
		{ label: 'Aspects', roots: roots.filter((n) => n.kind === 'aspect') },
		{ label: 'Food and drink', roots: roots.filter((n) => n.kind !== 'aspect') }
	]);

	// Open: what the user opened, and the path to the picked node unless the user closed it
	const opened = new SvelteSet<string>();
	const closed = new SvelteSet<string>();
	const pathOf = (key: string | undefined) => {
		const out: string[] = [];
		for (let n = key ? byKey.get(key) : undefined; n?.parentKey && out.length < 20; n = byKey.get(n.parentKey)) out.push(n.parentKey);
		return out;
	};
	const isOpen = (key: string) => !closed.has(key) && (opened.has(key) || pathOf(selected).includes(key));
	const toggle = (key: string) => {
		if (isOpen(key)) {
			opened.delete(key);
			closed.add(key);
		} else {
			closed.delete(key);
			opened.add(key);
		}
	};

	let query = $state('');
	let terms = $state<AdminExploreTermOutputDto[]>([]);
	let timer: ReturnType<typeof setTimeout> | undefined;
	$effect(() => {
		const q = query.trim();
		clearTimeout(timer);
		if (q.length < 2) {
			terms = [];
			return;
		}
		timer = setTimeout(() => api.admin.searchExploreTerms({ q }).then((res) => (terms = res.terms)), 250);
	});
	const topicHits = $derived(
		query.trim().length < 2
			? []
			: (nodes ?? [])
					.filter((n) => n.label.toLowerCase().includes(query.trim().toLowerCase()))
					.sort(order)
					.slice(0, 15)
	);
	const pathLabel = (n: AdminExploreTreeNodeOutputDto) =>
		pathOf(n.key)
			.reverse()
			.map((k) => byKey.get(k)?.label)
			.join(' › ');
	const n = (value: number) => value.toLocaleString('en-GB');
</script>

{#snippet count(node: AdminExploreTreeNodeOutputDto)}
	<span class="text-muted-foreground shrink-0 text-xs tabular-nums" title="Reviews and posts raising it{node.tagVenues ? `; places whose Google tags name it` : ''}">
		{node.sources ? n(node.sources) : '—'}{#if node.tagVenues}<span class="text-beet"> · {n(node.tagVenues)}<Tag class="ml-0.5 inline size-3 align-[-1px]" aria-label="Google tag places" /></span>{/if}
	</span>
{/snippet}

{#snippet branch(node: AdminExploreTreeNodeOutputDto, depth: number)}
	{@const kids = children[node.key] ?? []}
	<li>
		<div
			class={['flex min-h-9 items-center gap-1 rounded pr-1.5', selected === node.key ? 'bg-tint font-medium' : 'hover:bg-sand']}
			style:padding-left={`${depth * 0.875}rem`}>
			{#if kids.length}
				<button
					type="button"
					class="text-muted-foreground flex size-7 shrink-0 items-center justify-center"
					aria-label={isOpen(node.key) ? `Close ${node.label}` : `Open ${node.label}`}
					aria-expanded={isOpen(node.key)}
					onclick={() => toggle(node.key)}>
					<ChevronRight class={['size-3.5 transition-transform', isOpen(node.key) && 'rotate-90']} />
				</button>
			{:else}
				<span class="size-7 shrink-0"></span>
			{/if}
			<button type="button" class="min-w-0 flex-1 truncate py-1.5 text-left text-sm" aria-current={selected === node.key} onclick={() => onPick(node.key)}>
				{node.label}
			</button>
			{@render count(node)}
		</div>
		{#if kids.length && isOpen(node.key)}
			<ul class="m-0 list-none p-0">
				{#each kids as kid (kid.key)}
					{@render branch(kid, depth + 1)}
				{/each}
			</ul>
		{/if}
	</li>
{/snippet}

<div class="flex flex-col gap-3">
	<label class="border-line bg-paper flex h-(--field-height) items-center gap-2 rounded-md border px-3">
		<Search class="text-muted-foreground size-4 shrink-0" />
		<input class="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="A topic or a wording…" bind:value={query} aria-label="Find a topic or a wording" />
	</label>

	{#if query.trim().length >= 2}
		<div class="flex flex-col gap-1">
			{#each topicHits as hit (hit.key)}
				<button
					type="button"
					class={['hover:bg-sand flex min-h-9 items-center justify-between gap-2 rounded px-2 text-left text-sm', selected === hit.key && 'bg-tint font-medium']}
					onclick={() => onPick(hit.key)}>
					<span class="min-w-0">
						<span class="block truncate">{hit.label}</span>
						{#if pathLabel(hit)}<span class="text-muted-foreground block truncate text-xs">{pathLabel(hit)}</span>{/if}
					</span>
					{@render count(hit)}
				</button>
			{/each}
			{#if terms.length}
				<p class="eyebrow text-muted-foreground m-0 mt-2">Wordings</p>
				{#each terms as term (term.ref)}
					<button
						type="button"
						class={['hover:bg-sand flex min-h-9 items-center justify-between gap-2 rounded px-2 text-left text-sm', selected === term.ref && 'bg-tint font-medium']}
						onclick={() => onPick(term.ref)}>
						<span class="min-w-0">
							<span class="block truncate">“{term.label}”</span>
							<span class="text-muted-foreground block truncate text-xs">{term.topics.length ? term.topics.join(', ') : 'linked to no topic yet'}</span>
						</span>
						<span class="text-muted-foreground shrink-0 text-xs tabular-nums" title="Claims naming it, anywhere">{n(term.uses)}×</span>
					</button>
				{/each}
			{/if}
			{#if !topicHits.length && !terms.length}
				<p class="text-muted-foreground m-0 px-2 text-sm">No topic or wording by that name in this view.</p>
			{/if}
		</div>
	{:else if !nodes}
		<SkeletonRows count={10} />
	{:else if !nodes.length}
		<p class="text-muted-foreground m-0 text-sm">No claim in this view is filed under a topic.</p>
	{:else}
		{#if selected && isTermRef(selected)}
			<p class="bg-tint m-0 rounded px-2 py-1.5 text-sm">Showing the wording “{selected.slice(5)}”.</p>
		{/if}
		{#each groups as group (group.label)}
			{#if group.roots.length}
				<div>
					<p class="eyebrow text-muted-foreground m-0 mb-1">{group.label}</p>
					<ul class="m-0 list-none p-0">
						{#each group.roots as root (root.key)}
							{@render branch(root, 0)}
						{/each}
					</ul>
				</div>
			{/if}
		{/each}
	{/if}
</div>
