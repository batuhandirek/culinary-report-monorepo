<script lang="ts">
	import type { ReportAnalysis } from 'client';

	import { at } from '#components/admin/admin-format.js';
	import AdminFacts from '#components/admin/AdminFacts.svelte';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import Collapsible from '#ui/wrapped/Collapsible.svelte';
	import Notice from '#ui/wrapped/Notice.svelte';

	// How the analysis ("What moved, and why it might have") went: the moves found with their
	// scores, every check (the owner never sees the ones whose data was missing), the agent's
	// tool calls, its notes and reasoning, the lines the check dropped, the tokens. Admin only.
	interface Props {
		analysis?: ReportAnalysis;
	}

	let { analysis }: Props = $props();
	const trace = $derived(analysis?.trace);
	const tokens = $derived(trace?.usage?.totalTokens);
</script>

{#if analysis && trace}
	<AdminPanel
		title="Analysis"
		note={trace.skipped ?
			`skipped: ${trace.skipped}`
		:	`${analysis.observations.length} moves · ${analysis.investigations.length} investigated · ${trace.toolCalls} tool calls${tokens ? ` · ${tokens.toLocaleString('en')} tokens` : ''}`}>
		{#if trace.error}
			<Notice tone="danger" size="sm" title="The agent failed" text={trace.error} />
		{:else if trace.skipped}
			<Notice tone="neutral" size="sm" text={trace.skipped === 'no previous month' ? 'A first report: nothing to compare the month with.' : 'Nothing moved past the thresholds this month.'} />
		{/if}
		<Collapsible withPrefixIcon triggerClass="py-1 text-sm font-medium">
			{#snippet trigger()}How we got here{/snippet}
			<div class="flex flex-col gap-4 pt-3 text-sm">
				<AdminFacts
					items={[
						{ label: 'Model', value: trace.model, mono: true },
						{ label: 'Built', value: at(analysis.builtAt) },
						{ label: 'Model steps', value: trace.modelSteps },
						{ label: 'Tool calls', value: trace.toolCalls },
						{ label: 'Tokens', value: tokens, hint: trace.usage ? `${trace.usage.inputTokens ?? '—'} in · ${trace.usage.outputTokens ?? '—'} out` : undefined },
						{ label: 'Duration', value: `${(trace.durationMs / 1000).toFixed(1)} s` },
						{ label: 'Problems', value: trace.problems.length, tone: trace.problems.length ? 'danger' : 'muted' }
					]} />

				{#if analysis.observations.length}
					<div>
						<p class="eyebrow text-muted-foreground m-0 mb-1.5">Moves found</p>
						<div class="overflow-x-auto">
							<table class="w-full min-w-[36rem] border-collapse text-xs">
								<thead>
									<tr class="text-muted-foreground text-left">
										<th class="py-1 pr-3 font-medium">Key</th>
										<th class="py-1 pr-3 font-medium">From → to</th>
										<th class="py-1 pr-3 font-medium">Against</th>
										<th class="py-1 pr-3 font-medium">Resolution</th>
										<th class="py-1 pr-3 text-right font-medium">Score</th>
										<th class="py-1 font-medium">Checks</th>
									</tr>
								</thead>
								<tbody>
									{#each analysis.observations as o, i (o.key)}
										<tr class="border-line border-t align-top">
											<td class="py-1.5 pr-3 font-mono">{o.key}{i < analysis.investigations.length ? ' ★' : ''}</td>
											<td class="py-1.5 pr-3 tabular-nums">{o.from} → {o.to}</td>
											<td class="py-1.5 pr-3">{o.comparedWith}</td>
											<td class="py-1.5 pr-3">{o.resolution}</td>
											<td class="py-1.5 pr-3 text-right tabular-nums">{o.score}</td>
											<td class="py-1.5">
												<ul class="m-0 list-none p-0">
													{#each o.checks as c, j (j)}
														<li class={[c.verdict === 'unknown' && 'text-muted-foreground']}>
															<span class="font-mono">[{c.verdict}]</span>
															{c.question}
															<span class="text-muted-foreground">{c.answer}</span>
														</li>
													{/each}
												</ul>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
						<p class="text-muted-foreground m-0 mt-1 text-[11px]">★ investigated by the agent. Checks marked unknown are shown here only.</p>
					</div>
				{/if}

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
										<span class="text-muted-foreground block break-words">{step.resultSummary}</span>
									</span>
								</li>
							{/each}
						</ol>
					</div>
				{/if}

				{#if trace.notes}
					<div>
						<p class="eyebrow text-muted-foreground m-0 mb-1.5">The model's notes</p>
						<p class="m-0 text-xs leading-relaxed whitespace-pre-wrap">{trace.notes}</p>
					</div>
				{/if}
				{#if trace.reasoning}
					<div>
						<p class="eyebrow text-muted-foreground m-0 mb-1.5">Reasoning</p>
						<pre class="bg-wash m-0 max-h-64 overflow-auto rounded-md p-3 text-[11px] leading-relaxed whitespace-pre-wrap">{trace.reasoning}</pre>
					</div>
				{/if}

				{#if trace.problems.length}
					<div>
						<p class="eyebrow text-muted-foreground m-0 mb-1.5">Lines the check dropped or replaced</p>
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
