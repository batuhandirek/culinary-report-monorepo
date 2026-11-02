<script lang="ts">
	import { X } from '@lucide/svelte';
	import type {
		AdminExploreBreakdownOutputDto,
		AdminExploreBreakdownRowOutputDto,
		AdminExploreGroupsOutputDto,
		AdminExploreHeadOutputDto,
		AdminExploreTreeNodeOutputDto
	} from 'client';

	import ExploreBreakdown from './components/ExploreBreakdown.svelte';
	import ExploreGroups from './components/ExploreGroups.svelte';
	import ExploreHead from './components/ExploreHead.svelte';
	import ExploreTree from './components/ExploreTree.svelte';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import AdminPageHeader from '#components/admin/admin-page-header.svelte';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import ClaimsTable from '#components/admin/statements/ClaimsTable.svelte';
	import { findAdminMenu } from '#constants/ADMIN_MENUS.js';
	import { cityItems } from '#lib/admin-cities.js';
	import { api, isNotFoundError } from '#lib/api.js';
	import { lastMonth, monthLabel, recentMonths } from '#lib/culinary.js';
	import { type ExploreDimension, exploreHref, type ExploreSide, type ExploreView, SIDE_LABELS, SOURCE_LABELS, SUBJECT_LABELS, viewOf } from '#lib/explore.js';
	import { KIND_LABELS } from '#lib/statements.js';
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import Select from '#ui/wrapped/Select.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// "Who talked about X, how much, and what did they say": any topic or wording (the tree on the
	// left) in any scope (the city, a district, a brand, a branch) over any months, with its
	// figures, a breakdown whose rows narrow the view, the claims grouped by meaning, and every
	// claim with its source. Everything is in the URL, so a view is a link.
	adminCitiesStore.load();
	const view = $derived(viewOf(page.url.searchParams));
	const cityId = $derived(view.cityId ?? (adminCitiesStore.list.find((c) => c.active) ?? adminCitiesStore.list[0])?.id);
	const defaultTo = lastMonth();
	const shift = (month: string, n: number) => {
		const [y, m] = month.split('-').map(Number);
		return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
	};
	const to = $derived(view.to ?? defaultTo);
	const from = $derived(view.from ?? shift(to, -5));
	const by = $derived<ExploreDimension>(view.by ?? 'brand');

	/** A new view: the current one changed by `patch` (the table's own search and page dropped) */
	const setView = (patch: Partial<ExploreView>) => goto(exploreHref({ ...view, ...patch }), { reset: false });
	const MONTHS = recentMonths(24).map((m) => ({ value: m, label: monthLabel(m) }));
	const setMonths = (next: { from: string; to: string }) => {
		const lo = next.from <= next.to ? next.from : next.to;
		const hi = next.from <= next.to ? next.to : next.from;
		const toParam = hi === defaultTo ? undefined : hi;
		setView({ to: toParam, from: lo === shift(hi, -5) ? undefined : lo });
	};

	// What the API is asked: the view with the city and months filled in
	const query = $derived(
		cityId
			? {
					cityId,
					from,
					to,
					...(view.brandId && { brandId: view.brandId }),
					...(view.venueId && { venueId: view.venueId }),
					...(view.district && { district: view.district }),
					...(view.place && { place: view.place }),
					...(view.node && { node: view.node }),
					...(view.with?.length && { with: view.with.join(',') }),
					...(view.side && { side: view.side }),
					...(view.kind && { kind: view.kind }),
					...(view.source && { source: view.source }),
					...(view.subject && { subject: view.subject })
				}
			: null
	);
	type Query = NonNullable<typeof query>;

	let tree = $state<AdminExploreTreeNodeOutputDto[] | null>(null);
	let head = $state<AdminExploreHeadOutputDto | null>(null);
	let breakdown = $state<AdminExploreBreakdownOutputDto | null>(null);
	let groups = $state<AdminExploreGroupsOutputDto | null>(null);
	const treeLoader = createLoader((q: Query) => api.admin.getExploreTree(q as never), { onSuccess: (res) => (tree = res.nodes) });
	const headLoader = createLoader((q: Query) => api.admin.getExploreHead(q as never), { onSuccess: (res) => (head = res) });
	const breakdownLoader = createLoader((q: Query, dimension: ExploreDimension) => api.admin.getExploreBreakdown({ ...q, by: dimension } as never), {
		onSuccess: (res) => (breakdown = res)
	});
	const groupsLoader = createLoader((q: Query) => api.admin.getExploreGroups(q as never), { onSuccess: (res) => (groups = res) });

	// The tree's counts don't depend on X: reloaded only when the rest of the view moves
	const treeKey = $derived(query ? JSON.stringify({ ...query, node: undefined }) : '');
	$effect(() => {
		if (!treeKey) return;
		tree = null;
		const { node: _drop, ...rest } = JSON.parse(treeKey) as Query & { node?: string };
		void _drop;
		treeLoader.load(rest as Query);
	});
	const viewKey = $derived(query ? JSON.stringify(query) : '');
	$effect(() => {
		if (!viewKey) return;
		const q = JSON.parse(viewKey) as Query;
		head = null;
		groups = null;
		headLoader.load(q);
		groupsLoader.load(q);
	});
	$effect(() => {
		if (!viewKey) return;
		breakdownLoader.load(JSON.parse(viewKey) as Query, by);
	});
	// A new view starts the breakdown from its skeleton; another dimension keeps the rows dimmed
	$effect(() => {
		if (viewKey) breakdown = null;
	});

	/** A breakdown row narrows the view: the scope, a filter, the months, or a finer topic */
	const pick = (row: AdminExploreBreakdownRowOutputDto) => {
		const key = row.key;
		if (key === undefined) return;
		if (by === 'brand') return setView({ brandId: key, venueId: undefined });
		if (by === 'venue') return setView({ venueId: key });
		if (by === 'district') return setView({ district: key });
		if (by === 'place') return setView({ place: key });
		if (by === 'source') return setView({ source: key });
		if (by === 'subject') return setView({ subject: key });
		if (by === 'kind') return setView({ kind: key });
		if (by === 'side') return setView({ side: key as ExploreSide });
		if (by === 'month') return setView({ from: key, to: key });
		// A topic or a wording: a finer one replaces the topic it is under, else it is X or narrows X
		const under = breakdown?.under?.ref;
		if (under && key === under) return;
		if (under && view.node === under) return setView({ node: key });
		if (under && view.with?.includes(under)) return setView({ with: view.with.map((r) => (r === under ? key : r)) });
		if (!view.node) return setView({ node: key });
		if (view.node === key || view.with?.includes(key)) return;
		setView({ with: [...(view.with ?? []), key] });
	};

	const setLike = (phrase: string) => {
		const url = new URL(page.url.href);
		url.searchParams.set('like', phrase);
		url.searchParams.delete('q');
		url.searchParams.delete('page');
		goto(url, { reset: false }).then(() => document.getElementById('explore-claims')?.scrollIntoView({ behavior: 'smooth' }));
	};

	// The chips: what narrows the view besides X and the months, each removable
	const refLabel = (ref: string) => head?.with.find((w) => w.ref === ref)?.label ?? ref.replace(/^term:/, '');
	interface Chip {
		label: string;
		clear: Partial<ExploreView>;
	}
	const chips = $derived.by((): Chip[] => {
		const out: Chip[] = [];
		if (view.brandId) out.push({ label: `At ${head?.brand?.name ?? 'one brand'}`, clear: { brandId: undefined, venueId: undefined } });
		if (view.venueId) out.push({ label: `Branch ${head?.venue?.name ?? ''}`.trim(), clear: { venueId: undefined } });
		if (view.district) out.push({ label: `In ${view.district}`, clear: { district: undefined } });
		if (view.place) out.push({ label: `${head?.place?.label ?? view.place} places`, clear: { place: undefined } });
		for (const ref of view.with ?? []) out.push({ label: `And ${refLabel(ref)}`, clear: { with: view.with!.filter((r) => r !== ref) } });
		if (view.side) out.push({ label: SIDE_LABELS[view.side], clear: { side: undefined } });
		if (view.kind) out.push({ label: `Kind: ${KIND_LABELS[view.kind] ?? view.kind}`, clear: { kind: undefined } });
		if (view.source) out.push({ label: SOURCE_LABELS[view.source] ?? view.source, clear: { source: undefined } });
		if (view.subject) out.push({ label: SUBJECT_LABELS[view.subject] ?? view.subject, clear: { subject: undefined } });
		return out;
	});
	const clearAll: Partial<ExploreView> = {
		brandId: undefined,
		venueId: undefined,
		district: undefined,
		place: undefined,
		with: undefined,
		side: undefined,
		kind: undefined,
		source: undefined,
		subject: undefined
	};
