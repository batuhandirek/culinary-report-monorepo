<script lang="ts">
	import { ArrowLeft } from '@lucide/svelte';

	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import Logo from '#components/Logo.svelte';
	import { ADMIN_MENU_GROUPS, ADMIN_MENUS, findAdminMenu } from '#constants/ADMIN_MENUS.js';
	import { layoutStore } from '#stores/LayoutStore.svelte.js';
	import { userStore } from '#stores/UserStore.svelte.js';
	import { cn } from '#ui/lib/utils.js';
	import * as Sheet from '#ui/primitives-new/sheet/index.js';
	import Avatar from '#ui/wrapped/Avatar.svelte';

	let collapsed = $derived(layoutStore.computer && layoutStore.adminSidebarCollapsed);
	let active = $derived(findAdminMenu(page.url.pathname));

	const sections = [
		{ title: null, items: ADMIN_MENUS.filter((item) => item.group === null) },
		...ADMIN_MENU_GROUPS.map((group) => ({
			title: group,
			items: ADMIN_MENUS.filter((item) => item.group === group)
		}))
	];

	// What is waiting on an admin, as a badge on the entry where it gets handled, keyed by
	// the entry's href. Nothing waits yet.
	const attention: Record<string, number> = {};
	afterNavigate(() => {
		layoutStore.adminSidebarMobileOpen = false;
	});

	let me = $derived(userStore.user);
	let myName = $derived(me ? `${me.firstName ?? ''} ${me.lastName ?? ''}`.trim() : '');
</script>

{#snippet sidebar(iconsOnly: boolean)}
	{#if iconsOnly}
		<div class="h-3 shrink-0"></div>
	{:else}
		<a
			href="/admin"
			class="flex h-14 shrink-0 items-center gap-2 px-4"
			aria-label="Admin overview">
			<Logo width={104} noNav />
			<span class="eyebrow text-sand/60 mt-0.5">Admin</span>
		</a>
	{/if}

	<!-- Only the menu scrolls. -->
	<nav class="flex-1 overflow-y-auto px-2 pb-4" aria-label="Admin">
		{#each sections as section (section.title)}
			{#if section.title}
				{#if iconsOnly}
					<div class="bg-sand/15 mx-3 my-2 h-px"></div>
				{:else}
					<div class="eyebrow text-sand/45 px-3 pt-5 pb-1.5">{section.title}</div>
				{/if}
			{/if}
			<ul class="m-0 flex list-none flex-col gap-0.5 p-0">
				{#each section.items as item (item.href)}
					{@const isActive = active === item}
					{@const waiting = attention[item.href] ?? 0}
					{@const ItemIcon = item.icon}
					<li>
						<a
							href={item.href}
							title={iconsOnly ? item.name : undefined}
							aria-current={isActive ? 'page' : undefined}
							class={cn(
								'focus-visible:ring-primary relative flex h-9 items-center rounded-md text-sm outline-none transition-colors focus-visible:ring-2',
								iconsOnly ? 'justify-center' : 'gap-3 px-3',
								isActive
									? 'bg-sand/15 text-paper font-medium'
									: 'text-sand/75 hover:bg-sand/10 hover:text-paper'
							)}>
							{#if isActive}
								<span class="bg-primary absolute inset-y-2 left-0 w-[3px] rounded-r"
								></span>
							{/if}
							<ItemIcon class="size-[1.125rem] shrink-0" />
							{#if !iconsOnly}
								<span class="min-w-0 flex-1 truncate">{item.name}</span>
							{/if}
							{#if waiting > 0}
								<span
									class={cn(
										'bg-primary text-ink rounded-full text-[0.6875rem] leading-none font-semibold tabular-nums',
										iconsOnly ? 'absolute top-1 right-2 size-2' : 'px-1.5 py-1'
									)}
									title={`${waiting} waiting on an admin`}>
									{#if !iconsOnly}{waiting}{/if}
								</span>
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		{/each}
	</nav>

	<div class="border-sand/15 shrink-0 border-t p-2">
		{#if me && !iconsOnly}
			<a
				href={`/admin/users/${me.id}`}
				class="hover:bg-sand/10 flex items-center gap-2.5 rounded-md px-2 py-2">
				<Avatar size={28} identifier={me.id} alt={myName} src={me.profileImage?.url} />
				<span class="flex min-w-0 flex-col leading-tight">
					<span class="text-paper truncate text-sm font-medium">{myName}</span>
					<span class="text-sand/55 truncate text-xs">{me.email ?? 'Admin'}</span>
				</span>
			</a>
		{/if}
		<a
			href="/"
			title={iconsOnly ? 'Return to the app' : undefined}
			class={cn(
				'text-sand/75 hover:bg-sand/10 hover:text-paper flex h-9 items-center rounded-md text-sm',
				iconsOnly ? 'justify-center' : 'gap-3 px-3'
			)}>
			<ArrowLeft class="size-[1.125rem] shrink-0" />
			{#if !iconsOnly}Return to the app{/if}
		</a>
	</div>
{/snippet}

{#if layoutStore.computer}
	<aside
		class={cn(
			'bg-secondary pt-safe pb-safe flex h-dvh shrink-0 flex-col transition-[width] duration-200',
			collapsed ? 'w-14' : 'w-56'
		)}>
		{@render sidebar(collapsed)}
	</aside>
{:else}
	<Sheet.Root bind:open={layoutStore.adminSidebarMobileOpen}>
		<Sheet.Content
			side="left"
			hideClose
			class="bg-secondary pt-safe pb-safe flex w-60 max-w-[80vw] flex-col gap-0 border-0 p-0">
			<Sheet.Header class="sr-only">
				<Sheet.Title>Admin menu</Sheet.Title>
			</Sheet.Header>
			{@render sidebar(false)}
		</Sheet.Content>
	</Sheet.Root>
{/if}
