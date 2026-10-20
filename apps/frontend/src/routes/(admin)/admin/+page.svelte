<script lang="ts">
	import { ArrowRight, CircleAlert, Info, ListTodo, PartyPopper, RefreshCw } from '@lucide/svelte';
	import type { AdminOverviewOutputDto, AdminTodayOutputDto } from 'client';

	import { onMount } from 'svelte';

	import { ago, at, onDay, pipelineRunStatusVariant, prospectStageVariant } from '#components/admin/admin-format.js';
	import AdminPageHeader from '#components/admin/admin-page-header.svelte';
	import { api } from '#lib/api.js';
	import { compact, leadScoreVariant, monthLabel, PLATFORM_LABELS } from '#lib/culinary.js';
	import { isDueToday, stageLabel } from '#lib/outreach-status.js';
	import { stepLabel } from '#lib/pipeline-steps.js';
	import { enumToName } from '#lib/util.js';
	import { cn } from '#ui/lib/utils.js';
	import { Badge } from '#ui/primitives-new/badge/index.js';
	import { Button } from '#ui/primitives-new/button/index.js';
	import { Skeleton } from '#ui/primitives-new/skeleton/index.js';
	import Section from '#ui/wrapped/Section.svelte';

	// What is waiting on an admin, most pressing first, each line linking to where it is done;
	// then today's follow-ups, the posts we could not place, the next prospects and the run.
	let overview = $state<AdminOverviewOutputDto | null>(null);
	let today = $state<AdminTodayOutputDto | null>(null);
	let failed = $state(false);
	let loading = $state(false);

	async function load() {
		loading = true;
		failed = false;
		try {
			[overview, today] = await Promise.all([api.admin.getAdminOverview(), api.admin.getAdminToday()]);
		} catch {
			failed = true;
		}
		loading = false;
	}
	onMount(load);

	const usd = (value: number) => `$${value.toFixed(2)}`;
	const stageCount = (stage: string) =>
		overview?.outreach?.stages.find((row) => row.stage === stage)?.count ?? null;
	const TONES = {
		urgent: { icon: CircleAlert, class: 'text-destructive' },
		todo: { icon: ListTodo, class: 'text-ink' },
		info: { icon: Info, class: 'text-muted-foreground' }
	} as const;

	type Cell = { label: string; value: string; href?: string; note?: string; tone?: string };
	const cells = $derived.by((): Cell[] => {
		const o = overview;
		const spend = o?.apifyMonthCostUsd;
		const credit = o?.apifyMonthlyCreditUsd ?? 250;
		const count = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('en-US'));
		return [
			{
				label: o ? `Reports, ${monthLabel(o.reportMonth)}` : 'Reports',
				value: count(o?.reportsBuilt),
				href: o ? `/admin/reports?month=${o.reportMonth}` : '/admin/reports'
			},
			{
				label: 'To contact',
				value: count(stageCount('TO_CONTACT')),
				href: '/admin/brands?segment=prospects&stage=TO_CONTACT'
			},
			{
				label: 'Waiting for an answer',
				value: count(stageCount('CONTACTED')),
				note: o?.outreach ? `${o.outreach.outreachLast7Days} sent in 7 days` : undefined,
				href: '/admin/brands?segment=prospects&stage=CONTACTED'
			},
			{
				label: 'Customers',
				value: count(stageCount('WON')),
				href: '/admin/brands?segment=customers',
				tone: stageCount('WON') ? 'text-success' : ''
			},
			{
				label: 'Apify this month',
				value: spend == null ? '—' : usd(spend),
				note: `of ${usd(credit)} credit`,
				href: '/admin/data?tab=apify',
				tone: spend != null && spend > credit * 0.8 ? 'text-destructive' : ''
			}
		];
	});
</script>

