<script lang="ts">
	import { Store } from '@lucide/svelte';

	import PortalHeader from './components/PortalHeader.svelte';

	import { goto } from '$app/navigation';
	import { userStore } from '#stores/UserStore.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ListRow from '#ui/wrapped/ListRow.svelte';
	import Panel from '#ui/wrapped/Panel.svelte';

	// `/portal`: one brand opens straight away; several are a list to pick from.
	const memberships = $derived(userStore.brandMemberships);
	$effect(() => {
		if (memberships.length === 1) goto(`/portal/${memberships[0].brand.id}`, { replace: true });
	});
	// One place: its district and city; a chain: how many places
	const hint = (brand: (typeof memberships)[number]['brand']) => {
		if (brand.branches.length !== 1) return `${brand.branches.length} places`;
		const [only] = brand.branches;
		return [only.district, only.locality].filter(Boolean).join(', ');
	};
</script>

{#if memberships.length !== 1}
	<PortalHeader />
	<main class="mx-auto flex w-full max-w-[56rem] flex-col gap-5 px-4 pt-4 pb-12">
		<div class="flex flex-col gap-1.5">
			<span class="eyebrow text-beet">Venue portal</span>
			<h1 class="type-title text-ink m-0 text-[1.75rem]">Your places</h1>
		</div>
		{#if memberships.length}
			<Panel rows>
				{#each memberships as membership (membership.id)}
					<ListRow
						title={membership.brand.name}
						hint={hint(membership.brand)}
						icon={Store}
						href={`/portal/${membership.brand.id}`} />
				{/each}
			</Panel>
		{:else}
			<EmptyState
				ground="paper"
				icon={Store}
				title="No place on this account yet"
				hint={userStore.isAdmin
					? 'As an admin you can open any brand’s portal from its Sales tab.'
					: 'Your invite links this address to your place. Ask us if it went to another one.'}>
				{#if userStore.isAdmin}
					<Button variant="outline" href="/admin/brands?segment=prospects">Open the sales list</Button>
				{:else}
					<Button variant="outline" href="mailto:hello@munchwerk.com">Write to us</Button>
				{/if}
			</EmptyState>
		{/if}
	</main>
{/if}
