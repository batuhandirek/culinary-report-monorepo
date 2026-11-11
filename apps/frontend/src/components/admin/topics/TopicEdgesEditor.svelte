<script lang="ts">
	import { ArrowUp, X } from '@lucide/svelte';

	import { defaultEdgeType, EDGE_ITEMS, type EdgeType, kindLabel } from '#lib/topic-kinds.js';
	import Select from '#ui/wrapped/Select.svelte';

	// What a kind of food is and has, edited in place as one list: each row another topic with its
	// relation ("is a" or "has", defaulted from that topic's type and changeable), removable, and a
	// picker to add one. The first "is a" is the topic's parent in the tree; the arrow moves a row up.
	// A topic that already counts for this one is not offered (the API refuses the loop too).
	interface EdgeTopic {
		key: string;
		label: string;
		kind: string;
		edges: { to: string; type: string }[];
	}
	interface Props {
		/** The topic being edited; absent for a new one */
		selfKey?: string;
		topics: EdgeTopic[];
		edges: { to: string; type: EdgeType }[];
	}

	let { selfKey, topics, edges = $bindable() }: Props = $props();

	const NONE = '-';
	let adding = $state(NONE);
	const byKey = $derived(new Map(topics.map((t) => [t.key, t])));

	/** The topic and everything that counts for it: none of them can be what it is or has */
	const below = $derived.by(() => {
		if (!selfKey) return [] as string[];
		const out = [selfKey];
		let grew = true;
		while (grew) {
			grew = false;
			for (const t of topics)
				if (!out.includes(t.key) && t.edges.some((e) => out.includes(e.to))) {
					out.push(t.key);
					grew = true;
				}
		}
		return out;
	});
	const addItems = $derived([
		{ value: NONE, label: 'Add what it is or has…' },
		...topics
			.filter((t) => t.kind !== 'aspect' && !below.includes(t.key) && !edges.some((e) => e.to === t.key))
			.sort((a, b) => a.label.localeCompare(b.label))
			.map((t) => ({ value: t.key, label: `${t.label} · ${kindLabel(t.kind)}` }))
	]);
	const firstIsA = $derived(edges.findIndex((e) => e.type === 'is_a'));

	$effect(() => {
		if (adding === NONE) return;
		const topic = byKey.get(adding);
		if (topic) edges = [...edges, { to: topic.key, type: defaultEdgeType(topic.kind) }];
		adding = NONE;
	});

	const setType = (i: number, type: string) => (edges = edges.map((e, k) => (k === i ? { ...e, type: type as EdgeType } : e)));
	const remove = (i: number) => (edges = edges.filter((_, k) => k !== i));
	const moveUp = (i: number) => {
		const next = [...edges];
		[next[i - 1], next[i]] = [next[i], next[i - 1]];
		edges = next;
	};
</script>

<div class="flex flex-col gap-2">
	{#if edges.length}
		<ul class="m-0 flex list-none flex-col gap-1 p-0">
			{#each edges as edge, i (edge.to)}
				<li class="bg-paper border-line flex flex-wrap items-center gap-2 rounded-md border px-2 py-1 text-sm">
					<div class="w-24 shrink-0">
						<Select
							items={EDGE_ITEMS.map((e) => ({ value: e.value, label: e.label }))}
							value={edge.type}
							onValueChange={(v: string) => setType(i, v)}
							size="sm"
							aria-label="Relation to {byKey.get(edge.to)?.label ?? edge.to}" />
					</div>
					<span class="min-w-0 flex-1 truncate font-medium">{byKey.get(edge.to)?.label ?? edge.to}</span>
					{#if i === firstIsA}<span class="eyebrow text-beet">parent in the tree</span>{/if}
					<button
						type="button"
						class="text-muted-foreground hover:text-ink grid size-9 place-items-center disabled:opacity-30"
						aria-label="Move {byKey.get(edge.to)?.label ?? edge.to} up"
						disabled={i === 0}
						onclick={() => moveUp(i)}><ArrowUp class="size-4" /></button>
					<button
						type="button"
						class="text-muted-foreground hover:text-ink grid size-9 place-items-center"
						aria-label="Remove {byKey.get(edge.to)?.label ?? edge.to}"
						onclick={() => remove(i)}><X class="size-4" /></button>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-muted-foreground m-0 text-sm">A root: a kind of nothing, and it has nothing.</p>
	{/if}
	<Select items={addItems} bind:value={adding} size="sm" aria-label="Add what it is or has" />
	<p class="text-muted-foreground m-0 text-xs">
		"Is a" counts always (Menemen is a Turkish dish and a breakfast); "has" counts in broad mode only (Vegan döner has Vegan). Stated once here,
		every wording of the topic follows.
	</p>
</div>
