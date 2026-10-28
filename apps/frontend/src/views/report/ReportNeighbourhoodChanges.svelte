<script lang="ts">
	import type { ReportNeighbourhoodChanges } from 'client';

	import { monthLabel } from '#lib/culinary.js';

	// Openings and closures around the venue this quarter: one line, then the places
	interface Props {
		changes: ReportNeighbourhoodChanges;
	}

	let { changes }: Props = $props();

	const SHOWN = 6;
	const KIND_LABELS: Record<string, string> = {
		opened: 'opened',
		temporarily_closed: 'closed for now',
		permanently_closed: 'closed',
		reopened: 'reopened'
	};
	const count = (n: number, one: string, many: string) =>
		n === 0 ? '' : `${n === 1 ? 'one' : n} ${n === 1 ? one : many}`;
	const parts = (c: { opened: number; closed: number; reopened: number }) =>
		[
			count(c.opened, 'place opened', 'places opened'),
			count(c.closed, 'closed', 'closed'),
			count(c.reopened, 'reopened', 'reopened')
		].filter(Boolean);
	const sentence = (items: string[]) =>
		items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}` : (items[0] ?? '');

	// "20 Aug" from `YYYY-MM-DD`, read as UTC so the day never shifts
	const dayLabel = (date: string) =>
		new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			timeZone: 'UTC'
		});

	// Openings creators' posts announced count with the scans' and are marked with the first post's day
	const fromPosts = $derived(changes.openedFromPosts ?? 0);
	const street = $derived(changes.street ? parts(changes.street) : []);
	const district = $derived(parts(changes));
	const line = $derived(
		street.length
			? `On ${changes.street!.name} this quarter, ${sentence(street)}; in ${changes.district}, ${sentence(district)}.`
			: district.length
				? `In ${changes.district} this quarter, ${sentence(district)}.`
				: ''
	);
</script>

{#if line}
	<div class="border-line mt-5 border-t pt-4 break-inside-avoid">
		<p class="stamp text-beet m-0 mb-2">New and closed nearby</p>
		<p class="text-reading-ink m-0 max-w-[62ch] text-sm">{line}</p>
		<ul class="m-0 mt-2 flex list-none flex-col gap-0.5 p-0 text-xs">
			{#each changes.venues.slice(0, SHOWN) as v (`${v.venueId}-${v.kind}`)}
				<li class="flex min-w-0 gap-2">
					<span class={['shrink-0', v.kind === 'opened' ? 'text-primary-darker' : 'text-beet']}
						>{KIND_LABELS[v.kind] ?? v.kind}</span>
					<span class="min-w-0 truncate"
						>{v.name}{v.category ? ` · ${v.category}` : ''}{v.sameStreet && v.street
							? ` · ${v.street}`
							: ''}{#if v.source === 'posts'}<span class="text-muted-foreground"> · first post {dayLabel(v.date)}</span>{/if}</span>
				</li>
			{/each}
		</ul>
		<p class="text-muted-foreground m-0 mt-2 text-xs">
			{monthLabel(changes.from)} to {monthLabel(changes.to)}, as our Google Maps scans saw them{fromPosts
				? `; ${fromPosts === 1 ? 'one opening' : `${fromPosts} openings`} from posts: creators' posts said the place had just opened, dated the first one`
				: ''}.
		</p>
	</div>
{/if}
