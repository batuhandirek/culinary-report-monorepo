<script lang="ts">
	import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
	import {
		type ReportAnalysisPublic,
		type ReportCheck,
		ReportCheckVerdictEnum as Verdict,
		type ReportHypothesis,
		ReportHypothesisConfidenceEnum as Confidence,
		type ReportObservation,
		ReportObservationUnitEnum as Unit
	} from 'client';

	import Sparkline from './Sparkline.svelte';

	import { compact } from '#lib/culinary.js';

	// "What moved, and why it might have": the month's notable moves, each with its figure and
	// its series, what we checked (answered in code), the possible reasons the model gave with
	// how sure it is, and what only the owner can check. Reasons are possibilities, never
	// proven causes; a check whose data is missing is the admin's to see, not the owner's.
	interface Props {
		analysis: ReportAnalysisPublic;
		/** Moves shown, the most important first */
		limit: number;
	}

	let { analysis, limit }: Props = $props();

	const investigationOf = (o: ReportObservation) =>
		analysis.investigations.find((i) => i.key === o.key);
	// The investigated moves first; a sibling of one shown (posts, views and creators rising
	// together) folds into it rather than repeating the same story
	const shown = $derived.by(() => {
		const ordered = [
			...analysis.observations.filter((o) => investigationOf(o)),
			...analysis.observations.filter((o) => !investigationOf(o))
		];
		const taken = new Set<string>();
		const out: ReportObservation[] = [];
		for (const o of ordered) {
			if (out.length >= limit) break;
			if (o.related?.some((k) => taken.has(k))) continue;
			taken.add(o.key);
			out.push(o);
		}
		return out;
	});
	const siblingsOf = (o: ReportObservation) =>
		analysis.observations.filter((s) => o.related?.includes(s.key));

	const ordinal = (n: number) => {
		const rest = n % 100;
		const suffix = rest >= 11 && rest <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
		return `${n}${suffix}`;
	};
	const figure = (o: ReportObservation, value: number) => {
		switch (o.unit) {
			case Unit.Views:
				return compact(value);
			case Unit.Stars:
				return value.toFixed(1);
			case Unit.Share:
			case Unit.Points:
				return `${value}%`;
			case Unit.Rank:
				return ordinal(value);
			case Unit.Followers:
				return value.toLocaleString('en');
			default:
				return String(value);
		}
	};
	const changeText = (o: ReportObservation) => {
		const sign = o.change > 0 ? '+' : o.change < 0 ? '−' : '±';
		const abs = Math.abs(o.change);
		switch (o.unit) {
			case Unit.Share:
			case Unit.Points:
				return `${sign}${abs} pts`;
			case Unit.Index:
				return `${sign}${abs} pts`;
			case Unit.Stars:
				return `${sign}${abs.toFixed(1)}`;
			case Unit.Rank:
				return `${abs} place${abs === 1 ? '' : 's'} ${o.change > 0 ? 'down' : 'up'}`;
			case Unit.Views:
				return o.changePercent !== undefined ? `${sign}${Math.abs(o.changePercent)}%` : `${sign}${compact(abs)}`;
			default:
				return o.changePercent !== undefined ? `${sign}${Math.abs(o.changePercent)}%` : `${sign}${abs}`;
		}
	};
	// A rank falls when its number rises; a complaint share rising is a fall too
	const direction = (o: ReportObservation): 'up' | 'down' | 'flat' => {
		if (!o.change) return 'flat';
		const bad = o.unit === Unit.Rank || o.metric === 'complaint_theme' ? o.change > 0 : o.change < 0;
		return bad ? 'down' : 'up';
	};
	const minRange = (o: ReportObservation) =>
		o.unit === Unit.Stars ? 0.2 : o.unit === Unit.Share || o.unit === Unit.Points || o.unit === Unit.Index ? 10 : 0;

	const CONFIDENCE: Record<Confidence, string> = {
		[Confidence.Likely]: 'Likely',
		[Confidence.Possible]: 'Possible',
		[Confidence.Unclear]: "Can't tell from the data"
	};
	// A check whose data is missing is for the admin's trace, not the owner
	const ownerChecks = (checks: ReportCheck[]) => checks.filter((c) => c.verdict !== Verdict.Unknown);
	const VERDICT: Record<string, { mark: string; word: string }> = {
		[Verdict.Supports]: { mark: 'bg-primary-darker', word: 'points to your place' },
		[Verdict.Weakens]: { mark: 'bg-beet', word: 'points elsewhere' },
		[Verdict.Neutral]: { mark: 'bg-ink/30', word: 'context' }
	};
	const evidenceOf = (h: ReportHypothesis) => [
		...h.evidenceFor.map((text) => ({ side: 'For' as const, text })),
		...h.evidenceAgainst.map((text) => ({ side: 'Against' as const, text }))
	];
</script>

