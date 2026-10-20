<script lang="ts">
	import type { ReportPlatformGap, ReportReviewPlatform } from 'client';

	import { TOPIC_LABELS } from '#lib/culinary.js';

	// Google (mostly locals) next to TripAdvisor (mostly visitors): the month's reviews on each,
	// the all-time rating there, and the topics the two groups see differently.
	interface Props {
		platforms: ReportReviewPlatform[];
		gaps?: ReportPlatformGap[];
	}

	let { platforms, gaps = [] }: Props = $props();

	const NAMES: Record<string, string> = { google: 'Google', tripadvisor: 'TripAdvisor' };
	const WHO: Record<string, string> = { google: 'mostly locals', tripadvisor: 'mostly visitors' };
	const pct = (share: number) => `${Math.round(share * 100)} %`;
</script>

<div class="mb-7 break-inside-avoid">
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
		{#each platforms as p (p.platform)}
			<div class="bg-paper border-line rounded-md border px-4 py-3">
				<p class="eyebrow text-beet m-0">{NAMES[p.platform]}</p>
				<p class="text-ink m-0 mt-1 text-2xl leading-none font-semibold tabular-nums">
					{p.count}
					<span class="text-muted-foreground text-sm font-normal"
						>{p.count === 1 ? 'review' : 'reviews'} this month</span>
				</p>
				<p class="text-muted-foreground m-0 mt-1.5 text-xs">
					{WHO[p.platform]}{p.avgStars !== undefined
						? ` · ${p.avgStars.toFixed(1)}★ this month`
						: ''}{p.rating !== undefined ? ` · ${p.rating.toFixed(1)}★ all-time` : ''}{p.replyRate !==
					undefined
						? ` · ${pct(p.replyRate)} answered`
						: ''}
				</p>
			</div>
		{/each}
	</div>
	{#if gaps.length}
		<p class="m-0 mt-4 mb-1.5 text-sm font-semibold">Where locals and visitors disagree</p>
		<ul class="m-0 flex list-none flex-col gap-1 p-0 text-[13px]">
			{#each gaps as gap (`${gap.side}:${gap.topic}`)}
				<li class="text-reading-ink">
					<strong>{TOPIC_LABELS[gap.topic] ?? gap.topic}</strong>
					{gap.side === 'praise' ? 'praised' : 'criticised'} in {pct(gap.google)} of written Google reviews
					and {pct(gap.tripadvisor)} of TripAdvisor ones
				</li>
			{/each}
		</ul>
	{/if}
</div>
