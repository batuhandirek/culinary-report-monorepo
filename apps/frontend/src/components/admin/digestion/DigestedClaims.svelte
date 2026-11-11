<script lang="ts">
	import {
		BadgePercent,
		CalendarDays,
		CircleDashed,
		CircleQuestionMark,
		Gavel,
		Info,
		Minus,
		RefreshCw,
		Scale,
		Sparkles,
		ThumbsDown,
		ThumbsUp,
		TriangleAlert,
		Utensils
	} from '@lucide/svelte';
	import type { AdminDigestionStatementOutputDto } from 'client';
	import type { Component } from 'svelte';

	import { quoteFound } from '#lib/digestion.js';
	import { amountLabel, aspectOf, foodPartsOf, KIND_LABELS } from '#lib/statements.js';
	import { aspectPageHref, topicPageHref } from '#lib/topic-format.js';

	// A list of claims as agent A split them, one card each: agent B's sentiment as the icon and the
	// rule on the left, the claim, the source's own words under it, then B's parts as small chips
	// (aspect, kind, foods → topics, the number). An opinion is the default kind and gets no chip; a
	// quote that isn't in the source's text is flagged, one that is is marked in the text beside.
	interface Props {
		statements: AdminDigestionStatementOutputDto[];
		/** The source's texts, for checking each quote against */
		texts: (string | undefined)[];
		/** One claim's id: ringed, the others quieter (an opened claim row) */
		focus?: number;
	}

	let { statements, texts, focus }: Props = $props();

	const SENTIMENTS: Record<string, { icon: Component; tone: string; rule: string; label: string }> = {
		positive: { icon: ThumbsUp, tone: 'text-success', rule: 'border-l-success', label: 'positive' },
		negative: { icon: ThumbsDown, tone: 'text-destructive', rule: 'border-l-destructive', label: 'negative' },
		mixed: { icon: Scale, tone: 'text-warning', rule: 'border-l-warning', label: 'mixed' },
		neutral: { icon: Minus, tone: 'text-muted-foreground', rule: 'border-l-line', label: 'neutral' }
	};
	const UNREAD = { icon: CircleDashed, tone: 'text-faint', rule: 'border-l-line border-dashed', label: 'not read by agent B yet' };
	const KIND_ICONS: Record<string, Component> = {
		fact: Info,
		change: RefreshCw,
		new_item: Sparkles,
		deal: BadgePercent,
		event: CalendarDays,
		question: CircleQuestionMark,
		verdict: Gavel
	};
	// Kinds that say something happened at the place: worth the eye
	const LOUD_KINDS = new Set(['change', 'new_item', 'deal', 'event']);
</script>

<ul class="m-0 flex list-none flex-col gap-1.5 p-0">
	{#each statements as statement (statement.id)}
		{@const read = !!statement.partsAt}
		{@const look = read ? (SENTIMENTS[statement.sentiment ?? 'neutral'] ?? SENTIMENTS.neutral) : UNREAD}
		{@const aspect = aspectOf(statement)}
		{@const foods = foodPartsOf(statement)}
		{@const KindIcon = statement.kind ? KIND_ICONS[statement.kind] : undefined}
		{@const found = statement.quote ? quoteFound(statement.quote, texts) : false}
		<li
			class={[
				'bg-paper border-line flex gap-2.5 rounded-md border border-l-[3px] px-3 py-2',
				look.rule,
				focus != null && (statement.id === focus ? 'ring-grape ring-2' : 'opacity-60')
			]}>
			<span class={['mt-0.5 shrink-0', look.tone]} title={look.label}>
				<look.icon class="size-4" aria-label={look.label} />
			</span>
			<div class="flex min-w-0 flex-1 flex-col gap-1">
				<div class="flex items-start justify-between gap-3">
					<p class="m-0 text-sm leading-5">
						{#if statement.text}{statement.text}{:else}<span class="text-muted-foreground italic">named a dish</span>{/if}
					</p>
					{#if statement.amount != null && statement.unit}
						<span class="bg-tint text-ink shrink-0 rounded px-1.5 text-xs leading-5 font-semibold tabular-nums">{amountLabel(statement.amount, statement.unit)}</span>
					{/if}
				</div>
				{#if statement.quote}
					<p class="text-muted-foreground m-0 flex items-start gap-1 text-xs leading-4 italic">
						{#if !found}
							<span class="text-warning mt-px shrink-0" title="Not found in the source's text"><TriangleAlert class="size-3" aria-label="Not found in the source's text" /></span>
						{/if}
						<span class="min-w-0 break-words">“{statement.quote}”</span>
					</p>
				{/if}
				{#if !read}
					<p class="text-faint m-0 text-xs">Not read by agent B yet</p>
				{:else if aspect || KindIcon || foods.length}
					<div class="flex flex-wrap items-center gap-1 text-xs leading-5">
						{#if aspect}
							<a href={aspectPageHref(aspect.key)} class="bg-wash text-ink rounded px-1.5 underline-offset-2 hover:underline" title="Aspect">
								{aspect.root !== aspect.key ? `${aspect.rootLabel} › ${aspect.label}` : aspect.label}
							</a>
						{:else}
							<span class="text-faint px-0.5" title="Agent B filed it under no aspect">no aspect</span>
						{/if}
						{#if KindIcon && statement.kind}
							<span
								class={['inline-flex items-center gap-1 rounded px-1.5', LOUD_KINDS.has(statement.kind) ? 'bg-warning/15 text-ink font-medium' : 'text-muted-foreground']}
								title="Kind of claim">
								<KindIcon class="size-3" />{KIND_LABELS[statement.kind] ?? statement.kind}
							</span>
						{/if}
						{#each foods as food (food.key)}
							<span class="text-muted-foreground inline-flex items-center gap-1 px-0.5" title="Food wording as said → the topics it is linked to">
								<Utensils class="size-3 shrink-0" />
								<span class="text-ink font-medium">{food.name}</span>
								{#if food.topics.length}
									<span class="text-faint">→</span>
									{#each food.topics as topic, i (topic.key)}{#if i}<span class="text-faint">,</span>{/if}<a href={topicPageHref(topic.key, topic.kind)} class="text-beet underline-offset-2 hover:underline">{topic.label}</a>{/each}
								{:else}
									<span class="text-faint">(not linked yet)</span>
								{/if}
							</span>
						{/each}
					</div>
				{/if}
			</div>
		</li>
	{/each}
</ul>
