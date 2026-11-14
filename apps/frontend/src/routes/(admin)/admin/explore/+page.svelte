<script lang="ts">
	import type {
		AdminExploreHeadOutputDto,
		AdminExploreTreeNodeOutputDto
	} from 'client';

	import ExploreFilters, { type TopicPick } from './components/ExploreFilters.svelte';
	import ExploreHead from './components/ExploreHead.svelte';
	import ExploreOverTime from './components/ExploreOverTime.svelte';
	import ExploreSection from './components/ExploreSection.svelte';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import AdminPageHeader from '#components/admin/admin-page-header.svelte';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import ClaimsTable from '#components/admin/statements/ClaimsTable.svelte';
	import { findAdminMenu } from '#constants/ADMIN_MENUS.js';
	import { cityItems } from '#lib/admin-cities.js';
	import { api, isNotFoundError } from '#lib/api.js';
	import { lastMonth, monthLabel, recentMonths } from '#lib/culinary.js';
	import { exploreHref, type ExploreView, viewOf } from '#lib/explore.js';
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import Select from '#ui/wrapped/Select.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// "Who talked about X, how much, and what did they say": an aspect and/or a food or drink (the
	// bar's What pickers) in any scope (the city, a district, a brand, a branch) over any
	// months: one bar of everything that narrows it, its figures, then folding sections (over time,
	// the claims as a table or grouped by meaning).
	// Everything but which sections and tab are open is in the URL, so a view is a link.
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

	/**
	 * A new view: the current one changed by `patch` (the table's own words and page dropped; its
	 * All / grouped switch and its "Similar to…" phrase kept, so a phrase follows the view narrowed)
	 */
	const setView = (patch: Partial<ExploreView>) => {
		const url = new URL(exploreHref({ ...view, ...patch }), page.url.origin);
		for (const key of ['claims', 'like']) {
			const value = page.url.searchParams.get(key);
			if (value) url.searchParams.set(key, value);
		}
		goto(url, { reset: false });
	};
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
	const treeLoader = createLoader((q: Query) => api.admin.getExploreTree(q as never), { onSuccess: (res) => (tree = res.nodes) });
	const headLoader = createLoader((q: Query) => api.admin.getExploreHead(q as never), { onSuccess: (res) => (head = res) });

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
		headLoader.load(q);
	});

	// A link searching by meaning (an aspect page's "See claims") opens the claims whatever was remembered
	let claimsOpen = $state<boolean | undefined>(page.url.searchParams.get('like') ? true : undefined);

	// The topics: an aspect and a food or drink (each a picker), claims about both when both are
	// picked; node is the first, `with` the rest, and any further one an older link carried stays
	const treeByKey = $derived(new Map((tree ?? []).map((t) => [t.key, t])));
	const kindOf = (ref: string): 'aspect' | 'food' =>
		!ref.startsWith('term:') && (treeByKey.get(ref)?.kind ?? (head?.node?.ref === ref ? head.node.kind : undefined)) === 'aspect' ? 'aspect' : 'food';
	const pickOf = (ref: string): TopicPick => {
		const node = head?.node?.ref === ref ? head.node : undefined;
		// Its parents, top first: the node's own path, else the tree's display parents
		const path: string[] = node?.path.map((p) => p.label) ?? [];
		if (!node) for (let up = treeByKey.get(treeByKey.get(ref)?.parentKey ?? ''); up; up = treeByKey.get(up.parentKey ?? '')) path.unshift(up.label);
		return {
			ref,
			label: node?.label ?? treeByKey.get(ref)?.label ?? head?.with.find((w) => w.ref === ref)?.label ?? ref.replace(/^term:/, ''),
			path,
			hint: node?.hint
		};
	};
	const refs = $derived([view.node, ...(view.with ?? [])].filter((r): r is string => !!r));
	const aspectRef = $derived(refs.find((r) => kindOf(r) === 'aspect'));
	const foodRef = $derived(refs.find((r) => kindOf(r) === 'food'));
	const extraRefs = $derived(refs.filter((r) => r !== aspectRef && r !== foodRef));
	const setTopic = (kind: 'aspect' | 'food', ref: string | undefined) => {
		const list = [kind === 'aspect' ? ref : aspectRef, kind === 'food' ? ref : foodRef, ...extraRefs].filter((r): r is string => !!r);
		setView({ node: list[0], with: list.slice(1) });
	};
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
		<div class="flex flex-wrap items-center gap-1.5">
			{#if adminCitiesStore.list.length > 1}
				<Select items={cityItems(adminCitiesStore.list)} value={cityId} aria-label="City" size="sm" onValueChange={(v) => setView({ ...clearAll, cityId: v })} />
			{/if}
			<Select items={MONTHS} value={from} aria-label="From" size="sm" onValueChange={(v) => setMonths({ from: v, to })} />
			<span class="text-muted-foreground text-sm">–</span>
			<Select items={MONTHS} value={to} aria-label="To" size="sm" onValueChange={(v) => setMonths({ from, to: v })} />
		</div>
	{/snippet}
</AdminPageHeader>

<div class="flex min-w-0 flex-col gap-4 pb-12">
	<ExploreFilters
		{view}
		{head}
		{query}
		aspect={aspectRef ? pickOf(aspectRef) : undefined}
		food={foodRef ? pickOf(foodRef) : undefined}
		extras={extraRefs.map(pickOf)}
		{tree}
		treeFailed={!!treeLoader.error}
		onRetryTree={() => query && treeLoader.load({ ...query, node: undefined } as never)}
		onTopic={setTopic}
		onChange={setView}
		onClearAll={() => setView({ ...clearAll, node: undefined })} />

	{#if headLoader.error && !head}
		{#if isNotFoundError(headLoader.error)}
			<EmptyState title="Nothing by that name" hint="No topic or wording has this key: it may have been renamed or removed.">
				<Button size="sm" variant="outline" onclick={() => setView({ node: undefined, with: undefined })}>Start over</Button>
			</EmptyState>
		{:else}
			<ErrorState onRetry={() => query && headLoader.load(query)} />
		{/if}
	{:else if !head}
		<AdminPanel><SkeletonRows count={4} lines={2} /></AdminPanel>
	{:else}
		<ExploreHead {head} side={view.side} />

		<ExploreSection id="over-time" title="Over time" note="Month by month · click a month to narrow to it" defaultOpen={false}>
			<ExploreOverTime {head} side={view.side} onMonth={(month) => setView({ from: month, to: month })} />
		</ExploreSection>

		<ExploreSection
			id="claims"
			title="Claims"
			note="Every claim in the view, newest first, or grouped by meaning · a row opens its source"
			bind:open={claimsOpen}>
			{#if cityId && query}
				{#key viewKey}
					<ClaimsTable scope={{ cityId }} topicsCityId={cityId} explore={query as never} />
				{/key}
			{/if}
		</ExploreSection>
	{/if}
</div>
