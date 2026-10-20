<script lang="ts">
	import { Plus, Search, X } from '@lucide/svelte';
	import type {
		PortalBrandOutputDto,
		PortalCompetitorOutputDto,
		PortalCompetitorsOutputDto,
		PortalCompetitorVenueOutputDto
	} from 'client';

	import { api } from '#lib/api.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import IconButton from '#ui/wrapped/IconButton.svelte';
	import Input from '#ui/wrapped/Input.svelte';
	import Section from '#ui/wrapped/Section.svelte';
	import Select from '#ui/wrapped/Select.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// The places and chains the report compares this brand with: one list, whether we or they
	// picked them. Our suggestions first, then a search over the city's restaurants, cafés and
	// bars; a chain's branch can be added alone or as the whole chain.
	let { brandId }: { brandId: string } = $props();

	/** What to add: one place, or a whole chain; for one of your places with `branchId`. */
	type Target = ({ venueId: string } | { brandId: string }) & { name: string; branchId?: string };

	// A chain picks for the whole brand or for one of its places (local competition)
	let brand = $state<PortalBrandOutputDto | null>(null);
	$effect(() => {
		api.portal
			.getPortalBrand(brandId)
			.then((b) => (brand = b as PortalBrandOutputDto))
			.catch(() => (brand = null));
	});
	const WHOLE = 'all';
	let pickFor = $state(WHOLE);
	const forChoices = $derived([
		{ value: WHOLE, label: 'All your places' },
		...(brand?.branches ?? []).map((b) => ({ value: b.id, label: b.street ? `${b.name}, ${b.street}` : b.name }))
	]);
	const branchId = $derived(pickFor === WHOLE ? undefined : pickFor);

	let list = $state<PortalCompetitorsOutputDto | null>(null);
	let failed = $state(false);
	const load = async () => {
		failed = false;
		try {
			list = (await api.portal.listPortalCompetitors(brandId)) as PortalCompetitorsOutputDto;
		} catch {
			failed = true;
		}
	};
	$effect(() => {
		load();
	});

	// Each subject (all places, each place) holds `max`
	const used = $derived(list?.items.filter((i) => (i.branch?.id ?? undefined) === branchId).length ?? 0);
	const full = $derived(!!list && used >= list.max);
	const pickedVenues = $derived(new Set(list?.items.flatMap((i) => (i.venue ? [i.venue.id] : [])) ?? []));
	const pickedBrands = $derived(new Set(list?.items.flatMap((i) => (i.brand ? [i.brand.id] : [])) ?? []));
	const isPicked = (venue: PortalCompetitorVenueOutputDto) =>
		pickedVenues.has(venue.id) || pickedBrands.has(venue.brand.id);
	const entryName = (item: PortalCompetitorOutputDto) => item.venue?.name ?? item.brand?.name ?? '';
	const entryTarget = (item: PortalCompetitorOutputDto): Target => ({
		...(item.venue ?
			{ venueId: item.venue.id, name: item.venue.name }
		:	{ brandId: item.brand!.id, name: item.brand!.name }),
		branchId: item.branch?.id
	});

	const addAction = createAction(
		(target: Target) =>
			api.portal.addPortalCompetitor(brandId, {
				...('venueId' in target ? { venueId: target.venueId } : { brandId: target.brandId }),
				branchId: target.branchId
			}),
		{
			onSuccess: (res) => (list = res as PortalCompetitorsOutputDto),
			successNotification: (_, [target]) => ({ title: `${target.name} added` })
		}
	);
	const removeAction = createAction(
		(item: PortalCompetitorOutputDto) => api.portal.removePortalCompetitor(brandId, item.id),
		{
			onSuccess: (res) => (list = res as PortalCompetitorsOutputDto),
			successNotification: (_, [item]) => ({
				title: `${entryName(item)} removed`,
				action: { label: 'Undo', onClick: () => addAction.execute(entryTarget(item)) }
			})
		}
	);
	let busyId = $state<string | null>(null);
	const add = async (target: Target) => {
		busyId = 'venueId' in target ? target.venueId : target.brandId;
		await addAction.execute(target);
		busyId = null;
	};
	const remove = async (item: PortalCompetitorOutputDto) => {
		busyId = String(item.id);
		await removeAction.execute(item);
		busyId = null;
	};

	// The search, a quarter second after the last key
	let q = $state('');
	let found = $state<PortalCompetitorVenueOutputDto[] | null>(null);
	let searching = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;
	$effect(() => {
		const term = q.trim();
		clearTimeout(timer);
		if (term.length < 2) {
			found = null;
			searching = false;
			return;
		}
		searching = true;
		timer = setTimeout(async () => {
			try {
				const res = await api.portal.searchPortalCompetitors(brandId, { q: term });
				if (term === q.trim()) found = res.items as PortalCompetitorVenueOutputDto[];
			} catch {
				found = [];
			} finally {
				if (term === q.trim()) searching = false;
			}
		}, 250);
	});

	const describe = (venue: PortalCompetitorVenueOutputDto) =>
		[
			venue.category,
			venue.street ?? venue.district,
			venue.rating != null ? `${venue.rating.toFixed(1)} ★ (${venue.reviewsCount ?? 0})` : null
		]
			.filter(Boolean)
			.join(' · ');
	const describeEntry = (item: PortalCompetitorOutputDto) =>
		[
			item.venue ? describe(item.venue) : `The whole chain: ${item.brand!.branches} places`,
			item.branch ? `for ${item.branch.street ?? item.branch.name}` : null
		]
			.filter(Boolean)
			.join(' · ');
