<script lang="ts">
	import { Pencil, Plus, Telescope } from '@lucide/svelte';
	import type { AdminAspectOutputDto, AdminAspectsOutputDto } from 'client';

	import AspectEditor from './components/AspectEditor.svelte';
	import UnfiledGroups from './components/UnfiledGroups.svelte';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import AdminPageHeader from '#components/admin/admin-page-header.svelte';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { findAdminMenu } from '#constants/ADMIN_MENUS.js';
	import { cityItems } from '#lib/admin-cities.js';
	import { api } from '#lib/api.js';
	import { lastMonth, monthLabel, recentMonths } from '#lib/culinary.js';
	import { exploreTopicHref } from '#lib/explore.js';
	import { aspectPageHref } from '#lib/topic-format.js';
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import IconButton from '#ui/wrapped/IconButton.svelte';
	import Select from '#ui/wrapped/Select.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// Every aspect (what a claim is about at a place), root by root, each with its hint (word for
	// word what the claim labeller is told) and the city's claims under it: all time, in the month,
	// and at a root itself (nothing finer fitted). Added, renamed, re-hinted, moved and deleted in
	// place; each opens its own page and Explore. Under them the claims under no aspect, and the
	// loose ones grouped by meaning: where an aspect may be missing.
	adminCitiesStore.load();
	const param = (name: string) => page.url.searchParams.get(name) ?? undefined;
	const cityId = $derived(param('cityId') ?? (adminCitiesStore.list.find((c) => c.active) ?? adminCitiesStore.list[0])?.id);
	const month = $derived(param('month') ?? lastMonth());
	const setParam = (name: string, value: string | undefined) => {
		const url = new URL(page.url.href);
		if (value) url.searchParams.set(name, value);
		else url.searchParams.delete(name);
		goto(url, { replace: true, reset: false });
	};
	const MONTHS = recentMonths(12).map((m) => ({ value: m, label: monthLabel(m) }));

	let data = $state<AdminAspectsOutputDto | null>(null);
	const loader = createLoader((query: { cityId: string; month: string }) => api.admin.getAspects(query), {
		onSuccess: (res) => (data = res)
	});
	const load = () => cityId && loader.load({ cityId, month });
	$effect(() => {
		load();
	});

	const byLabel = (a: AdminAspectOutputDto, b: AdminAspectOutputDto) => a.label.localeCompare(b.label);
	const roots = $derived((data?.aspects ?? []).filter((a) => !a.parentKey).sort(byLabel));
	const childrenOf = (key: string) => (data?.aspects ?? []).filter((a) => a.parentKey === key).sort(byLabel);
	const rootItems = $derived(roots.map((r) => ({ key: r.key, label: r.label })));
	const inMonth = (a: { byMonth: number[] }) => a.byMonth.at(-1) ?? 0;
	const n = (v: number) => v.toLocaleString('en-GB');

	let editing = $state<string | null>(null);
	let adding = $state<string | null>(null);
	const saved = () => {
		editing = null;
		adding = null;
		load();
	};
	const claimsTabHref = (parts: string) =>
		`/admin/trends?${new URLSearchParams({ tab: 'claims', ...(cityId && { cityId }), month, parts })}`;
</script>

