<script lang="ts" module>
	// How far the pipeline got with a source, in one line: each step in the order it runs, with an
	// icon for its state and a short result ("2 places", "5 of 7"); when it ran sits in the hint.
	export interface Step {
		label: string;
		/** done ✓ · partly (some read, some not) · skipped (the gate said no) · pending (not run yet) */
		state: 'done' | 'partly' | 'skipped' | 'pending';
		/** The step's result, short */
		result?: string;
		/** When it ran, or why it didn't: the hover hint */
		hint?: string;
	}
</script>

<script lang="ts">
	import { ChevronRight, CircleCheck, CircleDashed, CircleMinus, CircleX } from '@lucide/svelte';

	interface Props {
		steps: Step[];
	}

	let { steps }: Props = $props();

	const LOOK = {
		done: { icon: CircleCheck, class: 'text-success' },
		partly: { icon: CircleDashed, class: 'text-warning' },
		skipped: { icon: CircleX, class: 'text-destructive' },
		pending: { icon: CircleMinus, class: 'text-faint' }
	};
</script>

<ol class="m-0 flex list-none flex-wrap items-center gap-x-1 gap-y-1 p-0 text-xs">
	{#each steps as step, i (step.label)}
		{@const look = LOOK[step.state]}
		{#if i}<li aria-hidden="true" class="text-faint"><ChevronRight class="size-3.5" /></li>{/if}
		<li class="bg-paper border-line inline-flex items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-1.5" title={step.hint}>
			<look.icon class={['size-3.5 shrink-0', look.class]} aria-label={step.state} />
			<span class="font-medium">{step.label}</span>
			{#if step.result}<span class="text-muted-foreground tabular-nums">{step.result}</span>{/if}
		</li>
	{/each}
</ol>
