<script lang="ts">
	import { Check, CircleDashed, Clock, Loader, Minus, Redo2, Wand2, X } from '@lucide/svelte';
	import type { AdminDataCoverageOutputDto, AdminDataStepOutputDto } from 'client';

	import { onMount, untrack } from 'svelte';

	import { AdminStartPipelineRunInputDtoStepEnum as Step } from 'client';

	import { ago, at } from '#components/admin/admin-format.js';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { compact, monthLabel } from '#lib/culinary.js';
	import { PIPELINE_STEPS, stepLabel } from '#lib/pipeline-steps.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import { cn } from '#ui/lib/utils.js';
	import Badge from '#ui/wrapped/Badge.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import PopConfirm from '#ui/wrapped/PopConfirm.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// Month by month: what is stored and what every step of the monthly run did, so a month half
	// done shows as one. A cell runs that step for that month; "Finish" runs every step that has
	// not succeeded (paid ones only when missing, the free ones again on the new data).
	interface Props {
		cityId: string;
	}

	let { cityId }: Props = $props();

	let coverage = $state<AdminDataCoverageOutputDto | null>(null);
	const loader = createLoader(
		(id: string) => api.admin.getDataCoverage({ cityId: id, months: 6 }),
		{ onSuccess: (c) => (coverage = c) }
	);
	$effect(() => {
		const id = cityId;
		untrack(() => loader.load(id));
	});
	// While something runs, the grid follows it
	onMount(() => {
		const timer = setInterval(() => {
			if (coverage?.queue.length) loader.reload();
		}, 10_000);
		return () => clearInterval(timer);
	});

	const months = $derived(coverage?.months ?? []);
	const steps = $derived(months[0]?.steps.map((s) => s.step) ?? []);
	const cellOf = (month: string, step: string) =>
		months.find((m) => m.month === month)?.steps.find((s) => s.step === step);
	const budgetOf = (step: string) => PIPELINE_STEPS.find((s) => s.value === step)?.budget;

	const STATES = {
		succeeded: { icon: Check, class: 'bg-success/15 text-success', label: 'Done' },
		skipped: { icon: Redo2, class: 'bg-wash text-muted-foreground', label: 'Skipped: done before' },
		failed: { icon: X, class: 'bg-destructive/10 text-destructive', label: 'Failed' },
		running: { icon: Loader, class: 'bg-tint text-ink', label: 'Running' },
		queued: { icon: Clock, class: 'bg-tint text-muted-foreground', label: 'Queued' },
		never: { icon: Minus, class: 'text-faint', label: 'Never ran' }
	} as const;
	const stateOf = (cell?: AdminDataStepOutputDto) => STATES[(cell?.state ?? 'never') as keyof typeof STATES];
	const titleOf = (month: string, cell?: AdminDataStepOutputDto) =>
		[
			`${stepLabel(cell?.step ?? '')}, ${monthLabel(month)}: ${stateOf(cell).label}`,
			cell?.at ? `${at(cell.at)} (${ago(cell.at)})` : '',
			cell?.summary ?? '',
			cell?.error ?? '',
			'Click to run it again'
		]
			.filter(Boolean)
			.join('\n');

	// One step for one month, or the whole month's missing steps
	let pending = $state<{ step: Step; month: string } | null>(null);
	let confirming = $state(false);
	const ask = (step: Step, month: string) => {
		pending = { step, month };
		confirming = true;
	};
	const startAction = createAction(
		(run: { step: Step; month: string }) =>
			api.admin.startPipelineRun({
				cityId,
				step: run.step,
				month: run.month,
				...(run.step === Step.MONTHLY && { onlyMissing: true })
			}),
		{
			onSuccess: () => loader.reload(),
			successNotification: (_, [run]) => ({
				title: 'Queued',
				text: `${run.step === Step.MONTHLY ? 'Finishing' : stepLabel(run.step)} ${monthLabel(run.month)}`
			})
		}
	);
	const pendingText = $derived.by(() => {
		if (!pending) return '';
		if (pending.step === Step.MONTHLY) {
			const month = months.find((m) => m.month === pending!.month);
			const paid = month?.steps.filter((s) => s.paid && s.state !== 'succeeded' && s.state !== 'skipped') ?? [];
			const cost = paid.reduce((sum, s) => sum + (budgetOf(s.step) ?? 0), 0);
			return `Runs the monthly sequence for ${monthLabel(pending.month)}: the ${paid.length} paid steps that have not succeeded (up to $${cost} on their default budgets), and every free step again on the new data. It takes an hour or more.`;
		}
		const budget = budgetOf(pending.step);
		return `${PIPELINE_STEPS.find((s) => s.value === pending!.step)?.note ?? ''}${budget ? ` Up to $${budget}.` : ' Free (LLM calls only).'}`;
	});

	const STORED = [
		{ label: 'TikTok posts', value: (m: AdminDataCoverageOutputDto['months'][number]) => m.posts.tiktok },
		{ label: 'Instagram posts', value: (m: AdminDataCoverageOutputDto['months'][number]) => m.posts.instagram },
		{ label: 'Blog articles', value: (m: AdminDataCoverageOutputDto['months'][number]) => m.posts.blog },
		{ label: 'Posts not read yet', value: (m: AdminDataCoverageOutputDto['months'][number]) => m.posts.unanalysed, warn: true },
		{ label: 'Mentions matched', value: (m: AdminDataCoverageOutputDto['months'][number]) => m.mentions.matched },
		{ label: 'Mentions unmatched', value: (m: AdminDataCoverageOutputDto['months'][number]) => m.mentions.unmatched, warn: true },
		{ label: 'Reviews', value: (m: AdminDataCoverageOutputDto['months'][number]) => m.reviews.total },
		{ label: 'Venues with reviews', value: (m: AdminDataCoverageOutputDto['months'][number]) => m.reviews.venues },
		{ label: 'Reviews not read yet', value: (m: AdminDataCoverageOutputDto['months'][number]) => m.reviews.unanalysed, warn: true },
		{ label: 'Reports built', value: (m: AdminDataCoverageOutputDto['months'][number]) => m.reports.built },
		{ label: 'Reports sent', value: (m: AdminDataCoverageOutputDto['months'][number]) => m.reports.sent }
	];
	const running = $derived(coverage?.queue.find((q) => q.state === 'running'));
	const queued = $derived(coverage?.queue.filter((q) => q.state === 'queued').length ?? 0);
