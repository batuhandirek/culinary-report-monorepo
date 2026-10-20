<script lang="ts">
	import type { AdminVenueDemandOutputDto, AdminVenueOutputDto } from 'client';

	import { onDay } from '#components/admin/admin-format.js';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { monthLabel } from '#lib/culinary.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { createAutoLoader } from '#ui/lib/loader.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import Input from '#ui/wrapped/Input.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// Demand signals: Google popular times sampled twice a week (the latest histogram as a
	// heat grid, the index per sample), open evening tables, delivery listings and menus
	interface Props {
		venue: AdminVenueOutputDto;
	}

	let { venue }: Props = $props();

	let demand = $state<AdminVenueDemandOutputDto | null>(null);
	const loader = createAutoLoader(api.admin.getVenueDemand, [venue.id], {
		onSuccess: (res) => (demand = res)
	});

	const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;
	const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);
	const latest = $derived(demand?.busyness.find((b) => b.histogram));
	const cell = (day: (typeof DAYS)[number], hour: number) =>
		latest?.histogram?.[day]?.find((h) => h.hour === hour)?.occupancyPercent ?? 0;
	const PLATFORMS: Record<string, string> = {
		wolt: 'Wolt',
		lieferando: 'Lieferando',
		thefork: 'TheFork',
		opentable: 'OpenTable',
		google: 'Google'
	};

	// The hand-set booking page: open tables are sampled from it before Google's reservation
	// link and the website. TheFork, OpenTable or Google's own booking page (google.com/maps/reserve/…).
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

	const empty = $derived(
		demand && !demand.busyness.length && !demand.reservations.length && !demand.delivery.length
	);
</script>

<AdminPanel title="Demand and delivery">
	<form
		class="mb-4 flex flex-col gap-1.5 text-sm"
		onsubmit={(e) => {
			e.preventDefault();
			if (bookingValid) bookingAction.execute(bookingUrl.trim() || null);
		}}>
		<label for="venue-booking-url" class="font-semibold">Booking page</label>
		<div class="flex flex-wrap items-center gap-2">
			<div class="min-w-48 flex-1">
				<Input
					id="venue-booking-url"
					type="url"
					bind:value={bookingUrl}
					placeholder="https://www.google.com/maps/reserve/…, TheFork or OpenTable"
					aria-invalid={!bookingValid || undefined}
					aria-describedby="venue-booking-url-hint" />
			</div>
			<Button
				type="submit"
				variant="outline"
				loading={bookingAction.executing}
				disabled={!bookingValid || bookingUrl.trim() === savedBookingUrl}
				>{bookingUrl.trim() || !savedBookingUrl ? 'Save' : 'Remove'}</Button>
		</div>
		<p id="venue-booking-url-hint" class={['m-0 text-xs', bookingValid ? 'text-muted-foreground' : 'text-destructive']}>
			{bookingValid
				? 'Its Google booking page (from Maps’ “Reserve a table”), TheFork or OpenTable page. Open tables are sampled from it first, before Google’s reservation link and the website.'
				: 'Only a Google booking page, TheFork or OpenTable page (https://…) can be sampled.'}
		</p>
	</form>

	{#if loader.error && !demand}
		<ErrorState onRetry={() => loader.load(venue.id)} />
	{:else if !demand}
		<SkeletonRows count={3} lines={1} />
	{:else if empty}
		<EmptyState
			title="Not sampled yet"
			hint="Report venues and their competitors get popular times twice a week and delivery menus monthly; every venue with a booking page gets open tables on Thursdays."
			ground="none"
			size="sm" />
	{:else}
		<div class="flex flex-col gap-5 text-sm">
			{#if latest}
				<section>
					<h3 class="m-0 mb-2 text-sm font-semibold">
						Popular times <span class="text-muted-foreground font-normal"
							>as of {onDay(latest.sampledAt)}</span>
					</h3>
					<div class="overflow-x-auto">
						<table class="border-collapse text-[10px]">
							<caption class="sr-only">Google popular times by day and hour, 0–100</caption>
							<thead>
								<tr>
									<th></th>
									{#each HOURS as hour (hour)}
										<th scope="col" class="text-muted-foreground w-5 font-normal"
											>{hour % 3 === 0 ? hour : ''}</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each DAYS as day (day)}
									<tr>
										<th scope="row" class="text-muted-foreground pr-1.5 text-left font-normal"
											>{day}</th>
										{#each HOURS as hour (hour)}
											{@const value = cell(day, hour)}
											<td class="p-px">
												<span
													class={['block h-4 w-5 rounded-[2px]', value ? 'bg-primary-darker' : 'bg-wash']}
													style:opacity={value ? 0.2 + 0.8 * (value / 100) : 1}
													title={`${day} ${hour}:00 · ${value}`}></span>
											</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</section>
			{/if}

			{#if demand.busyness.length}
				<section>
					<h3 class="m-0 mb-1 text-sm font-semibold">Busyness samples</h3>
					<ul class="divide-line m-0 flex list-none flex-col divide-y p-0">
						{#each demand.busyness as sample (sample.id)}
							<li class="flex gap-3 py-1.5">
								<span class="text-muted-foreground w-28 shrink-0 tabular-nums"
									>{onDay(sample.sampledAt)}</span>
								{#if sample.busynessIndex !== undefined}
									<span class="tabular-nums">index {sample.busynessIndex}</span>
									{#if sample.livePercent !== undefined}
										<span class="text-muted-foreground tabular-nums"
											>live {sample.livePercent} %{sample.liveText ? ` · ${sample.liveText}` : ''}</span>
									{/if}
								{:else}
									<span class="text-muted-foreground">no popular times</span>
								{/if}
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if demand.reservations.length}
				<section>
					<h3 class="m-0 mb-1 text-sm font-semibold">
						Open evening tables{#if venue.reservationPartner}{' '}<span
								class="text-muted-foreground font-normal">via {venue.reservationPartner}</span
							>{/if}
					</h3>
					<ul class="divide-line m-0 flex list-none flex-col divide-y p-0">
						{#each demand.reservations as sample (sample.id)}
							<li class="flex gap-3 py-1.5">
								<span class="w-28 shrink-0 tabular-nums">{sample.forDate}</span>
								<span class="tabular-nums"
									>{sample.slotsOpen} of {sample.slotsAsked} open</span>
								<span class="text-muted-foreground">
									{PLATFORMS[sample.platform] ?? sample.platform}{sample.partySize
										? ` · for ${sample.partySize}`
										: ''} · asked {onDay(sample.sampledAt)}
								</span>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if demand.delivery.length}
				<section>
					<h3 class="m-0 mb-1 text-sm font-semibold">Delivery</h3>
					<ul class="divide-line m-0 flex list-none flex-col divide-y p-0">
						{#each demand.delivery as listing (listing.id)}
							<li class="flex flex-wrap gap-x-3 py-1.5">
								<a href={listing.url} target="_blank" rel="noopener noreferrer"
									>{PLATFORMS[listing.platform] ?? listing.platform}</a>
								<span class="tabular-nums"
									>{listing.rating !== undefined ? `${listing.rating.toFixed(1)} ★` : '—'}{listing.reviewsCount !==
									undefined
										? ` · ${listing.reviewsCount} ratings`
										: ''}</span>
								<span class="text-muted-foreground">
									{listing.menuMonth
										? `${listing.menuItems} dishes (${monthLabel(listing.menuMonth)})`
										: 'no menu'} · {onDay(listing.fetchedAt)}
								</span>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		</div>
	{/if}
</AdminPanel>
