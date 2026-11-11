<script lang="ts">
	import { MessageCircle, Newspaper, Star, Store, UtensilsCrossed } from '@lucide/svelte';
	import type { AdminBrandOutputDto, AdminVenueOutputDto, AdminVenueTopicsOutputDto } from 'client';

	import VenuePlaceCard from './VenuePlaceCard.svelte';
	import VenueRatingCard from './VenueRatingCard.svelte';

	import DetailCard from '#components/admin/detail/DetailCard.svelte';
	import StatCell from '#components/admin/detail/StatCell.svelte';
	import TagCloud from '#components/admin/detail/TagCloud.svelte';
	import VenueDemandPanel from '#components/admin/venues/VenueDemandPanel.svelte';
	import VenueDetailsPanel from '#components/admin/venues/VenueDetailsPanel.svelte';
	import VenueDishSearchesPanel from '#components/admin/venues/VenueDishSearchesPanel.svelte';
	import VenueTopicsPanel from '#components/admin/venues/VenueTopicsPanel.svelte';
	import { topicHref } from '#lib/topic-format.js';

	// The place itself: its figures since we first read it, Google's facts, the
	// food it is known for, its Google rating and what its reviews mention; then its demand, where
	// it ranks in dish searches and Google's details. What is said about the business as a whole
	// lives on its brand's page.
	interface Props {
		venue: AdminVenueOutputDto;
		/** Its brand with every branch, loaded by the page (the place switcher too); null while loading */
		brand: AdminBrandOutputDto | null;
		openTab: (tab: string) => void;
	}

	let { venue, brand, openTab }: Props = $props();

	const chain = $derived(venue.brand.branches > 1);
	let topics = $state<AdminVenueTopicsOutputDto | null>(null);
	const primary = $derived(topics?.tags.find((t) => t.primary));
	const PRIMARY_FROM: Record<string, (score: number) => string> = {
		mentions: (s) => `${Math.round(s * 100)} % of posts`,
		menu: (s) => `${Math.round(s * 100)} % of its menu`,
		reviews: (s) => `${Math.round(s * 100)} % of review tags`,
		category: () => 'its Google category',
		manual: () => 'set by an admin'
	};

	const shortDay = (date: string) =>
		new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' });
	// The first stored read: what the rating and the review count are compared with
	const firstRated = $derived(venue.snapshots.find((s) => s.rating != null));
	const firstCounted = $derived(venue.snapshots.find((s) => s.reviewsCount != null));
	const ratingChange = $derived.by(() => {
		if (venue.rating == null || firstRated?.rating == null) return {};
		const diff = Math.round((venue.rating - firstRated.rating) * 10) / 10;
		if (!diff) return {};
		return { delta: `${diff > 0 ? '+' : '−'}${Math.abs(diff).toFixed(1)}`, tone: diff > 0 ? ('up' as const) : ('down' as const) };
	});
	const reviewsChange = $derived.by(() => {
		if (venue.reviewsCount == null || firstCounted?.reviewsCount == null) return {};
		const diff = venue.reviewsCount - firstCounted.reviewsCount;
		if (!diff) return {};
		return { delta: `${diff > 0 ? '+' : '−'}${Math.abs(diff).toLocaleString('en')}`, tone: diff > 0 ? ('up' as const) : ('down' as const) };
	});

	// The brand's stars over its open places in this city: what the place stands beside
	const brandRating = $derived.by(() => {
		const rated = (brand?.branches ?? []).filter(
			(b) => !b.closed && b.city.id === venue.city.id && b.rating != null && b.reviewsCount
		);
		const count = rated.reduce((sum, b) => sum + b.reviewsCount!, 0);
		return count ? { stars: rated.reduce((sum, b) => sum + b.rating! * b.reviewsCount!, 0) / count, count } : undefined;
	});

	const tagTopics = $derived(new Map(venue.reviewTagTopics.map((t) => [t.title, t])));
	const tags = $derived(
		(venue.details?.reviewsTags ?? []).map((t) => {
			const topic = tagTopics.get(t.title);
			return { title: t.title, count: t.count, ...(topic && { href: topicHref(topic.key), hint: `Food topic: ${topic.label}` }) };
		})
	);
</script>

<div class="flex min-w-0 flex-col gap-3">
	<section class="bg-paper border-line flex flex-wrap rounded-md border" aria-label="Key figures">
		<StatCell
			label="Rating"
			icon={Star}
			value={venue.rating?.toFixed(1) ?? '—'}
			{...ratingChange}
			sub={firstRated ? `since ${shortDay(firstRated.snapshotDate)} (${firstRated.rating!.toFixed(1)})` : 'not read yet'} />
		<StatCell
			label="Reviews"
			icon={MessageCircle}
			value={(venue.reviewsCount ?? 0).toLocaleString('en')}
			{...reviewsChange}
			sub={firstCounted ? `since ${shortDay(firstCounted.snapshotDate)}` : 'on Google'}
			href="?tab=reviews"
			onclick={(e) => (e.preventDefault(), openTab('reviews'))} />
		<StatCell
			label="Posts"
			icon={Newspaper}
			value={venue.mentionCount.toLocaleString('en')}
			sub="naming this branch"
			href="?tab=mentions"
			onclick={(e) => (e.preventDefault(), openTab('mentions'))} />
		<StatCell
			label="Main food"
			icon={UtensilsCrossed}
			value={primary?.label ?? '—'}
			word
			sub={primary ? PRIMARY_FROM[primary.source]?.(primary.score) : topics ? 'none known' : undefined}
			loading={!topics} />
		<StatCell
			label="Brand"
			icon={Store}
			value={chain ? `${venue.brand.branches} places` : 'One place'}
			word
			sub={brandRating ? `${brandRating.stars.toFixed(1)} ★ · ${brandRating.count.toLocaleString('en')} reviews in all` : venue.brand.name}
			href={`/admin/brands/${venue.brand.id}`} />
	</section>

	<div class="flex flex-wrap items-start gap-3">
		<div class="flex min-w-0 flex-[1_1_420px] flex-col gap-3">
			<VenuePlaceCard {venue} />
			<VenueTopicsPanel {venue} bind:data={topics} />
		</div>
		<div class="flex min-w-0 flex-[1_1_420px] flex-col gap-3">
			<VenueRatingCard {venue} onReviews={() => openTab('reviews')} />
			{#if tags.length}
				<DetailCard title="Reviews mention" icon={MessageCircle} note="all time">
					<TagCloud {tags} />
				</DetailCard>
			{/if}
		</div>
	</div>

	<div class="grid grid-cols-1 items-start gap-3 xl:grid-cols-2">
		<VenueDemandPanel {venue} />
		<div class="flex min-w-0 flex-col gap-3">
			<VenueDishSearchesPanel {venue} />
			<VenueDetailsPanel {venue} />
		</div>
	</div>
</div>
