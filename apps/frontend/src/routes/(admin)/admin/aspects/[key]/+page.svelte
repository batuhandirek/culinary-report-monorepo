<script lang="ts">
	import { Pencil, Telescope } from '@lucide/svelte';
	import type { AdminAspectsOutputDto } from 'client';

	import AspectEditor from '../components/AspectEditor.svelte';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import ClaimsTable from '#components/admin/statements/ClaimsTable.svelte';
	import ExplorerHeader from '#components/admin/topics/ExplorerHeader.svelte';
	import TopicTermsManager from '#components/admin/topics/TopicTermsManager.svelte';
	import TreePopover from '#components/admin/topics/TreePopover.svelte';
	import MonthChart from '#components/charts/MonthChart.svelte';
	import { cityItems } from '#lib/admin-cities.js';
	import { api } from '#lib/api.js';
	import { lastMonth, monthLabel, recentMonths } from '#lib/culinary.js';
	import { exploreTopicHref } from '#lib/explore.js';
	import { aspectPageHref, topicHref } from '#lib/topic-format.js';
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import Select from '#ui/wrapped/Select.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// One aspect, laid out like a file explorer: every aspect on the left (the nine roots, the open
	// one's branch opened, each with its claims in the month), the aspect on the right. Its hint
	// leads, since it is what the claim labeller reads word for word; then its claims by month, the
	// newest of them, and the wordings linked to it ("waiting time" → Waiting). A food topic's key
	// opens its own page.
	const key = $derived(decodeURIComponent(page.params.key ?? ''));

	adminCitiesStore.load();
	const param = (name: string) => page.url.searchParams.get(name) ?? undefined;
	const cityId = $derived(
		param('cityId') ??
			(adminCitiesStore.list.find((c) => c.active) ?? adminCitiesStore.list[0])?.id
	);
	const month = $derived(param('month') ?? lastMonth());
	const setParam = (name: string, value: string | undefined) => {
		const url = new URL(page.url.href);
		if (value) url.searchParams.set(name, value);
		else url.searchParams.delete(name);
		goto(url, { replace: true, reset: false });
	};
	const MONTHS = recentMonths(12).map((m) => ({ value: m, label: monthLabel(m) }));

	let data = $state<AdminAspectsOutputDto | null>(null);
	const loader = createLoader(
		(query: { cityId: string; month: string }) => api.admin.getAspects(query),
		{
			onSuccess: (res) => (data = res)
		}
	);
	const load = () => cityId && loader.load({ cityId, month });
	$effect(() => {
		load();
	});

	const aspect = $derived(data?.aspects.find((a) => a.key === key));
	const root = $derived(
		aspect?.parentKey ? data?.aspects.find((a) => a.key === aspect.parentKey) : undefined
	);
	const children = $derived((data?.aspects ?? []).filter((a) => a.parentKey === key));
	const roots = $derived(
		(data?.aspects ?? [])
			.filter((a) => !a.parentKey)
			.sort((a, b) => a.label.localeCompare(b.label))
			.map((r) => ({ key: r.key, label: r.label }))
	);
	const tree = $derived(
		(data?.aspects ?? []).map((a) => ({
			key: a.key,
			label: a.label,
			parentKey: a.parentKey,
			count: a.byMonth.at(-1) ?? 0
		}))
	);

	// Not an aspect: a food topic's key opens its own page, anything else is unknown
	let unknown = $state(false);
	$effect(() => {
		if (!data || aspect || !cityId) return;
		api.admin.getTopics({ cityId }).then((res) => {
			if (res.topics.some((t) => t.key === key && t.kind !== 'aspect'))
				goto(topicHref(key), { replace: true });
			else unknown = true;
		});
	});

	let selected = $state(11);
	$effect(() => {
		if (data) selected = data.months.length - 1;
	});
	let editing = $state(false);
	$effect(() => {
		void key;
		editing = false;
	});
</script>

