<script lang="ts">
	import { type DateValue, parseDate } from '@internationalized/date';
	import { CalendarDays, X } from '@lucide/svelte';
	import type { DateRange } from 'bits-ui';

	import { addDays, monthEnd, monthStart, utcToday } from '#lib/spend-format.js';
	import { cn } from '#ui/lib/utils.js';
	import * as Popover from '#ui/primitives-new/popover/index.js';
	import { RangeCalendar } from '#ui/primitives-new/range-calendar/index.js';

	// A table's date filter: a small key saying the range ("Any time", "1 Aug – 31 Aug"), opening
	// presets and a two-month calendar. Days are inclusive UTC days (`2026-08-01`); nothing set is
	// every day. It sits on the table it filters, never in the page head.
	interface Props {
		from?: string;
		to?: string;
		onChange: (range: { from?: string; to?: string }) => void;
		class?: string;
	}

	let { from, to, onChange, class: className = '' }: Props = $props();

	let open = $state(false);
	const today = utcToday();
	const lastMonth = addDays(monthStart(today), -1);
	const PRESETS = [
		{ label: 'Last 30 days', from: addDays(today, -29), to: today },
		{ label: 'Last 90 days', from: addDays(today, -89), to: today },
		{ label: 'This month', from: monthStart(today), to: today },
		{ label: 'Last month', from: monthStart(lastMonth), to: monthEnd(lastMonth) },
		{ label: 'This year', from: `${today.slice(0, 4)}-01-01`, to: today },
		{ label: 'Any time', from: undefined, to: undefined }
	];

	const short = (day: string, year: boolean) =>
		new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			...(year && { year: 'numeric' }),
			timeZone: 'UTC'
		});
	const label = $derived.by(() => {
		const preset = PRESETS.find((p) => p.from === from && p.to === to);
		if (preset) return preset.label;
		const sameYear = !!from && !!to && from.slice(0, 4) === to.slice(0, 4);
		if (from && to) return from === to ? short(from, true) : `${short(from, !sameYear)} – ${short(to, true)}`;
		if (from) return `Since ${short(from, true)}`;
		return `Until ${short(to!, true)}`;
	});

	// The calendar's own value while it is open; a range is applied once both ends are picked
	let picked = $state<DateRange | undefined>(undefined);
	$effect(() => {
		if (open)
			picked = {
				start: from ? parseDate(from) : undefined,
				end: to ? parseDate(to) : undefined
			};
	});
	const pick = (range: DateRange | undefined) => {
		picked = range;
		if (range?.start && range.end) {
			onChange({ from: (range.start as DateValue).toString(), to: (range.end as DateValue).toString() });
			open = false;
		}
	};
	const choose = (p: { from?: string; to?: string }) => {
		onChange({ from: p.from, to: p.to });
		open = false;
	};
</script>

<span class={cn('inline-flex items-center', className)}>
	<Popover.Root bind:open>
		<Popover.Trigger
			class={cn(
				'border-line bg-paper text-ink hover:bg-sand/60 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium whitespace-nowrap',
				(from || to) && 'pr-7'
			)}
			aria-label={`Dates: ${label}`}>
			<CalendarDays class="text-muted-foreground size-3.5" />{label}
		</Popover.Trigger>
		<Popover.Content align="start" class="bg-paper border-line flex w-auto gap-0 p-0">
			<div class="border-line flex flex-col gap-0.5 border-r p-2">
				{#each PRESETS as preset (preset.label)}
					<button
						type="button"
						class={cn(
							'hover:bg-sand rounded px-2.5 py-1.5 text-left text-xs whitespace-nowrap',
							preset.from === from && preset.to === to && 'bg-ink text-sand hover:bg-ink'
						)}
						onclick={() => choose(preset)}>{preset.label}</button>
				{/each}
			</div>
			<RangeCalendar
				value={picked}
				onValueChange={pick}
				numberOfMonths={2}
				maxValue={parseDate(today)}
				locale="en-GB"
				weekStartsOn={1}
				class="bg-paper" />
		</Popover.Content>
	</Popover.Root>
	{#if from || to}
		<button
			type="button"
			class="text-muted-foreground hover:text-ink -ml-6 grid size-5 cursor-pointer place-items-center rounded"
			aria-label="Any time"
			title="Clear the dates"
			onclick={() => choose({})}><X class="size-3.5" /></button>
	{/if}
</span>
