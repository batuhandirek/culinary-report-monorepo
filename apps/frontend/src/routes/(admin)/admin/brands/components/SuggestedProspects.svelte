<script lang="ts">
	import { ArrowUpRight, ListPlus, Plus, RefreshCw } from '@lucide/svelte';
	import type { AdminSuggestedProspectOutputDto } from 'client';

	import { api } from '#lib/api.js';
	import { LEAD_SIGNAL_LABELS, leadScoreVariant } from '#lib/culinary.js';
	import { notificationManager } from '#ui/lib/notification-manager.js';
	import { Badge } from '#ui/primitives-new/badge/index.js';
	import { Skeleton } from '#ui/primitives-new/skeleton/index.js';
	import Button from '#ui/wrapped/Button.svelte';
	import PopConfirm from '#ui/wrapped/PopConfirm.svelte';

	// The best-scoring brands that are not prospects yet. Adding one keeps it in view with a
	// link to its prospect page, so a run of adds doesn't shift the rows under the cursor.
	const SIZE = 20;
	const SIGNALS = Object.keys(LEAD_SIGNAL_LABELS) as (keyof typeof LEAD_SIGNAL_LABELS)[];

	let rows = $state<AdminSuggestedProspectOutputDto[] | null>(null);
	let failed = $state(false);
	let added = $state<Record<string, string>>({});
	let adding = $state<Record<string, boolean>>({});
	let bulk = $state<{ done: number; total: number } | null>(null);
	let confirmBulk = $state(false);

	async function load() {
		failed = false;
		try {
			rows = await api.admin.listSuggestedProspects({ size: SIZE });
			added = {};
		} catch {
			failed = true;
		}
	}
	load();

	async function add(brandId: string) {
		adding[brandId] = true;
		try {
			const prospect = await api.admin.addProspect({ brandId });
			added[brandId] = prospect.id;
			return true;
		} catch {
			return false;
		} finally {
			adding[brandId] = false;
		}
	}

	const pending = $derived((rows ?? []).filter((row) => !added[row.id]));

	// One at a time: each add may write the prospect's hook with an LLM call
	async function addAll() {
		const queue = [...pending];
		bulk = { done: 0, total: queue.length };
		let failures = 0;
		for (const row of queue) {
			if (!(await add(row.id))) failures++;
			bulk.done++;
		}
		bulk = null;
		notificationManager.addNotification(
			failures
				? { title: `${failures} of ${queue.length} could not be added`, warning: true }
				: { title: `${queue.length} brands added to the sales list`, success: true }
		);
	}

	const percent = (value: number | null | undefined) =>
		value == null ? '—' : `${Math.round(value * 100)}`;
</script>

<div class="flex flex-col gap-3">
	<div class="flex flex-wrap items-center gap-2">
		<p class="text-muted-foreground mr-auto text-sm">
			The {SIZE} highest lead scores among brands not on the list yet. Signals are 0–100;
			"—" means not enough data.
		</p>
		<Button variant="outline" size="sm" icon={RefreshCw} onclick={load} disabled={!!bulk}>
			Refresh
		</Button>
		<PopConfirm
			bind:open={confirmBulk}
			title={`Add ${pending.length} brands to the sales list?`}
			description="Each becomes a prospect to contact, with a hook written from its report."
			confirmText="Add all"
			onConfirm={addAll} />
		<Button
			size="sm"
			icon={ListPlus}
			loading={!!bulk}
			disabled={!pending.length || !!bulk}
			onclick={() => (confirmBulk = true)}>
			{bulk ? `Adding ${bulk.done} / ${bulk.total}…` : `Add all ${pending.length}`}
		</Button>
	</div>

	<div class="border-line bg-paper overflow-x-auto rounded-md border">
		<table class="w-full text-sm">
			<thead class="text-muted-foreground border-line border-b text-left text-xs">
				<tr>
					<th class="px-3 py-2 font-medium">Venue</th>
					<th class="px-3 py-2 text-right font-medium">Score</th>
					{#each SIGNALS as key (key)}
						<th class="px-3 py-2 text-right font-medium" title={LEAD_SIGNAL_LABELS[key].hint}>
							{LEAD_SIGNAL_LABELS[key].name}
						</th>
					{/each}
					<th class="px-3 py-2 font-medium">Missing</th>
					<th class="px-3 py-2"></th>
				</tr>
			</thead>
			<tbody class="divide-line divide-y">
				{#if rows === null && !failed}
					{#each { length: 5 }, i (i)}
						<tr>
							<td class="px-3 py-3" colspan={SIGNALS.length + 4}>
								<Skeleton class="h-4 w-full rounded-sm" />
							</td>
						</tr>
					{/each}
				{:else if failed}
					<tr>
						<td class="text-destructive px-3 py-6 text-center" colspan={SIGNALS.length + 4}>
							The suggestions could not be loaded.
						</td>
					</tr>
				{:else}
					{#each rows ?? [] as row (row.id)}
						<tr class={added[row.id] ? 'bg-sand/50' : ''}>
							<td class="max-w-72 px-3 py-2">
								<a href={`/admin/brands/${row.id}`} class="block truncate font-medium hover:underline">
									{row.name}
								</a>
								<span class="text-muted-foreground block truncate text-xs">
									{(row.branches > 1
										? [`${row.branches} places`, row.city, row.category]
										: [row.district, row.category]
									)
										.filter(Boolean)
										.join(' · ')}
								</span>
							</td>
							<td class="px-3 py-2 text-right">
								<Badge variant={leadScoreVariant(row.leadScore)}>{Math.round(row.leadScore)}</Badge>
							</td>
							{#each SIGNALS as key (key)}
								{@const value = row.leadSignals?.[key]?.value}
								<td
									class="px-3 py-2 text-right tabular-nums {value == null
										? 'text-faint'
										: value >= 0.6
											? 'text-ink font-medium'
											: 'text-muted-foreground'}">
									{percent(value)}
								</td>
							{/each}
							<td class="text-muted-foreground max-w-48 truncate px-3 py-2 text-xs">
								{row.leadSignals?.missing.join(', ') ?? ''}
							</td>
							<td class="px-3 py-2 text-right whitespace-nowrap">
								{#if added[row.id]}
									<Button
										variant="ghost"
										size="sm"
										icon={ArrowUpRight}
										href={`/admin/brands/${row.id}?tab=sales`}>
										Open
									</Button>
								{:else}
									<Button
										variant="outline"
										size="sm"
										icon={Plus}
										loading={adding[row.id]}
										disabled={!!bulk}
										onclick={() => add(row.id)}>
										Add
									</Button>
								{/if}
							</td>
						</tr>
					{:else}
						<tr>
							<td class="text-muted-foreground px-3 py-6 text-center" colspan={SIGNALS.length + 4}>
								No scored brand left to suggest. Scores come from the monthly run's last step.
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>
