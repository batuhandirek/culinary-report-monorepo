<script lang="ts">
	import { MapPin, Pencil } from '@lucide/svelte';
	import type { AdminCityOutputDto } from 'client';

	import CityFormDialog from '../components/CityFormDialog.svelte';

	import CityCalendarTab from './components/CityCalendarTab.svelte';
	import CityOverviewTab from './components/CityOverviewTab.svelte';
	import CitySourcesTab from './components/CitySourcesTab.svelte';

	import { invalidate } from '$app/navigation';
	import AdminPageHeader from '#components/admin/admin-page-header.svelte';
	import AdminDetailTabs, { type AdminDetailTab } from '#components/admin/AdminDetailTabs.svelte';
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';
	import Badge from '#ui/wrapped/Badge.svelte';
	import Button from '#ui/wrapped/Button.svelte';

	let { data } = $props();
	let city: AdminCityOutputDto = $derived(data.city);

	const tabs: AdminDetailTab[] = [
		{ value: 'overview', label: 'Overview' },
		{ value: 'sources', label: 'Sources' },
		{ value: 'calendar', label: 'Calendar' }
	];
	let tab = $state('overview');
	let editing = $state(false);
</script>

<AdminPageHeader title={city.name}>
	{#snippet aboveTitle()}
		<span class="text-muted-foreground text-xs">City · {city.country}</span>
	{/snippet}
	{#snippet belowTitle()}
		<div class="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
			<Badge pill variant={city.active ? 'success' : 'secondary'}>{city.active ? 'Active' : 'Paused'}</Badge>
			<Badge pill variant={city.cronEnabled ? 'success' : 'secondary'}>
				Monthly run {city.cronEnabled ? 'on' : 'off'}
			</Badge>
			<span class="flex items-center gap-1"><MapPin class="size-4 shrink-0" /> {city.locationQuery}</span>
		</div>
	{/snippet}
	{#snippet rightTitle()}
		<Button size="sm" variant="outline" icon={Pencil} onclick={() => (editing = true)}>Edit</Button>
	{/snippet}
</AdminPageHeader>

<div class="flex min-w-0 flex-col gap-5 pb-12">
	<AdminDetailTabs {tabs} bind:value={tab} />
	{#key city.id}
		{#if tab === 'overview'}
			<CityOverviewTab {city} />
		{:else if tab === 'sources'}
			<CitySourcesTab {city} />
		{:else if tab === 'calendar'}
			<CityCalendarTab {city} />
		{/if}
	{/key}
</div>

<CityFormDialog
	{city}
	bind:active={editing}
	onSaved={() => {
		adminCitiesStore.refresh();
		invalidate(`city:${city.id}`);
	}} />
