<script lang="ts">
	import { Plus, Search, X } from '@lucide/svelte';

	import type { AdminBrandBranchOutputDto, AdminBrandOutputDto } from 'client';

	import BrandBranchRow from './BrandBranchRow.svelte';

	import { onDay } from '#components/admin/admin-format.js';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { branchesByCity } from '#lib/brands.js';
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import Checkbox from '#ui/primitives-new/checkbox/checkbox.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import IconButton from '#ui/wrapped/IconButton.svelte';
	import Select from '#ui/wrapped/Select.svelte';

	// The brand's places per city, finding new ones on Google Maps and the namesakes that may be
	// branches. Taking a branch off makes it a brand of its own.
	interface Props {
		brand: AdminBrandOutputDto;
		onChange: (brand: AdminBrandOutputDto) => void;
	}

	let { brand, onChange: set }: Props = $props();

	const cities = $derived(branchesByCity(brand.branches));
	const chain = $derived(brand.branches.length > 1);

	const addAction = createAction(
		(venueIds: string[]) => api.admin.addBrandBranches(brand.id, { venueIds }),
		{
			onSuccess: (b) => {
				set(b);
				ticked = {};
			},
			successNotification: (_, [ids]) => ({
				title: ids.length === 1 ? 'Branch added' : `${ids.length} branches added`,
				text: 'Their mentions are matched again in the background.'
			})
		}
	);

	const removeAction = createAction(
		(branch: AdminBrandBranchOutputDto) => api.admin.removeBrandBranch(brand.id, branch.id),
		{
			onSuccess: set,
			successNotification: (_, [branch]) => ({
				title: 'Branch removed',
				text: branch.name,
				action: { label: 'Undo', onClick: () => addAction.execute([branch.id]) }
			})
		}
	);

	const excludeAction = createAction(
		(venue: AdminBrandBranchOutputDto) =>
			api.admin.excludeBrandVenue(brand.id, { venueId: venue.id }),
		{
			onSuccess: set,
			successNotification: (_, [venue]) => ({
				title: 'Not a branch',
				text: `${venue.name} won't be offered again`
			})
		}
	);

	// Possible branches: ticked to add in one go
	let ticked = $state<Record<string, boolean>>({});
	const tickedIds = $derived(brand.candidates.filter((c) => ticked[c.id]).map((c) => c.id));

	// One Google Maps search for the name in a city; what it finds shows up as possible branches
	adminCitiesStore.load();
	let searchCityId = $state<string | undefined>();
	$effect(() => {
		if (!searchCityId) searchCityId = cities[0]?.cityId ?? adminCitiesStore.list[0]?.id;
	});
	const CITIES = $derived(adminCitiesStore.list.map((c) => ({ value: c.id, label: c.name })));
	// The search runs in the background (about half a minute): poll until its date moves
	let searching = $state(false);
	const pollSearch = async (cityId: string, before?: string) => {
		searching = true;
		try {
			for (let i = 0; i < 24; i++) {
				await new Promise((r) => setTimeout(r, 5000));
				const fresh = await api.admin.getBrand(brand.id);
				if (fresh.branchesSearchedAt[cityId] !== before) {
					set(fresh);
					return;
				}
			}
		} finally {
			searching = false;
		}
	};
	const searchAction = createAction(
		(cityId: string) => api.admin.searchBrandBranches(brand.id, { cityId }),
		{
			onSuccess: (_, [cityId]) => pollSearch(cityId, brand.branchesSearchedAt[cityId]),
			successNotification: () => ({
				title: 'Searching Google Maps',
				text: 'Possible branches show up below in about half a minute.'
			})
		}
	);

	const searchedAt = (cityId?: string) => (cityId ? brand.branchesSearchedAt[cityId] : undefined);

</script>

