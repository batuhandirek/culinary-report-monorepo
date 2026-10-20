<script lang="ts">
	import { type AdminUserOutputDto } from 'client';

	import UserDetailsTab from './UserDetailsTab.svelte';
	import UserSessionsTab from './UserSessionsTab.svelte';

	import AdminDetailTabs, { type AdminDetailTab } from '#components/admin/AdminDetailTabs.svelte';

	interface Props {
		user: AdminUserOutputDto;
	}

	let { user }: Props = $props();

	const tabs: AdminDetailTab[] = [
		{ value: 'overview', label: 'Overview' },
		{ value: 'sessions', label: 'Sessions' }
	];

	let tab = $state('overview');
</script>

<div class="flex min-w-0 flex-col gap-5 pb-12">
	<AdminDetailTabs {tabs} bind:value={tab} />

	<!-- One body for the live screen: each of these fetches on mount. -->
	{#if tab === 'overview'}
		<UserDetailsTab {user} />
	{:else if tab === 'sessions'}
		<UserSessionsTab {user} />
	{/if}
</div>
