<script lang="ts">
	import { CloudDownload, Plus, Trash2 } from '@lucide/svelte';
	import type {
		AdminCityDayOutputDto,
		AdminCityEventOutputDto,
		AdminCityOutputDto,
		CityMonthContextOutputDto
	} from 'client';

	import { AdminAddCityEventInputDtoKindEnum as Kind } from 'client';

	import AdminFacts, { type AdminFact } from '#components/admin/AdminFacts.svelte';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';
	import Input from '#ui/wrapped/Input.svelte';
	import Select from '#ui/wrapped/Select.svelte';

	// The city's day context: weather and public holidays per day (fetched, free), the school
	// holidays and events an admin enters, and the month summary reports quote
	interface Props {
		city: AdminCityOutputDto;
	}

	let { city }: Props = $props();

	const KINDS = [
		{ value: Kind.Event, label: 'Event' },
		{ value: Kind.SchoolHoliday, label: 'School holidays' }
	];
	const kindLabel = (kind: string) => KINDS.find((k) => `${k.value}` === kind)?.label ?? kind;

	const lastMonth = () => {
		const d = new Date();
		d.setUTCDate(1);
		d.setUTCMonth(d.getUTCMonth() - 1);
		return d.toISOString().slice(0, 7);
	};
	const lastDay = (month: string) => {
		const [y, m] = month.split('-').map(Number);
		return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
	};
	const weekday = (date: string) =>
		new Date(`${date}T00:00:00Z`).toLocaleDateString('en', { weekday: 'short', timeZone: 'UTC' });
	const shortDate = (date: string) =>
		new Date(`${date}T00:00:00Z`).toLocaleDateString('en', { day: 'numeric', month: 'short', timeZone: 'UTC' });

	let month = $state(lastMonth());
	let refreshKey = $state(0);
	let days = $state<AdminCityDayOutputDto[]>([]);
	let context = $state<CityMonthContextOutputDto | null>(null);
	let events = $state<AdminCityEventOutputDto[]>([]);

	$effect(() => {
		void refreshKey;
		const m = month;
		if (!/^\d{4}-\d{2}$/.test(m)) return;
		Promise.all([
			api.admin.listCityDays(city.id, { from: `${m}-01`, to: lastDay(m) }),
			api.admin.getCityMonthContext(city.id, { month: m }),
			api.admin.listCityEvents(city.id)
		]).then(([d, c, e]) => {
			days = d.items;
			context = c;
			events = e.items;
		});
	});

	const fill = createAction(() => api.admin.fillCityDays(city.id, { from: `${month}-01`, to: lastDay(month) }), {
		onSuccess: () => refreshKey++,
		successNotification: (res) => ({ title: `${res.written} days fetched` })
	});

	const eventsOn = (date: string) => events.filter((e) => e.startDate <= date && e.endDate >= date);
	const isWeekend = (date: string) => ['Sat', 'Sun'].includes(weekday(date));

	const facts = $derived<AdminFact[]>(
		context
			? [
					{
						label: 'Rainy weekends',
						value: context.rainyWeekends !== undefined ? `${context.rainyWeekends} of ${context.weekends}` : null,
						hint: 'rain ≥ 1 mm on the Saturday or Sunday'
					},
					{ label: 'Rain days', value: context.rainDays ?? null },
					{ label: 'Mean high', value: context.avgTMax !== undefined ? `${context.avgTMax} °C` : null },
					{
						label: 'Public holidays',
						value: context.holidays.map((h) => `${h.name} (${shortDate(h.date)})`).join(', ') || '—'
					},
					{ label: 'Events', value: context.events.map((e) => e.name).join(', ') || '—' }
				]
			: []
	);

	let kind = $state<Kind>(Kind.Event);
	let name = $state('');
	let startDate = $state('');
	let endDate = $state('');
	const addEvent = createAction(
		() =>
			api.admin.addCityEvent(city.id, {
				kind,
				name: name.trim(),
				startDate,
				endDate: endDate || startDate
			}),
		{
			onSuccess: () => {
				name = '';
				startDate = '';
				endDate = '';
				refreshKey++;
			},
			successNotification: (event) => ({ title: 'Added', text: event.name })
		}
	);
	const removeEvent = async (event: AdminCityEventOutputDto) => {
		await api.admin.removeCityEvent(city.id, event.id);
		refreshKey++;
	};
</script>

