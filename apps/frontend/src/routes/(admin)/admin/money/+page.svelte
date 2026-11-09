<script lang="ts">
	import CallsTab from './components/CallsTab.svelte';
	import CreditsTab from './components/CreditsTab.svelte';
	import SpendTab from './components/SpendTab.svelte';

	import AdminDetailTabs from '#components/admin/AdminDetailTabs.svelte';
	import AdminListPage from '#components/admin/AdminListPage.svelte';
	import { ADMIN_MONEY_TABS } from '#constants/ADMIN_MONEY_TABS.js';

	// Money: what the LLM calls cost (summed as chosen, and one by one) and what each
	// provider's account has left, with the snapshots that anchor it.
	let tab = $state('spend');
</script>

<AdminListPage>
	<AdminDetailTabs tabs={ADMIN_MONEY_TABS} bind:value={tab} />

	{#if tab === 'calls'}
		<CallsTab />
	{:else}
		<!-- Panels, not a table filling the page: they scroll in the space it leaves -->
		<div class="min-h-0 flex-1 overflow-y-auto pb-8">
			{#if tab === 'credits'}
				<CreditsTab />
			{:else}
				<SpendTab />
			{/if}
		</div>
	{/if}
</AdminListPage>
