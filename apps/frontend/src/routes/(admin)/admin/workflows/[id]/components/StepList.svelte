<script lang="ts">
	import { ArrowRight, GitFork } from '@lucide/svelte';
	import type { AdminWorkflowStepOutputDto } from 'client';

	import { atExact, clock } from '#components/admin/admin-format.js';
	import AdminRawJson from '#components/admin/AdminRawJson.svelte';
	import { formatDuration, stepDuration, workflowHref } from '#lib/workflow-status.js';
	import { cn } from '#ui/lib/utils.js';
	import Button from '#ui/wrapped/Button.svelte';

	// A run's steps in the order they ran: name, when and how long, the child run a step
	// started, and what each stored (the result a resume or a fork replays) or its error.
	interface Props {
		steps: AdminWorkflowStepOutputDto[];
		/** Fork a new run that starts afresh from this step */
		onFork: (step: AdminWorkflowStepOutputDto) => void;
	}

	let { steps, onFork }: Props = $props();

	const parse = (json: string): unknown => {
		try {
			return JSON.parse(json);
		} catch {
			return json;
		}
	};
</script>

<ol class="m-0 flex list-none flex-col p-0">
	{#each steps as step (step.functionId)}
		{@const took = stepDuration(step)}
		<li class="border-line flex gap-3 border-t py-3 first:border-t-0 first:pt-0">
			<span
				class={cn(
					'grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums',
					step.error ? 'bg-destructive/10 text-destructive' : 'bg-wash text-ink'
				)}
				title="The step's position: fork takes it">{step.functionId}</span>
			<div class="flex min-w-0 flex-1 flex-col gap-1.5">
				<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
					<span class="font-medium break-all">{step.name}</span>
					<span class="text-muted-foreground text-xs tabular-nums" title={atExact(step.startedAt)}>
						{#if step.startedAt}{clock(step.startedAt, true)}{/if}
						{#if took !== undefined}· {formatDuration(took)}{/if}
					</span>
					{#if step.childWorkflowId}
						<a
							class="text-beet flex items-center gap-1 text-xs underline-offset-2 hover:underline"
							href={workflowHref(step.childWorkflowId)}>
							Child run <span class="font-mono">{step.childWorkflowId.slice(0, 8)}</span>
							<ArrowRight class="size-3" />
						</a>
					{/if}
					<Button size="sm" variant="ghost" icon={GitFork} class="ml-auto" onclick={() => onFork(step)}>
						Fork from here
					</Button>
				</div>
				{#if step.error}
					<pre
						class="bg-destructive/10 text-destructive m-0 max-h-60 overflow-auto rounded-md p-3 font-mono text-xs whitespace-pre-wrap">{step.error}</pre>
				{/if}
				{#if step.output !== undefined}
					<AdminRawJson value={parse(step.output)} label="Stored result" />
				{/if}
			</div>
		</li>
	{/each}
</ol>
