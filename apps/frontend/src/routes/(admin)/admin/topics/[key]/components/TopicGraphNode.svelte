<script lang="ts">
	import { Handle, type Node, type NodeProps, Position } from '@xyflow/svelte';

	import { GRAPH_NODE_HEIGHT, GRAPH_NODE_WIDTH, type GraphNode } from './topic-graph-layout.js';

	import { kindLabel } from '#lib/topic-kinds.js';
	import { cn } from '#ui/lib/utils.js';

	// One topic in the graph: its name, its kind and its wordings; the page's own topic in ink. An
	// edge leaves from its top towards what it is or has, and arrives at its bottom from what is it.
	let { data }: NodeProps<Node<{ topic: GraphNode }, 'topic'>> = $props();
	const topic = $derived(data.topic);
	const current = $derived(topic.place === 'current');
</script>

<Handle type="source" position={Position.Top} class="opacity-0" />
<div
	class={cn(
		'flex flex-col justify-center rounded-md border px-3 text-left',
		current ? 'bg-ink text-paper border-ink' : 'bg-paper border-line hover:border-ink cursor-pointer'
	)}
	style="width: {GRAPH_NODE_WIDTH}px; height: {GRAPH_NODE_HEIGHT}px"
	title={topic.label}>
	<div class="truncate text-sm font-semibold">{topic.label}</div>
	<div class={cn('flex justify-between gap-2 text-[11px]', current ? 'text-paper/75' : 'text-muted-foreground')}>
		<span class="truncate">{kindLabel(topic.kind)}</span>
		<span class="shrink-0 tabular-nums">{topic.terms ? `${topic.terms.toLocaleString('en-GB')} ${topic.terms === 1 ? 'wording' : 'wordings'}` : ''}</span>
	</div>
</div>
<Handle type="target" position={Position.Bottom} class="opacity-0" />
