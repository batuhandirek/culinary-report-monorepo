<script lang="ts">
	import { MessageSquareText } from '@lucide/svelte';
	import type {
		ListPortalReviewsParamsPlatformEnum,
		ListPortalReviewsParamsTopicEnum,
		PortalReviewFiltersOutputDto,
		PortalReviewOutputDto,
		PortalReviewsOutputDto
	} from 'client';

	import ReviewCard from './components/ReviewCard.svelte';

	import { page } from '$app/state';
	import { api } from '#lib/api.js';
	import { monthLabel, TOPIC_LABELS } from '#lib/culinary.js';
	import PaginatedResultFetcher from '#ui/components/PaginatedResultFetcher.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import Section from '#ui/wrapped/Section.svelte';
	import Select from '#ui/wrapped/Select.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// Every Google review of the venue, filterable, and on top the ones still waiting for an
	// answer, each with a reply draft to copy when we have one.
	const brandId = $derived(page.params.brandId!);

	let facets = $state<PortalReviewFiltersOutputDto | null>(null);
	let facetsFailed = $state(false);
	let needs = $state<PortalReviewOutputDto[]>([]);
	let needsTotal = $state(0);

	const loadTop = async () => {
		facetsFailed = false;
		try {
			const [f, n] = await Promise.all([
				api.portal.getPortalReviewFilters(brandId),
				api.portal.listPortalReviews(brandId, { page: 1, size: 5, needsReply: true })
			]);
			facets = f as PortalReviewFiltersOutputDto;
			needs = (n as PortalReviewsOutputDto).items;
			needsTotal = (n as PortalReviewsOutputDto).totalItems;
		} catch {
			facetsFailed = true;
		}
	};
	$effect(() => {
		loadTop();
	});

	const ALL = 'all';
	let month = $state(ALL);
	let stars = $state(ALL);
	let topic = $state(ALL);
	let answered = $state(ALL);
	let language = $state(ALL);
	let platform = $state(ALL);

	const filters = $derived({
		...(month !== ALL && { month }),
		...(stars !== ALL && { stars: Number(stars) }),
		...(topic !== ALL && { topic: topic as ListPortalReviewsParamsTopicEnum }),
		...(answered !== ALL && { answered: answered === 'yes' }),
		...(language !== ALL && { language }),
		...(platform !== ALL && { platform: platform as ListPortalReviewsParamsPlatformEnum })
	});
	const filtered = $derived(Object.keys(filters).length > 0);
	const clear = () => {
		month = stars = topic = answered = language = platform = ALL;
	};

	const monthItems = $derived([
		{ value: ALL, label: 'All months' },
		...(facets?.months ?? []).map((m) => ({ value: m.month, label: monthLabel(m.month) }))
	]);
	const STAR_ITEMS = [
		{ value: ALL, label: 'Any stars' },
		...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} ${n === 1 ? 'star' : 'stars'}` }))
	];
	const topicItems = $derived([
		{ value: ALL, label: 'Any topic' },
		...(facets?.topics ?? []).map((t) => ({ value: t.topic, label: TOPIC_LABELS[t.topic] ?? t.topic }))
	]);
	const ANSWERED_ITEMS = [
		{ value: ALL, label: 'Answered or not' },
		{ value: 'no', label: 'Not answered' },
		{ value: 'yes', label: 'Answered' }
	];
	const languageItems = $derived([
		{ value: ALL, label: 'Any language' },
		...(facets?.languages ?? []).map((l) => ({ value: l.language, label: l.language.toUpperCase() }))
	]);

	// Only for a venue with reviews on both platforms
	const PLATFORM_NAMES: Record<string, string> = { google: 'Google', tripadvisor: 'TripAdvisor' };
	const platformItems = $derived([
		{ value: ALL, label: 'Google and TripAdvisor' },
		...(facets?.platforms ?? []).map((p) => ({
			value: p.platform,
			label: PLATFORM_NAMES[p.platform] ?? p.platform
		}))
	]);
	const showPlatforms = $derived((facets?.platforms?.length ?? 0) > 1);

	let results = $state<PortalReviewOutputDto[]>([]);
	const listReviews = (query: { page: number; size: number }) =>
		api.portal.listPortalReviews(brandId, query);

	// A mark updates the card wherever it shows and moves it off (or back onto) the to-do list
	const changed = (review: PortalReviewOutputDto) => {
		results = results.map((r) => (r.id === review.id ? review : r));
		const wasThere = needs.some((r) => r.id === review.id);
		if (review.answered && wasThere) {
			needs = needs.filter((r) => r.id !== review.id);
			needsTotal--;
		} else if (!review.answered && !wasThere) {
			loadTop();
		} else {
			needs = needs.map((r) => (r.id === review.id ? review : r));
		}
	};
</script>

{#if needsTotal > 0}
	<Section title="Needs a reply" count={needsTotal} class="gap-3">
		<p class="text-muted-foreground m-0 text-sm">
			Written reviews of three stars or fewer that nobody has answered yet, the lowest first.
			Copy the draft, change what you like and post it under the review on Google.
		</p>
		<ul class="bg-paper border-line m-0 flex list-none flex-col rounded-md border p-0">
			{#each needs as review, index (review.id)}
				<li class={[index > 0 && 'border-line border-t']}>
					<ReviewCard {brandId} {review} onChange={changed} />
				</li>
			{/each}
		</ul>
		{#if needsTotal > needs.length}
			<p class="font-term text-muted-foreground m-0 text-base">
				{needsTotal - needs.length} more below: filter by “Not answered”.
			</p>
		{/if}
	</Section>
{/if}

<Section title="All reviews" count={facets?.months.reduce((n, m) => n + m.count, 0)} class="gap-3">
	{#if facetsFailed}
		<ErrorState ground="paper" onRetry={loadTop} />
	{:else}
		<div class={['grid grid-cols-2 gap-2', showPlatforms ? 'sm:grid-cols-6' : 'sm:grid-cols-5']}>
			<Select items={monthItems} bind:value={month} size="sm" width="100%" aria-label="Month" />
			<Select items={STAR_ITEMS} bind:value={stars} size="sm" width="100%" aria-label="Stars" />
			<Select items={topicItems} bind:value={topic} size="sm" width="100%" aria-label="Topic" />
			<Select items={ANSWERED_ITEMS} bind:value={answered} size="sm" width="100%" aria-label="Answered" />
			<Select items={languageItems} bind:value={language} size="sm" width="100%" aria-label="Language" />
			{#if showPlatforms}
				<Select items={platformItems} bind:value={platform} size="sm" width="100%" aria-label="Platform" />
			{/if}
		</div>
		<PaginatedResultFetcher
			api={listReviews}
			{filters}
			key={brandId}
			size={20}
			bind:results
			class="bg-paper border-line overflow-hidden rounded-md border">
			{#snippet children({ results: items })}
				<ul class="m-0 flex list-none flex-col p-0">
					{#each items as review, index (review.id)}
						<li class={[index > 0 && 'border-line border-t']}>
							<ReviewCard {brandId} {review} onChange={changed} />
						</li>
					{/each}
				</ul>
			{/snippet}
			{#snippet loadingSnippet()}
				<SkeletonRows count={4} lines={3} />
			{/snippet}
			{#snippet noResultSnippet()}
				<EmptyState
					ground="none"
					icon={MessageSquareText}
					title={filtered ? 'No review matches these filters' : 'No reviews yet'}
					hint={filtered
						? 'Try another month or fewer filters.'
						: 'Google reviews show up here once we have read them.'}>
					{#if filtered}
						<button type="button" class="chip border-line min-h-11 border" onclick={clear}>
							Clear the filters
						</button>
					{/if}
				</EmptyState>
			{/snippet}
		</PaginatedResultFetcher>
	{/if}
</Section>