{#snippet counts(a: AdminAspectOutputDto)}
	<span class="text-right tabular-nums" title="Claims under it, all time">{n(a.claims)}</span>
	<span class="text-right tabular-nums" title={`Claims under it in ${monthLabel(month)}`}>{n(inMonth(a))}</span>
{/snippet}

{#snippet hintLine(a: AdminAspectOutputDto)}
	{#if a.hint}
		<p class="text-muted-foreground m-0 text-xs">{a.hint}</p>
	{:else}
		<p class="text-beet m-0 text-xs">No hint: the labeller goes by the label alone.</p>
	{/if}
{/snippet}

<AdminPageHeader description={findAdminMenu(page.url.pathname)?.description}>
	{#snippet rightTitle()}
		<div class="flex items-center gap-2">
			{#if adminCitiesStore.list.length > 1}
				<div class="w-40">
					<Select items={cityItems(adminCitiesStore.list)} value={cityId} aria-label="City" size="sm" onValueChange={(v) => setParam('cityId', v)} />
				</div>
			{/if}
			<div class="w-44">
				<Select items={MONTHS} value={month} aria-label="Month" size="sm" onValueChange={(v) => setParam('month', v === lastMonth() ? undefined : v)} />
			</div>
		</div>
	{/snippet}
</AdminPageHeader>

<div class="flex min-w-0 flex-col gap-5 pb-12">
	<p class="ink-strip m-0 text-sm">
		A hint is told to the claim labeller word for word, with the label: it decides where new claims are filed. Stored claims keep
		their aspect until they are labelled again, which costs money and is decided apart. Counts are claims, not sources; who said
		them is on Explore.
	</p>

	{#if loader.error && !data}
		<ErrorState onRetry={load} />
	{:else if !data}
		<AdminPanel><SkeletonRows count={10} lines={2} trailing /></AdminPanel>
	{:else}
		{#each roots as root (root.key)}
			{@const children = childrenOf(root.key)}
			<AdminPanel title={root.label} note={`${n(root.claims)} claims · ${n(inMonth(root))} in ${monthLabel(month)}`}>
				{#snippet action()}
					<div class="flex items-center gap-1.5">
						<Button size="sm" variant="ghost" icon={Telescope} href={exploreTopicHref(root.key, { cityId, month })}>Explore</Button>
						<Button size="sm" variant="outline" icon={Plus} onclick={() => ((adding = root.key), (editing = null))}>Add aspect</Button>
					</div>
				{/snippet}
				<div class="text-muted-foreground grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_2.75rem] gap-x-3 pb-1 text-xs">
					<span>Aspect · what it covers</span>
					<span class="text-right">All time</span>
					<span class="text-right">{monthLabel(month)}</span>
					<span></span>
				</div>
				<ul class="m-0 list-none p-0 text-sm">
					<li class="border-t py-2">
						{#if editing === root.key}
							<AspectEditor aspect={root} roots={rootItems} hasChildren={children.length > 0} onSaved={saved} onCancel={() => (editing = null)} />
						{:else}
							<div class="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_2.75rem] items-start gap-x-3">
								<div class="min-w-0">
									<a class="font-medium" href={aspectPageHref(root.key)}>{root.label} itself</a>
									<span class="text-faint ml-1 font-mono text-xs">{root.key}</span>
									<p class="text-muted-foreground m-0 text-xs">Claims about it with nothing finer to say: {root.hint ?? 'no hint'}</p>
								</div>
								<span class="text-right tabular-nums" title="Filed at the root itself, all time">{n(root.atItself)}</span>
								<span class="text-right tabular-nums" title={`Filed at the root itself in ${monthLabel(month)}`}>{n(root.atItselfByMonth.at(-1) ?? 0)}</span>
								<IconButton sm variant="ghost" icon={Pencil} label={`Edit ${root.label}`} onclick={() => ((editing = root.key), (adding = null))} />
							</div>
						{/if}
					</li>
					{#each children as a (a.key)}
						<li class="border-t py-2">
							{#if editing === a.key}
								<AspectEditor
									aspect={a}
									roots={rootItems}
									hasChildren={childrenOf(a.key).length > 0}
									onSaved={saved}
									onDeleted={saved}
									onCancel={() => (editing = null)} />
							{:else}
								<div class="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_2.75rem] items-start gap-x-3">
									<div class="min-w-0">
										<a class="font-medium" href={aspectPageHref(a.key)}>{a.label}</a>
										<span class="text-faint ml-1 font-mono text-xs">{a.key}</span>
										{#if a.discoveredAt}<span class="text-muted-foreground ml-1 text-xs">· found by discovery</span>{/if}
										{@render hintLine(a)}
									</div>
									{@render counts(a)}
									<IconButton sm variant="ghost" icon={Pencil} label={`Edit ${a.label}`} onclick={() => ((editing = a.key), (adding = null))} />
								</div>
							{/if}
						</li>
					{/each}
					{#if adding === root.key}
						<li class="border-t py-2">
							<AspectEditor root={root.key} roots={rootItems} onSaved={saved} onCancel={() => (adding = null)} />
						</li>
					{/if}
				</ul>
			</AdminPanel>
		{/each}

		<AdminPanel title="Under no aspect" note={`${n(data.noAspect.claims)} claims · ${n(data.noAspect.byMonth.at(-1) ?? 0)} in ${monthLabel(month)}`}>
			<p class="m-0 text-sm">
				Claims the labeller read and filed under no aspect ("came on a Tuesday"): kept, about nothing a place is judged on, or
				about something no aspect covers yet.
				<a href={claimsTabHref('no_aspect')}>See {monthLabel(month)}'s</a>.
			</p>
			{#if data.unread.claims}
				<p class="text-muted-foreground m-0 mt-2 text-sm">
					{n(data.unread.claims)} claims ({n(data.unread.byMonth.at(-1) ?? 0)} in {monthLabel(month)}) are not labelled yet, so they
					sit under no aspect either until the labeller reads them.
				</p>
			{/if}
		</AdminPanel>

		{#if cityId}
			{#key `${cityId}:${month}`}
				<UnfiledGroups {cityId} {month} />
			{/key}
		{/if}
	{/if}
</div>
