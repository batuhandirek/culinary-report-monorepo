<script lang="ts">
	import type { PortalBrandOutputDto, PortalPatternsOutputDto } from 'client';

	import CityPicker from '../components/CityPicker.svelte';

	import PatternsView from './components/PatternsView.svelte';

	import { page } from '$app/state';
	import { api } from '#lib/api.js';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import SkeletonText from '#ui/wrapped/SkeletonText.svelte';

	// Six months of relations and weeks in one city, from the brand's stored reports
	const brandId = $derived(page.params.brandId!);
	const cityId = $derived(page.url.searchParams.get('city') ?? undefined);
	let request = $state<Promise<[PortalPatternsOutputDto, PortalBrandOutputDto]>>(new Promise(() => {}));
	const load = () =>
		(request = Promise.all([
			api.portal.getPortalPatterns(brandId, { months: 6, cityId }) as Promise<PortalPatternsOutputDto>,
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
{:then [patterns, brand]}
	{#if brand.reportScope !== 'all'}<CityPicker cities={brand.cities} />{/if}
	<PatternsView {patterns} {brandId} />
{:catch}
	<ErrorState ground="paper" onRetry={load} />
{/await}
