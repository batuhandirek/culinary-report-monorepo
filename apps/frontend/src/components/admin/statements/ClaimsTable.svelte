<script lang="ts">
	import { Quote } from '@lucide/svelte';
	import type {
		AdminExploreGroupsOutputDto,
		AdminStatementRowOutputDto,
		AdminStatementsSummaryOutputDto,
		AdminTopicOutputDto
	} from 'client';

	import {
		ListStatementsParamsKindEnum,
		ListStatementsParamsPartsEnum,
		ListStatementsParamsSentimentEnum,
		ListStatementsParamsSourceKindEnum,
		ListStatementsParamsSubjectEnum
	} from 'client';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import DateRangeFilter from '#components/admin/DateRangeFilter.svelte';
	import PlatformIcon from '#components/admin/detail/PlatformIcon.svelte';
	import DigestionDetail from '#components/admin/digestion/DigestionDetail.svelte';
	import ClaimGroups from '#components/admin/statements/ClaimGroups.svelte';
	import { api } from '#lib/api.js';
	import { authorLabel, monthLabel, PLATFORM_LABELS } from '#lib/culinary.js';
	import { amountLabel, aspectOf, aspectPath, foodPartsOf, KIND_ICONS, KIND_LABELS, sentimentLook } from '#lib/statements.js';
	import { aspectPageHref } from '#lib/topic-format.js';
	import type { Column, Filter } from '#ui/components/paginated-data-table/index.js';
	import PaginatedDataTable from '#ui/components/paginated-data-table/PaginatedDataTable.svelte';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import * as Tabs from '#ui/primitives-new/tabs/index.js';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import Tooltip from '#ui/wrapped/Tooltip.svelte';

	// What agents A and B made of the sources: every claim of the scope (a city's month on the
	// Trends page, a brand's or a branch's on theirs), one line each, faintly tinted by its
	// sentiment, opening in place on its source (the review or the post, every step's result) with
	// the claim ringed and its quote marked louder: its sentiment as a dot; the claim cut to the
	// line, its kind as an icon when it is news (a change, a new item, a deal, an event, a
	// question, a verdict), its number as a tag and the source's own words on hover; its aspect
	// beside its food wordings; the source's platform icon (who and where on hover), the place or
	// the city, and the day. On an aspect's page a row names its aspect
	// only when it is a finer one under it. The strip above is the whole scope, whatever
	// the table filters: how it was split and how much was read. With `explore` it lists an Explore
	// view's claims instead (its own chips narrow them), with no strip and only the text and meaning
	// searches. A brand's, a branch's or an aspect's claims are narrowed by days, like their Posts
	// and Reviews tabs (the date range, `?from=&to=`); a city's month is fixed.
	interface Props {
		/** Whose claims, fixed: a city's month, a brand's (its branches' reviews, posts about it) or a branch's; every month unless `month` is given */
		scope: { cityId?: string; brandId?: string; venueId?: string; month?: string };
		/** The city whose aspects the filter offers */
		topicsCityId: string;
		/** What the strip says it covers */
		scopeLabel?: string;
		/** An Explore view's query: the table lists its claims (`listExploreClaims`) */
		explore?: Parameters<typeof api.admin.listExploreClaims>[0];
		/** Fixed to one aspect's claims (its children's included): an aspect's page. No strip then, since the strip is the whole scope's */
		aspect?: string;
	}

	let { scope, topicsCityId, scopeLabel = 'Every review and post here, whatever the table below filters', explore, aspect }: Props = $props();

	// Days, when the scope is not one month and not an Explore view: the table's own date range
	// (`?from=&to=`, every day without), the strip's figures following it
	const dated = $derived(!scope.month && !explore);
	const isDay = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
	const from = $derived(dated ? isDay(page.url.searchParams.get('from')) : undefined);
	const to = $derived(dated ? isDay(page.url.searchParams.get('to')) : undefined);
	const days = $derived({ ...(from && { from }), ...(to && { to }) });
	const setRange = (range: { from?: string; to?: string }) => {
		const url = new URL(page.url.href);
		for (const key of ['from', 'to', 'page'] as const) {
			const value = key === 'page' ? undefined : range[key];
			if (value) url.searchParams.set(key, value);
			else url.searchParams.delete(key);
		}
		goto(url, { replace: true, reset: false });
	};

	// The claims also read grouped by meaning (Explore's `getExploreGroups`), switched in the table's
	// own bar: the same filters pick the claims, so "negative, under Waiting" groups only those. A
	// brand's or a branch's over the months the dates cover (the last 24 up to now without, its
	// most); an Explore view's over its months.
	const groupable = $derived(!!explore || (dated && !aspect && !!(scope.brandId || scope.venueId)));
	// Kept in the URL (`?claims=groups`), so a view remounting the table and a shared link keep it
	const shown = $derived(page.url.searchParams.get('claims') === 'groups' ? 'groups' : 'all');
	const setShown = (value: string) => {
		const url = new URL(page.url.href);
		if (value === 'groups') url.searchParams.set('claims', 'groups');
		else url.searchParams.delete('claims');
		goto(url, { replace: true, reset: false });
	};
	let groupBar = $state<{ similarity?: number; minClaims?: number }>({});
	let groups = $state<AdminExploreGroupsOutputDto | null>(null);
	const groupsLoader = createLoader((q: Parameters<typeof api.admin.getExploreGroups>[0]) => api.admin.getExploreGroups(q), {
		onSuccess: (res) => (groups = res)
	});
	const shiftMonth = (month: string, n: number) => {
		const [y, m] = month.split('-').map(Number);
		return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
	};
	// A select filter holds a list; the groups take one value
	const one = (value: unknown) => {
		const v = Array.isArray(value) ? value[0] : value;
		return v === undefined || v === null || v === '' ? undefined : String(v);
	};
	const months = $derived.by(() => {
		const toMonth = (to ?? new Date().toISOString()).slice(0, 7);
		const earliest = shiftMonth(toMonth, -23);
		return { from: from && from.slice(0, 7) > earliest ? from.slice(0, 7) : earliest, to: toMonth };
	});
	const groupsQuery = (table: Record<string, unknown>) => {
		const own = { q: one(table.q), sentiment: one(table.sentiment), parts: one(table.parts), ...groupBar };
		if (explore) return { ...explore, ...own } as Parameters<typeof api.admin.getExploreGroups>[0];
		return {
			cityId: scope.cityId ?? topicsCityId,
			...(scope.brandId && { brandId: scope.brandId }),
			...(scope.venueId && { venueId: scope.venueId }),
			...months,
			node: one(table.aspect),
			source: one(table.sourceKind),
			subject: one(table.subject),
			kind: one(table.kind),
			...own
		} as Parameters<typeof api.admin.getExploreGroups>[0];
	};
	// The table keeps its filters in the URL: the groups read them there
	const TABLE_KEYS = ['q', 'sentiment', 'parts', 'aspect', 'sourceKind', 'subject', 'kind'];
	const groupsKey = $derived.by(() => {
		if (!groupable || shown !== 'groups') return '';
		const params = page.url.searchParams;
		const table = Object.fromEntries(TABLE_KEYS.map((key) => [key, params.get(key)?.split(',')]));
		return JSON.stringify(groupsQuery(table));
	});
	$effect(() => {
		if (!groupsKey) return;
		groups = null;
		groupsLoader.load(JSON.parse(groupsKey));
	});

	let summary = $state<AdminStatementsSummaryOutputDto | null>(null);
	$effect(() => {
		if (!explore && !aspect) api.admin.getStatementsSummary({ ...scope, ...days }).then((res) => (summary = res));
	});

	// The aspects to filter by, each root followed by the aspects under it
	let aspects = $state<AdminTopicOutputDto[]>([]);
	$effect(() => {
		api.admin.getTopics({ cityId: topicsCityId }).then((res) => (aspects = res.topics.filter((t) => t.kind === 'aspect')));
	});
	const byLabel = (a: AdminTopicOutputDto, b: AdminTopicOutputDto) => a.label.localeCompare(b.label);
	const aspectOptions = $derived(
		aspects
			.filter((t) => !t.parentKey)
			.sort(byLabel)
			.flatMap((root) => [
				{ name: root.label, value: root.key },
				...aspects
					.filter((t) => t.parentKey === root.key)
					.sort(byLabel)
					.map((t) => ({ name: `${root.label} › ${t.label}`, value: t.key }))
			])
	);

	// One filter bar for every claims table. On Explore, the page's own pickers already narrow the
	// view by months, source, about, kind and topic (its figures and tree too): the table keeps
	// only what they don't, the words, the sentiment and the parts.
	const EXPLORE_KEYS = ['q', 'sentiment', 'parts'];
	const ALL_FILTERS: Filter[] = $derived([
		{ key: 'q', name: 'Search', type: 'text', placeholder: 'Words in the claim…' },
		{
			key: 'sourceKind',
			name: 'Source',
			type: 'select',
			options: [
				{ name: 'Reviews', value: ListStatementsParamsSourceKindEnum.Review },
				{ name: 'Posts', value: ListStatementsParamsSourceKindEnum.Post }
			]
		},
		{
			key: 'subject',
			name: 'About',
			type: 'select',
			options: [
				{ name: 'A place', value: ListStatementsParamsSubjectEnum.Place },
				{ name: 'The city', value: ListStatementsParamsSubjectEnum.City },
				{ name: 'Nothing in particular', value: ListStatementsParamsSubjectEnum.None }
			]
		},
		{
			key: 'sentiment',
			name: 'Sentiment',
			type: 'select',
			options: [
				{ name: 'Positive', value: ListStatementsParamsSentimentEnum.Positive },
				{ name: 'Negative', value: ListStatementsParamsSentimentEnum.Negative },
				{ name: 'Neutral', value: ListStatementsParamsSentimentEnum.Neutral },
				{ name: 'Mixed', value: ListStatementsParamsSentimentEnum.Mixed },
				{ name: 'Not read yet', value: ListStatementsParamsSentimentEnum.Unread }
			]
		},
		...(aspect ? [] : [{ key: 'aspect', name: 'Aspect', type: 'select', options: aspectOptions } satisfies Filter]),
		{
			key: 'parts',
			name: 'Parts',
			type: 'select',
			options: [
				{ name: 'Under no aspect', value: ListStatementsParamsPartsEnum.NoAspect },
				{ name: 'No part at all', value: ListStatementsParamsPartsEnum.None },
				{ name: 'Names a food', value: ListStatementsParamsPartsEnum.Food }
			]
		},
		{
			key: 'kind',
			name: 'Kind',
			type: 'select',
			options: [
				...Object.values(ListStatementsParamsKindEnum)
					.filter((k) => k !== ListStatementsParamsKindEnum.Unread)
					.map((k) => ({ name: KIND_LABELS[k] ?? k, value: k })),
				{ name: 'not read yet', value: ListStatementsParamsKindEnum.Unread }
			]
		}
	]);
	const FILTERS: Filter[] = $derived(ALL_FILTERS.filter((f) => !explore || EXPLORE_KEYS.includes(f.key)));

	const aboutOf = (row: AdminStatementRowOutputDto) =>
		row.review
			? row.review.venue.name
			: row.mention
				? (row.mention.brand?.name ?? row.mention.venueName)
				: row.subject === 'city'
					? 'the city'
					: 'nothing in particular';
	// A brand's own post about itself is not word of mouth: said so in the source
	const isOwnPost = (row: AdminStatementRowOutputDto) =>
		!!row.post?.account?.brand && row.post.account.brand.id === row.mention?.brand?.id;
	const day = (value: string | Date | null | undefined) => {
		if (!value) return '';
		const d = new Date(value);
		return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(d.getFullYear() !== new Date().getFullYear() && { year: '2-digit' }) });
	};
	const sourceLine = (row: AdminStatementRowOutputDto) =>
		[
			row.review
				? `${row.review.platform === 'tripadvisor' ? 'TripAdvisor' : 'Google'}${row.review.stars ? ` ${row.review.stars}★` : ''}`
				: row.post
					? `${PLATFORM_LABELS[row.post.platform] ?? row.post.platform} ${authorLabel(row.post.platform, row.post.author)}${isOwnPost(row) ? ' (own)' : ''}`
					: '',
			day(row.saidAt)
		]
			.filter(Boolean)
			.join(' · ');

	// One line a claim: the rest is in tooltips, and the row opens on its source in place
	const ALL_COLUMNS: Column<AdminStatementRowOutputDto>[] = [
		{ type: 'snippet', name: 'Sentiment', label: '', class: 'w-0 pr-0', snippet: sentimentCell },
		{ type: 'snippet', name: 'Claim', grow: true, snippet: claimCell },
		{ type: 'snippet', name: 'About', label: 'Aspect · foods', class: 'max-w-[14rem]', snippet: aboutCell },
		{ type: 'snippet', name: 'Where', class: 'max-w-[16rem]', snippet: whereCell }
	];
	const COLUMNS = ALL_COLUMNS;

	// The scope is fixed: the page mounts the table again when it changes
	const filters = $derived(explore ? { ...explore } : { ...scope, ...days, ...(aspect && { aspect }) });

	const listStatements = (params: Parameters<typeof api.admin.listStatements>[0]) =>
		explore
			? api.admin.listExploreClaims(params as unknown as Parameters<typeof api.admin.listExploreClaims>[0])
			: api.admin.listStatements(params);
	const n = (value: number) => value.toLocaleString('en-GB');
	const share = (part: number, whole: number) => `${whole ? Math.round((part / whole) * 100) : 0} %`;
	const FIGURES: { label: string; value: (s: AdminStatementsSummaryOutputDto) => string }[] = [
		{ label: 'Claims', value: (s) => n(s.statements) },
		{ label: 'From reviews / posts', value: (s) => `${n(s.reviews)} / ${n(s.posts)}` },
		{ label: 'About a place', value: (s) => share(s.place, s.statements) },
		{ label: 'About the city', value: (s) => share(s.city, s.statements) },
		{ label: 'Nothing in particular', value: (s) => share(s.none, s.statements) },
		{ label: 'Under an aspect', value: (s) => share(s.statements - s.noAspect, s.statements) },
		{ label: 'Name a food', value: (s) => share(s.withFood, s.statements) },
		{ label: 'No part at all', value: (s) => n(s.noParts) },
		{ label: 'Changes', value: (s) => n(s.kinds.change) },
		{ label: 'New items · deals · events', value: (s) => `${n(s.kinds.new_item)} · ${n(s.kinds.deal)} · ${n(s.kinds.event)}` },
		{ label: 'Not read yet', value: (s) => n(s.unread) }
	];
