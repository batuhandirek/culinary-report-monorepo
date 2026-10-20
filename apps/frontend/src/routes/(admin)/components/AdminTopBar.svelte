<script lang="ts">
	import {
		ChevronRight,
		Menu,
		PanelLeftClose,
		PanelLeftOpen,
		Search
	} from '@lucide/svelte';

	import AdminCommandPalette from './AdminCommandPalette.svelte';

	import { constructAdminBreadcrumbs } from '#components/admin/construct-admin-breadcrumbs.js';
	import { layoutStore } from '#stores/LayoutStore.svelte.js';
	import { Button } from '#ui/primitives-new/button/index.js';

	let breadcrumbs = $derived(constructAdminBreadcrumbs());

	let paletteOpen = $state(false);

	let ToggleIcon = $derived(
		layoutStore.computer
			? layoutStore.adminSidebarCollapsed
				? PanelLeftOpen
				: PanelLeftClose
			: Menu
	);
	let toggleLabel = $derived(
		layoutStore.computer
			? layoutStore.adminSidebarCollapsed
				? 'Expand the sidebar'
				: 'Collapse the sidebar'
			: 'Open the menu'
	);

	const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

	const isTyping = (target: EventTarget | null) =>
		target instanceof HTMLElement &&
		(target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

	// ⌘K / Ctrl+K anywhere; "/" when not in a field.
	function onKeydown(event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			paletteOpen = !paletteOpen;
		} else if (event.key === '/' && !paletteOpen && !isTyping(event.target)) {
			event.preventDefault();
			paletteOpen = true;
		}
	}
</script>

<svelte:window onkeydown={onKeydown} />

<header class="border-line bg-sand pt-safe flex w-full shrink-0 flex-col border-b">
	<div class="px-device flex h-12 w-full items-center gap-2">
		<Button
			variant="ghost"
			size="icon-sm"
			class="-ml-2 shrink-0 rounded-md"
			aria-label={toggleLabel}
			title={toggleLabel}
			onclick={() => layoutStore.toggleAdminSidebar()}>
			<ToggleIcon class="size-[1.125rem]" />
		</Button>

		<nav aria-label="Breadcrumb" class="no-scrollbar min-w-0 flex-1 overflow-x-auto">
			<ol class="m-0 flex list-none items-center gap-1 p-0 text-sm">
				{#each breadcrumbs as crumb, index (index)}
					{@const last = index === breadcrumbs.length - 1}
					{@const CrumbIcon = crumb.icon}
					{#if index > 0}
						<li aria-hidden="true" class="text-faint flex shrink-0">
							<ChevronRight class="size-3.5" />
						</li>
					{/if}
					<li class="flex min-w-0 shrink-0 items-center">
						{#if last || !crumb.href}
							<span
								aria-current="page"
								class="text-ink flex max-w-[40ch] items-center gap-1.5 px-1.5 py-1 font-medium">
								{#if CrumbIcon}<CrumbIcon class="size-4 shrink-0" />{/if}
								<span class="truncate">{crumb.name}</span>
							</span>
						{:else}
							<a
								href={crumb.href}
								class="text-muted-foreground hover:bg-ink/5 hover:text-ink flex items-center gap-1.5 rounded-md px-1.5 py-1 whitespace-nowrap">
								{#if CrumbIcon}<CrumbIcon class="size-4 shrink-0" />{/if}
								{crumb.name}
							</a>
						{/if}
					</li>
				{/each}
			</ol>
		</nav>

		<!-- The palette's trigger: a field to look at on desktop, a key on touch. -->
		<button
			type="button"
			class="border-line bg-paper text-muted-foreground hover:border-ink/40 focus-visible:ring-ring/50 hidden h-8 w-64 shrink-0 items-center gap-2 rounded-full border px-3 text-xs outline-none focus-visible:ring-2 lg:flex"
			onclick={() => (paletteOpen = true)}>
			<Search class="size-3.5" />
			<span class="flex-1 truncate text-left">Search or jump to…</span>
			<kbd class="border-line rounded border px-1 py-px font-sans text-[0.6875rem]">
				{isMac ? '⌘K' : 'Ctrl K'}
			</kbd>
		</button>
		<Button
			variant="ghost"
			size="icon-sm"
			class="shrink-0 rounded-md lg:hidden"
			aria-label="Search"
			onclick={() => (paletteOpen = true)}>
			<Search class="size-[1.125rem]" />
		</Button>

	</div>
</header>

<AdminCommandPalette bind:open={paletteOpen} />
