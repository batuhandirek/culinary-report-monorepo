<script lang="ts">
	import QueuesTab from './components/QueuesTab.svelte';
	import RunsTab from './components/RunsTab.svelte';
	import SchedulesTab from './components/SchedulesTab.svelte';

	import AdminDetailTabs from '#components/admin/AdminDetailTabs.svelte';
	import AdminListPage from '#components/admin/AdminListPage.svelte';

	// The durable workflows (DBOS): every run with its steps, the queues they wait on and the
	// schedules that start them. A run opens on its own page.
	const TABS = [
		{ value: 'runs', label: 'Runs' },
		{ value: 'queues', label: 'Queues' },
		{ value: 'schedules', label: 'Schedules' }
	];
	let tab = $state('runs');
</script>

<AdminListPage>
	<AdminDetailTabs tabs={TABS} bind:value={tab} />

	{#if tab === 'queues' || tab === 'schedules'}
		<!-- Panels, not a table filling the page: they scroll in the space it leaves -->
		<div class="min-h-0 flex-1 overflow-y-auto pb-8">
			{#if tab === 'queues'}
				<QueuesTab />
			{:else}
				<SchedulesTab />
			{/if}
		</div>
	{:else}
		<RunsTab />
	{/if}
</AdminListPage>