</script>

{#snippet sentimentCell(row: AdminStatementRowOutputDto)}
	{@const look = sentimentLook(row.sentiment)}
	<span class={['block size-2.5 rounded-full', look.dot]} title={look.label}><span class="sr-only">{look.label}</span></span>
{/snippet}

{#snippet claimCell(row: AdminStatementRowOutputDto)}
	{@const KindIcon = row.kind ? KIND_ICONS[row.kind] : undefined}
	<div class="flex min-w-0 items-center gap-1.5">
		{#if KindIcon}
			<Tooltip text={KIND_LABELS[row.kind!] ?? row.kind}><KindIcon class="text-beet size-3.5 shrink-0" aria-label={KIND_LABELS[row.kind!] ?? row.kind} /></Tooltip>
		{/if}
		<span class={['min-w-0 truncate', !row.text && 'text-muted-foreground italic']} title={row.quote ? `${row.text ?? ''}\n\nIn their words: “${row.quote}”` : (row.text ?? undefined)}>
			{row.text ?? 'named a dish'}
		</span>
		{#if row.quote}<Quote class="text-faint size-3 shrink-0" aria-label="Has the source's own words" />{/if}
		{#if row.amount != null && row.unit}
			<span class="bg-wash text-ink ml-auto shrink-0 rounded px-1.5 text-xs font-medium tabular-nums">{amountLabel(row.amount, row.unit)}</span>
		{/if}
	</div>
{/snippet}

{#snippet aboutCell(row: AdminStatementRowOutputDto)}
	<!-- On an aspect's page its own name would fill every row: only a finer aspect under it shows -->
	{@const a = aspectOf(row)?.key === aspect ? undefined : aspectOf(row)}
	{@const foods = foodPartsOf(row).map((f) => f.name).join(', ')}
	<div class="flex min-w-0 items-baseline gap-1.5">
		{#if a}
			<Tooltip text={aspectPath(a)} class="min-w-0 shrink-0">
				<a
					class="text-ink decoration-line hover:decoration-ink truncate underline underline-offset-4"
					href={aspectPageHref(a.key)}
					onclick={(e) => e.stopPropagation()}>{a.label}</a>
			</Tooltip>
		{/if}
		{#if foods}<span class="text-muted-foreground min-w-0 truncate text-xs" title={foods}>{foods}</span>{/if}
	</div>
{/snippet}

{#snippet whereCell(row: AdminStatementRowOutputDto)}
	{@const platform = row.review?.platform ?? row.post?.platform}
	<div class="flex min-w-0 items-center gap-1.5">
		{#if platform}<PlatformIcon {platform} tip={sourceLine(row)} class="text-muted-foreground" />{/if}
		{#if row.review?.stars}<span class="text-xs font-medium tabular-nums">{row.review.stars}★</span>{/if}
		{#if !scope.venueId}
			<span class={['min-w-0 truncate', row.subject !== 'place' && 'text-muted-foreground']} title={aboutOf(row)}>{aboutOf(row)}</span>
		{/if}
		<span class="text-muted-foreground ml-auto shrink-0 pl-1 text-xs tabular-nums">{day(row.saidAt)}</span>
	</div>
{/snippet}

{#snippet dateRange()}
	<DateRangeFilter {from} {to} onChange={setRange} />
{/snippet}

{#snippet groupSwitch()}
	<div class="flex flex-wrap items-center gap-2">
		<Tabs.Root value={shown} onValueChange={setShown}>
			<Tabs.List>
				<Tabs.Trigger value="all">All</Tabs.Trigger>
				<Tabs.Trigger value="groups">
					Grouped by meaning{#if shown === 'groups' && groups?.groups.length}<span class="font-term text-base leading-none opacity-70">{groups.groups.length}</span>{/if}
				</Tabs.Trigger>
			</Tabs.List>
		</Tabs.Root>
		{#if dated}{@render dateRange()}{/if}
	</div>
{/snippet}

{#snippet groupedBody()}
	{#if !explore}
		<p class="text-muted-foreground m-0 mb-2 text-xs">{monthLabel(months.from)} – {monthLabel(months.to)} · the claims these filters keep</p>
	{/if}
	{#if groupsLoader.error && !groups}
		<ErrorState onRetry={() => groupsLoader.load(JSON.parse(groupsKey))} />
	{:else}
		<ClaimGroups data={groups} bar={groupBar} onBar={(next) => (groupBar = { ...groupBar, ...next })} />
	{/if}
{/snippet}

{#snippet source(row: AdminStatementRowOutputDto)}
	<DigestionDetail postId={row.post?.id} reviewId={row.review?.id} focus={row.id} />
{/snippet}

<div class="flex flex-col gap-5 pb-12">
	{#if !explore && !aspect}
	<AdminPanel title="Claims" note={scopeLabel}>
		{#if summary}
			<dl class="m-0 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-5">
				{#each FIGURES as figure (figure.label)}
					<div class="min-w-0">
						<dt class="text-muted-foreground text-xs">{figure.label}</dt>
						<dd class="m-0 text-lg font-semibold tabular-nums">{figure.value(summary)}</dd>
					</div>
				{/each}
			</dl>
		{:else}
			<div class="h-24"></div>
		{/if}
	</AdminPanel>
	{/if}

	<PaginatedDataTable
		syncWithSearchParams
		{filters}
		api={listStatements}
		noun="claims"
		limit={50}
		availableFilters={FILTERS}
		columns={COLUMNS}
		expand={source}
		dense
		toolbar={groupable ? groupSwitch : dated ? dateRange : undefined}
		body={groupable && shown === 'groups' ? groupedBody : undefined}
		rowKey={(row) => String(row.id)}
		rowClass={(row) => sentimentLook(row.sentiment).tint}
		emptyTitle="No claim matches"
		emptyDescription="The month's reviews and posts hold no claim with these filters." />
</div>
