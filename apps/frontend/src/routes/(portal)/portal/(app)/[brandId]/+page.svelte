<script lang="ts">
	import { FileText } from '@lucide/svelte';
	import type { PortalReportsOutputDto } from 'client';

	import PortalReport from './components/PortalReport.svelte';

	import { page } from '$app/state';
	import { api } from '#lib/api.js';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import SkeletonText from '#ui/wrapped/SkeletonText.svelte';

	// The newest report: what the owner opens the portal for.
	const brandId = $derived(page.params.brandId!);
	let request = $state<Promise<PortalReportsOutputDto>>(new Promise(() => {}));
	const load = () => (request = api.portal.listPortalReports(brandId) as Promise<PortalReportsOutputDto>);
	$effect(() => {
		load();
	});
</script>

{#await request}
	<div class="bg-paper border-line rounded-md border px-5 py-8">
		<SkeletonText lines={8} />
	</div>
{:then { items }}
	{#if items.length}
		<PortalReport {brandId} reportId={items[0].id} eyebrow="Latest report" />
	{:else}
		<EmptyState
			ground="paper"
			icon={FileText}
			title="No report yet"
			hint="Your first report arrives early next month, once the month is over." />
	{/if}
{:catch}
	<ErrorState ground="paper" onRetry={load} />
{/await}
