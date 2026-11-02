<script lang="ts">
	import type { AdminDigestionTallyOutputDto } from 'client';

	// A source's claims by sentiment, in one line: positive, negative, neutral or mixed, and those
	// agent B has not read yet. A zero is left out; no claims at all is a dash.
	interface Props {
		sentiments: AdminDigestionTallyOutputDto;
	}

	let { sentiments }: Props = $props();

	const PARTS = $derived(
		[
			{ n: sentiments.positive, label: 'positive', sign: '+', class: 'text-success' },
			{ n: sentiments.negative, label: 'negative', sign: '−', class: 'text-destructive' },
			{ n: sentiments.neutral + sentiments.mixed, label: 'neutral or mixed', sign: '·', class: 'text-muted-foreground' },
			{ n: sentiments.unread, label: 'not read by agent B yet', sign: '?', class: 'text-faint' }
		].filter((part) => part.n > 0)
	);
</script>

{#if PARTS.length}
	<span class="inline-flex gap-2 tabular-nums">
		{#each PARTS as part (part.label)}
			<span class={`font-semibold ${part.class}`} title={`${part.n} ${part.label}`}>{part.sign}{part.n}</span>
		{/each}
	</span>
{:else}
	<span class="text-faint">—</span>
{/if}
