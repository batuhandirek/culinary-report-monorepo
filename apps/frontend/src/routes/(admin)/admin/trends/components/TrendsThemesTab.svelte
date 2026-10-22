<script lang="ts">
	import type {
		AdminThemeFoodCoverageOutputDto,
		AdminThemeInsightRowOutputDto,
		AdminThemeInsightsOutputDto
	} from 'client';

	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { monthLabel, TOPIC_LABELS } from '#lib/culinary.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import ResponsiveCombobox from '#ui/wrapped/ResponsiveCombobox.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// What the city's guests praise and criticise, across every venue: per feedback theme ("price
	// increase", "cash only"), the month's written reviews and posts by others raising it, each
	// counted once however often it says so. A row opens its sample details, the brands it came up
	// at most and the kinds of food (a brand's is the main food of most of its places); the picker
	// narrows every count to the brands of one kind of food
	interface Props {
		cityId: string;
		month: string;
	}

	let { cityId, month }: Props = $props();

	let data = $state<AdminThemeInsightsOutputDto | null>(null);
	// The month's kinds of food, kept while a narrowed count loads so the picker stays put
	let foods = $state<AdminThemeFoodCoverageOutputDto[]>([]);
	let food = $state<string | null>(null);
	let foodOpen = $state(false);
	const loader = createLoader(
		(query: { cityId: string; month: string; food?: string }) => api.admin.getThemeInsights(query),
		{
			onSuccess: (res) => {
				data = res;
				foods = res.foods;
			}
		}
	);
	const query = $derived({ cityId, month, ...(food && { food }) });
	$effect(() => {
		data = null;
		if (query.cityId) loader.load(query);
	});
	const foodItems = $derived([
		{ label: 'Every kind of food', value: null },
		...foods.map((f) => ({ label: `${f.label} · ${(f.reviews + f.posts).toLocaleString('en-GB')}`, value: f.key }))
	]);

	let polarity = $state<'complaints' | 'praise'>('complaints');
	let topic = $state<string>('all');
	const SORTS = [
		{ value: 'raised', label: 'Most raised' },
		{ value: 'reviews', label: 'Gaining in reviews' },
		{ value: 'posts', label: 'Gaining in posts' }
	] as const;
	let sort = $state<(typeof SORTS)[number]['value']>('raised');
	const sortKey: Record<typeof sort, (r: AdminThemeInsightRowOutputDto) => number> = {
		raised: (r) => r.reviews + r.posts,
		reviews: (r) => r.reviewShareChange ?? -Infinity,
		posts: (r) => r.postShareChange ?? -Infinity
	};
	const all = $derived(data?.[polarity] ?? []);
	const topics = $derived(Object.keys(TOPIC_LABELS).filter((t) => all.some((r) => r.topic === t)));
	const rows = $derived(
		all
			.filter((r) => topic === 'all' || r.topic === topic)
			.toSorted((a, b) => sortKey[sort](b) - sortKey[sort](a) || a.label.localeCompare(b.label))
	);
	let open = $state<string | null>(null);

	const monthName = $derived(data ? monthLabel(data.month) : '');
	const prevName = $derived(data ? monthLabel(data.previous).split(' ')[0] : '');
	const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;
	const change = (pt: number | null) =>
		pt === null ? '' : `${pt > 0 ? '+' : pt < 0 ? '−' : '±'}${Math.abs(pt).toFixed(1)} pt on ${prevName}`;
</script>

