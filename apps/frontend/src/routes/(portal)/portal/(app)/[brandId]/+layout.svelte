<script lang="ts">
	import { Lock } from '@lucide/svelte';
	import type { PortalBrandOutputDto } from 'client';
	import type { Snippet } from 'svelte';

	import PortalHeader from '../components/PortalHeader.svelte';

	import PortalTabs from './components/PortalTabs.svelte';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { api, isNotFoundError } from '#lib/api.js';
	import { userStore } from '#stores/UserStore.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import Select from '#ui/wrapped/Select.svelte';
	import SkeletonText from '#ui/wrapped/SkeletonText.svelte';

	let { children }: { children?: Snippet } = $props();

	const brandId = $derived(page.params.brandId!);
	let brand = $state<PortalBrandOutputDto | null>(null);
	let failure = $state<unknown>(null);

	const load = async (id: string) => {
		failure = null;
		try {
			const loaded = (await api.portal.getPortalBrand(id)) as PortalBrandOutputDto;
			if (id === brandId) brand = loaded;
		} catch (e) {
			if (id === brandId) failure = e;
		}
	};
	$effect(() => {
		brand = null;
		load(brandId);
	});

	// One place: its district and city; a chain: how many places, in which cities
	const where = $derived.by(() => {
		if (!brand) return '';
		if (brand.branches.length === 1) {
			const [only] = brand.branches;
			return [only.district, only.locality].filter(Boolean).join(', ');
		}
		return `${brand.branches.length} places in ${brand.cities.map((c) => c.name).join(', ')}`;
	});

	// The switcher lists their brands; an admin on someone else's brand sees it added
	const choices = $derived.by(() => {
		const items = userStore.brandMemberships.map((m) => ({ value: m.brand.id, label: m.brand.name }));
		if (brand && !items.some((item) => item.value === brand!.id))
			items.unshift({ value: brand.id, label: brand.name });
		return items;
	});
	// Switching keeps the section: Months stays Months
	const switchTo = (id: string) => {
		const section = page.url.pathname.split('/')[3];
		const keep = section && section !== 'months' ? `/${section}` : section ? '/months' : '';
		goto(`/portal/${id}${keep}`);
	};
</script>

<PortalHeader>
	{#if brand && choices.length > 1}
		<Select
			items={choices}
			value={brand.id}
			onValueChange={(id) => id && id !== brandId && switchTo(id)}
			aria-label="Place"
			size="sm"
			width="min(14rem, 100%)" />
	{/if}
</PortalHeader>

<main class="mx-auto flex w-full max-w-[56rem] flex-col gap-5 px-4 pb-12">
	{#if failure}
		{#if isNotFoundError(failure)}
			<EmptyState
				ground="paper"
				icon={Lock}
				class="mt-6"
				title="This place is not on your account"
				hint="Your portal shows the places you were invited to.">
				<Button variant="outline" href="/portal">Your places</Button>
			</EmptyState>
		{:else}
			<ErrorState ground="paper" class="mt-6" onRetry={() => load(brandId)} />
		{/if}
	{:else}
		<div class="flex flex-col gap-1 pt-2">
			<span class="eyebrow text-beet">Venue portal</span>
			{#if brand}
				<h1 class="type-title text-ink m-0 text-[1.75rem] leading-tight">{brand.name}</h1>
				{#if where}
					<p class="text-muted-foreground m-0 text-sm">{where}</p>
				{/if}
			{:else}
				<SkeletonText lines={2} />
			{/if}
		</div>
		<PortalTabs {brandId} />
		{#key brandId}
			{@render children?.()}
		{/key}
	{/if}
</main>
