<script lang="ts">
	import type { AdminWorkflowStepOutputDto } from 'client';

	import Button from '#ui/wrapped/Button.svelte';
	import ResponsiveModal from '#ui/wrapped/ResponsiveModal.svelte';
	import Select from '#ui/wrapped/Select.svelte';

	// Fork: a new run of the same workflow with the same input, whose steps before the chosen
	// one are copied from this run and the rest run again (a step that pays runs again too).
	interface Props {
		open: boolean;
		steps: AdminWorkflowStepOutputDto[];
		/** The step picked where the dialog was opened from */
		startStep: number;
		forking: boolean;
		onFork: (startStep: number) => void;
	}

	let { open = $bindable(), steps, startStep, forking, onFork }: Props = $props();

	let picked = $state('0');
	$effect(() => {
		if (open) picked = String(startStep);
	});

	const items = $derived([
		...steps.map((step) => ({ value: String(step.functionId), label: `${step.functionId} · ${step.name}` })),
		// Past the last finished step: everything is copied and the run goes on from there
		...(steps.length
			? [{ value: String(steps.at(-1)!.functionId + 1), label: `${steps.at(-1)!.functionId + 1} · after the last step` }]
			: [])
	]);
	const copied = $derived(steps.filter((step) => step.functionId < Number(picked)).length);
</script>

<ResponsiveModal bind:open title="Fork this run" size="md" description="A new run with the same input, starting afresh from a step.">
	<div class="flex flex-col gap-4">
		<label class="flex flex-col gap-2 text-sm font-medium">
			Start from step
			<Select items={items.length ? items : [{ value: '0', label: '0 · the first step' }]} bind:value={picked} aria-label="Start from step" />
		</label>
		<p class="text-muted-foreground m-0 text-sm">
			{#if copied}
				The {copied} step{copied === 1 ? '' : 's'} before it keep{copied === 1 ? 's' : ''} this run's stored results;
				that step and every one after it run again.
			{:else}
				Every step runs again, as a fresh start with the same input.
			{/if}
			A step that runs again and calls Apify or a paid model may pay again.
		</p>
		<div class="flex justify-end gap-2">
			<Button variant="ghost" onclick={() => (open = false)}>Cancel</Button>
			<Button loading={forking} onclick={() => onFork(Number(picked))}>Fork</Button>
		</div>
	</div>
</ResponsiveModal>
