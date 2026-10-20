<script lang="ts">
	import { Network, Plus, X } from '@lucide/svelte';

	import {
		type AdminCompetitorOutputDto,
		type AdminCompetitorSuggestionOutputDto,
		type AdminVenueListItemOutputDto,
		ListVenuesParamsSortEnum
	} from 'client';

	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { createAutoLoader } from '#ui/lib/loader.svelte.js';
	import type { PaginationArg } from '#ui/types/pagination.types.js';
	import Autocomplete from '#ui/wrapped/autocomplete/autocomplete.svelte';
	import Checkbox from '#ui/wrapped/Checkbox.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import IconButton from '#ui/wrapped/IconButton.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// The places and whole chains a brand's reports compare it with: for the whole brand (used in
	// every city it has branches in) or for one branch (a chain's branch competes locally). The
	// monthly run scrapes their Google reviews too, so the comparison covers reviews as well as
	// posts. Suggestions are for `cityId`, around `branch` when given (a chain's venue page).
	interface Props {
		brandId: string;
		cityId: string;
		/** A chain's branch whose page this is: picks can be for it only */
		branch?: { id: string; name: string };
	}

	let { brandId, cityId, branch }: Props = $props();

	// On a chain branch's page, a pick is for that branch unless unticked
	let forBranch = $state(true);
	const branchId = $derived(branch && forBranch ? branch.id : undefined);

	/** What to add: one place, or a whole chain; for one branch with `branchId`. */
	type Target = ({ venueId: string } | { brandId: string }) & { name: string; branchId?: string };

	let competitors = $state<AdminCompetitorOutputDto[] | null>(null);
	const loader = createAutoLoader(api.admin.listBrandCompetitors, [brandId], {
		onSuccess: (list) => (competitors = list)
	});

	// Same kind of food nearby, most talked about first. Nothing is added without a click.
	let suggestions = $state<AdminCompetitorSuggestionOutputDto[] | null>(null);
	const suggestionsLoader = createAutoLoader(
		api.admin.listBrandCompetitorSuggestions,
		[brandId, { cityId, branchId: branch?.id }],
		{ onSuccess: (list) => (suggestions = list) }
	);
	const reloadSuggestions = () => suggestionsLoader.load(brandId, { cityId, branchId: branch?.id });

	let picked = $state<string | undefined>();
	let pickedLabel = $state<string | undefined>();

	const addAction = createAction(
		(target: Target) =>
			api.admin.addBrandCompetitor(brandId, {
				...('venueId' in target ? { venueId: target.venueId } : { brandId: target.brandId }),
				branchId: target.branchId
			}),
		{
			onSuccess: (list) => {
				competitors = list;
				picked = undefined;
				pickedLabel = undefined;
				reloadSuggestions();
			},
			successNotification: (_, [target]) => ({ title: 'Competitor added', text: target.name })
		}
	);

	const name = (c: AdminCompetitorOutputDto) => c.venue?.name ?? c.rival?.name ?? '';
	const target = (c: AdminCompetitorOutputDto): Target => ({
		...(c.venue ? { venueId: c.venue.id, name: c.venue.name } : { brandId: c.rival!.id, name: c.rival!.name }),
		branchId: c.branch?.id
	});
	const forWhom = (c: AdminCompetitorOutputDto) =>
		c.branch ? `for ${c.branch.street ? `${c.branch.name}, ${c.branch.street}` : c.branch.name}` : undefined;

	const removeAction = createAction(
		(competitor: AdminCompetitorOutputDto) => api.admin.removeBrandCompetitor(brandId, competitor.id),
		{
			onSuccess: (list) => {
				competitors = list;
				reloadSuggestions();
			},
			successNotification: (_, [competitor]) => ({
				title: 'Competitor removed',
				text: name(competitor),
				action: { label: 'Undo', onClick: () => addAction.execute(target(competitor)) }
			})
		}
	);

	// The most talked-about first: the likelier competition. Neither its own branches nor a
	// place already on the list can be picked
	const searchVenues = async ({ page, size, q }: PaginationArg & { q?: string }) => {
		const res = await api.admin.listVenues({
			page,
			size,
			q,
			cityId,
			sort: ListVenuesParamsSortEnum.MentionCountDesc
		});
		const taken = new Set((competitors ?? []).flatMap((c) => (c.venue ? [c.venue.id] : [])));
		return { ...res, items: res.items.filter((v) => v.brand.id !== brandId && !taken.has(v.id)) };
	};

	// Admin picks are the default and go unlabelled; the owner's and the bulk fill's say so
	const PICKED_BY: Record<string, string | undefined> = {
		owner: 'picked by the owner',
		suggested: 'added by the bulk fill'
	};

	const label = (v: AdminVenueListItemOutputDto) =>
		[v.name, v.street ?? v.district, v.category].filter(Boolean).join(' · ');
	const mentions = (n: number) => `${n} ${n === 1 ? 'mention' : 'mentions'}`;
</script>

