<script lang="ts">
	import { Handle, type Node, type NodeProps, Position } from '@xyflow/svelte';
	import type { AdminWorkflowTreeRunDto } from 'client';

	import { TREE_NODE_HEIGHT, TREE_NODE_WIDTH } from './run-tree-layout.js';

	import { workflowStatusVariant } from '#components/admin/admin-format.js';
	import { formatDuration, workflowDuration, workflowStatusLabel } from '#lib/workflow-status.js';
	import { cn } from '#ui/lib/utils.js';
	import Badge from '#ui/wrapped/Badge.svelte';

	// One run in the tree: its workflow, status and how long it took; the page's own run outlined
	let { data }: NodeProps<Node<{ run: AdminWorkflowTreeRunDto; current: boolean }, 'run'>> = $props();
	const run = $derived(data.run);
	const took = $derived(workflowDuration(run));
</script>

<Handle type="target" position={Position.Left} class="opacity-0" />
<div
	class={cn(
		'bg-card flex cursor-pointer flex-col justify-between rounded-md border px-3 py-2 text-left shadow-xs hover:border-ink',
		data.current && 'border-ink border-2'
	)}
	style="width: {TREE_NODE_WIDTH}px; height: {TREE_NODE_HEIGHT}px">
	<div class="flex items-start justify-between gap-2">
		<div class="min-w-0">
			<div class="truncate text-sm font-semibold" title={run.name}>{run.name}</div>
			<div class="text-muted-foreground truncate font-mono text-[10px]" title={run.className}>{run.className}</div>
		</div>
		<Badge pill variant={workflowStatusVariant(run.status)}>{workflowStatusLabel(run.status)}</Badge>
	</div>
	<div class="text-muted-foreground flex justify-between gap-2 text-[11px]">
		<span class="truncate">{run.queue ?? (run.purpose ? run.purpose : '')}</span>
		<span class="shrink-0 tabular-nums">{took === undefined ? '' : formatDuration(took)}</span>
	</div>
</div>
<Handle type="source" position={Position.Right} class="opacity-0" />