<div class="flex min-w-0 flex-col gap-4 pb-12">
	{#if loader.error && !data}
		<ErrorState onRetry={load} />
	{:else if !data || (!aspect && !unknown)}
		<AdminPanel><SkeletonRows count={4} lines={1} /></AdminPanel>
	{:else if !aspect}
		<EmptyState title="No such aspect" hint={`No aspect or topic has the key "${key}".`}>
			<Button size="sm" variant="outline" href="/admin/aspects">All aspects</Button>
		</EmptyState>
	{:else}
		<ExplorerHeader
			title={aspect.label}
			type={root ? `Aspect under ${root.label}` : 'Root aspect'}
			code={aspect.key}
			facts={[
				{ value: aspect.byMonth.at(-1) ?? 0, label: `claims in ${monthLabel(month)}` },
				{
					value: aspect.claims,
					label: 'claims, all time',
					hint: children.length ? "Its own and its aspects' claims" : undefined
				},
				...(children.length
					? [
							{ value: children.length, label: 'aspects under it' },
							{
								value: aspect.atItself,
								label: 'filed at it alone',
								hint: 'Claims about it that no aspect under it fitted'
							}
						]
					: [])
			]}>
			{#snippet titleAside()}
				<TreePopover
					nodes={tree}
					current={key}
					href={aspectPageHref}
					countLabel={`claims in ${monthLabel(month)}`}
					label="All aspects"
					back={{ href: '/admin/aspects', label: 'All aspects' }} />
			{/snippet}
			{#snippet actions()}
				{#if adminCitiesStore.list.length > 1}
					<div class="w-36">
						<Select
							items={cityItems(adminCitiesStore.list)}
							value={cityId}
							aria-label="City"
							size="sm"
							onValueChange={(v) => setParam('cityId', v)} />
					</div>
				{/if}
				<div class="w-40">
					<Select
						items={MONTHS}
						value={month}
						aria-label="Month"
						size="sm"
						onValueChange={(v) =>
							setParam('month', v === lastMonth() ? undefined : v)} />
				</div>
				<Button
					size="sm"
					variant="ghost"
					icon={Telescope}
					href={exploreTopicHref(key, { cityId, month })}>Explore</Button>
			{/snippet}
		</ExplorerHeader>

		<!-- The hint is the one thing on the page an agent reads: it gets the ink -->
		<section class="bg-ink text-paper rounded-md p-5">
			<div class="flex items-start justify-between gap-4">
				<div class="min-w-0">
					<h2 class="text-lavender m-0 text-sm font-medium">What the labeller is told</h2>
					{#if !editing}
						<p class="m-0 mt-2 text-lg leading-snug">
							<span class="font-semibold">{aspect.label}</span>{#if root}<span
									class="text-paper/60">
									({root.label})</span
								>{/if}:
							{aspect.hint || 'no hint, so the labeller goes by the label alone.'}
						</p>
					{/if}
				</div>
				{#if !editing}
					<Button size="sm" icon={Pencil} onclick={() => (editing = true)}>Edit</Button>
				{/if}
			</div>
			{#if editing}
				<div class="text-ink mt-3">
					<AspectEditor
						{aspect}
						{roots}
						hasChildren={children.length > 0}
						onSaved={(saved) => {
							editing = false;
							if (saved !== key) goto(aspectPageHref(saved));
							else load();
						}}
						onDeleted={() => goto(root ? aspectPageHref(root.key) : '/admin/aspects')}
						onCancel={() => (editing = false)} />
				</div>
			{/if}
		</section>

		<MonthChart
			title="Claims by month"
			note={children.length
				? "Its own and its aspects' claims; dashed, the ones filed at it alone."
				: 'Claims filed under it, by the month they were said.'}
			months={data.months}
			values={aspect.byMonth}
			comparisons={children.length
				? [{ name: 'Filed at it alone', values: aspect.atItselfByMonth, dashed: true }]
				: []}
			kind="column"
			format={(v) => v.toLocaleString('en-GB')}
			unit="claims"
			venueName={aspect.label}
			{selected}
			onSelect={(i) => (selected = i)} />

		{#if cityId}
			{#key `${cityId}:${key}`}
				<TopicTermsManager
					{cityId}
					topic={{
						id: aspect.id,
						key: aspect.key,
						label: aspect.label,
						kind: 'aspect'
					}} />
				<section class="flex flex-col gap-2">
					<h2 class="m-0 text-base font-semibold">Its claims, newest first</h2>
					<ClaimsTable scope={{ cityId }} topicsCityId={cityId} aspect={key} />
				</section>
			{/key}
		{/if}
	{/if}
</div>