<div class="flex flex-col gap-5">
	{#each shown as o (o.key)}
		{@const investigation = investigationOf(o)}
		{@const checks = ownerChecks(o.checks)}
		{@const dir = direction(o)}
		<article class="bg-paper border-line flex flex-col gap-4 rounded-md border p-5 break-inside-avoid">
			<header class="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
				<div class="min-w-0">
					<p class="stamp text-beet m-0">{o.source}</p>
					<h3 class="type-display m-0 mt-1 text-[22px] leading-tight">{o.label}</h3>
				</div>
				<div class="flex items-center gap-3">
					<span class="flex items-baseline gap-1.5">
						<span
							class="font-display text-[28px] leading-none font-extrabold tracking-[-0.02em] tabular-nums">
							{figure(o, o.to)}
						</span>
						<span
							class={[
								'inline-flex items-center gap-px text-[11px] font-semibold whitespace-nowrap tabular-nums',
								dir === 'up' ? 'text-primary-darker' : 'text-muted-foreground'
							]}
							aria-label={`${changeText(o)} against ${o.comparedWith}`}>
							{#if dir === 'up'}<ArrowUpIcon class="size-3" />{/if}
							{#if dir === 'down'}<ArrowDownIcon class="size-3" />{/if}
							{changeText(o)}
						</span>
					</span>
					<Sparkline
						values={o.series.map((p) => p.value)}
						minRange={minRange(o)}
						label={`${o.label}: ${o.series.map((p) => `${figure(o, p.value)} (${p.at})`).join(', ')}`} />
				</div>
			</header>

			<p class="m-0 text-[15px] leading-snug font-semibold">
				{investigation?.whatHappened ?? o.sentence}
			</p>
			{#if siblingsOf(o).length}
				<p class="text-muted-foreground m-0 -mt-2 text-[13px] leading-snug">
					Moving with it: {siblingsOf(o)
						.map((s) => `${s.label.toLowerCase()} ${figure(s, s.from)} → ${figure(s, s.to)}`)
						.join(', ')}.
				</p>
			{/if}

			{#if checks.length}
				<div>
					<p class="eyebrow text-muted-foreground m-0 mb-1.5">What we checked</p>
					<ul class="m-0 flex list-none flex-col gap-1.5 p-0">
						{#each checks as check, i (i)}
							<li class="grid grid-cols-[0.5rem_minmax(0,1fr)] items-baseline gap-x-2.5">
								<span
									class={['mt-[0.45em] inline-block size-2 rounded-full', VERDICT[check.verdict]?.mark]}
									title={VERDICT[check.verdict]?.word}
									aria-hidden="true"></span>
								<p class="text-reading-ink m-0 text-[13px] leading-normal">
									<span class="font-semibold">{check.question}</span>
									{check.answer}
								</p>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if investigation?.hypotheses.length}
				<div>
					<p class="eyebrow text-muted-foreground m-0 mb-1.5">What might explain it</p>
					<ol class="m-0 flex list-none flex-col gap-3 p-0">
						{#each investigation.hypotheses as h, i (i)}
							<li class="border-line border-t pt-2.5">
								<div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
									<span
										class={[
											'rounded-full border px-1.5 py-px text-[10px] font-medium whitespace-nowrap',
											h.confidence === Confidence.Likely
												? 'bg-acid border-ink text-ink'
												: 'border-line text-muted-foreground'
										]}>
										{CONFIDENCE[h.confidence]}
									</span>
									<p class="m-0 text-[14px] leading-snug">{h.reason}</p>
								</div>
								{#if evidenceOf(h).length}
									<ul class="text-muted-foreground m-0 mt-1 flex list-none flex-col gap-0.5 p-0 text-[12px] leading-snug">
										{#each evidenceOf(h) as e, j (j)}
											<li class="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-2">
												<span class="font-semibold">{e.side}</span>
												<span>{e.text}</span>
											</li>
										{/each}
									</ul>
								{/if}
							</li>
						{/each}
					</ol>
				</div>
			{/if}

			{#if investigation?.cannotTell || investigation?.worthChecking.length}
				<div class="bg-tint border-ink/15 flex flex-col gap-2 rounded-md border px-4 py-3 text-[13px] leading-normal">
					{#if investigation.cannotTell}
						<p class="m-0">
							<span class="font-semibold">What we can't tell from the data.</span>
							{investigation.cannotTell}
						</p>
					{/if}
					{#if investigation.worthChecking.length}
						<div>
							<p class="m-0 font-semibold">Worth checking</p>
							<ul class="m-0 mt-0.5 list-disc pl-4">
								{#each investigation.worthChecking as item, i (i)}
									<li>{item}</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>
			{/if}
		</article>
	{/each}

	<p class="text-muted-foreground m-0 text-[11px] leading-snug">
		Reasons are possibilities we checked against your numbers, not proven causes. Monthly
		figures compare whole months; weekly ones compare weeks.
	</p>
</div>
