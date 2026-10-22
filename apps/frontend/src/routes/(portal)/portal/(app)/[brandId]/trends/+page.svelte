<script lang="ts">
	import type { PortalBrandOutputDto, PortalSeriesOutputDto } from 'client';

	import BranchPicker from '../components/BranchPicker.svelte';
	import CityPicker from '../components/CityPicker.svelte';

	import TrendsView from './components/TrendsView.svelte';

	import { page } from '$app/state';
	import { api } from '#lib/api.js';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import SkeletonText from '#ui/wrapped/SkeletonText.svelte';

	// Twelve months of the brand in one city, from its stored reports
	const brandId = $derived(page.params.brandId!);
	const cityId = $derived(page.url.searchParams.get('city') ?? undefined);
	const branchId = $derived(page.url.searchParams.get('branch') ?? undefined);
	let request = $state<Promise<[PortalSeriesOutputDto, PortalBrandOutputDto]>>(new Promise(() => {}));
	const load = () =>
		(request = Promise.all([
			(api.portal.getPortalSeries(brandId, { months: 12, cityId, branchId }) as Promise<PortalSeriesOutputDto>).catch(
				(error) => {
					// A stale `?branch=` (closed, taken off the brand, mistyped) shows the default branch
					if (!branchId) throw error;
					return api.portal.getPortalSeries(brandId, { months: 12, cityId }) as Promise<PortalSeriesOutputDto>;
				}
			),
			api.portal.getPortalBrand(brandId) as Promise<PortalBrandOutputDto>
		]));
	$effect(() => {
		load();
	});
</script>

{#await request}
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		{#each [0, 1, 2, 3] as i (i)}
			<div class="bg-paper border-line h-64 rounded-md border px-4 py-4">
				<SkeletonText lines={3} />
			</div>
		{/each}
	</div>
{:then [series, brand]}
	<div class="flex flex-wrap items-center gap-2">
		{#if brand.reportScope !== 'all'}<CityPicker cities={brand.cities} />{/if}
		<BranchPicker branches={series.branches} value={series.branchId} />
	</div>
	<TrendsView {series} {brandId} venueName={brand.name} />
{:catch}
	<ErrorState ground="paper" onRetry={load} />
{/await}
