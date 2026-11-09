<script lang="ts">
	import { Handle, type Node, type NodeProps, Position } from '@xyflow/svelte';
	import type { AdminWorkflowTreeGroupDto } from 'client';

	import { TREE_NODE_HEIGHT, TREE_NODE_WIDTH } from './run-tree-layout.js';

	import { isWorkflowLive, workflowStatusLabel } from '#lib/workflow-status.js';

	// Many runs of one workflow under one parent, folded: how many, in which status, the live ones first
	let { data }: NodeProps<Node<{ group: AdminWorkflowTreeGroupDto }, 'fold'>> = $props();
	const group = $derived(data.group);
	const statuses = $derived(
		[...group.statuses].sort((a, b) => Number(isWorkflowLive(b.status)) - Number(isWorkflowLive(a.status)) || b.count - a.count)
	);
</script>

<Handle type="target" position={Position.Left} class="opacity-0" />
<div
	class="bg-muted/60 hover:border-ink flex cursor-pointer flex-col justify-between rounded-md border border-dashed px-3 py-2 text-left"
	style="width: {TREE_NODE_WIDTH}px; height: {TREE_NODE_HEIGHT}px">
	<div class="min-w-0">
		<div class="truncate text-sm font-semibold" title={group.name}>
			<span class="tabular-nums">{group.count.toLocaleString('en')}</span> × {group.name}
		</div>
		<div class="text-muted-foreground truncate font-mono text-[10px]" title={group.className}>{group.className}</div>
	</div>
	<div class="truncate text-[11px] tabular-nums">
		{#each statuses as s, i (s.status)}
			{#if i > 0}<span class="text-muted-foreground"> · </span>{/if}
			<span class={isWorkflowLive(s.status) ? 'font-semibold' : 'text-muted-foreground'}
				>{s.count.toLocaleString('en')} {workflowStatusLabel(s.status).toLowerCase()}</span>
		{/each}
	</div>
</div>
