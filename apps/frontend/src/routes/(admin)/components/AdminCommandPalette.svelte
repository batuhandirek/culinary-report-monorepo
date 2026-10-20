<script lang="ts">
	import {
		ArrowDown,
		ArrowLeft,
		ArrowUp,
		CornerDownLeft,
		Hash,
		LoaderCircle,
		PanelLeft,
		UserRound
	} from '@lucide/svelte';
	import type { AdminUserOutputDto } from 'client';
	import type { Component } from 'svelte';

	import { goto } from '$app/navigation';
	import { ADMIN_MENUS } from '#constants/ADMIN_MENUS.js';
	import { api } from '#lib/api.js';
	import { layoutStore } from '#stores/LayoutStore.svelte.js';
	import { logFactory } from '#ui/lib/logger.js';
	import * as Command from '#ui/primitives-new/command/index.js';

	interface Props {
		open?: boolean;
	}

	let { open = $bindable(false) }: Props = $props();

	const logger = logFactory.create('AdminCommandPalette');

	let query = $state('');
	let needle = $derived(query.trim().toLowerCase());

	// --- Pages: matched here, the list is short and already in memory ---

	interface Destination {
		name: string;
		href: string;
		icon: Component;
		hint?: string;
		words: string;
	}

	const DESTINATIONS: Destination[] = ADMIN_MENUS.map((item) => ({
		name: item.name,
		href: item.href,
		icon: item.icon,
		hint: item.group ?? undefined,
		words: [item.name, item.group ?? '', ...(item.keywords ?? [])].join(' ').toLowerCase()
	}));

	let destinations = $derived(
		needle ? DESTINATIONS.filter((d) => d.words.includes(needle)) : DESTINATIONS
	);

	// --- Records: asked of the backend once typing pauses ---

	const MIN_LENGTH = 2;
	let users = $state<AdminUserOutputDto[]>([]);
	let searching = $state(false);
	let requestId = 0;

	$effect(() => {
		const q = needle;
		const id = ++requestId;
		if (!open || q.length < MIN_LENGTH) {
			users = [];
			searching = false;
			return;
		}
		searching = true;
		const timer = setTimeout(() => {
			api.admin
				.listUsers({ q, size: 5, page: 1 })
				.then((found) => {
					if (id === requestId) users = found.items;
				})
				.catch((e) => logger.warn(e))
				.finally(() => {
					if (id === requestId) searching = false;
				});
		}, 250);
		return () => clearTimeout(timer);
	});

	// A pasted id is a destination by itself: every record page is `/admin/<kind>/<id>`.
	const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	const BY_ID = [{ label: 'User', path: 'users' }];
	let pastedId = $derived(UUID.test(query.trim()) ? query.trim() : null);

	// --- Actions ---

	const ACTIONS = [
		{
			name: 'Toggle the sidebar',
			icon: PanelLeft,
			run: () => layoutStore.toggleAdminSidebar()
		},
		{ name: 'Return to the app', icon: ArrowLeft, run: () => goto('/') }
	];
	let actions = $derived(
		needle ? ACTIONS.filter((a) => a.name.toLowerCase().includes(needle)) : ACTIONS
	);

	let nothing = $derived(
		!searching &&
			!pastedId &&
			destinations.length + actions.length + users.length === 0
	);

	const close = () => {
		open = false;
		query = '';
	};
	const go = (href: string) => {
		close();
		goto(href);
	};

	const userName = (user: AdminUserOutputDto) =>
		`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Unnamed user';
</script>

<Command.Dialog
	bind:open
	shouldFilter={false}
	loop
	title="Jump to"
	description="Find an admin page or a user"
	onOpenChange={(isOpen) => {
		if (!isOpen) query = '';
	}}>
	<Command.Input bind:value={query} placeholder="Jump to a page or user…" />
	<Command.List class="max-h-[min(60dvh,28rem)]">
		{#if nothing}
			<div class="text-muted-foreground px-4 py-8 text-center text-sm">
				Nothing found for “{query.trim()}”
			</div>
		{/if}

		{#if pastedId}
			<Command.Group heading="Open by id">
				{#each BY_ID as kind (kind.path)}
					<Command.Item
						value={`id-${kind.path}`}
						onSelect={() => go(`/admin/${kind.path}/${pastedId}`)}>
						<Hash class="text-muted-foreground" />
						<span>{kind.label}</span>
						<span class="text-muted-foreground truncate font-mono text-xs"
							>{pastedId}</span>
					</Command.Item>
				{/each}
			</Command.Group>
		{/if}

		{#if destinations.length > 0}
			<Command.Group heading="Pages">
				{#each destinations as destination (destination.href)}
					{@const DestinationIcon = destination.icon}
					<Command.Item
						value={`page-${destination.href}`}
						onSelect={() => go(destination.href)}>
						<DestinationIcon class="text-muted-foreground" />
						<span>{destination.name}</span>
						{#if destination.hint}
							<span class="text-muted-foreground ml-auto text-xs"
								>{destination.hint}</span>
						{/if}
					</Command.Item>
				{/each}
			</Command.Group>
		{/if}

		{#if users.length > 0}
			<Command.Group heading="Users">
				{#each users as user (user.id)}
					<Command.Item
						value={`user-${user.id}`}
						onSelect={() => go(`/admin/users/${user.id}`)}>
						<UserRound class="text-muted-foreground" />
						<span class="truncate">{userName(user)}</span>
						<span class="text-muted-foreground ml-auto truncate text-xs">
							{user.email ?? user.mobileNumber ?? ''}
						</span>
					</Command.Item>
				{/each}
			</Command.Group>
		{/if}

		{#if searching}
			<div class="text-muted-foreground flex items-center gap-2 px-4 py-3 text-xs">
				<LoaderCircle class="size-3.5 animate-spin" />
				Searching users…
			</div>
		{/if}

		{#if actions.length > 0}
			<Command.Group heading="Actions">
				{#each actions as action (action.name)}
					{@const ActionIcon = action.icon}
					<Command.Item
						value={`action-${action.name}`}
						onSelect={() => {
							close();
							action.run();
						}}>
						<ActionIcon class="text-muted-foreground" />
						<span>{action.name}</span>
					</Command.Item>
				{/each}
			</Command.Group>
		{/if}
	</Command.List>
	<div
		class="border-line text-muted-foreground flex items-center gap-3 border-t px-3 py-2 text-xs max-lg:hidden">
		<span class="flex items-center gap-1"><CornerDownLeft class="size-3" /> open</span>
		<span class="flex items-center gap-0.5">
			<ArrowUp class="size-3" /><ArrowDown class="size-3" /> move
		</span>
		<span>esc close</span>
		<span class="ml-auto">Paste an id to open its record</span>
	</div>
</Command.Dialog>
