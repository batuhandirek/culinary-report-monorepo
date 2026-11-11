<script lang="ts">
	import type { Component } from 'svelte';

	import { cn } from '#ui/lib/utils.js';

	// One figure of a `StatStrip`: a pixel label, the value with its change beside it, and one line
	// under it saying what it counts or since when. A cell with `href` opens where it is listed.
	// `trend` draws the same measure month by month as small bars beside the value, each bar's
	// month and figure on hover: the history without a table of its own.
	interface Props {
		label: string;
		icon?: Component;
		value: string | number;
		/** "+30", "−0.1": the change, already signed */
		delta?: string;
		/** `up` green, `down` red; `bad` turns the value itself red (reviews to answer) */
		tone?: 'up' | 'down';
		bad?: boolean;
		sub?: string;
		/** A word rather than a number ("Fried chicken"): set smaller */
		word?: boolean;
		href?: string;
		onclick?: (e: MouseEvent) => void;
		loading?: boolean;
		/** The measure by month, oldest first: `text` is the bar's hover words ("Aug 2026: 12 posts") */
		trend?: { value: number; text: string }[];
	}

	let { label, icon: Icon, value, delta, tone, bad = false, sub, word = false, href, onclick, loading = false, trend }: Props =
		$props();
	const peak = $derived(Math.max(1, ...(trend ?? []).map((t) => t.value)));
</script>

<svelte:element
	this={href ? 'a' : 'div'}
	{href}
	{onclick}
	role={href ? undefined : 'group'}
	class={cn(
		'border-line/60 min-w-0 flex-[1_1_130px] border-r px-3.5 py-2.5 text-inherit last:border-r-0',
		href && 'hover:bg-sand/60 hover:no-underline'
	)}>
	<div class="eyebrow text-muted-foreground flex items-center gap-1.5 text-[7.5px] leading-tight">
		{#if Icon}<Icon class="size-[11px]" strokeWidth={2} />{/if}{label}
	</div>
	{#if loading}
		<div class="bg-wash mt-1.5 h-5 w-14 animate-pulse rounded"></div>
		<div class="bg-wash mt-1.5 h-3 w-20 animate-pulse rounded"></div>
	{:else}
		<div
			class={cn(
				'mt-1 flex items-baseline gap-1.5 leading-tight font-semibold tabular-nums',
				word ? 'text-[15px]' : 'text-lg',
				bad && 'text-destructive'
			)}>
			<span class="truncate">{value}</span>
			{#if delta}
				<span
					class={cn(
						'text-xs font-medium',
						tone === 'up' && 'text-success',
						tone === 'down' && 'text-destructive',
						!tone && 'text-muted-foreground'
					)}>{delta}</span>
			{/if}
		</div>
		{#if sub}<div class="text-muted-foreground truncate text-[11.5px]">{sub}</div>{/if}
		{#if trend?.length}
			<div class="mt-1.5 flex h-4 items-end gap-px" role="img" aria-label={trend.map((t) => t.text).join(', ')}>
				{#each trend as t, i (i)}
					<span class="group/bar relative flex h-full min-w-0 flex-1 items-end" title={t.text}>
						<i
							class={cn(
								'block w-full rounded-t-[2px]',
								t.value ? 'bg-primary-darker/60 group-hover/bar:bg-primary-darker' : 'bg-wash h-px'
							)}
							style:height={t.value ? `${Math.max(12, (t.value / peak) * 100)}%` : undefined}></i>
					</span>
				{/each}
			</div>
		{/if}
	{/if}
</svelte:element>
