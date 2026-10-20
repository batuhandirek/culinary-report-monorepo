<script lang="ts">
	import type { AdminMentionOutputDto } from 'client';

	// The places a post names: a matched one links to its brand, an unmatched one is the name the
	// post used (to link by hand on the post page), one in another city is dimmed.
	interface Props {
		mentions: AdminMentionOutputDto[];
	}

	let { mentions }: Props = $props();

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

<span class="flex max-w-[22rem] flex-wrap gap-x-2 gap-y-0.5 text-sm">
	{#each items as item (item.key)}
		{#if item.kind === 'brand'}
			<a href={item.href} class="text-ink truncate font-medium hover:underline" onclick={(e) => e.stopPropagation()}>{item.label}</a>
		{:else if item.kind === 'unmatched'}
			<span class="text-warning truncate" title="No venue matched: link it on the post page">{item.label}?</span>
		{:else}
			<span class="text-faint truncate" title="In another city">{item.label}</span>
		{/if}
	{:else}
		<span class="text-faint">—</span>
	{/each}
</span>
