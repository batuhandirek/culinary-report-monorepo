<script lang="ts">
	import { ArrowLeft, FileQuestion, RotateCw, TriangleAlert } from '@lucide/svelte';

	import { page } from '$app/state';
	import { ADMIN_MENUS, findAdminMenu } from '#constants/ADMIN_MENUS.js';
	import { Button } from '#ui/primitives-new/button/index.js';

	// A failed admin page stays inside the admin frame, in the admin's language: without
	// this, an unknown record id (deleted since, or pasted wrong into the palette) fell out
	// to the storefront's Turkish error page with the sidebar gone.
	const notFound = $derived(page.status === 404);

	// The list this page belongs to is the way back; the overview when the path is unknown.
	const section = $derived(findAdminMenu(page.url.pathname) ?? ADMIN_MENUS[0]);
	const onSectionRoot = $derived(page.url.pathname === section.href);
	const back = $derived(onSectionRoot ? ADMIN_MENUS[0] : section);

	const title = $derived(
		notFound
			? // Loads name what was missing ("This order doesn't exist"); a path nothing
				// answers gets the generic line.
				page.error?.message && page.error.message !== 'Not Found'
				? page.error.message
				: "This page doesn't exist"
			: "This page didn't load"
	);
</script>

<div class="flex min-h-full flex-col items-center justify-center gap-4 px-6 pb-16 text-center">
	<span
		class={[
			'grid size-12 place-items-center rounded-full border',
			notFound
				? 'bg-paper border-line text-muted-foreground'
				: 'bg-destructive/10 text-destructive border-transparent'
		]}>
		{#if notFound}
			<FileQuestion class="size-6" />
		{:else}
			<TriangleAlert class="size-6" />
		{/if}
	</span>
	<div class="max-w-md">
		<h1 class="m-0 text-lg font-semibold">{title}</h1>
		<p class="text-muted-foreground m-0 mt-1 text-sm">
			{#if notFound}
				It may have been deleted, or the id in the address is not one of ours.
			{:else}
				The request failed{page.status ? ` (${page.status})` : ''}. Nothing was changed —
				try again, and if it keeps failing the backend log has the reason.
			{/if}
		</p>
		{#if !notFound && page.error?.debugId}
			<p class="text-muted-foreground m-0 mt-2 font-mono text-xs">
				Debug id {page.error.debugId}
			</p>
		{/if}
	</div>
	<div class="flex flex-wrap items-center justify-center gap-2">
		{#if !notFound}
			<Button variant="secondary" onclick={() => location.reload()}>
				<RotateCw class="size-4" />
				Try again
			</Button>
		{/if}
		<Button variant="outline" href={back.href}>
			<ArrowLeft class="size-4" />
			Back to {back.name === 'Overview' ? 'the overview' : back.name.toLowerCase()}
		</Button>
	</div>
</div>
