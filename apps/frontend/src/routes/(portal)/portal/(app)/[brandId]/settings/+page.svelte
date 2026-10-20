<script lang="ts">
	import type { PortalSettingsOutputDto } from 'client';

	import CompetitorPicker from './components/CompetitorPicker.svelte';
	import SettingsForm from './components/SettingsForm.svelte';

	import { page } from '$app/state';
	import { api } from '#lib/api.js';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import SkeletonText from '#ui/wrapped/SkeletonText.svelte';

	// Where the monthly report is e-mailed, and the language we write to them in.
	const brandId = $derived(page.params.brandId!);
	let request = $state<Promise<PortalSettingsOutputDto>>(new Promise(() => {}));
	const load = () =>
		(request = api.portal.getPortalSettings(brandId) as Promise<PortalSettingsOutputDto>);
	$effect(() => {
		load();
	});
</script>

{#await request}
	<div class="bg-paper border-line rounded-md border px-5 py-6">
		<SkeletonText lines={4} />
	</div>
{:then settings}
	<SettingsForm {brandId} {settings} />
{:catch}
	<ErrorState ground="paper" onRetry={load} />
{/await}

<CompetitorPicker {brandId} />
