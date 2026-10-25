<script lang="ts">
	import { Play, Users } from '@lucide/svelte';
	import type { AdminPipelineRunOutputDto } from 'client';

	import { onMount } from 'svelte';

	import { AdminStartPipelineRunInputDtoStepEnum as Step } from 'client';

	import LlmBacklogsPanel from './LlmBacklogsPanel.svelte';

	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { lastMonth, monthLabel, recentMonths } from '#lib/culinary.js';
	import { PIPELINE_STEPS as STEPS } from '#lib/pipeline-steps.js';
	import { enumToName } from '#lib/util.js';
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';
	import type { Column } from '#ui/components/paginated-data-table/index.js';
	import PaginatedDataTable from '#ui/components/paginated-data-table/PaginatedDataTable.svelte';
	import { createAction } from '#ui/lib/action.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';
	import Input from '#ui/wrapped/Input.svelte';
	import Select from '#ui/wrapped/Select.svelte';

	// Start any step by hand, fill competitors, and every run so far. The city is the page's.
	interface Props {
		cityId: string;
	}

	let { cityId }: Props = $props();

	adminCitiesStore.load();
	const cityName = $derived(adminCitiesStore.list.find((c) => c.id === cityId)?.name ?? '');

	let step = $state<Step>(Step.MONTHLY);
	let month = $state(lastMonth());
	let budget = $state<string | number>('');
	let top = $state<string | number>(20);
	const selected = $derived(STEPS.find((s) => s.value === step)!);
	const MONTHS = recentMonths(12).map((m) => ({ value: m, label: monthLabel(m) }));

	// Bumped to refetch both tables; ticks on its own while the page is open
	let refreshKey = $state(0);
	onMount(() => {
	const timer = setInterval(() => refreshKey++, 10_000);
	return () => clearInterval(timer);
	});

	const startAction = createAction(
	() =>
		api.admin.startPipelineRun({
			cityId,
			step,
			month,
			budgetUsd: budget === '' ? undefined : Number(budget),
			top: selected.top ? Number(top) : undefined
		}),
	{
		onSuccess: () => refreshKey++,
		successNotification: () => ({ title: 'Queued', text: `${selected.label}, ${cityName}, ${monthLabel(month)}` })
	}
	);

	// The month's report venues: the Month and Top venues fields above
	const fillAction = createAction(() => api.admin.fillCompetitors({ cityId, month, top: Number(top) || undefined }), {
	successNotification: (res) => ({
		title: 'Competitors filled',
		text: `${res.added} added to ${res.filled} venues; ${res.skipped} already had some`
	})
	});

	const duration = (run: AdminPipelineRunOutputDto) => {
	if (!run.startedAt) return '';
	const ms = new Date(run.finishedAt ?? Date.now()).getTime() - new Date(run.startedAt).getTime();
	return ms < 60_000 ? `${Math.round(ms / 1000)}s` : `${Math.round(ms / 60_000)} min`;
	};
	const statusVariant = (status: string) =>
	status === 'SUCCEEDED' ? 'success' : status === 'FAILED' ? 'destructive' : status === 'PARTIAL' ? 'warning' : 'secondary';

	const RUN_COLUMNS: Column<AdminPipelineRunOutputDto>[] = [
	{ type: 'date', name: 'Started', relative: true, value: (row) => row.createdAt },
	{ type: 'value', name: 'City', value: (row) => row.city.name },
	{ type: 'value', name: 'Step', value: (row) => STEPS.find((s) => s.value === `${row.step}`)?.label ?? enumToName(row.step) },
	{ type: 'value', name: 'Month', value: (row) => monthLabel(row.month) },
	{ type: 'badge', name: 'Status', value: (row) => enumToName(row.status), variant: (row) => statusVariant(row.status) },
	{ type: 'value', name: 'Took', value: duration },
	{
		type: 'value',
		name: 'Result',
		truncate: 70,
		value: (row) => row.error ?? (row.result ? JSON.stringify(row.result) : '')
	}
	];

</script>

<div class="flex min-w-0 flex-col gap-5 pb-12">
	<AdminPanel title="Start a run">
		<div class="flex flex-wrap items-end gap-3">
			<label class="flex flex-col gap-1 text-sm">
				<span class="text-muted-foreground text-xs">Step</span>
				<Select items={STEPS.map((s) => ({ value: s.value, label: s.label }))} bind:value={step} aria-label="Step" />
			</label>
			<label class="flex flex-col gap-1 text-sm">
				<span class="text-muted-foreground text-xs">Month</span>
				<Select items={MONTHS} bind:value={month} aria-label="Month" />
			</label>
			{#if selected.budget}
				<label class="flex w-32 flex-col gap-1 text-sm">
					<span class="text-muted-foreground text-xs">Budget (USD)</span>
					<Input type="number" min="0" max="100" placeholder={`city's, else ${selected.budget}`} bind:value={budget} />
				</label>
			{/if}
			{#if selected.top}
				<label class="flex w-28 flex-col gap-1 text-sm">
					<span class="text-muted-foreground text-xs">Report brands</span>
					<Input type="number" min="1" max="200" bind:value={top} />
				</label>
			{/if}
			<Button icon={Play} loading={startAction.executing} disabled={!cityId} onclick={() => startAction.execute()}>Start</Button>
		</div>
		<p class="text-muted-foreground m-0 mt-3 text-sm">{selected.note} Runs go one at a time, in the background.</p>
	</AdminPanel>

	<AdminPanel title="Competitors">
		<div class="flex flex-wrap items-center gap-3">
			<Button variant="outline" icon={Users} loading={fillAction.executing} disabled={!cityId} onclick={() => fillAction.execute()}>
				Fill competitors for the top {top} brands of {cityName}, {monthLabel(month)}
			</Button>
		</div>
		<p class="text-muted-foreground m-0 mt-3 text-sm">
			Each report brand without competitors gets its five best suggestions (same kind of food, same or next
			district, most talked about). Brands that have some are left alone. Free; run it before scraping reviews so
			their reviews are scraped too.
		</p>
	</AdminPanel>

	<LlmBacklogsPanel {refreshKey} />

	<section class="flex min-w-0 flex-col gap-2">
		<h2 class="m-0 text-base font-semibold">Runs</h2>
		<PaginatedDataTable key={refreshKey} filters={{ cityId }} api={api.admin.listPipelineRuns} noun="runs" columns={RUN_COLUMNS} limit={25} />
	</section>
</div>