<AdminPageHeader description="What is waiting on you, and where to do it.">
	{#snippet rightTitle()}
		<Button variant="outline" size="sm" onclick={load} disabled={loading}>
			<RefreshCw class={loading ? 'animate-spin' : ''} />
			Refresh
		</Button>
	{/snippet}
</AdminPageHeader>

<div class="mb-12 flex flex-col gap-8">
	{#if failed}
		<p class="text-destructive text-sm">Today could not be loaded. Try Refresh.</p>
	{/if}

	<!-- The to-do list: every count links to the page where it is worked through -->
	<section class="border-line bg-paper overflow-hidden rounded-md border">
		<div class="border-line flex items-baseline gap-3 border-b px-4 py-3">
			<h2 class="m-0 text-base font-semibold">Waiting on you</h2>
			{#if today}<span class="eyebrow text-beet">{today.todos.length}</span>{/if}
		</div>
		<ul class="divide-line m-0 list-none divide-y p-0">
			{#if today === null && !failed}
				{#each { length: 4 }, i (i)}
					<li class="flex items-center gap-3 px-4 py-3.5">
						<Skeleton class="h-4 w-80 rounded-sm" />
						<Skeleton class="ml-auto h-7 w-16 rounded-full" />
					</li>
				{/each}
			{:else if today}
				{#each today.todos as todo (todo.key)}
					{@const tone = TONES[todo.tone]}
					<li>
						<a href={todo.href} class="hover:bg-sand flex items-center gap-3 px-4 py-3 text-sm">
							<tone.icon class={cn('size-4 shrink-0', tone.class)} />
							<span class={cn('min-w-0 flex-1', todo.tone === 'urgent' && 'font-medium')}>{todo.text}</span>
							<span class="text-beet flex shrink-0 items-center gap-1 text-xs font-medium">
								{todo.cta}
								<ArrowRight class="size-3.5" />
							</span>
						</a>
					</li>
				{:else}
					<li class="text-muted-foreground flex items-center gap-2 px-4 py-6 text-sm">
						<PartyPopper class="size-4" /> Nothing is waiting. The data is complete and nobody needs an answer.
					</li>
				{/each}
			{/if}
		</ul>
	</section>

	<!-- One band, not separate cards: the hairlines between cells are the grid's own gap. -->
	<div class="border-line bg-line grid grid-cols-2 gap-px overflow-hidden rounded-md border lg:grid-cols-5">
		{#each cells as cell (cell.label)}
			<a href={cell.href} class="bg-paper hover:bg-sand flex flex-col gap-1.5 px-4 py-3">
				<span class="eyebrow text-muted-foreground">{cell.label}</span>
				{#if overview === null && !failed}
					<Skeleton class="h-8 w-16 rounded-sm" />
				{:else}
					<span class="text-2xl font-semibold tabular-nums {cell.value === '—' ? 'text-faint' : cell.tone}">
						{cell.value}
					</span>
				{/if}
				{#if cell.note}
					<span class="text-muted-foreground text-xs">{cell.note}</span>
				{/if}
			</a>
		{/each}
	</div>

	<div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
		<Section title="Follow up today" href="/admin/brands?segment=prospects&sort=followUp:asc" linkText="Sales list">
			<ul class="border-line bg-paper divide-line m-0 list-none divide-y overflow-hidden rounded-md border p-0">
				{#if overview === null && !failed}
					{#each { length: 3 }, i (i)}
						<li class="flex items-center gap-3 px-4 py-3.5">
							<Skeleton class="h-4 w-40 rounded-sm" />
							<Skeleton class="ml-auto h-3.5 w-12 rounded-sm" />
						</li>
					{/each}
				{:else if !overview?.dueFollowUps}
					<li class="text-muted-foreground px-4 py-6 text-center text-sm">—</li>
				{:else}
					{#each overview.dueFollowUps as prospect (prospect.id)}
						<li>
							<a href={`/admin/brands/${prospect.brand.id}?tab=sales`} class="hover:bg-sand flex items-center gap-3 px-4 py-2.5 text-sm">
								<span class="flex min-w-0 flex-1 flex-col">
									<span class="truncate font-medium">{prospect.brand.name}</span>
									<span class="text-muted-foreground truncate text-xs">
										{prospect.outreachCount}
										{prospect.outreachCount === 1 ? 'try' : 'tries'}
										{#if prospect.lastTouchAt}· last {ago(prospect.lastTouchAt)}{/if}
									</span>
								</span>
								<Badge variant={prospectStageVariant(prospect.stage)}>{stageLabel(prospect.stage)}</Badge>
								<span class="shrink-0 text-xs tabular-nums {isDueToday(prospect.nextFollowUpAt) ? 'text-destructive font-medium' : 'text-muted-foreground'}">
									{onDay(prospect.nextFollowUpAt)}
								</span>
							</a>
						</li>
					{:else}
						<li class="text-muted-foreground px-4 py-6 text-center text-sm">Nothing due today</li>
					{/each}
				{/if}
			</ul>
		</Section>

		<Section title="Next prospects" href="/admin/brands?tab=suggested" linkText="See all">
			<ul class="border-line bg-paper divide-line m-0 list-none divide-y overflow-hidden rounded-md border p-0">
				{#if overview === null && !failed}
					{#each { length: 3 }, i (i)}
						<li class="flex items-center gap-3 px-4 py-3.5">
							<Skeleton class="h-4 w-40 rounded-sm" />
							<Skeleton class="ml-auto h-3.5 w-12 rounded-sm" />
						</li>
					{/each}
				{:else if !overview?.suggestedProspects}
					<li class="text-muted-foreground px-4 py-6 text-center text-sm">—</li>
				{:else}
					{#each overview.suggestedProspects as brand (brand.id)}
						<li>
							<a href={`/admin/brands/${brand.id}`} class="hover:bg-sand flex items-center gap-3 px-4 py-2.5 text-sm">
								<span class="flex min-w-0 flex-1 flex-col">
									<span class="truncate font-medium">{brand.name}</span>
									<span class="text-muted-foreground truncate text-xs">
										{[brand.branches > 1 ? `${brand.branches} places` : brand.district, brand.category].filter(Boolean).join(' · ')}
									</span>
								</span>
								<Badge variant={leadScoreVariant(brand.leadScore)}>{Math.round(brand.leadScore)}</Badge>
							</a>
						</li>
					{:else}
						<li class="text-muted-foreground px-4 py-6 text-center text-sm">No scored brand left to suggest</li>
					{/each}
				{/if}
			</ul>
		</Section>

		<Section title="Posts we couldn't place" href="/admin/posts?unmatchedOnly=true" linkText="All of them">
			<ul class="border-line bg-paper divide-line m-0 list-none divide-y overflow-hidden rounded-md border p-0">
				{#if today === null && !failed}
					{#each { length: 3 }, i (i)}
						<li class="flex items-center gap-3 px-4 py-3.5"><Skeleton class="h-4 w-48 rounded-sm" /></li>
					{/each}
				{:else if today}
					{#each today.unmatchedPosts as post (post.postId)}
						<li>
							<a href={`/admin/posts/${post.postId}`} class="hover:bg-sand flex items-center gap-3 px-4 py-2.5 text-sm">
								<span class="w-14 shrink-0 text-right font-medium tabular-nums">{compact(post.views)}</span>
								<span class="flex min-w-0 flex-1 flex-col">
									<span class="truncate">“{post.name}”</span>
									<span class="text-muted-foreground truncate text-xs">
										@{post.author ?? '—'} · {PLATFORM_LABELS[post.platform] ?? post.platform} · {onDay(post.postedAt)}
									</span>
								</span>
							</a>
						</li>
					{:else}
						<li class="text-muted-foreground px-4 py-6 text-center text-sm">Every recent post is placed</li>
					{/each}
				{/if}
			</ul>
		</Section>

		<Section title="Pipeline" href="/admin/data" linkText="Months">
			<div class="border-line bg-paper flex flex-col gap-2 rounded-md border px-4 py-3 text-sm">
				{#if overview === null}
					<Skeleton class="h-5 w-72 rounded-sm" />
				{:else}
					{#each [overview.lastMonthlyRun, overview.lastRun].filter((r, i, all) => r && all.findIndex((x) => x?.id === r.id) === i) as run (run!.id)}
						<span class="flex flex-wrap items-center gap-x-3 gap-y-1">
							<Badge variant={pipelineRunStatusVariant(run!.status)}>{enumToName(run!.status)}</Badge>
							<span class="font-medium">{stepLabel(run!.step)}, {monthLabel(run!.month)}</span>
							<span class="text-muted-foreground tabular-nums" title={at(run!.startedAt ?? run!.createdAt)}>
								{ago(run!.startedAt ?? run!.createdAt)}
							</span>
						</span>
						{#if run!.error}<span class="text-destructive line-clamp-2 text-xs">{run!.error}</span>{/if}
					{/each}
					<span class="text-muted-foreground text-xs">
						Next monthly run {at(overview.nextMonthlyRunAt)}, {ago(overview.nextMonthlyRunAt)}
					</span>
				{/if}
			</div>
		</Section>
	</div>

	<p class="text-muted-foreground text-sm">
		Accounts: <a href="/admin/users" class="underline">users</a> and
		<a href="/admin/user-sessions" class="underline">sessions</a>.
	</p>
</div>
