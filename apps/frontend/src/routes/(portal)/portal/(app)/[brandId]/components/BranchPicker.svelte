<script lang="ts">
	import type { PortalBranchChoiceOutputDto } from 'client';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Select from '#ui/wrapped/Select.svelte';

	// A chain's place charts (rating, foot traffic, weekend tables) are one branch's at a time:
	// each place's figures are its own, never added up. The branch is `?branch=` (the most
	// reviewed when absent); the brand's counts don't change with it.
	let { branches, value }: { branches: PortalBranchChoiceOutputDto[]; value?: string } = $props();

	const choose = (id: string) => {
		const url = new URL(page.url.href);
		if (id === branches[0]?.id) url.searchParams.delete('branch');
		else url.searchParams.set('branch', id);
		goto(url, { replace: true });
	};
</script>

{#if branches.length > 1}
	<Select
		items={branches.map((b) => ({ value: b.id, label: b.street ? `${b.name} · ${b.street}` : b.name }))}
		value={value ?? branches[0]?.id}
		onValueChange={(id) => id && id !== value && choose(id)}
		aria-label="Branch"
		size="sm"
		width="min(20rem, 100%)" />
{/if}
