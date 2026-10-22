<script lang="ts">
	import type { PortalCityOutputDto } from 'client';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Select from '#ui/wrapped/Select.svelte';

	// A brand with branches in more than one city reads its trends and patterns one city at a
	// time: the city is `?city=` (the brand's first city when absent).
	let { cities }: { cities: PortalCityOutputDto[] } = $props();

	const value = $derived(page.url.searchParams.get('city') ?? cities[0]?.id);
	const choose = (id: string) => {
		const url = new URL(page.url.href);
		// A branch is one city's
		url.searchParams.delete('branch');
		if (id === cities[0]?.id) url.searchParams.delete('city');
		else url.searchParams.set('city', id);
		goto(url, { replace: true });
	};
</script>

{#if cities.length > 1}
	<Select
		items={cities.map((c) => ({ value: c.id, label: c.name }))}
		{value}
		onValueChange={(id) => id && id !== value && choose(id)}
		aria-label="City"
		size="sm"
		width="min(12rem, 100%)" />
{/if}
