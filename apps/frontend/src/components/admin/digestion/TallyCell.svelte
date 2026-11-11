<script lang="ts">
	import { CircleDashed, Minus, ThumbsDown, ThumbsUp } from '@lucide/svelte';
	import type { AdminDigestionTallyOutputDto } from 'client';

	import Tooltip from '#ui/wrapped/Tooltip.svelte';

	// A source's claims by sentiment, in one line, with the icons the opened row's claims carry:
	// positive, negative, neutral or mixed, and those agent B has not read yet. A zero is left out;
	// no claims at all is a dash.
	interface Props {
		sentiments: AdminDigestionTallyOutputDto;
	}

	let { sentiments }: Props = $props();

	const PARTS = $derived(
		[
			{ n: sentiments.positive, label: 'positive', icon: ThumbsUp, class: 'text-success' },
			{ n: sentiments.negative, label: 'negative', icon: ThumbsDown, class: 'text-destructive' },
			{ n: sentiments.neutral + sentiments.mixed, label: 'neutral or mixed', icon: Minus, class: 'text-muted-foreground' },
			{ n: sentiments.unread, label: 'not read by agent B yet', icon: CircleDashed, class: 'text-faint' }
		].filter((part) => part.n > 0)
	);
</script>

{#if PARTS.length}
	<span class="inline-flex gap-2.5 tabular-nums">
		{#each PARTS as part (part.label)}
			<Tooltip text={`${part.n} ${part.label}`}><span class={`inline-flex items-center gap-0.5 font-semibold ${part.class}`}><part.icon class="size-3.5" />{part.n}</span></Tooltip>
		{/each}
	</span>
{:else}
	<span class="text-faint">—</span>
{/if}
