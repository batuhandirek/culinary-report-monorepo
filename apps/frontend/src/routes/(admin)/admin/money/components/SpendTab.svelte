<script lang="ts">
	import {
		type AdminLlmSpendOutputDto,
		type AdminLlmSpendRowOutputDto,
		LlmSpendParamsGroupByEnum as Group
	} from 'client';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onDay } from '#components/admin/admin-format.js';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { DEFAULT_SPEND_GROUP, providerLabel, SPEND_GROUPS } from '#constants/ADMIN_MONEY_TABS.js';
	import { api } from '#lib/api.js';
	import { addDays, daysBetween, monthEnd, monthStart, tokens, usd, utcToday } from '#lib/spend-format.js';
	import { workflowHref } from '#lib/workflow-status.js';
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';
	import { cn } from '#ui/lib/utils.js';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import Input from '#ui/wrapped/Input.svelte';
	import Select from '#ui/wrapped/Select.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// The LLM call ledger over a range of UTC days, summed by what was chosen. The range is
	// picked as the days it covers; the API takes the day after the last.
	adminCitiesStore.load();

	const today = utcToday();
	const DEFAULT_FROM = monthStart(today);
	const isDay = (value: string | null): value is string => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);

	const from = $derived(isDay(page.url.searchParams.get('from')) ? page.url.searchParams.get('from')! : DEFAULT_FROM);
	const to = $derived(isDay(page.url.searchParams.get('to')) ? page.url.searchParams.get('to')! : today);
	const groupBy = $derived(
		(SPEND_GROUPS.find((g) => g.value === page.url.searchParams.get('groupBy'))?.value ?? DEFAULT_SPEND_GROUP) as Group
	);

	const setParams = (next: { from?: string; to?: string; groupBy?: string }) => {
		const url = new URL(page.url.href);
		const values = { from, to, groupBy, ...next };
		const defaults = { from: DEFAULT_FROM, to: today, groupBy: DEFAULT_SPEND_GROUP };
		for (const key of ['from', 'to', 'groupBy'] as const) {
			if (values[key] === defaults[key]) url.searchParams.delete(key);
			else url.searchParams.set(key, values[key]);
		}
		goto(url, { replace: true, reset: false });
	};

	const lastMonth = addDays(DEFAULT_FROM, -1);
	const PRESETS = [
		{ label: 'This month', from: DEFAULT_FROM, to: today },
		{ label: 'Last month', from: monthStart(lastMonth), to: monthEnd(lastMonth) },
		{ label: 'Last 7 days', from: addDays(today, -6), to: today },
		{ label: 'Last 30 days', from: addDays(today, -29), to: today },
		{ label: 'Today', from: today, to: today }
	];

	let result = $state<AdminLlmSpendOutputDto | null>(null);
	let failed = $state<Error | null>(null);
	let loading = $state(false);
	let request = 0;
	const load = () => {
		const mine = ++request;
		loading = true;
		failed = null;
		api.admin
			.llmSpend({ from, to: addDays(to, 1), groupBy })
			.then((res) => {
				if (mine === request) result = res;
			})
			.catch((e: Error) => {
				if (mine === request) failed = e;
			})
			.finally(() => {
				if (mine === request) loading = false;
			});
	};
	$effect(() => {
		void [from, to, groupBy];
		if (from <= to) load();
	});

	// By day: every day of the range in order, the quiet ones as zeros, so the bars read as a calendar
	const rows = $derived.by((): AdminLlmSpendRowOutputDto[] => {
		if (!result) return [];
		if ((result.groupBy as string) !== Group.Day) return result.rows;
		const byDay = new Map(result.rows.map((row) => [row.key, row]));
		return daysBetween(from, to).map(
			(day) =>
				byDay.get(day) ?? { key: day, calls: 0, failed: 0, inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, usd: 0 }
		);
	});
	// The bar measures dollars, or calls while everything was free
	const barBy = $derived(result && result.total.usd > 0 ? 'usd' : 'calls');
	const barMax = $derived(Math.max(0, ...rows.map((row) => (barBy === 'usd' ? row.usd : row.calls))));

	const cityName = (id: string) => adminCitiesStore.list.find((c) => c.id === id)?.name ?? id.slice(0, 8);
	const callsHref = (param: string, value: string) =>
		`/admin/money?tab=calls&${param}=${encodeURIComponent(value)}`;

	/** What a row is, in words, and where it leads */
	const label = (key: string): { text: string; href?: string; mono?: boolean } => {
		if (key === 'none')
			return { text: groupBy === Group.City ? 'No city' : groupBy === Group.Workflow ? 'Outside a workflow' : 'None' };
		switch (groupBy) {
			case Group.Agent:
				return { text: key, href: callsHref('agentId', key) };
			case Group.Purpose:
				return { text: key, href: callsHref('purpose', key) };
			case Group.City:
				return { text: cityName(key), href: callsHref('cityId', key) };
			case Group.Workflow:
				return { text: key.slice(0, 8), href: workflowHref(key), mono: true };
			case Group.Provider:
				return { text: providerLabel(key) };
			case Group.Day:
				return { text: onDay(key) };
			default:
				return { text: key };
		}
	};
	const groupLabel = $derived(SPEND_GROUPS.find((g) => g.value === groupBy)?.label ?? 'Key');
</script>