<div class="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
	<AdminPanel title="Competitors" note={competitors?.length}>
		{#if loader.error && !competitors}
			<ErrorState onRetry={() => loader.load(brandId)} />
		{:else if !competitors}
			<SkeletonRows count={3} lines={2} trailing />
		{:else if competitors.length === 0}
			<EmptyState
				title="No competitors yet"
				hint="Add the places or chains this brand competes with. Its reports will compare them."
				ground="none"
				size="sm" />
		{:else}
			<ul class="divide-line m-0 flex list-none flex-col divide-y p-0 text-sm">
				{#each competitors as competitor (competitor.id)}
					<li class="flex items-center gap-3 py-2">
						{#if competitor.venue}
							{@const venue = competitor.venue}
							<a href={`/admin/venues/${venue.id}`} class="min-w-0 flex-1 hover:underline">
								<span class="block truncate font-medium">{venue.name}</span>
								<span class="text-muted-foreground block truncate text-xs">
									{[venue.category, venue.street ?? venue.district, venue.city.name, forWhom(competitor), PICKED_BY[competitor.pickedBy]]
										.filter(Boolean)
										.join(' · ')}
								</span>
							</a>
							<span class="text-muted-foreground w-28 shrink-0 text-right text-xs tabular-nums">
								{venue.rating ? `${venue.rating.toFixed(1)} ★ · ` : ''}{mentions(venue.mentionCount)}
							</span>
						{:else if competitor.rival}
							{@const rival = competitor.rival}
							<a href={`/admin/brands/${rival.id}`} class="flex min-w-0 flex-1 items-center gap-2 hover:underline">
								<Network class="text-muted-foreground size-4 shrink-0" />
								<span class="min-w-0">
									<span class="block truncate font-medium">{rival.name}</span>
									<span class="text-muted-foreground block truncate text-xs">
										{[
											`the whole chain: ${rival.branches} ${rival.branches === 1 ? 'place' : 'places'}`,
											rival.cities.map((c) => c.name).join(', '),
											forWhom(competitor),
											PICKED_BY[competitor.pickedBy]
										]
											.filter(Boolean)
											.join(' · ')}
									</span>
								</span>
							</a>
						{/if}
						<IconButton
							icon={X}
							label={`Remove ${name(competitor)}`}
							variant="ghost"
							loading={removeAction.executing}
							onclick={() => removeAction.execute(competitor)} />
					</li>
				{/each}
			</ul>
		{/if}
	</AdminPanel>

	<div class="flex min-w-0 flex-col gap-5">
		<AdminPanel title="Suggested" note={suggestions?.length}>
			{#if suggestionsLoader.error && !suggestions}
				<ErrorState onRetry={reloadSuggestions} />
			{:else if !suggestions}
				<SkeletonRows count={3} lines={2} trailing />
			{:else if suggestions.length === 0}
				<EmptyState
					title="No suggestions"
					hint="No open place nearby shares its kind of food. Search below instead."
					ground="none"
					size="sm" />
			{:else}
				<ul class="divide-line m-0 flex list-none flex-col divide-y p-0 text-sm">
					{#each suggestions as suggestion (suggestion.venue.id)}
						{@const venue = suggestion.venue}
						<li class="flex items-center gap-3 py-2">
							<a href={`/admin/venues/${venue.id}`} class="min-w-0 flex-1 hover:underline">
								<span class="block truncate font-medium">{venue.name}</span>
								<span class="text-muted-foreground block truncate text-xs">
									{[venue.category, venue.street ?? venue.district].filter(Boolean).join(' · ')}
								</span>
								<span class="text-muted-foreground block truncate text-xs">
									{suggestion.reasons.join(', ')} · {mentions(venue.mentionCount)}
								</span>
							</a>
							<IconButton
								icon={Plus}
								label={`Add ${venue.name}`}
								variant="outline"
								loading={addAction.executing}
								onclick={() => addAction.execute({ venueId: venue.id, name: venue.name, branchId })} />
							{#if suggestion.brandBranches > 1}
								<IconButton
									icon={Network}
									label={`Add all ${suggestion.brandBranches} places of ${venue.brand.name}`}
									variant="outline"
									loading={addAction.executing}
									onclick={() =>
										addAction.execute({ brandId: venue.brand.id, name: venue.brand.name, branchId })} />
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</AdminPanel>

		<AdminPanel title="Add a competitor">
			<div class="flex flex-col gap-2">
				<Autocomplete
					api={searchVenues}
					bind:value={picked}
					bind:selectedLabel={pickedLabel}
					labelKey={label}
					valueKey="id"
					placeholder="Search venues"
					searchPlaceholder="Name, street or category"
					disabled={addAction.executing}
					onChange={(id) =>
						id && addAction.execute({ venueId: id, name: pickedLabel ?? 'Competitor', branchId })} />
				{#if branch}
					<Checkbox bind:checked={forBranch}>Only for {branch.name}, not the whole brand</Checkbox>
				{/if}
				<p class="text-muted-foreground m-0 text-xs">
					Reports compare posts, views and Google reviews with each competitor; a chain counts
					with its places in the report's city. The monthly run scrapes their reviews within the
					same budget.
				</p>
			</div>
		</AdminPanel>
	</div>
</div>
