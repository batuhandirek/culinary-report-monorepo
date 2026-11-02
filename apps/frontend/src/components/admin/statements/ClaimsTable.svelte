<script lang="ts">
	import type { AdminStatementRowOutputDto, AdminStatementsSummaryOutputDto, AdminTopicOutputDto } from 'client';

	import {
		ListStatementsParamsKindEnum,
		ListStatementsParamsPartsEnum,
		ListStatementsParamsSentimentEnum,
		ListStatementsParamsSourceKindEnum,
		ListStatementsParamsSubjectEnum
	} from 'client';

	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { authorLabel, monthLabel, PLATFORM_LABELS, recentMonths, sentimentVariant } from '#lib/culinary.js';
	import { amountLabel, aspectOf, foodPartsOf, KIND_LABELS } from '#lib/statements.js';
	import { topicHref } from '#lib/topic-format.js';
	import type { Column, Filter } from '#ui/components/paginated-data-table/index.js';
	import PaginatedDataTable from '#ui/components/paginated-data-table/PaginatedDataTable.svelte';

	// What agents A and B made of the sources: every claim of the scope (a city's month on the
	// Trends page, a brand's or a branch's on theirs), one row each, with its sentiment, aspect, food
	// wordings, number, what it is about and where it was said (the row opens the source). The strip
	// above is the whole scope, whatever the table filters: how it was split and how much was read.
	// With `explore` it lists an Explore view's claims instead (its own chips narrow them), with no
	// strip and only the text and meaning searches.
	interface Props {
		/** Whose claims, fixed: a city's month, a brand's (its branches' reviews, posts about it) or a branch's; every month unless `month` is given */
		scope: { cityId?: string; brandId?: string; venueId?: string; month?: string };
		/** The city whose aspects the filter offers */
		topicsCityId: string;
		/** What the strip says it covers */
		scopeLabel?: string;
		/** An Explore view's query: the table lists its claims (`listExploreClaims`) */
		explore?: Parameters<typeof api.admin.listExploreClaims>[0];
	}

	let { scope, topicsCityId, scopeLabel = 'Every review and post here, whatever the table below filters', explore }: Props = $props();

	let summary = $state<AdminStatementsSummaryOutputDto | null>(null);
	$effect(() => {
		if (!explore) api.admin.getStatementsSummary(scope).then((res) => (summary = res));
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

	const MONTHS = recentMonths(12).map((m) => ({ name: monthLabel(m), value: m }));
	const SEARCHES: Filter[] = [
		{ key: 'q', name: 'Search', type: 'text', placeholder: 'Words in the claim…' },
		{ key: 'like', name: 'Similar to', type: 'text', placeholder: 'Similar to…' }
	];
	const FILTERS: Filter[] = $derived(explore ? SEARCHES : [
		{ key: 'q', name: 'Search', type: 'text', placeholder: 'Words in the claim…' },
		{ key: 'like', name: 'Similar to', type: 'text', placeholder: 'Similar to…' },
		...(scope.month ? [] : [{ key: 'month', name: 'Month', type: 'select', options: MONTHS } satisfies Filter]),
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
		{ key: 'aspect', name: 'Aspect', type: 'select', options: aspectOptions },
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

	const aboutOf = (row: AdminStatementRowOutputDto) =>
		row.review
			? row.review.venue.name
			: row.venue
				? row.venue.name
			: row.mention
				? (row.mention.brand?.name ?? row.mention.venueName)
				: row.subject === 'city'
					? 'the city'
					: 'nothing in particular';
	// A brand's own post about itself is not word of mouth: said so in the source
	const isOwnPost = (row: AdminStatementRowOutputDto) =>
		!!row.post?.account?.brand && row.post.account.brand.id === row.mention?.brand?.id;
	const sourceOf = (row: AdminStatementRowOutputDto) =>
		row.review
			? `${row.review.platform === 'tripadvisor' ? 'TripAdvisor' : 'Google'} review${row.review.stars ? ` · ${row.review.stars}★` : ''}`
			: row.post
				? `${PLATFORM_LABELS[row.post.platform] ?? row.post.platform} · ${authorLabel(row.post.platform, row.post.author)}${isOwnPost(row) ? ' (own post)' : ''}`
				: row.sourceKind === 'google_tag'
					? `Google tag${row.count && row.count > 1 ? ` · ×${row.count.toLocaleString('en-GB')}` : ''}`
					: '';
	const sourceHref = (row: AdminStatementRowOutputDto) =>
		row.post
			? `/admin/posts/${row.post.id}`
			: row.review
				? `/admin/venues/${row.review.venue.id}?tab=reviews`
				: row.venue
					? `/admin/venues/${row.venue.id}`
					: undefined;

	const ALL_COLUMNS: Column<AdminStatementRowOutputDto>[] = [
		{ type: 'date', name: 'Said', format: 'date', value: (row) => row.saidAt },
		{
			type: 'value',
			name: 'Claim',
			truncate: 90,
			value: (row) => (row.text ? row.text : { value: 'named a dish', class: 'text-muted-foreground italic' })
		},
		{
			type: 'value',
			name: 'Quote',
			label: 'In their words',
			truncate: 60,
			value: (row) => (row.quote ? { value: `“${row.quote}”`, class: 'text-muted-foreground' } : '')
		},
		{
			type: 'badge',
			name: 'Sentiment',
			value: (row) => row.sentiment ?? 'not read',
			variant: (row) => (row.sentiment ? sentimentVariant(row.sentiment) : 'quiet')
		},
		{
			type: 'link',
			name: 'Aspect',
			truncate: 32,
			if: (row) => !!aspectOf(row),
			href: (row) => topicHref(aspectOf(row)!.key),
			value: (row) => {
				const a = aspectOf(row)!;
				return a.root !== a.key ? `${a.rootLabel} › ${a.label}` : a.label;
			}
		},
		{
			type: 'value',
			name: 'Foods',
			truncate: 30,
			value: (row) => foodPartsOf(row).map((f) => f.name).join(', ')
		},
		{
			type: 'value',
			name: 'Number',
			numeric: true,
			value: (row) => (row.amount != null && row.unit ? amountLabel(row.amount, row.unit) : '')
		},
		{
			type: 'badge',
			name: 'Kind',
			value: (row) => (row.kind ? (KIND_LABELS[row.kind] ?? row.kind) : null),
			variant: (row) => (row.kind === 'change' || row.kind === 'new_item' || row.kind === 'deal' ? 'warning' : 'quiet')
		},
		{
			type: 'value',
			name: 'About',
			truncate: 28,
			value: (row) => (row.subject === 'place' ? aboutOf(row) : { value: aboutOf(row), class: 'text-muted-foreground' })
		},
		{ type: 'value', name: 'Source', truncate: 30, value: sourceOf }
	];
	// A branch's claims are all about it: no "About" column there
	const COLUMNS = $derived(ALL_COLUMNS.filter((c) => !(scope.venueId && c.name === 'About')));

	// The scope is fixed: the page mounts the table again when it changes
	const filters = $derived(explore ? { ...explore } : { ...scope });

	// "Similar to…" orders the page by meaning and leaves out the claims without a vector yet,
	// which the response counts (`notEmbedded`, only with `like`)
	let notEmbedded = $state<number | undefined>(undefined);
	const listStatements = async (params: Parameters<typeof api.admin.listStatements>[0]) => {
		const res = explore
			? await api.admin.listExploreClaims(params as unknown as Parameters<typeof api.admin.listExploreClaims>[0])
			: await api.admin.listStatements(params);
		notEmbedded = res.notEmbedded;
		return res;
	};
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

<div class="flex flex-col gap-5 pb-12">
	{#if !explore}
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

	{#if notEmbedded !== undefined}
		<p class="text-muted-foreground m-0 text-sm">
			Closest in meaning first.
			{#if notEmbedded}{n(notEmbedded)} matching {notEmbedded === 1 ? 'claim has' : 'claims have'} no vector yet and {notEmbedded === 1 ? 'is' : 'are'} left out.{/if}
		</p>
	{/if}

	<PaginatedDataTable
		syncWithSearchParams
		{filters}
		api={listStatements}
		noun="claims"
		limit={50}
		availableFilters={FILTERS}
		columns={COLUMNS}
		rowHref={sourceHref}
		emptyTitle="No claim matches"
		emptyDescription="The month's reviews and posts hold no claim with these filters." />
</div>
