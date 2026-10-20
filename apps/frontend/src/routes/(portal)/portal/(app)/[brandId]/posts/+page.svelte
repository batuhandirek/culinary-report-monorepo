<script lang="ts">
	import { Clapperboard } from '@lucide/svelte';
	import type {
		ListPortalPostsParamsPlatformEnum,
		PortalPostFiltersOutputDto
	} from 'client';

	import CreatorList from './components/CreatorList.svelte';
	import PostRow from './components/PostRow.svelte';

	import { page } from '$app/state';
	import { api } from '#lib/api.js';
	import { monthLabel } from '#lib/culinary.js';
	import PaginatedResultFetcher from '#ui/components/PaginatedResultFetcher.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import Section from '#ui/wrapped/Section.svelte';
	import Select from '#ui/wrapped/Select.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// Every TikTok and Instagram post about the venue, or the same grouped by creator.
	const brandId = $derived(page.params.brandId!);

	let facets = $state<PortalPostFiltersOutputDto | null>(null);
	$effect(() => {
		api.portal
			.getPortalPostFilters(brandId)
			.then((f) => (facets = f as PortalPostFiltersOutputDto))
			.catch(() => (facets = { months: [] }));
	});

	const ALL = 'all';
	let view = $state<'posts' | 'creators'>('posts');
	let month = $state(ALL);
	let platform = $state(ALL);

	const filters = $derived({
		...(month !== ALL && { month }),
		...(platform !== ALL && { platform: platform as ListPortalPostsParamsPlatformEnum })
	});
	const filtered = $derived(Object.keys(filters).length > 0);

	const monthItems = $derived([
		{ value: ALL, label: 'All months' },
		...(facets?.months ?? []).map((m) => ({ value: m.month, label: monthLabel(m.month) }))
	]);
	const PLATFORM_ITEMS = [
		{ value: ALL, label: 'TikTok and Instagram' },
		{ value: 'tiktok', label: 'TikTok' },
		{ value: 'instagram', label: 'Instagram' }
	];

	const listPosts = (query: { page: number; size: number }) => api.portal.listPortalPosts(brandId, query);
</script>

<Section title="Posts about you" count={facets?.months.reduce((n, m) => n + m.count, 0)} class="gap-3">
	<div class="flex flex-wrap items-center gap-2">
		<div class="flex gap-1.5" role="group" aria-label="Show">
			<button
				type="button"
				class="chip border-line min-h-11 border"
				aria-pressed={view === 'posts'}
				onclick={() => (view = 'posts')}>
				Posts
			</button>
			<button
				type="button"
				class="chip border-line min-h-11 border"
				aria-pressed={view === 'creators'}
				onclick={() => (view = 'creators')}>
				Creators
			</button>
		</div>
		<div class="grid w-full grid-cols-2 gap-2 sm:max-w-md">
			<Select items={monthItems} bind:value={month} size="sm" width="100%" aria-label="Month" />
			<Select items={PLATFORM_ITEMS} bind:value={platform} size="sm" width="100%" aria-label="Platform" />
		</div>
	</div>

	{#if view === 'creators'}
		{#key `${month}-${platform}`}
			<CreatorList
				{brandId}
				month={filters.month}
				platform={filters.platform} />
		{/key}
	{:else}
		<PaginatedResultFetcher
			api={listPosts}
			{filters}
			key={brandId}
			size={20}
			class="bg-paper border-line overflow-hidden rounded-md border">
			{#snippet children({ results })}
				<ul class="m-0 flex list-none flex-col p-0">
					{#each results as post, index (post.id)}
						<li class={[index > 0 && 'border-line border-t']}>
							<PostRow {post} />
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
					icon={Clapperboard}
					title={filtered ? 'No post matches these filters' : 'No posts yet'}
					hint={filtered
						? 'Try another month or both platforms.'
						: 'Posts that name you show up here once we have read them.'} />
			{/snippet}
		</PaginatedResultFetcher>
	{/if}
</Section>
