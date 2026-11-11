<script lang="ts">
	import { Minus, Scale, ThumbsDown, ThumbsUp } from '@lucide/svelte';
	import type { AdminDigestionTallyOutputDto } from 'client';
	import type { Component } from 'svelte';

	import DigestionStatusIcon from '#components/admin/digestion/DigestionStatusIcon.svelte';
	import TallyCell from '#components/admin/digestion/TallyCell.svelte';
	import Tooltip from '#ui/wrapped/Tooltip.svelte';

	// A post row's claims: whether the pipeline read it (when the row knows), then its claims by
	// sentiment; a row with only an overall tone (the brand's most viewed posts) shows that instead.
	interface Props {
		status?: 'digested' | 'skipped' | 'unread';
		skipReason?: string;
		sentiments?: AdminDigestionTallyOutputDto;
		tone?: string;
	}

	let { status, skipReason, sentiments, tone }: Props = $props();

	const TONE_ICON: Record<string, Component> = { positive: ThumbsUp, negative: ThumbsDown, mixed: Scale };
	const TONE_TEXT: Record<string, string> = {
		positive: 'text-success',
		negative: 'text-destructive',
		mixed: 'text-[hsl(30_85%_30%)]'
	};
	const ToneIcon = $derived(tone ? (TONE_ICON[tone] ?? Minus) : undefined);
</script>

<span class="inline-flex items-center gap-2">
	{#if status}<DigestionStatusIcon {status} {skipReason} />{/if}
	{#if sentiments}<TallyCell {sentiments} />{/if}
	{#if ToneIcon}
		<Tooltip text={`Tone: ${tone}`}
			><ToneIcon class={['size-3.5', TONE_TEXT[tone!] ?? 'text-muted-foreground']} aria-label={tone} /></Tooltip>
	{/if}
</span>
