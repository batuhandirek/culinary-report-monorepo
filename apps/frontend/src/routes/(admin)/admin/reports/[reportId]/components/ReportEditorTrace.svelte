<script lang="ts">
	import type { ReportHighlights } from 'client';

	import AdminFacts from '#components/admin/AdminFacts.svelte';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import Collapsible from '#ui/wrapped/Collapsible.svelte';
	import Notice from '#ui/wrapped/Notice.svelte';

	// How the editor's read (the letter, the cards, the actions) went: the kind of month it
	// called, its tool calls, its notes, the lines the check cut, the tokens. Admin only.
	interface Props {
		highlights: ReportHighlights;
	}

	let { highlights }: Props = $props();
	const trace = $derived(highlights.trace);
	const tokens = $derived(trace?.usage?.totalTokens);
</script>

{#if trace}
	<AdminPanel
		title="The editor"
		note={`${highlights.kind === 'quiet' ? 'a quiet month' : 'a story month'} · ${highlights.letter?.length ?? 0} paragraphs · ${highlights.highlights.length} cards · ${highlights.actions.length} actions · ${trace.toolCalls} tool calls${tokens ? ` · ${tokens.toLocaleString('en')} tokens` : ''}`}>
		{#if trace.error}
			<Notice
				tone="danger"
				size="sm"
				title="The editor failed: the written part is the code-written fallback"
				text={trace.error} />
		{/if}
		<Collapsible withPrefixIcon triggerClass="py-1 text-sm font-medium">
			{#snippet trigger()}How it was written{/snippet}
			<div class="flex flex-col gap-4 pt-3 text-sm">
				<AdminFacts
					items={[
						{ label: 'Model', value: trace.model, mono: true },
						{ label: 'Model steps', value: trace.modelSteps },
						{ label: 'Tool calls', value: trace.toolCalls },
						{
							label: 'Tokens',
							value: tokens,
							hint: trace.usage
								? `${trace.usage.inputTokens ?? '—'} in · ${trace.usage.outputTokens ?? '—'} out`
								: undefined
						},
						{ label: 'Duration', value: `${(trace.durationMs / 1000).toFixed(1)} s` },
						{
							label: 'Lines cut',
							value: trace.problems.length,
							tone: trace.problems.length ? 'danger' : 'muted'
						}
					]} />

				{#if trace.steps.length}
					<div>
						<p class="eyebrow text-muted-foreground m-0 mb-1.5">Tool calls</p>
						<ol class="m-0 flex list-none flex-col gap-1.5 p-0 text-xs">
							{#each trace.steps as step (step.step)}
								<li class="grid grid-cols-[2rem_8rem_minmax(0,1fr)] gap-x-2">
									<span class="text-muted-foreground tabular-nums">{step.step}</span>
									<span class="font-mono">{step.tool}</span>
									<span class="min-w-0">
										<code class="text-[11px] break-all">{JSON.stringify(step.input)}</code>
										<span class="text-muted-foreground block break-words"
											>{step.resultSummary}</span>
									</span>
								</li>
							{/each}
						</ol>
					</div>
				{/if}

				{#if highlights.notes}
					<div>
						<p class="eyebrow text-muted-foreground m-0 mb-1.5">The editor's notes</p>
						<p class="m-0 text-xs leading-relaxed whitespace-pre-wrap">{highlights.notes}</p>
					</div>
				{/if}

				{#if trace.problems.length}
					<div>
						<p class="eyebrow text-muted-foreground m-0 mb-1.5">Lines the check cut</p>
						<ul class="m-0 list-none p-0 text-xs">
							{#each trace.problems as p, i (i)}
								<li><span class="font-mono">{p.where}</span> · {p.problem}</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		</Collapsible>
	</AdminPanel>
{/if}
