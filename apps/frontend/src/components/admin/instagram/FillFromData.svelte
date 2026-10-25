<script lang="ts">
	import type { AdminCityHighlightsOutputDto } from 'client';

	import type { FillSource, PostDesign, PostFill } from './post-design.js';

	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { cityItems } from '#lib/admin-cities.js';
	import { api } from '#lib/api.js';
	import { lastMonth, monthLabel } from '#lib/culinary.js';
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';
	import { notificationManager } from '#ui/lib/notification-manager.js';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import Notice from '#ui/wrapped/Notice.svelte';
	import Select from '#ui/wrapped/Select.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// Fills a design from a city's built month: the data the public page `/<city>/<month>` draws
	// (Public reports › City month builds it). The design's `fills` say what goes where; the
	// studio merges the result into the draft and offers the undo.
	interface Props {
		design: PostDesign;
		onfill: (
			result: { values: Record<string, unknown>; caption: string },
			source: FillSource
		) => void;
	}

	let { design, onfill }: Props = $props();
	const fills = $derived((design.fills ?? []) as PostFill[]);

	adminCitiesStore.load();
	let pickedCity = $state<string | undefined>();
	const cityId = $derived(
		pickedCity ?? (adminCitiesStore.list.find((c) => c.active) ?? adminCitiesStore.list[0])?.id
	);
	let month = $state(lastMonth());
	let fillId = $state<string | undefined>();
	const fill = $derived(fills.find((f) => f.id === fillId) ?? fills[0]);
	let count = $state<number | undefined>();

	let loaded = $state<AdminCityHighlightsOutputDto | null>(null);
	let failed = $state(false);
	let request = 0;
	const load = async (city: string, wanted: string, fallBack: boolean) => {
		const mine = ++request;
		failed = false;
		try {
			const res = (await api.admin.getCityHighlights({
				cityId: city,
				month: wanted
			})) as AdminCityHighlightsOutputDto;
			if (mine !== request) return;
			// The month asked for isn't built: open the newest one that is
			if (!res.highlight && fallBack && res.months.length) {
				month = res.months[0].month;
				return load(city, month, false);
			}
			loaded = res;
		} catch {
			if (mine === request) failed = true;
		}
	};
	$effect(() => {
		if (!cityId) return;
		loaded = null;
		load(cityId, lastMonth(), true);
	});
	const pickMonth = (value: string) => {
		month = value;
		loaded = null;
		if (cityId) load(cityId, value, false);
	};

	const highlight = $derived(loaded?.highlight);
	const MONTHS = $derived(
		(loaded?.months ?? []).map((m) => ({
			value: m.month,
			label: `${monthLabel(m.month)}${m.publishedAt ? '' : ' · not published'}`
		}))
	);
	const city = $derived(adminCitiesStore.list.find((c) => c.id === cityId));
	const highlightsHref = $derived(
		`/admin/public-reports${cityId ? `?cityId=${cityId}&month=${month}` : ''}`
	);

	const apply = () => {
		if (!highlight || !fill) return;
		const source: FillSource = {
			cityName: highlight.city.name,
			citySlug: highlight.city.slug,
			month: highlight.month,
			data: highlight.data,
			count: fill.counts ? (count ?? fill.counts[0]) : undefined
		};
		const result = fill.apply(source);
		if (!result) {
			notificationManager.addNotification({
				title: `${monthLabel(highlight.month)} has nothing for “${fill.label}”`,
				text: 'Try another fill or month.',
				warning: true
			});
			return;
		}
		onfill(result, source);
	};
</script>

<AdminPanel title="Fill from data">
	<div class="flex flex-col gap-4">
		<p class="text-muted-foreground m-0 text-sm">
			From a city’s built month: the numbers its public page shows. Photos and credits you
			added stay with their place.
		</p>

		<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
			{#if adminCitiesStore.list.length > 1}
				<Select
					items={cityItems(adminCitiesStore.list)}
					value={cityId}
					aria-label="City"
					onValueChange={(v) => (pickedCity = v)} />
			{/if}
			{#if MONTHS.length}
				<Select
					items={MONTHS}
					value={month}
					aria-label="Month"
					onValueChange={pickMonth}
					class={adminCitiesStore.list.length > 1 ? '' : 'sm:col-span-2'} />
			{/if}
		</div>

		{#if failed}
			<ErrorState
				onRetry={() => cityId && load(cityId, month, false)}
				ground="none"
				size="sm" />
		{:else if !loaded}
			<SkeletonRows count={2} lines={1} boxed={false} />
		{:else if !highlight}
			<EmptyState
				title={`No month built for ${city?.name ?? 'this city'}`}
				hint="Build one under Public reports › City month; it reads the month's matched posts."
				size="sm"
				ground="none">
				<Button size="sm" variant="outline" href={highlightsHref}
					>Open the city month</Button>
			</EmptyState>
		{:else}
			{#if !highlight.publishedAt}
				<Notice
					tone="warning"
					size="sm"
					text="Not published yet. Check and publish the month before posting: the caption's link leads to its page.">
					{#snippet actions()}
						<Button size="sm" variant="outline" href={highlightsHref}>Review it</Button>
					{/snippet}
				</Notice>
			{/if}

			{#if fills.length > 1}
				<div class="flex flex-col gap-1.5">
					<Select
						items={fills.map((f) => ({ value: f.id, label: f.label }))}
						value={fill?.id}
						aria-label="What to fill"
						onValueChange={(v) => (fillId = v)} />
					<p class="text-muted-foreground m-0 text-xs">{fill?.description}</p>
				</div>
			{:else if fill}
				<p class="text-muted-foreground m-0 text-xs">{fill.description}</p>
			{/if}

			<div class="flex flex-wrap items-center gap-2">
				{#if fill?.counts}
					<div class="w-36">
						<Select
							items={[...fill.counts]
								.sort((a, b) => a - b)
								.map((c) => ({
									value: String(c),
									label: `${c} places`
								}))}
							value={String(count ?? fill.counts[0])}
							aria-label="How many places"
							size="sm"
							onValueChange={(v) => (count = Number(v))} />
					</div>
				{/if}
				<Button size="sm" variant="outline" onclick={apply}
					>Fill from {monthLabel(highlight.month)}</Button>
			</div>
		{/if}
	</div>
</AdminPanel>
