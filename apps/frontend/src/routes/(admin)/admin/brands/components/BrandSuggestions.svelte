<script lang="ts">
	import { Check, X } from '@lucide/svelte';

	import { untrack } from 'svelte';

	import type { AdminBrandSuggestionOutputDto } from 'client';

	import { goto } from '$app/navigation';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import VenueFavicon from '#components/admin/venues/VenueFavicon.svelte';
	import { api } from '#lib/api.js';
	import { branchLine, SUGGESTION_REASONS } from '#lib/brands.js';
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import Checkbox from '#ui/primitives-new/checkbox/checkbox.svelte';
	import Badge from '#ui/wrapped/Badge.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import Input from '#ui/wrapped/Input.svelte';
	import Select from '#ui/wrapped/Select.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// A city's venues that look like one chain, worked out on read. Confirming one groups the
	// ticked venues as a brand; dismissing it means it never comes back.
	adminCitiesStore.load();
	let cityId = $state<string | undefined>();
	$effect(() => {
		if (!cityId && adminCitiesStore.list.length)
			cityId = (adminCitiesStore.list.find((c) => c.active) ?? adminCitiesStore.list[0]).id;
	});
	const CITIES = $derived(adminCitiesStore.list.map((c) => ({ value: c.id, label: c.name })));

	let suggestions = $state<AdminBrandSuggestionOutputDto[] | null>(null);
	let failed = $state(false);
	// Per suggestion key: the name to confirm under, which venues are branches
	let names = $state<Record<string, string>>({});
	let ticked = $state<Record<string, Record<string, boolean>>>({});

	const load = async (id: string) => {
		suggestions = null;
		failed = false;
		try {
			const list = await api.admin.listBrandSuggestions({ cityId: id });
			names = Object.fromEntries(list.map((s) => [s.key, s.name]));
			ticked = Object.fromEntries(
				list.map((s) => [s.key, Object.fromEntries(s.venues.map((v) => [v.id, true]))])
			);
			suggestions = list;
		} catch {
			failed = true;
		}
	};
	$effect(() => {
		const id = cityId;
		if (id) untrack(() => load(id));
	});

	const drop = (key: string) => (suggestions = (suggestions ?? []).filter((s) => s.key !== key));

	const confirmAction = createAction(
		(s: AdminBrandSuggestionOutputDto) =>
			api.admin.confirmBrand({
				name: names[s.key].trim(),
				venueIds: s.venues.filter((v) => ticked[s.key][v.id]).map((v) => v.id)
			}),
		{
			// Stay on the list: the next group is the next decision
			onSuccess: (_, [s]) => drop(s.key),
			successNotification: (brand) => ({
				title: 'Brand confirmed',
				text: `${brand.name}: ${brand.branches.length} branches. Its mentions are matched again in the background.`,
				action: { label: 'Open', onClick: () => goto(`/admin/brands/${brand.id}`) }
			})
		}
	);

	// The surest groups first: every name the same once accents and punctuation are gone, or one
	// website or profile; then a name plus a branch; then names that only look alike
	const plain = (name: string) =>
		name
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, ' ')
			.trim();
	const kindOf = (s: AdminBrandSuggestionOutputDto) =>
		new Set(s.venues.map((v) => plain(v.name))).size === 1
			? 'identical'
			: s.reason === 'same website' || s.reason === 'same Instagram' || s.reason === 'same TikTok'
				? 'website'
				: s.reason === 'name prefix'
					? 'prefix'
					: 'similar';
	const KINDS = [
		{ value: 'identical', label: 'Identical names' },
		{ value: 'website', label: 'One website or profile' },
		{ value: 'prefix', label: 'Name plus a branch' },
		{ value: 'similar', label: 'Similar names' }
	];
	let kind = $state('identical');
	const counts = $derived(
		Object.fromEntries(KINDS.map((k) => [k.value, (suggestions ?? []).filter((s) => kindOf(s) === k.value).length]))
	);
	const shown = $derived((suggestions ?? []).filter((s) => kindOf(s) === kind));

	const dismissAction = createAction(
		(s: AdminBrandSuggestionOutputDto) =>
			api.admin.dismissBrandSuggestion({ name: s.name, key: s.key }),
		{
			onSuccess: (_, [s]) => drop(s.key),
			successNotification: (_, [s]) => ({
				title: 'Not a brand',
				text: `${s.name} won't be suggested again`
			})
		}
	);

	const tickedCount = (s: AdminBrandSuggestionOutputDto) =>
		s.venues.filter((v) => ticked[s.key]?.[v.id]).length;
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-wrap items-center gap-3">
		<div class="w-56">
			<Select items={CITIES} bind:value={cityId} aria-label="City" placeholder="City" />
		</div>
		<p class="text-muted-foreground m-0 text-sm">
			Venues of the city with the same name, the name plus a branch ("Burgermeister Zoo"), one
			website, or one Instagram or TikTok profile whatever their names, that need a look:
			groups whose branches share a website named after the brand are merged by themselves as
			venues come in. Tick the branches, say who decides there, and confirm.
		</p>
	</div>

	{#if failed}
		<ErrorState onRetry={() => cityId && load(cityId)} />
	{:else if !suggestions}
		<SkeletonRows count={4} lines={2} />
	{:else if suggestions.length === 0}
		<EmptyState
			title="No chains to group"
			hint="Every group of namesakes in this city is a brand or was dismissed. A venue scrape or a brand search adds venues."
			size="sm" />
	{:else}
		<div class="flex flex-wrap gap-1.5" role="group" aria-label="Kind">
			{#each KINDS as k (k.value)}
				<button type="button" class="chip text-xs" aria-pressed={kind === k.value} onclick={() => (kind = k.value)}>
					{k.label} <span class="tabular-nums opacity-70">{counts[k.value]}</span>
				</button>
			{/each}
		</div>
		{#each shown as s (s.key)}
			<AdminPanel title={s.name} note={`${s.venues.length} venues`}>
				{#snippet action()}
					<Badge pill variant="secondary"
						>{SUGGESTION_REASONS[s.reason] ?? s.reason}</Badge>
				{/snippet}
				<ul class="divide-line m-0 flex list-none flex-col divide-y p-0 text-sm">
					{#each s.venues as venue (venue.id)}
						<li class="flex items-center gap-3 py-2">
							<Checkbox
								checked={ticked[s.key][venue.id]}
								aria-label={`${venue.name} is a branch`}
								onCheckedChange={(v) => (ticked[s.key][venue.id] = !!v)} />
							<VenueFavicon favicon={venue.favicon} />
							<a
								href={`/admin/venues/${venue.id}`}
								class="min-w-0 flex-1 hover:underline">
								<span class="block truncate font-medium">{venue.name}</span>
								<span class="text-muted-foreground block truncate text-xs"
									>{branchLine(venue) || venue.category || '—'}</span>
							</a>
							<span class="text-muted-foreground shrink-0 text-xs tabular-nums">
								{venue.reviewsCount ?? 0} reviews · {venue.mentions} mentions
							</span>
						</li>
					{/each}
				</ul>
				<div class="mt-3 flex flex-wrap items-end gap-2">
					<div class="min-w-48 flex-1">
						<Input
							bind:value={names[s.key]}
							aria-label="Brand name"
							placeholder="Brand name" />
					</div>
					<Button
						icon={Check}
						loading={confirmAction.executing}
						disabled={tickedCount(s) === 0 || !names[s.key]?.trim()}
						onclick={() => confirmAction.execute(s)}
						>Confirm {tickedCount(s)} as a brand</Button>
					<Button
						variant="ghost"
						icon={X}
						loading={dismissAction.executing}
						onclick={() => dismissAction.execute(s)}>Not a brand</Button>
				</div>
			</AdminPanel>
		{:else}
			<EmptyState title="None of this kind" hint="Pick another kind above." ground="none" size="sm" />
		{/each}
	{/if}
</div>