</script>

{#if loader.failed}
	<ErrorState title="Couldn't load the months" onRetry={() => loader.reload()} />
{:else if !coverage}
	<AdminPanel><SkeletonRows count={10} /></AdminPanel>
{:else}
	<div class="flex min-w-0 flex-col gap-5 pb-12">
		<div class="border-line bg-paper flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border px-4 py-3 text-sm">
			{#if running}
				<span class="flex items-center gap-2 font-medium">
					<Loader class="size-4 animate-spin" />
					{stepLabel(running.step)}, {monthLabel(running.month)}
				</span>
				<span class="text-muted-foreground">since {ago(running.createdAt)}{queued ? ` · ${queued} more queued` : ''}</span>
			{:else if queued}
				<span class="text-muted-foreground">{queued} queued, starting</span>
			{:else}
				<span class="text-muted-foreground flex items-center gap-2"><CircleDashed class="size-4" /> Nothing running</span>
			{/if}
			<span class="text-muted-foreground ml-auto text-xs">
				The monthly cron reports on {monthLabel(coverage.reportMonth)}. A cell's tooltip says what the step found.
			</span>
		</div>

		<div class="border-line bg-paper overflow-x-auto rounded-md border">
			<table class="w-full min-w-[56rem] text-sm">
				<thead>
					<tr class="border-line border-b">
						<th class="text-muted-foreground w-56 px-4 py-3 text-left text-xs font-normal">Month</th>
						{#each months as m (m.month)}
							<th class="px-2 py-3 text-center align-bottom">
								<div class="flex flex-col items-center gap-1.5">
									<span class="font-semibold">{monthLabel(m.month)}</span>
									{#if m.inProgress}
										<Badge pill variant="secondary">In progress</Badge>
									{:else if m.complete}
										<Badge pill variant="success">Complete</Badge>
									{:else}
										<Badge pill variant="warning">Incomplete</Badge>
									{/if}
								</div>
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					<tr><td colspan={months.length + 1} class="eyebrow text-muted-foreground bg-sand/40 px-4 pt-3 pb-1.5">Stored</td></tr>
					{#each STORED as row (row.label)}
						<tr class="border-line/60 border-b last:border-0">
							<td class="px-4 py-1.5">{row.label}</td>
							{#each months as m (m.month)}
								{@const value = row.value(m)}
								<td class={cn('px-2 py-1.5 text-center tabular-nums', !value && 'text-faint', value && row.warn && 'text-warning font-medium')}>
									{value ? compact(value) : '—'}
								</td>
							{/each}
						</tr>
					{/each}
					<tr class="border-line/60 border-b">
						<td class="px-4 py-1.5">Apify spend</td>
						{#each months as m (m.month)}
							<td class={cn('px-2 py-1.5 text-center tabular-nums', !m.apifyUsd && 'text-faint')}>
								{m.apifyUsd ? `$${m.apifyUsd.toFixed(2)}` : '—'}
							</td>
						{/each}
					</tr>

					<tr><td colspan={months.length + 1} class="eyebrow text-muted-foreground bg-sand/40 px-4 pt-4 pb-1.5">Monthly steps</td></tr>
					{#each steps as step (step)}
						<tr class="border-line/60 border-b">
							<td class="px-4 py-1">
								<span class="flex items-center gap-2">
									{stepLabel(step)}
									{#if budgetOf(step)}<span class="text-muted-foreground text-xs">${budgetOf(step)}</span>{/if}
								</span>
							</td>
							{#each months as m (m.month)}
								{@const cell = cellOf(m.month, step)}
								{@const state = stateOf(cell)}
								<td class="px-2 py-1 text-center">
									<button
										type="button"
										title={titleOf(m.month, cell)}
										aria-label={`${stepLabel(step)}, ${monthLabel(m.month)}: ${state.label}`}
										class={cn('inline-flex h-7 w-10 cursor-pointer items-center justify-center rounded-md hover:ring-1 hover:ring-ink/30', state.class)}
										onclick={() => ask(step as unknown as Step, m.month)}>
										<state.icon class={cn('size-4', cell?.state === 'running' && 'animate-spin')} />
									</button>
								</td>
							{/each}
						</tr>
					{/each}
					<tr>
						<td class="px-4 py-3"></td>
						{#each months as m (m.month)}
							<td class="px-2 py-3 text-center">
								{#if !m.complete && !m.inProgress}
									<Button size="sm" variant="outline" icon={Wand2} onclick={() => ask(Step.MONTHLY, m.month)}>Finish</Button>
								{/if}
							</td>
						{/each}
					</tr>
				</tbody>
			</table>
		</div>

		<AdminPanel title="On their own schedule">
			<ul class="divide-line m-0 flex list-none flex-col divide-y p-0 text-sm">
				{#each coverage.recurring as row (row.step)}
					{@const state = stateOf(row)}
					<li class="flex items-center gap-3 py-2">
						<span class={cn('inline-flex h-6 w-8 shrink-0 items-center justify-center rounded-md', state.class)}>
							<state.icon class="size-3.5" />
						</span>
						<span class="w-52 shrink-0 font-medium">{stepLabel(row.step)}</span>
						<span class="text-muted-foreground min-w-0 flex-1 truncate">
							{row.at ? `${ago(row.at)} · ` : 'Never ran'}{row.summary ?? row.error ?? ''}
						</span>
						<Button size="sm" variant="ghost" onclick={() => ask(row.step as unknown as Step, coverage!.reportMonth)}>Run now</Button>
					</li>
				{/each}
			</ul>
		</AdminPanel>
	</div>
{/if}

<PopConfirm
	bind:open={confirming}
	title={pending ? (pending.step === Step.MONTHLY ? `Finish ${monthLabel(pending.month)}?` : `Run ${stepLabel(pending.step)} for ${monthLabel(pending.month)}?`) : ''}
	description={pendingText}
	confirmText={pending?.step === Step.MONTHLY ? 'Finish the month' : 'Queue it'}
	onConfirm={() => pending && startAction.execute(pending)} />
