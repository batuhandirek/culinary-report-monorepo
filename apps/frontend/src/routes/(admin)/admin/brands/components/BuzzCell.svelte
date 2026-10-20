<script lang="ts">
	import { cn } from '#ui/lib/utils.js';

	// A month's count with its change on the month before: "12 ↑4". Zero both months is faint.
	interface Props {
		value: number;
		previous: number;
	}

	let { value, previous }: Props = $props();
	const change = $derived(value - previous);
</script>

<span class="inline-flex items-baseline justify-end gap-1.5 tabular-nums">
	<span class={cn('font-medium', value === 0 && 'text-faint font-normal')}>{value}</span>
	{#if change !== 0}
		<span
			class={cn('text-xs', change > 0 ? 'text-success' : 'text-destructive')}
			title={`${previous} the month before`}>
			{change > 0 ? '↑' : '↓'}{Math.abs(change)}
		</span>
	{/if}
</span>