<div class="flex min-w-0 flex-col gap-4">
	<div class="flex flex-wrap items-end gap-3">
		<label class="flex flex-col gap-1 text-xs font-medium">
			From
			<Input type="date" value={from} max={to} class="h-9 w-40" onchange={(e) => isDay(e.currentTarget.value) && setParams({ from: e.currentTarget.value })} />
		</label>
		<label class="flex flex-col gap-1 text-xs font-medium">
			Through
			<Input type="date" value={to} min={from} class="h-9 w-40" onchange={(e) => isDay(e.currentTarget.value) && setParams({ to: e.currentTarget.value })} />
		</label>
		<label class="flex flex-col gap-1 text-xs font-medium">
			Grouped by
			<div class="w-40">
				<Select items={SPEND_GROUPS} value={groupBy} size="sm" aria-label="Group by" onValueChange={(v) => v && setParams({ groupBy: v })} />
			</div>
		</label>
		<div class="flex flex-wrap gap-1.5 pb-1">
			{#each PRESETS as preset (preset.label)}
				<button
					type="button"
					class="chip"
					aria-pressed={preset.from === from && preset.to === to}
					onclick={() => setParams({ from: preset.from, to: preset.to })}>{preset.label}</button>
			{/each}
		</div>
	</div>

	<AdminPanel title={`By ${groupLabel.toLowerCase()}`} note={result ? `${onDay(from)} – ${onDay(to)}, UTC` : undefined}>
		{#if from > to}
			<EmptyState title="The range ends before it starts" hint="Pick a first day on or before the last." ground="none" size="sm" />
		{:else if failed && !result}
			<ErrorState onRetry={load} />
		{:else if !result}
			<SkeletonRows count={5} lines={1} trailing />
		{:else if !result.total.calls}
			<EmptyState title="No LLM calls in this range" hint="Every agent and classifier call is filed in the ledger as it is made." ground="none" />
		{:else}
			<div class={cn('overflow-x-auto transition-opacity', loading && 'opacity-60')}>
				<table class="w-full text-sm">
					<thead>
						<tr class="text-muted-foreground text-left text-xs">
							<th class="py-1 font-medium">{groupLabel}</th>
							{#if groupBy === Group.Day}
								<th class="w-1/4 px-2 py-1 font-medium">{barBy === 'usd' ? 'Dollars' : 'Calls (all free)'}</th>
							{/if}
							<th class="px-2 py-1 text-right font-medium">Calls</th>
							<th class="px-2 py-1 text-right font-medium">Failed</th>
							<th class="px-2 py-1 text-right font-medium whitespace-nowrap" title="Input tokens, cached ones included">Input</th>
							<th class="px-2 py-1 text-right font-medium" title="Input tokens read from the provider's cache">Cached</th>
							<th class="px-2 py-1 text-right font-medium">Output</th>
							<th class="py-1 pl-2 text-right font-medium">Cost</th>
						</tr>
					</thead>
					<tbody class="divide-line divide-y">
						{#each rows as row (row.key)}
							{@const name = label(row.key)}
							{@const measure = barBy === 'usd' ? row.usd : row.calls}
							<tr class={cn(!row.calls && 'text-muted-foreground')}>
								<td class="max-w-[22rem] truncate py-1.5 pr-2" title={row.key}>
									{#if name.href}
										<a class={cn('decoration-line hover:decoration-ink underline underline-offset-2', name.mono && 'font-mono text-xs')} href={name.href}>{name.text}</a>
									{:else}
										<span class={cn(name.mono && 'font-mono text-xs')}>{name.text}</span>
									{/if}
								</td>
								{#if groupBy === Group.Day}
									<td class="px-2 py-1.5">
										<div class="bg-wash h-2.5 w-full rounded-sm">
											<div class="bg-primary-darker h-full rounded-sm" style:width={barMax ? `${(measure / barMax) * 100}%` : '0'}></div>
										</div>
									</td>
								{/if}
								<td class="px-2 py-1.5 text-right tabular-nums">{row.calls.toLocaleString('en')}</td>
								<td class={cn('px-2 py-1.5 text-right tabular-nums', row.failed ? 'text-destructive font-semibold' : 'text-muted-foreground')}>{row.failed}</td>
								<td class="px-2 py-1.5 text-right tabular-nums">{tokens(row.inputTokens)}</td>
								<td class="text-muted-foreground px-2 py-1.5 text-right tabular-nums">{tokens(row.cachedInputTokens)}</td>
								<td class="px-2 py-1.5 text-right tabular-nums">{tokens(row.outputTokens)}</td>
								<td class="py-1.5 pl-2 text-right font-medium tabular-nums">{usd(row.usd)}</td>
							</tr>
						{/each}
					</tbody>
					<tfoot>
						<tr class="border-ink border-t-2 font-semibold">
							<td class="py-2 pr-2">Total</td>
							{#if groupBy === Group.Day}<td></td>{/if}
							<td class="px-2 py-2 text-right tabular-nums">{result.total.calls.toLocaleString('en')}</td>
							<td class={cn('px-2 py-2 text-right tabular-nums', result.total.failed && 'text-destructive')}>{result.total.failed}</td>
							<td class="px-2 py-2 text-right tabular-nums">{tokens(result.total.inputTokens)}</td>
							<td class="px-2 py-2 text-right tabular-nums">{tokens(result.total.cachedInputTokens)}</td>
							<td class="px-2 py-2 text-right tabular-nums">{tokens(result.total.outputTokens)}</td>
							<td class="py-2 pl-2 text-right tabular-nums">{usd(result.total.usd)}</td>
						</tr>
					</tfoot>
				</table>
			</div>
		{/if}
		<p class="text-muted-foreground m-0 mt-3 text-sm">
			Every agent and classifier call, succeeded or not, with the model that answered. Calls on OpenAI's daily allowance and
			OpenRouter's free models cost $0; Claude and TypeSafe are priced. Apify is not here: its account is on the Apify credit tab,
			each run's cost on the Data page.
		</p>
	</AdminPanel>
</div>
