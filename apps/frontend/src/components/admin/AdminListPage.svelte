<script lang="ts">
	import type { Snippet } from 'svelte';

	import { page } from '$app/state';
	import AdminPageHeader from '#components/admin/admin-page-header.svelte';
	import { findAdminMenu } from '#constants/ADMIN_MENUS.js';
	import { setDataTableFill } from '#ui/components/paginated-data-table/index.js';

	// A page whose body is a table: the header stays put and the table takes the rest of
	// the height, scrolling inside itself with its columns' names and its pager in reach.
	interface Props {
		title?: string;
		// Defaults to the section's own line in `ADMIN_MENUS`.
		description?: string;
		actions?: Snippet;
		children: Snippet;
	}

	let { title, description, actions, children }: Props = $props();

	setDataTableFill(true);

	let resolvedDescription = $derived(
		description ?? findAdminMenu(page.url.pathname)?.description
	);
</script>

<div class="flex h-full min-h-0 flex-col pb-4">
	<AdminPageHeader {title} description={resolvedDescription} rightTitle={actions} />
	<div class="flex min-h-0 flex-1 flex-col gap-3">
		{@render children()}
	</div>
</div>
