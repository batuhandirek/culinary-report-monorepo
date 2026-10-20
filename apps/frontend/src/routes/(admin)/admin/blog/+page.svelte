<script lang="ts">
	import { Plus } from '@lucide/svelte';

	import AdminListPage from '#components/admin/AdminListPage.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import AdminBlogEntriesTableView from '#views/admin/blog/admin-blog-entries-table-view.svelte';
</script>

<AdminListPage>
	{#snippet actions()}
		<Button size="sm" icon={Plus} href="/admin/blog/new">New article</Button>
	{/snippet}

	<AdminBlogEntriesTableView filters={{}} />
</AdminListPage>
