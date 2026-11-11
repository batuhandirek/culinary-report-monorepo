<script lang="ts">
	import { CalendarDays, Check, Copy, Globe, Hash, Store, Wallet } from '@lucide/svelte';
	import type { AdminVenueOutputDto } from 'client';
	import type { Component } from 'svelte';

	import DetailCard from '#components/admin/detail/DetailCard.svelte';
	import { api } from '#lib/api.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import IconButton from '#ui/wrapped/IconButton.svelte';

	// The place's own facts as rows (an icon, the label, the value, a key on hover): what Google
	// files it under, its place id, its city and district, and the booking page an admin sets by
	// hand, which open tables are sampled from before Google's reservation link and the website.
	interface Props {
		venue: AdminVenueOutputDto;
	}

	let { venue }: Props = $props();

	const others = $derived(
		(venue.categories ?? []).filter((c) => c !== venue.category).map((c) => c.toLowerCase())
	);

	let copied = $state(false);
	const copyId = async () => {
		await navigator.clipboard.writeText(venue.placeId);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	};

	// svelte-ignore state_referenced_locally
	let savedBookingUrl = $state(venue.bookingUrl ?? '');
	// svelte-ignore state_referenced_locally
	let bookingUrl = $state(venue.bookingUrl ?? '');
	const BOOKING_HOST = /(^|\.)(thefork|lafourchette|eltenedor|opentable)\.[a-z.]+$/i;
	const GOOGLE_HOST = /(^|\.)google\.[a-z.]+$/i;
	const bookingValid = $derived.by(() => {
		const url = bookingUrl.trim();
		if (!url) return true;
		try {
			const parsed = new URL(url);
			return (
				/^https?:$/.test(parsed.protocol) &&
				(BOOKING_HOST.test(parsed.hostname) ||
					(GOOGLE_HOST.test(parsed.hostname) && parsed.pathname.startsWith('/maps/reserve')))
			);
		} catch {
			return false;
		}
	});
	const bookingAction = createAction(
		(url: string | null) => api.admin.updateVenue(venue.id, { bookingUrl: url }),
		{
			onSuccess: (res) => {
				savedBookingUrl = res.bookingUrl ?? '';
				bookingUrl = savedBookingUrl;
			},
			successNotification: (res) => ({
				title: res.bookingUrl ? 'Booking link saved' : 'Booking link removed',
				text: venue.name
			})
		}
	);
	const bookingChanged = $derived(bookingUrl.trim() !== savedBookingUrl);
	const formId = $derived(`venue-booking-${venue.id}`);
</script>

{#snippet row(icon: Component, label: string)}
	{@const Icon = icon}
	<Icon class="text-faint size-3.5" strokeWidth={1.8} />
	<dt class="text-muted-foreground m-0 text-xs">{label}</dt>
{/snippet}

<DetailCard title="Place">
	<dl class="-mx-2 m-0 text-[13px]">
		<div class="hover:bg-sand/60 grid min-h-7 grid-cols-[22px_92px_minmax(0,1fr)_auto] items-center gap-x-1.5 rounded-md px-1.5 py-[3px]">
			{@render row(Store, 'Category')}
			<dd class="m-0 truncate">
				{venue.category ?? '—'}{#if others.length}<span class="text-muted-foreground">&nbsp;· also {others.join(', ')}</span>{/if}
			</dd>
			<span></span>
		</div>
		<div class="group hover:bg-sand/60 grid min-h-7 grid-cols-[22px_92px_minmax(0,1fr)_auto] items-center gap-x-1.5 rounded-md px-1.5 py-[3px]">
			{@render row(Hash, 'Place ID')}
			<dd class="m-0 truncate"><code class="text-[11.5px]">{venue.placeId}</code></dd>
			<span class="flex opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
				<IconButton icon={copied ? Check : Copy} label="Copy place ID" variant="ghost" xs onclick={copyId} />
			</span>
		</div>
		<div class="hover:bg-sand/60 grid min-h-7 grid-cols-[22px_92px_minmax(0,1fr)_auto] items-center gap-x-1.5 rounded-md px-1.5 py-[3px]">
			{@render row(Globe, 'City')}
			<dd class="m-0 truncate">
				<a href={`/admin/cities/${venue.city.id}`}>{venue.city.name}</a>{#if venue.district}<span class="text-muted-foreground">&nbsp;· {venue.district}</span>{/if}
			</dd>
			<span></span>
		</div>
		{#if venue.priceLevel}
			<div class="hover:bg-sand/60 grid min-h-7 grid-cols-[22px_92px_minmax(0,1fr)_auto] items-center gap-x-1.5 rounded-md px-1.5 py-[3px]">
				{@render row(Wallet, 'Price level')}
				<dd class="m-0 truncate">{venue.priceLevel}</dd>
				<span></span>
			</div>
		{/if}
		<div class="hover:bg-sand/60 grid min-h-7 grid-cols-[22px_92px_minmax(0,1fr)_auto] items-center gap-x-1.5 rounded-md px-1.5 py-[3px]">
			{@render row(CalendarDays, 'Booking page')}
			<dd class="m-0 min-w-0">
				<form
					id={formId}
					onsubmit={(e) => {
						e.preventDefault();
						if (bookingValid && bookingChanged) bookingAction.execute(bookingUrl.trim() || null);
					}}>
					<input
						class="border-line placeholder:text-faint aria-invalid:border-destructive h-[26px] w-full min-w-0 rounded-lg border bg-white px-2 text-xs"
						type="url"
						aria-label="Booking page"
						placeholder="Maps reserve link, TheFork or OpenTable"
						title="Open tables are sampled from it first, before Google's reservation link and the website"
						bind:value={bookingUrl}
						aria-invalid={!bookingValid || undefined} />
					{#if !bookingValid}
						<span class="text-destructive mt-0.5 block text-[11.5px]">Only a Google booking page, a TheFork or an OpenTable page can be sampled.</span>
					{/if}
				</form>
			</dd>
			<span class="flex">
				<IconButton
					type="submit"
					form={formId}
					icon={Check}
					label={bookingUrl.trim() || !savedBookingUrl ? 'Save booking page' : 'Remove booking page'}
					variant="ghost"
					xs
					loading={bookingAction.executing}
					disabled={!bookingValid || !bookingChanged} />
			</span>
		</div>
	</dl>
</DetailCard>
