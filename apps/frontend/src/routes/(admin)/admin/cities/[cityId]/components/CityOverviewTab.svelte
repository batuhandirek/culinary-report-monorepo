<script lang="ts">
	import type { AdminCityOutputDto } from 'client';

	import { MapPinned } from '@lucide/svelte';
	import type { AdminSuggestedDistrictOutputDto } from 'client';

	import { BUDGETED_STEPS } from '../../components/CityFormDialog.svelte';

	import CityDistrictSuggestions from './CityDistrictSuggestions.svelte';

	import { at } from '#components/admin/admin-format.js';
	import AdminFacts, { type AdminFact } from '#components/admin/AdminFacts.svelte';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';

	interface Props {
		city: AdminCityOutputDto;
	}

	let { city }: Props = $props();

	const facts = $derived<AdminFact[]>([
		{ label: 'Slug', value: city.slug, mono: true },
		{ label: 'Other names', value: city.aliases.join(', ') },
		{ label: 'Country', value: city.country },
		{ label: 'Region', value: city.region, hint: 'holidays, Google Trends' },
		{ label: 'Time zone', value: city.timezone },
		{ label: 'Language', value: city.language, hint: 'reports and outreach' },
		{ label: 'Google Maps location', value: city.locationQuery },
		{ label: 'TikTok region', value: city.tiktokRegion },
		{ label: 'Instagram', value: city.instagramEnabled ? 'Scraped' : 'Off' },
		{
			label: 'Coordinates',
			value: city.lat != null && city.lng != null ? `${city.lat}, ${city.lng}` : null
		},
		{ label: 'Report brands', value: city.topBrands, hint: 'per month' },
		{ label: 'Monthly run', value: city.cronEnabled ? 'On' : 'Off' },
		{ label: 'Added', value: at(city.createdAt) }
	]);

	// "Suggest districts": postal codes from where the venue scrape put the city's venues
	let districtSuggestions = $state<AdminSuggestedDistrictOutputDto[] | null>(null);
	const suggestDistricts = createAction(() => api.admin.listCityDistrictSuggestions(city.id), {
		onSuccess: (res) => (districtSuggestions = res.items)
	});

	const budgets = $derived(city.stepBudgetsUsd as Record<string, number | undefined>);
	const budgetFacts = $derived<AdminFact[]>(
		BUDGETED_STEPS.map((step) => ({
			label: step.label,
			value: `$${budgets[step.key] ?? step.fallback}`,
			hint: budgets[step.key] === undefined ? 'default' : undefined,
			tone: budgets[step.key] === undefined ? ('muted' as const) : undefined
		}))
	);
</script>

<div class="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
	<AdminPanel title="City">
		<AdminFacts items={facts} />
	</AdminPanel>

	<AdminPanel title="Apify budget per step" note="USD">
		<AdminFacts items={budgetFacts} numeric />
	</AdminPanel>

	<AdminPanel title="Words dropped from venue names" note={city.nameStopwords.length}>
		<p class="m-0 text-sm">{city.nameStopwords.join(', ') || '—'}</p>
	</AdminPanel>

	<AdminPanel title="Chains and institutions" note={city.chainDenyList.length}>
		<p class="m-0 text-sm">{city.chainDenyList.join(', ') || '—'}</p>
	</AdminPanel>

	<AdminPanel title="Districts" note={city.districts.length} class="xl:col-span-2">
		{#snippet action()}
			<Button
				size="sm"
				variant="outline"
				icon={MapPinned}
				loading={suggestDistricts.executing}
				onclick={() => suggestDistricts.execute()}>
				Suggest from venues
			</Button>
		{/snippet}
		{#if districtSuggestions}
			<CityDistrictSuggestions
				{city}
				items={districtSuggestions}
				onClose={() => (districtSuggestions = null)} />
		{:else if city.districts.length}
			<ul class="m-0 flex list-none flex-col gap-2 p-0 text-sm">
				{#each city.districts as district (district.name)}
					<li class="flex flex-col gap-0.5">
						<span class="font-medium">{district.name}</span>
						<span class="text-muted-foreground">
							Borders {district.neighbours.join(', ') || 'nothing listed'}
							· {district.postalCodes.length
								? `${district.postalCodes.length} postal codes`
								: 'no postal codes'}
						</span>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-muted-foreground m-0 text-sm">
				None yet: district filters, the district fill and competitor suggestions need them.
			</p>
		{/if}
	</AdminPanel>
</div>
