<script lang="ts">
	import type { AdminMentionOutputDto } from 'client';

	import Tooltip from '#ui/wrapped/Tooltip.svelte';

	// The places a post names: a matched one links to its brand, an unmatched one is the name the
	// post used (to link by hand on the post page), one in another city is dimmed.
	interface Props {
		mentions: AdminMentionOutputDto[];
	}

	let { mentions }: Props = $props();
	const SHOWN = 2;

	const items = $derived.by(() => {
		const seen = new Set<string>();
		return mentions
			.map((m) =>
				m.brand
					? { key: `b:${m.brand.id}`, label: m.brand.name, href: `/admin/brands/${m.brand.id}`, kind: 'brand' as const }
					: m.matchMethod === 'other_city'
						? { key: `o:${m.venueName}`, label: m.venueName, kind: 'elsewhere' as const }
						: m.matchMethod === 'ignored'
							? null
							: { key: `n:${m.venueName}`, label: m.venueName, kind: 'unmatched' as const }
			)
			.filter((i): i is NonNullable<typeof i> => !!i && !seen.has(i.key) && !!seen.add(i.key));
	});
</script>

<!-- One line: the first two, the rest counted with their names on hover -->
<span class="flex max-w-[16rem] min-w-0 items-center gap-x-2 text-sm">
	{#each items.slice(0, SHOWN) as item (item.key)}
		{#if item.kind === 'brand'}
			<a href={item.href} class="text-ink min-w-0 truncate font-medium hover:underline" onclick={(e) => e.stopPropagation()}>{item.label}</a>
		{:else if item.kind === 'unmatched'}
			<span class="text-warning min-w-0 truncate" title="No venue matched: link it on the post page">{item.label}?</span>
		{:else}
			<span class="text-faint min-w-0 truncate" title="In another city">{item.label}</span>
		{/if}
	{:else}
		<span class="text-faint">—</span>
	{/each}
	{#if items.length > SHOWN}
		<Tooltip text={items.slice(SHOWN).map((i) => i.label).join(', ')}>
			<span class="bg-wash text-muted-foreground shrink-0 rounded px-1.5 text-xs font-medium tabular-nums">+{items.length - SHOWN}</span>
		</Tooltip>
	{/if}
</span>