</script>

{#snippet venueRow(venue: PortalCompetitorVenueOutputDto, note: string | null, index: number)}
	<li class={['flex items-center gap-3 py-2 pr-2 pl-4', index > 0 && 'border-line border-t']}>
		<div class="flex min-w-0 flex-1 flex-col gap-0.5 py-1">
			<span class="text-ink truncate font-semibold">{venue.name}</span>
			{#if describe(venue)}
				<span class="text-muted-foreground truncate text-sm">{describe(venue)}</span>
			{/if}
			{#if note}<span class="font-term text-muted-foreground text-base">{note}</span>{/if}
		</div>
		{#if isPicked(venue)}
			<span class="text-muted-foreground px-2 text-sm">On your list</span>
		{:else}
			<div class="flex shrink-0 flex-wrap justify-end gap-2">
				<Button
					variant="outline"
					size="sm"
					icon={Plus}
					disabled={full}
					loading={busyId === venue.id}
					onclick={() => add({ venueId: venue.id, name: venue.name, branchId })}>
					{venue.brand.branches > 1 ? 'This one' : 'Add'}
				</Button>
				{#if venue.brand.branches > 1}
					<Button
						variant="outline"
						size="sm"
						icon={Plus}
						disabled={full}
						loading={busyId === venue.brand.id}
						onclick={() => add({ brandId: venue.brand.id, name: venue.brand.name, branchId })}>
						All {venue.brand.branches}
					</Button>
				{/if}
			</div>
		{/if}
	</li>
{/snippet}

<Section title="Competitors" class="gap-3">
	{#if failed}
		<ErrorState ground="paper" onRetry={load} />
	{:else if !list}
		<SkeletonRows count={3} lines={2} boxed />
	{:else}
		<p class="text-muted-foreground m-0 text-sm">
			Your next report compares you with these places: up to {list.max}, from your city. A
			chain counts with all its places there. Changes count from the next report on.
		</p>

		<div class="bg-paper border-line rounded-md border">
			<div class="flex items-center justify-between px-4 pt-3">
				<span class="eyebrow text-beet">Your list</span>
				<span class="font-term text-muted-foreground text-base">
					{used} of {list.max}
				</span>
			</div>
			{#if list.items.length}
				<ul class="m-0 flex list-none flex-col p-0">
					{#each list.items as item, index (item.id)}
						<li class={['flex items-center gap-3 py-2 pr-2 pl-4', index > 0 && 'border-line border-t']}>
							<div class="flex min-w-0 flex-1 flex-col gap-0.5 py-1">
								<span class="flex min-w-0 items-baseline gap-2">
									<span class="text-ink truncate font-semibold">{entryName(item)}</span>
									<span class="eyebrow text-muted-foreground shrink-0">
										{item.pickedBy === 'owner' ? 'Your pick' : 'Our pick'}
									</span>
								</span>
								{#if describeEntry(item)}
									<span class="text-muted-foreground truncate text-sm">{describeEntry(item)}</span>
								{/if}
							</div>
							<IconButton
								icon={X}
								variant="ghost"
								label={`Remove ${entryName(item)}`}
								loading={busyId === String(item.id)}
								onclick={() => remove(item)} />
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-muted-foreground m-0 px-4 pt-1 pb-4 text-sm">
					None yet: add a few below.
				</p>
			{/if}
		</div>

		{#if full}
			<p class="ink-strip m-0">Your list is full: remove one to add another.</p>
		{/if}

		{#if (brand?.branches.length ?? 0) > 1}
			<div class="flex flex-wrap items-center gap-2">
				<span class="text-muted-foreground text-sm">Add competitors for</span>
				<Select
					items={forChoices}
					value={pickFor}
					onValueChange={(v) => v && (pickFor = v)}
					aria-label="Add competitors for"
					size="sm"
					width="min(16rem, 100%)" />
			</div>
		{/if}

		{#if !full && list.suggestions.length}
			<div class="bg-paper border-line rounded-md border">
				<p class="eyebrow text-beet m-0 px-4 pt-3">Suggested for you</p>
				<ul class="m-0 flex list-none flex-col p-0">
					{#each list.suggestions as suggestion, index (suggestion.venue.id)}
						{@render venueRow(suggestion.venue, suggestion.reasons.join(', '), index)}
					{/each}
				</ul>
			</div>
		{/if}

		<div class="flex flex-col gap-2">
			<Input
				bind:value={q}
				icon={Search}
				loading={searching}
				placeholder="Search a restaurant, café or bar"
				aria-label="Search places in your city"
				autocomplete="off" />
			{#if found}
				{#if found.length}
					<ul class="bg-paper border-line m-0 flex list-none flex-col rounded-md border p-0">
						{#each found as venue, index (venue.id)}
							{@render venueRow(venue, null, index)}
						{/each}
					</ul>
				{:else if !searching}
					<p class="text-muted-foreground m-0 text-sm">
						Nothing in your city by that name. Try part of the name or the street.
					</p>
				{/if}
			{/if}
		</div>
	{/if}
</Section>