{#snippet figure(count: number, share: number | null, pt: number | null)}
	<span class="text-right tabular-nums">
		<span class="block">{count ? count : '—'}{#if count && share !== null}<span class="text-muted-foreground"> · {share.toFixed(1)} %</span>{/if}</span>
		{#if count && pt !== null}
			<span class={['block text-xs', pt > 0 ? (polarity === 'complaints' ? 'text-destructive' : 'text-success') : 'text-muted-foreground']}>
				{change(pt)}
			</span>
		{/if}
	</span>
{/snippet}

<div class="flex min-w-0 flex-col gap-5 pb-12">
	{#if loader.error && !data}
		<ErrorState onRetry={() => loader.load(query)} />
	{:else if !data}
		<AdminPanel><SkeletonRows count={10} lines={2} trailing /></AdminPanel>
	{:else if !data.coverage.reviews && !data.coverage.posts}
		<EmptyState
			title={`Nothing to count in ${monthName}`}
			hint={data.food
				? `No review or post about a ${data.food.label} brand has a praise or complaint point this month.`
				: 'No analysed review or matched post of the month has a praise or complaint point yet.'}
			size="sm" />
	{:else}
		<p class="text-muted-foreground m-0 text-sm">
			{monthName}{#if data.food}, brands whose food is {data.food.label}{/if}: {plural(data.coverage.reviews, 'written review')} of {plural(data.coverage.reviewBrands, 'brand')} and
			{plural(data.coverage.posts, 'post')} by others about {plural(data.coverage.postBrands, 'brand')}, each with a
			praise or complaint point. A review or a post counts once per theme, however often it says so; the share is of
			those reviews or posts. Reviews are only scraped for report venues and their competitors, so the review column
			is those brands, not the whole city; posts cover every venue a post was matched to. A venue's own posts are left
			out. A brand's kind of food is the main food of most of its places in the city.
			{#if data.coverage.unfiledReviews || data.coverage.unfiledPosts}
				{plural(data.coverage.unfiledReviews, 'review')} and {plural(data.coverage.unfiledPosts, 'post')} have a point
				not filed under a theme yet and count under none (run the feedback-themes backfill).
			{/if}
		</p>

		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex flex-wrap gap-1.5" role="group" aria-label="Praise or complaints">
				{#each [{ value: 'complaints', label: 'Complaints' }, { value: 'praise', label: 'Praise' }] as const as p (p.value)}
					<button
						type="button"
						class="chip text-xs"
						aria-pressed={polarity === p.value}
						onclick={() => {
							polarity = p.value;
							topic = 'all';
							open = null;
						}}>
						{p.label}
					</button>
				{/each}
			</div>
			<div class="flex flex-wrap gap-1.5" role="group" aria-label="Order">
				{#each SORTS as s (s.value)}
					<button type="button" class="chip text-xs" aria-pressed={sort === s.value} onclick={() => (sort = s.value)}>
						{s.label}
					</button>
				{/each}
			</div>
		</div>
		<div class="w-72 max-w-full">
			<ResponsiveCombobox
				items={foodItems}
				bind:selected={food}
				bind:open={foodOpen}
				onSelect={() => {
					foodOpen = false;
					open = null;
				}}
				placeholder="Every kind of food"
				title="Kind of food" />
		</div>
		<div class="flex flex-wrap gap-1.5" role="group" aria-label="Topic">
			{#each [{ value: 'all', label: 'All' }, ...topics.map((t) => ({ value: t, label: TOPIC_LABELS[t] }))] as t (t.value)}
				<button type="button" class="chip text-xs" aria-pressed={topic === t.value} onclick={() => (topic = t.value)}>
					{t.label}
				</button>
			{/each}
		</div>

		<AdminPanel title={plural(rows.length, 'theme')} note={`${polarity === 'praise' ? 'praised' : 'criticised'} · ${monthName}`}>
			{#if !rows.length}
				<EmptyState title="Nothing raised" hint="No review or post of the month raised a theme of this topic." ground="none" size="sm" />
			{:else}
				<div class="text-muted-foreground grid grid-cols-[minmax(0,1fr)_9rem_9rem_4.5rem] gap-3 pb-2 text-xs">
					<span>Theme</span>
					<span class="text-right">Written reviews</span>
					<span class="text-right">Posts by others</span>
					<span class="text-right">Brands</span>
				</div>
				<ul class="divide-line m-0 flex list-none flex-col divide-y p-0 text-sm">
					{#each rows as row (row.key)}
						<li>
							<button
								type="button"
								class="hover:bg-sand grid w-full grid-cols-[minmax(0,1fr)_9rem_9rem_4.5rem] items-center gap-3 py-2 text-left"
								aria-expanded={open === row.key}
								onclick={() => (open = open === row.key ? null : row.key)}>
								<span class="min-w-0">
									<span class="block truncate font-medium">{row.label}</span>
									<span class="text-muted-foreground block truncate text-xs">{TOPIC_LABELS[row.topic] ?? row.topic}</span>
								</span>
								{@render figure(row.reviews, row.reviewShare, row.reviewShareChange)}
								{@render figure(row.posts, row.postShare, row.postShareChange)}
								<span class="text-right tabular-nums">{row.venues}</span>
							</button>
							{#if open === row.key}
								<div class={['grid grid-cols-1 gap-4 pb-3', data.food ? 'md:grid-cols-2' : 'md:grid-cols-3']}>
									<div>
										<p class="text-muted-foreground m-0 mb-1 text-xs">What they said</p>
										<ul class="m-0 flex list-none flex-col gap-1 p-0">
											{#each row.samples as sample (sample)}
												<li>“{sample}”</li>
											{/each}
										</ul>
									</div>
									<div>
										<p class="text-muted-foreground m-0 mb-1 text-xs">Where it came up most</p>
										<ul class="m-0 flex list-none flex-col gap-1 p-0">
											{#each row.topBrands as brand (brand.id)}
												<li class="flex justify-between gap-3">
													<a href={`/admin/brands/${brand.id}?month=${data.month}`} class="min-w-0 truncate hover:underline">{brand.name}</a>
													<span class="text-muted-foreground tabular-nums">{plural(brand.sources, 'time')}</span>
												</li>
											{/each}
										</ul>
									</div>
									{#if !data.food}
										<div>
											<p class="text-muted-foreground m-0 mb-1 text-xs">By kind of food</p>
											<ul class="m-0 flex list-none flex-col gap-1 p-0">
												{#each row.foods as f (f.key)}
													<li class="flex justify-between gap-3">
														<button type="button" class="min-w-0 truncate text-left hover:underline" onclick={() => (food = f.key)}>
															{f.label}
														</button>
														<span class="text-muted-foreground tabular-nums" title="Of its brands' reviews and posts with a point">
															{f.sources} · {f.share.toFixed(1)} %
														</span>
													</li>
												{:else}
													<li class="text-muted-foreground">No brand of a known food</li>
												{/each}
											</ul>
										</div>
									{/if}
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</AdminPanel>
	{/if}
</div>
