<script lang="ts">
	import { Eye, EyeOff } from '@lucide/svelte';

	import {
		AdminAddCitySourceInputDtoKindEnum as Kind,
		type AdminCreatorOutputDto,
		type AdminCreatorWatchOutputDto,
		type AdminWatchReasonOutputDto,
		AdminWatchReasonOutputDtoKindEnum as Reason	} from 'client';

	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { monthLabel, PLATFORM_LABELS } from '#lib/culinary.js';
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import Badge from '#ui/wrapped/Badge.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import Select from '#ui/wrapped/Select.svelte';

	// Why each of the creator's profiles is scraped, or isn't: a city follows them (an account
	// source on its Sources tab), they are on a city's creator list (enough of their recent posts
	// name a place there: they join and leave by themselves), both scraped daily; or the profile is a
	// brand's own account (a paying customer, a most talked-about brand, a report brand's
	// competitor, or any brand with a place open in the city), scraped weekly. The backend's watch
	// list is the one the runs use, so this says what they do. "Watch in <city>" adds the creator to
	// a city's sources; "Stop watching" on the creator list adds them switched off, which keeps them
	// off it.
	interface Props {
		creator: AdminCreatorOutputDto;
		month: string;
	}

	let { creator, month }: Props = $props();

	let refreshKey = $state(0);
	let watch = $state<AdminCreatorWatchOutputDto | null>(null);
	$effect(() => {
		void refreshKey;
		const id = creator.id;
		api.admin.getCreatorWatch(id, { month }).then((res) => {
			if (id === creator.id) watch = res;
		});
	});

	const watched = $derived(watch?.accounts.some((a) => a.reasons.some((r) => r.active)) ?? false);

	const brandLink = (brand?: { id: string; name: string }) => (brand ? `/admin/brands/${brand.id}` : '#');
	const sourcesHref = (cityId: string) => `/admin/cities/${cityId}?tab=sources`;

	// The city source's state in a few words, for the reasons that are no source of the run
	const sourceState = (r: AdminWatchReasonOutputDto) =>
		r.enabled === false ? 'switched off'
		: r.instagramOff ? `waiting: Instagram is off for ${r.city.name}`
		: !r.active ? `${r.city.name}'s weekly runs are off`
		: null;

	const toggleSource = createAction(
		(reason: AdminWatchReasonOutputDto, enabled: boolean) =>
			api.admin.updateCitySource(reason.city.id, reason.sourceId!, { enabled }),
		{
			onSuccess: () => refreshKey++,
			successNotification: (_, [reason, enabled]) => ({
				title: enabled ? `Watched in ${reason.city.name}` : `No longer watched in ${reason.city.name}`,
				text: enabled ? 'Their profile is scraped daily' : 'The source stays on the Sources tab, switched off, and keeps them off the creator list'
			})
		}
	);

	// The cities whose runs go every week: where a creator can be watched
	$effect(() => {
		adminCitiesStore.load();
	});
	const cities = $derived(adminCitiesStore.list.filter((c) => c.active && c.cronEnabled));
	let cityId = $state<string | undefined>(undefined);
	const pickedCity = $derived(cities.find((c) => c.id === cityId) ?? cities[0]);

	// Each profile becomes the city's source, or its switched-off source is turned on again
	const watchAction = createAction(
		async (city: { id: string; name: string }) => {
			for (const account of watch?.accounts ?? []) {
				const existing = account.reasons.find((r) => r.kind === Reason.CitySource && r.city.id === city.id);
				if (existing?.sourceId) {
					if (!existing.enabled) await api.admin.updateCitySource(city.id, existing.sourceId, { enabled: true });
					continue;
				}
				await api.admin.addCitySource(city.id, {
					kind: account.platform === 'tiktok' ? Kind.TiktokAccount : Kind.InstagramAccount,
					value: account.handle,
					note: `Added from ${creator.name}'s page`
				});
			}
		},
		{
			onSuccess: () => refreshKey++,
			successNotification: (_, [city]) => ({
				title: `${creator.name} is watched in ${city.name}`,
				text: 'Their profiles are scraped daily'
			})
		}
	);

	// Off a city's creator list for good: each profile becomes a switched-off source of the city
	// (an enabled one is switched off), which the list leaves out
	const stopCreator = createAction(
		async (city: { id: string; name: string }) => {
			for (const account of watch?.accounts ?? []) {
				const existing = account.reasons.find((r) => r.kind === Reason.CitySource && r.city.id === city.id);
				if (existing?.sourceId) {
					if (existing.enabled) await api.admin.updateCitySource(city.id, existing.sourceId, { enabled: false });
					continue;
				}
				await api.admin.addCitySource(city.id, {
					kind: account.platform === 'tiktok' ? Kind.TiktokAccount : Kind.InstagramAccount,
					value: account.handle,
					enabled: false,
					note: `Kept off the creator list from ${creator.name}'s page`
				});
			}
		},
		{
			onSuccess: () => refreshKey++,
			successNotification: (_, [city]) => ({
				title: `${creator.name} is no longer watched in ${city.name}`,
				text: "Their profiles are switched-off sources of the city, which keep them off its creator list"
			})
		}
	);
	const lastPost = (at?: string) =>
		at ? new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
	const watchedIn = (id: string) =>
		watch?.accounts.every((a) => a.reasons.some((r) => r.kind === Reason.CitySource && r.city.id === id && r.enabled)) ?? false;
