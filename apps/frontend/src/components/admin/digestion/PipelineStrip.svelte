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
		/** No pill around each step, a step that only got partly marked by a ground: inside a card (the post page) */
		flat?: boolean;
	}

	let { steps, flat = false }: Props = $props();

	const LOOK = {
		done: { icon: CircleCheck, class: 'text-success' },
		partly: { icon: CircleDashed, class: 'text-warning' },
		skipped: { icon: CircleX, class: 'text-destructive' },
		pending: { icon: CircleMinus, class: 'text-faint' }
	};
</script>

<ol class={['m-0 flex list-none flex-wrap items-center p-0 text-xs', flat ? 'gap-0' : 'gap-x-1 gap-y-1']}>
	{#each steps as step, i (step.label)}
		{@const look = LOOK[step.state]}
		{#if i}<li aria-hidden="true" class="text-faint"><ChevronRight class="size-3.5" /></li>{/if}
		<li
			class={[
				'inline-flex items-center gap-1.5',
				flat ? ['h-6 rounded-md px-2', step.state === 'partly' && 'bg-warning/15', step.state === 'skipped' && 'bg-destructive/10'] : 'bg-paper border-line rounded-full border py-0.5 pr-2.5 pl-1.5'
			]}
			title={step.hint}>
			<!-- On the amber ground the warning colour fades: the badge's darker amber there -->
			<look.icon class={['size-3.5 shrink-0', flat && step.state === 'partly' ? 'text-[hsl(30_85%_30%)]' : look.class]} aria-label={step.state} />
			<span class={flat ? 'font-semibold' : 'font-medium'}>{step.label}</span>
			{#if step.result}<span class="text-muted-foreground tabular-nums">{step.result}</span>{/if}
		</li>
	{/each}
</ol>
