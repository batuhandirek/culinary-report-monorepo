<script lang="ts">
	import type { AdminVenueOutputDto } from 'client';

	import { onDay } from '#components/admin/admin-format.js';
	import AdminFacts, { type AdminFact } from '#components/admin/AdminFacts.svelte';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { topicHref } from '#lib/topic-format.js';
	import { Badge } from '#ui/primitives-new/badge/index.js';

	interface Props {
		venue: AdminVenueOutputDto;
	}

	let { venue }: Props = $props();

	// What Google Maps shows beside the rating (`Venue.details`). Every field may be missing:
	// a list scrape fills hours, stars and accessibility; the monthly REFRESH_VENUE_DETAILS
	// step's detail pages add the rest. Missing reads as "unknown", never as "none".
	const details = $derived(venue.details);
	// The food topic each review tag names, by its title
	const tagTopics = $derived(new Map(venue.reviewTagTopics.map(t => [t.title, t])));

	const STARS = [
		{ key: 'fiveStar', label: '5' },
		{ key: 'fourStar', label: '4' },
		{ key: 'threeStar', label: '3' },
		{ key: 'twoStar', label: '2' },
		{ key: 'oneStar', label: '1' }
	] as const;
	const stars = $derived.by(() => {
		const dist = details?.reviewsDistribution;
		if (!dist) return [];
		const total = STARS.reduce((sum, s) => sum + dist[s.key], 0) || 1;
		return STARS.map((s) => ({ ...s, count: dist[s.key], share: dist[s.key] / total }));
	});

	const facts = $derived<AdminFact[]>([
		{ label: 'Photos on Google', value: details?.imagesCount?.toLocaleString('en') },
		{ label: 'Menu', value: details?.menu ? 'Open menu' : undefined, href: details?.menu },
		{
			label: 'Reservations',
			value: details?.reserveTableUrl ? 'Book on Google' : undefined,
			href: details?.reserveTableUrl
		}
	]);

	const amenities = $derived(
		Object.entries(details?.amenities ?? {}).map(([section, options]) => ({
			section,
			offered: Object.keys(options).filter((o) => options[o]),
			notOffered: Object.keys(options).filter((o) => !options[o])
		}))
	);

	// The busiest hour of the week, when Google shows popular times at all
	const DAY_NAMES: Record<string, string> = {
		Mo: 'Mon',
		Tu: 'Tue',
		We: 'Wed',
		Th: 'Thu',
		Fr: 'Fri',
		Sa: 'Sat',
		Su: 'Sun'
	};
	const busiest = $derived.by(() => {
		let best: { day: string; hour: number; percent: number } | undefined;
		for (const [day, hours] of Object.entries(details?.popularTimesHistogram ?? {})) {
			for (const h of hours ?? []) {
				if (!best || h.occupancyPercent > best.percent) {
					best = { day, hour: h.hour, percent: h.occupancyPercent };
				}
			}
		}
		return best;
	});

	const mapsSearch = (title: string) =>
		`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
			`${title} ${venue.locality ?? venue.city.name}`
		)}`;
</script>