<div class="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
	<div class="flex min-w-0 flex-col gap-5">
		{#each cities as city (city.cityId)}
			<AdminPanel title={`Branches in ${city.cityName}`} note={city.branches.length}>
				<ul class="divide-line m-0 flex list-none flex-col divide-y p-0 text-sm">
					{#each city.branches as branch (branch.id)}
						<BrandBranchRow {branch}>
							{#snippet trailing()}
								{#if chain}
									<IconButton
										icon={X}
										label={`Take ${branch.name} off the brand`}
										variant="ghost"
										loading={removeAction.executing}
										onclick={() => removeAction.execute(branch)} />
								{/if}
							{/snippet}
						</BrandBranchRow>
					{/each}
				</ul>
				<p class="text-muted-foreground m-0 mt-3 text-xs">
					{#if chain}
						The brand's report here covers every branch: posts (those naming only the brand
						too) and reviews, then each open branch's own place figures (busyness, open
						tables, prices, search ranks, the neighbourhood). A branch taken off becomes a
						brand of its own and never joins again by itself.
					{:else}
						One place. Branches on its own website join by themselves when they are scraped;
						find more on Google Maps here, or merge the namesakes listed under Brands → Look
						like one brand.
					{/if}
				</p>
			</AdminPanel>
		{:else}
			<AdminPanel title="Branches">
				<EmptyState
					title="No branches"
					hint="Add one from the possible branches."
					ground="none"
					size="sm" />
			</AdminPanel>
		{/each}
	</div>

	<div class="flex min-w-0 flex-col gap-5">
		<AdminPanel title="Find branches">
			<p class="text-muted-foreground m-0 mb-3 text-sm">
				Searches Google Maps for “{brand.name}” in the city (about $0.20) and saves the
				places it finds. Places of the name on the brand's own website join it by
				themselves; the other branch names show up below to add. The quarterly venue
				scrape runs this for every brand.
			</p>
			<div class="flex flex-wrap items-center gap-2">
				<div class="w-48">
					<Select items={CITIES} bind:value={searchCityId} aria-label="City" />
				</div>
				<Button
					variant="outline"
					icon={Search}
					loading={searchAction.executing || searching}
					disabled={!searchCityId}
					onclick={() => searchCityId && searchAction.execute(searchCityId)}
					>Find branches</Button>
				<span class="text-muted-foreground text-xs">
					{searchedAt(searchCityId)
						? `Last searched ${onDay(searchedAt(searchCityId)!)}`
						: 'Never searched there'}
				</span>
			</div>
		</AdminPanel>

		<AdminPanel title="Possible branches" note={brand.candidates.length || undefined}>
			{#snippet action()}
				{#if brand.candidates.length}
					<Button
						size="sm"
						icon={Plus}
						loading={addAction.executing}
						disabled={tickedIds.length === 0}
						onclick={() => addAction.execute(tickedIds)}
						>Add {tickedIds.length || ''}</Button>
				{/if}
			{/snippet}
			{#if brand.candidates.length === 0}
				<EmptyState
					title="Nothing to review"
					hint="Places with a branch name that are a brand of their own show up here, from any city."
					ground="none"
					size="sm" />
			{:else}
				<ul class="divide-line m-0 flex list-none flex-col divide-y p-0 text-sm">
					{#each brand.candidates as venue (venue.id)}
						<BrandBranchRow branch={venue}>
							{#snippet leading()}
								<Checkbox
									checked={!!ticked[venue.id]}
									aria-label={`Add ${venue.name}`}
									onCheckedChange={(v) => (ticked[venue.id] = !!v)} />
							{/snippet}
							{#snippet trailing()}
								<span class="text-muted-foreground shrink-0 text-xs"
									>{venue.city.name}</span>
								<Button
									size="sm"
									variant="ghost"
									loading={excludeAction.executing}
									onclick={() => excludeAction.execute(venue)}
									>Not a branch</Button>
							{/snippet}
						</BrandBranchRow>
					{/each}
				</ul>
			{/if}
		</AdminPanel>
	</div>
</div>
