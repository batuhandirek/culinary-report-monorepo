<script lang="ts">
	import { type AdminUserOutputDto } from 'client';

	import AdminSessionsTableView from '#views/admin/session/admin-sessions-table-view.svelte';

	interface Props {
		user: AdminUserOutputDto;
	}

	let { user = $bindable() }: Props = $props();
</script>

<div class="min-w-0">
	<AdminSessionsTableView filters={{ userId: user.id }} hiddenColumns={['User']} />
</div>