<AdminPanel
	title="Google Maps details"
	note={venue.detailsAt ? `as of ${onDay(venue.detailsAt)}` : undefined}>
	{#if details}
		<div class="flex flex-col gap-5 text-sm">
			{#if details.temporarilyClosed}
				<p class="text-destructive m-0 font-medium">Temporarily closed on Google Maps.</p>
			{/if}

			<AdminFacts items={facts} />

			<section>
				<h3 class="m-0 mb-2 text-sm font-semibold">Opening hours</h3>
				{#if details.openingHours?.length}
					<dl class="m-0 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1">
						{#each details.openingHours as row (row.day)}
							<dt class="text-muted-foreground">{row.day}</dt>
							<dd class="m-0 tabular-nums">{row.hours}</dd>
						{/each}
					</dl>
				{:else}
					<p class="text-muted-foreground m-0">Unknown.</p>
				{/if}
			</section>

			<section>
				<h3 class="m-0 mb-2 text-sm font-semibold">All-time stars</h3>
				{#if stars.length}
					<ul class="m-0 flex list-none flex-col gap-1 p-0">
						{#each stars as row (row.key)}
							<li class="flex items-center gap-3">
								<span class="text-muted-foreground w-6 shrink-0 tabular-nums">{row.label}★</span>
								<span class="bg-wash h-2 flex-1 overflow-hidden rounded-full">
									<span
										class="bg-primary-darker block h-full rounded-full"
										style={`width: ${row.share * 100}%`}></span>
								</span>
								<span class="w-24 shrink-0 text-right text-xs tabular-nums">
									{row.count.toLocaleString('en')}
									<span class="text-muted-foreground">· {Math.round(row.share * 100)} %</span>
								</span>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-muted-foreground m-0">Unknown.</p>
				{/if}
			</section>

			<section>
				<h3 class="m-0 mb-2 text-sm font-semibold">Amenities</h3>
				{#if amenities.length}
					<div class="flex flex-col gap-2">
						{#each amenities as group (group.section)}
							<div>
								<p class="text-muted-foreground m-0 mb-1 text-xs">{group.section}</p>
								<div class="flex flex-wrap gap-1">
									{#each group.offered as option (option)}
										<Badge variant="success" class="rounded-full px-2">{option}</Badge>
									{/each}
									{#each group.notOffered as option (option)}
										<Badge variant="quiet" class="rounded-full px-2 line-through"
											>{option}</Badge>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-muted-foreground m-0">Unknown.</p>
				{/if}
			</section>

			<section>
				<h3 class="m-0 mb-2 text-sm font-semibold">Ordering and popular times</h3>
				<p class="m-0">
					<span class="text-muted-foreground">Delivery:</span>
					{#if details.orderBy?.length}
						{#each details.orderBy as platform, i (platform.name)}
							{i ? ', ' : ''}{#if platform.url}<a
									href={platform.url}
									target="_blank"
									rel="noopener noreferrer">{platform.name}</a
								>{:else}{platform.name}{/if}
						{/each}
					{:else}
						<span class="text-muted-foreground">unknown</span>
					{/if}
				</p>
				<p class="m-0 mt-1">
					<span class="text-muted-foreground">Popular times:</span>
					{#if busiest}
						busiest {DAY_NAMES[busiest.day] ?? busiest.day}
						{String(busiest.hour).padStart(2, '0')}:00
					{:else}
						<span class="text-muted-foreground">unknown</span>
					{/if}
				</p>
			</section>

			<section>
				<h3 class="m-0 mb-2 text-sm font-semibold">Reviews often mention</h3>
				{#if details.reviewsTags?.length}
					<p class="m-0 flex flex-wrap gap-x-3 gap-y-1">
						{#each details.reviewsTags.slice(0, 12) as tag (tag.title)}
							{@const topic = tagTopics.get(tag.title)}
							<span>
								{#if topic}
									<a
										class="text-beet underline-offset-2 hover:underline"
										href={topicHref(topic.key)}
										title={`Food topic: ${topic.label}`}>{tag.title}</a>
								{:else}
									{tag.title}
								{/if}
								<span class="text-muted-foreground text-xs tabular-nums">{tag.count}</span>
							</span>
						{/each}
					</p>
					<p class="text-muted-foreground m-0 mt-1 text-xs">
						Google's count over all reviews, not the month's. A tag naming a kind of food links to its topic.
					</p>
				{:else}
					<p class="text-muted-foreground m-0">Unknown until a detail-page refresh.</p>
				{/if}
			</section>

			<section>
				<h3 class="m-0 mb-2 text-sm font-semibold">People also search for</h3>
				{#if details.peopleAlsoSearch?.length}
					<ul class="m-0 flex list-none flex-col gap-1 p-0">
						{#each details.peopleAlsoSearch as place (place.title)}
							<li class="flex items-baseline gap-2">
								<a href={mapsSearch(place.title)} target="_blank" rel="noopener noreferrer"
									>{place.title}</a>
								{#if place.totalScore != null}
									<span class="text-muted-foreground text-xs tabular-nums">
										{place.totalScore.toFixed(1)}★{place.reviewsCount != null
											? ` · ${place.reviewsCount.toLocaleString('en')} reviews`
											: ''}
									</span>
								{/if}
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-muted-foreground m-0">Unknown until a detail-page refresh.</p>
				{/if}
			</section>
		</div>
	{:else}
		<p class="text-muted-foreground m-0 text-sm">
			No Google Maps details yet. The monthly run refreshes them for report venues and their
			competitors, or start <a href="/admin/data?tab=runs">Refresh venue details</a> on the Data
			page.
		</p>
	{/if}
</AdminPanel>