</script>

<AdminPanel title="Watched" note={watch ? `for ${monthLabel(watch.month)}'s report brands` : undefined}>
	{#snippet action()}
		{#if watch?.accounts.length}
			<Badge pill variant={watched ? 'success' : 'secondary'}>{watched ? 'Watched' : 'Not watched'}</Badge>
		{/if}
	{/snippet}
	{#if !watch}
		<p class="text-muted-foreground m-0 text-sm">Loading…</p>
	{:else if !watch.accounts.length}
		<p class="text-muted-foreground m-0 text-sm">
			No TikTok or Instagram profile: a blog is read through its feed with the city's other blogs.
		</p>
	{:else}
		<ul class="divide-line m-0 flex list-none flex-col divide-y p-0 text-sm">
			{#each watch.accounts as account (account.accountId)}
				<li class="flex flex-col gap-1.5 py-2.5">
					<span class="font-medium">{PLATFORM_LABELS[account.platform]} · @{account.handle}</span>
					{#if !account.reasons.length}
						<span class="text-muted-foreground text-xs">
							Not watched: its posts reach us only when a city's hashtag or search, or a search for a venue, finds them. A
							creator joins a city's creator list by themselves once 3 of their posts in 90 days name a place there.
						</span>
					{/if}
					{#each account.reasons as reason, i (i)}
						<div class="flex items-start gap-2 text-xs">
							{#if reason.active}
								<Eye class="text-success mt-px size-3.5 shrink-0" aria-label="Watched" />
							{:else}
								<EyeOff class="text-faint mt-px size-3.5 shrink-0" aria-label="Not watched" />
							{/if}
							<div class="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
								{#if reason.kind === Reason.CitySource}
									<span class={reason.active ? '' : 'text-muted-foreground'}>
										Tied to <a href={sourcesHref(reason.city.id)} class="font-medium hover:underline">{reason.city.name}'s discovery</a>:
										a creator source of the city{sourceState(reason) ? ` (${sourceState(reason)})` : ''}
									</span>
									{#if reason.sourceId && reason.enabled === false}
										<span class="text-muted-foreground">Keeps them off the city's creator list.</span>
									{/if}
									{#if reason.sourceId && reason.enabled}
										<Button size="sm" variant="ghost" loading={toggleSource.executing} onclick={() => toggleSource.execute(reason, false)}
											>Stop watching</Button>
									{:else if reason.sourceId && reason.enabled === false}
										<Button size="sm" variant="outline" loading={toggleSource.executing} onclick={() => toggleSource.execute(reason, true)}
											>Turn on</Button>
									{/if}
								{:else if reason.kind === Reason.Creator}
									<span class={reason.active ? '' : 'text-muted-foreground'}>
										On {reason.city.name}'s creator list, #{reason.rank} of {reason.top} at most: {reason.posts} of their {reason.readPosts}
										posts in {reason.windowDays} days named a place there, the last on {lastPost(reason.lastPostAt)}. Scraped daily; they
										leave the list by themselves{reason.instagramOff ? ` (waiting: Instagram is off for ${reason.city.name})` : ''}
									</span>
									<Button size="sm" variant="ghost" loading={stopCreator.executing} onclick={() => stopCreator.execute(reason.city)}
										>Stop watching</Button>
								{:else}
									<span>
										Tied to <a href={brandLink(reason.brand)} class="font-medium hover:underline">{reason.brand?.name}</a>'s own
										account tracking:
										{#if reason.kind === Reason.Customer}
											they are a paying customer in {reason.city.name}
										{:else if reason.kind === Reason.TopBrand}
											#{reason.rank} of {reason.city.name}'s {reason.top} most talked-about brands in {monthLabel(reason.month ?? month)}
										{:else if reason.kind === Reason.Rival}
											a rival of
											{#each reason.rivalOf ?? [] as of, j (of.id)}{j ? ', ' : ''}<a href={brandLink(of)} class="hover:underline">{of.name}</a
												>{/each} in {reason.city.name}, whose report compares them
										{:else if reason.kind === Reason.Brand}
											a brand with a place open in {reason.city.name}, scraped weekly
										{/if}
									</span>
								{/if}
							</div>
						</div>
					{/each}
				</li>
			{/each}
		</ul>

		{#if pickedCity}
			<div class="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
				{#if cities.length > 1}
					<div class="w-40">
						<Select
							items={cities.map((c) => ({ value: c.id, label: c.name }))}
							value={pickedCity.id}
							aria-label="City"
							size="sm"
							onValueChange={(value) => (cityId = value)} />
					</div>
				{/if}
				{#if watchedIn(pickedCity.id)}
					<span class="text-muted-foreground text-xs">Every profile is one of {pickedCity.name}'s sources.</span>
				{:else}
					<Button
						size="sm"
						variant="outline"
						icon={Eye}
						loading={watchAction.executing}
						onclick={() => watchAction.execute({ id: pickedCity.id, name: pickedCity.name })}>Watch in {pickedCity.name}</Button>
					<span class="text-muted-foreground text-xs">Adds their profiles to the city's sources: scraped daily.</span>
				{/if}
			</div>
		{/if}
	{/if}
</AdminPanel>