<div class="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
	<AdminPanel title="The month" note={context ? undefined : '…'}>
		{#snippet action()}
			<div class="flex items-center gap-2">
				<span class="w-40"><Input type="month" bind:value={month} aria-label="Month" /></span>
				<Button
					size="sm"
					variant="outline"
					icon={CloudDownload}
					loading={fill.executing}
					disabled={city.lat == null || city.lng == null}
					onclick={() => fill.execute()}>
					Fetch
				</Button>
			</div>
		{/snippet}
		{#if city.lat == null || city.lng == null}
			<p class="text-muted-foreground m-0 mb-3 text-sm">
				Add the city's coordinates (Edit) for its weather.{city.region ? '' : ' A region adds its regional holidays.'}
			</p>
		{/if}
		<AdminFacts items={facts} />
		<p class="text-muted-foreground m-0 mt-3 text-sm">
			Reports quote this month's line. Weather (Open-Meteo) and public holidays (Nager.Date) are free and
			fetched every morning for the last week; Fetch refills the month.
		</p>
	</AdminPanel>

	<AdminPanel title="School holidays and events" note={events.length}>
		<form
			class="mb-3 flex flex-wrap items-end gap-2"
			onsubmit={(e) => {
				e.preventDefault();
				if (name.trim() && startDate) addEvent.execute();
			}}>
			<label class="flex flex-col gap-1 text-sm">
				<span class="text-muted-foreground text-xs">Kind</span>
				<Select items={KINDS} bind:value={kind} aria-label="Kind" />
			</label>
			<label class="flex min-w-40 flex-1 flex-col gap-1 text-sm">
				<span class="text-muted-foreground text-xs">Name</span>
				<Input bind:value={name} placeholder="Berlin Marathon" />
			</label>
			<label class="flex flex-col gap-1 text-sm">
				<span class="text-muted-foreground text-xs">From</span>
				<Input type="date" bind:value={startDate} />
			</label>
			<label class="flex flex-col gap-1 text-sm">
				<span class="text-muted-foreground text-xs">To</span>
				<Input type="date" bind:value={endDate} min={startDate} />
			</label>
			<Button type="submit" icon={Plus} loading={addEvent.executing} disabled={!name.trim() || !startDate}>Add</Button>
		</form>
		{#if events.length}
			<ul class="m-0 flex list-none flex-col p-0 text-sm">
				{#each events as event (event.id)}
					<li class="flex items-center gap-3 border-t py-1.5">
						<span class="text-muted-foreground w-28 shrink-0 text-xs">{kindLabel(`${event.kind}`)}</span>
						<span class="min-w-0 flex-1 truncate font-medium">{event.name}</span>
						<span class="text-muted-foreground shrink-0 tabular-nums">
							{shortDate(event.startDate)}{event.endDate !== event.startDate ? ` – ${shortDate(event.endDate)}` : ''}
						</span>
						<Button size="sm" variant="ghost" icon={Trash2} aria-label={`Remove ${event.name}`} onclick={() => removeEvent(event)} />
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-muted-foreground m-0 text-sm">None yet.</p>
		{/if}
	</AdminPanel>

	<AdminPanel title="Days" note={days.length} class="xl:col-span-2">
		{#if days.length}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead class="text-muted-foreground text-left text-xs">
						<tr>
							<th class="py-1 pr-3 font-normal">Day</th>
							<th class="py-1 pr-3 text-right font-normal">High °C</th>
							<th class="py-1 pr-3 text-right font-normal">Rain mm</th>
							<th class="py-1 font-normal">Holiday and events</th>
						</tr>
					</thead>
					<tbody>
						{#each days as day (day.date)}
							<tr class="border-t {isWeekend(day.date) ? 'bg-muted/40' : ''}">
								<td class="py-1 pr-3 tabular-nums">{weekday(day.date)} {shortDate(day.date)}</td>
								<td class="py-1 pr-3 text-right tabular-nums">{day.tMax ?? '—'}</td>
								<td class="py-1 pr-3 text-right tabular-nums {(day.rainMm ?? 0) >= 1 ? 'font-semibold' : 'text-muted-foreground'}">
									{day.rainMm ?? '—'}
								</td>
								<td class="py-1">
									{[day.holiday, ...eventsOn(day.date).map((e) => e.name)].filter(Boolean).join(' · ')}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="text-muted-foreground m-0 text-sm">Nothing fetched for this month yet.</p>
		{/if}
	</AdminPanel>
</div>
