<script lang="ts">
	import '@xyflow/svelte/dist/style.css';

	import { Background, Controls, type Edge, MarkerType, type Node, SvelteFlow } from '@xyflow/svelte';
	import type { AdminTopicOutputDto } from 'client';

	import { GRAPH_NODE_HEIGHT, GRAPH_NODE_WIDTH, type GraphNode, topicGraphLayout } from './topic-graph-layout.js';
	import TopicGraphNode from './TopicGraphNode.svelte';

	import { goto } from '$app/navigation';
	import { topicHref } from '#lib/topic-format.js';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';

	// A kind of food's neighbourhood in the graph, drawn top-down: above it, everything it counts
	// for, each on the row of its longest way up; below it, the topics that count for it. "Is a"
	// edges in ink, "has" edges dashed in grape, each pointing at what is had or been. A click on
	// another topic opens its page, which draws its own neighbourhood: the way to walk the graph. In
	// a page, the wheel scrolls the page; the buttons and a pinch zoom.
	interface Props {
		topic: AdminTopicOutputDto;
		/** Every kind of food, with their edges */
		topics: AdminTopicOutputDto[];
	}

	let { topic, topics }: Props = $props();

	const layout = $derived(topicGraphLayout(topic.key, topics));
	const nodeTypes = { topic: TopicGraphNode };
	const STYLE: Record<string, { stroke: string; dash?: string }> = {
		is_a: { stroke: 'var(--color-ink)' },
		has: { stroke: 'var(--color-grape)', dash: '6 4' }
	};

	let nodes = $state.raw<Node[]>([]);
	let edges = $state.raw<Edge[]>([]);
	$effect(() => {
		if (!layout) return;
		nodes = layout.nodes.map((n) => ({
			id: n.key,
			type: 'topic',
			position: { x: n.x, y: n.y },
			// A known size: Svelte Flow hides a node until it has measured it
			width: GRAPH_NODE_WIDTH,
			height: GRAPH_NODE_HEIGHT,
			data: { topic: n satisfies GraphNode }
		}));
		edges = layout.edges.map((e) => {
			const style = STYLE[e.type] ?? STYLE.is_a;
			return {
				id: `${e.from}-${e.type}-${e.to}`,
				source: e.from,
				target: e.to,
				style: `stroke: ${style.stroke}; stroke-width: 1.5;${style.dash ? ` stroke-dasharray: ${style.dash};` : ''}`,
				markerEnd: { type: MarkerType.ArrowClosed, color: style.stroke, width: 16, height: 16 }
			};
		});
	});

	const open = ({ node }: { node: Node }) => {
		if (node.id !== topic.key) goto(topicHref(node.id));
	};

	// As tall as the drawing, within bounds that fit the page: beyond them it zooms out and pans
	const height = $derived(
		Math.min(420, Math.max(200, Math.max(0, ...(layout?.nodes ?? []).map((n) => n.y)) + GRAPH_NODE_HEIGHT + 72))
	);
</script>

<div class="text-muted-foreground mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
	<span>Above: what it counts for. Below: what counts for it.</span>
	<span class="flex items-center gap-1.5"><svg width="28" height="6" aria-hidden="true"><line x1="0" y1="3" x2="28" y2="3" stroke="var(--color-ink)" stroke-width="1.5" /></svg>is a</span>
	<span class="flex items-center gap-1.5"><svg width="28" height="6" aria-hidden="true"><line x1="0" y1="3" x2="28" y2="3" stroke="var(--color-grape)" stroke-width="1.5" stroke-dasharray="6 4" /></svg>has</span>
	{#if layout?.moreBelow}
		<span>Under it: the {layout.nodes.filter((n) => n.place === 'below').length} most worded of {(layout.nodes.filter((n) => n.place === 'below').length + layout.moreBelow).toLocaleString('en-GB')}</span>
	{/if}
</div>

{#if !layout || layout.nodes.length <= 1}
	<EmptyState title="Nothing around it yet" hint="Give it what it is under Edit: a cuisine, a meal, a kind of dish." ground="none" size="sm" />
{:else}
	<div class="border-line overflow-hidden rounded-md border" style="height: {height}px">
		{#key topic.key}
			<SvelteFlow
				bind:nodes
				bind:edges
				{nodeTypes}
				fitView
				fitViewOptions={{ maxZoom: 1, padding: 0.15 }}
				minZoom={0.1}
				zoomOnScroll={false}
				preventScrolling={false}
				nodesDraggable={false}
				nodesConnectable={false}
				elementsSelectable={false}
				proOptions={{ hideAttribution: true }}
				onnodeclick={open}>
				<Background />
				<Controls showLock={false} />
			</SvelteFlow>
		{/key}
	</div>
{/if}
