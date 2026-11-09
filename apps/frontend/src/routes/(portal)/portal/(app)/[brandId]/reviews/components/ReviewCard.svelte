<script lang="ts">
	import { Check, Undo2 } from '@lucide/svelte';
	import type { PortalReviewOutputDto } from 'client';

	import { api } from '#lib/api.js';
	import { rootsOf } from '#lib/statements.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';
	import Stars from '#views/report/Stars.svelte';

	// One Google or TripAdvisor review: the words, the topics it raised, the owner's answer, and for an
	// unanswered one the "I answered it" mark.
	interface Props {
		brandId: string;
		review: PortalReviewOutputDto;
		/** The review after the owner marked it, so the list can update */
		onChange?: (review: PortalReviewOutputDto) => void;
	}

	let { brandId, review, onChange }: Props = $props();

	const site = $derived(review.platform === 'tripadvisor' ? 'TripAdvisor' : 'Google');

	let showTranslation = $state(false);
	// A long review folds to a few lines until asked for
	let expanded = $state(false);
	const translatable = $derived(
		!!review.textTranslated && !!review.text && review.textTranslated !== review.text
	);
	const words = $derived(
		showTranslation ? review.textTranslated : (review.text ?? review.textTranslated)
	);
	const date = $derived(
		new Date(review.publishedAt).toLocaleDateString('en', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			timeZone: 'UTC'
		})
	);
	// The roots its claims raise, labelled as its aspects name them: praised, criticised, and the
	// facts it noted ("fries for 10 euros"), which are neither
	const topics = $derived([
		...rootsOf(review.statements, 'praise').map((t) => ({ topic: t.key, label: t.label, tone: 'good' as const })),
		...rootsOf(review.statements, 'complaints').map((t) => ({ topic: t.key, label: t.label, tone: 'bad' as const })),
		...rootsOf(review.statements, 'noted').map((t) => ({ topic: t.key, label: t.label, tone: 'noted' as const }))
	]);

	const markAction = createAction(
		(replied: boolean) => api.portal.markPortalReviewReplied(brandId, review.id, { replied }),
		{
			onSuccess: (updated) => onChange?.(updated as PortalReviewOutputDto),
			successNotification: (_, [replied]) =>
				replied
					? {
							title: 'Marked as answered',
							text: `Our next look at ${site} confirms it.`,
							action: { label: 'Undo', onClick: () => markAction.execute(false) }
						}
					: { title: 'Back on the to-do list' }
		}
	);

</script>

<article class="flex flex-col gap-3 px-4 py-4 sm:px-5">
	<header class="flex flex-wrap items-center gap-x-3 gap-y-1">
		{#if review.stars}<Stars value={review.stars} size={13} />{/if}
		<span class="text-muted-foreground text-sm">{date}</span>
		{#if review.branch}
			<span class="text-sm font-medium">{review.branch}</span>
		{/if}
		{#if review.platform === 'tripadvisor'}
			<span class="eyebrow text-beet">TripAdvisor</span>
		{/if}
		{#if review.language}
			<span class="eyebrow text-muted-foreground">{review.language}</span>
		{/if}
		{#if review.answered}
			<span class="text-primary-darker inline-flex items-center gap-1 text-sm font-medium">
				<Check class="size-4" aria-hidden="true" />
				{review.ownerResponse ? 'Answered' : 'Marked answered'}
			</span>
		{/if}
	</header>

	{#if words}
		<div class="flex flex-col gap-1">
			<p
				class={[
					'text-ink m-0 max-w-[68ch] text-[0.9375rem] leading-relaxed whitespace-pre-line',
					!expanded && 'line-clamp-6'
				]}>
				{words}
			</p>
			{#if !expanded && words.length > 360}
				<button
					type="button"
					class="text-beet min-h-11 self-start text-sm font-medium underline-offset-2 hover:underline"
					onclick={() => (expanded = true)}>
					Read all
				</button>
			{/if}
			{#if translatable}
				<button
					type="button"
					class="text-beet min-h-11 self-start text-sm font-medium underline-offset-2 hover:underline"
					onclick={() => (showTranslation = !showTranslation)}>
					{showTranslation ? 'Show the original' : 'Show in English'}
				</button>
			{/if}
		</div>
	{:else}
		<p class="text-muted-foreground m-0 text-sm">Stars only, no text.</p>
	{/if}

	{#if topics.length}
		<ul class="m-0 flex list-none flex-wrap gap-1.5 p-0" aria-label="Topics">
			{#each topics as t (`${t.topic}-${t.tone}`)}
				<li
					class={[
						'border-line rounded-full border px-2.5 py-0.5 text-xs font-medium',
						t.tone === 'good' ? 'text-primary-darker' : t.tone === 'bad' ? 'text-beet' : 'text-muted-foreground'
					]}>
					{#if t.tone === 'good'}+{:else if t.tone === 'bad'}−{/if}
					{t.label}
				</li>
			{/each}
		</ul>
	{/if}

	{#if review.ownerResponse}
		<div class="border-line border-l-2 pl-3">
			<p class="eyebrow text-muted-foreground m-0 mb-1">Your answer</p>
			<p class="text-muted-foreground m-0 line-clamp-4 text-sm leading-snug">
				{review.ownerResponse}
			</p>
		</div>
	{/if}

	{#if !review.ownerResponse}
		<div class="flex flex-wrap gap-2">
			{#if review.markedRepliedAt}
				<Button
					variant="ghost"
					size="sm"
					icon={Undo2}
					loading={markAction.executing}
					onclick={() => markAction.execute(false)}>
					Not answered yet
				</Button>
			{:else}
				<Button
					variant="outline"
					size="sm"
					icon={Check}
					loading={markAction.executing}
					onclick={() => markAction.execute(true)}>
					I answered it
				</Button>
			{/if}
		</div>
	{/if}
</article>
