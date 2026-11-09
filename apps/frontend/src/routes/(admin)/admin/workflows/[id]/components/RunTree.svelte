<script lang="ts">
	import '@xyflow/svelte/dist/style.css';

	import { RefreshCw } from '@lucide/svelte';
	import { Background, Controls, type Edge, type Node, SvelteFlow } from '@xyflow/svelte';
	import type { AdminWorkflowTreeGroupDto, AdminWorkflowTreeOutputDto, AdminWorkflowTreeRunDto } from 'client';

	import { layoutTree, TREE_NODE_HEIGHT, TREE_NODE_WIDTH } from './run-tree-layout.js';
	import RunTreeGroupNode from './RunTreeGroupNode.svelte';
	import RunTreeRunNode from './RunTreeRunNode.svelte';

	import { goto } from '$app/navigation';
	import { api } from '#lib/api.js';
	import { workflowHref, workflowStatusLabel } from '#lib/workflow-status.js';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';

	// Who started whom under this run, drawn left to right; a parent's many runs of one workflow
	// are one node with their counts, which opens them in the list. Read once, and again on Refresh.
	let { runId }: { runId: string } = $props();

	let tree = $state<AdminWorkflowTreeOutputDto | null>(null);
	let failed = $state(false);
	let loading = $state(false);

	const load = async (id: string) => {
		loading = true;
		try {
			tree = (await api.admin.getWorkflowTree(id)) as AdminWorkflowTreeOutputDto;
			failed = false;
		} catch {
			failed = true;
		} finally {
			loading = false;
		}
	};

	// A new run id (a link to another run) draws its tree
	$effect(() => {
		const id = runId;
		tree = null;
		load(id);
	});

	// `group` is a node type Svelte Flow styles itself, so the folded runs are `fold`
	const nodeTypes = { run: RunTreeRunNode, fold: RunTreeGroupNode };

	let nodes = $state.raw<Node[]>([]);
	let edges = $state.raw<Edge[]>([]);
	$effect(() => {
		if (!tree) return;
		const positions = layoutTree(tree.nodes.map((n) => ({ id: n.id, parentKey: n.parentKey })));
		nodes = tree.nodes.map((n) => ({
			id: n.id,
			type: n.kind === 'run' ? 'run' : 'fold',
			position: positions.get(n.id) ?? { x: 0, y: 0 },
			// A known size: Svelte Flow hides a node until it has measured it, which blinks on a reload
			width: TREE_NODE_WIDTH,
			height: TREE_NODE_HEIGHT,
			data:
				n.kind === 'run'
					? { run: n as AdminWorkflowTreeRunDto, current: n.id === tree!.id }
					: { group: n as AdminWorkflowTreeGroupDto }
		}));
		edges = tree.nodes
			.filter((n) => n.parentKey)
			.map((n) => ({ id: `${n.parentKey}->${n.id}`, source: n.parentKey!, target: n.id, type: 'smoothstep' }));
	});

	const open = ({ node }: { node: Node }) => {
		if (node.id === tree?.id) return;
		if (node.type === 'run') return goto(workflowHref(node.id));
		const group = (node.data as { group: AdminWorkflowTreeGroupDto }).group;
		goto(`/admin/workflows?parent=${encodeURIComponent(group.parentId)}&name=${encodeURIComponent(group.name)}`);
	};

	// As tall as the tree, within bounds: beyond them it zooms out and pans
	const height = $derived(
		Math.min(640, Math.max(180, Math.max(0, ...nodes.map((n) => n.position.y)) + TREE_NODE_HEIGHT + 96))
	);
</script>

<div class="mb-3 flex items-center justify-between gap-3">
	<nav class="text-muted-foreground flex min-w-0 flex-wrap items-center gap-1 text-xs">
		{#if tree?.ancestors.length}
			<span>Started by</span>
			{#each tree.ancestors as a, i (a.id)}
				{#if i > 0}<span aria-hidden="true">›</span>{/if}
				<a class="text-foreground hover:underline" href={workflowHref(a.id)} title={workflowStatusLabel(a.status)}>{a.name}</a>
			{/each}
		{:else if tree}
			<span>Nothing started it: a schedule's firing, a button or a service</span>
		{/if}
	</nav>
	<Button size="sm" variant="outline" icon={RefreshCw} {loading} onclick={() => load(runId)}>Refresh</Button>
</div>

{#if failed && !tree}
	<EmptyState title="The tree could not be read" hint="Try the page again in a moment." ground="none" size="sm" />
{:else if tree && nodes.length <= 1}
	<EmptyState title="It started no other run" hint="A run it starts shows up here, linked to it." ground="none" size="sm" />
{:else if tree}
	<div class="overflow-hidden rounded-md border" style="height: {height}px">
		<SvelteFlow
			bind:nodes
			bind:edges
			{nodeTypes}
			fitView
			fitViewOptions={{ maxZoom: 1 }}
			minZoom={0.1}
			nodesDraggable={false}
			nodesConnectable={false}
			elementsSelectable={false}
			proOptions={{ hideAttribution: true }}
			onnodeclick={open}>
			<Background />
			<Controls showLock={false} />
		</SvelteFlow>
	</div>
	{#if tree.truncated}
		<p class="text-muted-foreground mt-2 text-xs">More runs are under it than one drawing reads; open a node to see its part.</p>
	{/if}
{/if}