</script>

<AdminPageHeader description={findAdminMenu(page.url.pathname)?.description}>
	{#snippet rightTitle()}
		<div class="flex flex-wrap items-center gap-2">
			{#if adminCitiesStore.list.length > 1}
				<div class="w-40">
					<Select items={cityItems(adminCitiesStore.list)} value={cityId} aria-label="City" size="sm" onValueChange={(v) => setView({ ...clearAll, cityId: v })} />
				</div>
			{/if}
			<div class="w-40">
				<Select items={MONTHS} value={from} aria-label="From" size="sm" onValueChange={(v) => setMonths({ from: v, to })} />
			</div>
			<span class="text-muted-foreground text-sm">to</span>
			<div class="w-40">
				<Select items={MONTHS} value={to} aria-label="To" size="sm" onValueChange={(v) => setMonths({ from, to: v })} />
			</div>
		</div>
	{/snippet}
</AdminPageHeader>

<div class="grid grid-cols-1 items-start gap-5 pb-12 lg:grid-cols-[18rem_minmax(0,1fr)]">
	<aside class="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
		<AdminPanel title="Topics" note="reviews and posts">
			{#if treeLoader.error && !tree}
				<ErrorState onRetry={() => query && treeLoader.load({ ...query, node: undefined } as never)} />
			{:else}
				<ExploreTree nodes={tree} selected={view.node} onPick={(ref) => setView({ node: ref, with: view.with?.filter((r) => r !== ref) })} />
			{/if}
		</AdminPanel>
	</aside>

	<div class="flex min-w-0 flex-col gap-5">
		{#if chips.length}
			<div class="flex flex-wrap items-center gap-1.5">
				{#each chips as chip (chip.label)}
					<button type="button" class="chip flex items-center gap-1 text-xs" aria-pressed="true" onclick={() => setView(chip.clear)}>
						{chip.label}<X class="size-3.5" aria-label="Clear" />
					</button>
				{/each}
				{#if chips.length > 1}
					<Button size="sm" variant="ghost" onclick={() => setView(clearAll)}>Clear all</Button>
				{/if}
			</div>
		{/if}

		{#if headLoader.error && !head}
			{#if isNotFoundError(headLoader.error)}
				<EmptyState title="Nothing by that name" hint="No topic or wording has this key: it may have been renamed or removed.">
					<Button size="sm" variant="outline" onclick={() => setView({ node: undefined, with: undefined })}>Start over</Button>
				</EmptyState>
			{:else}
				<ErrorState onRetry={() => query && headLoader.load(query)} />
			{/if}
		{:else if !head}
			<AdminPanel><SkeletonRows count={6} lines={2} /></AdminPanel>
		{:else}
			<ExploreHead
				{head}
				side={view.side}
				onSide={(side) => setView({ side })}
				onRef={(ref) => setView({ node: ref })}
				onMonth={(month) => setView({ from: month, to: month })} />

			<AdminPanel title="Break down" note="a row narrows the view">
				{#if breakdownLoader.error && !breakdown}
					<ErrorState onRetry={() => query && breakdownLoader.load(query, by)} />
				{:else}
					<ExploreBreakdown {by} data={breakdown} loading={breakdownLoader.loading} onBy={(d) => setView({ by: d === 'brand' ? undefined : d })} onPick={pick} />
				{/if}
			</AdminPanel>

			<AdminPanel title="What they say" note="grouped by meaning">
				{#if groupsLoader.error && !groups}
					<ErrorState onRetry={() => query && groupsLoader.load(query)} />
				{:else}
					<ExploreGroups data={groups} onLike={setLike} />
				{/if}
			</AdminPanel>

			<section id="explore-claims" class="scroll-mt-20">
				{#if cityId && query}
					{#key viewKey}
						<ClaimsTable scope={{ cityId }} topicsCityId={cityId} explore={query as never} />
					{/key}
				{/if}
			</section>
		{/if}
	</div>
</div>
