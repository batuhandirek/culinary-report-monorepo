<script lang="ts">
	import { Check, Copy, Undo2 } from '@lucide/svelte';
	import type { PortalReviewOutputDto } from 'client';

	import { api } from '#lib/api.js';
	import { TOPIC_LABELS } from '#lib/culinary.js';
	import { topicsOf } from '#lib/feedback.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { notificationManager } from '#ui/lib/notification-manager.js';
	import Button from '#ui/wrapped/Button.svelte';
	import Stars from '#views/report/Stars.svelte';

	// One Google or TripAdvisor review: the words, the topics it raised, the owner's answer, and for an
	// unanswered one the reply draft to copy and the "I answered it" mark.
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
	const topics = $derived([
		...topicsOf(review.feedback, 'praise').map((t) => ({ topic: t, good: true })),
		...topicsOf(review.feedback, 'complaints').map((t) => ({ topic: t, good: false }))
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

	const copyDraft = async () => {
		try {
			await navigator.clipboard.writeText(review.replyDraft ?? '');
			notificationManager.addNotification({
				title: 'Reply copied',
				text: `Paste it under the review on ${site}.`,
				success: true
			});
		} catch {
			notificationManager.addNotification({
				title: "Couldn't copy",
				text: 'Select the text and copy it by hand.',
				error: true
			});
		}
	};
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
			{#each topics as t (`${t.topic}-${t.good}`)}
				<li
					class={[
						'border-line rounded-full border px-2.5 py-0.5 text-xs font-medium',
						t.good ? 'text-primary-darker' : 'text-beet'
					]}>
					{t.good ? '+' : '−'}
					{TOPIC_LABELS[t.topic] ?? t.topic}
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

	{#if review.replyDraft}
		<div class="bg-tint flex flex-col gap-2 rounded-md px-3.5 py-3">
			<p class="eyebrow text-beet m-0">Reply draft</p>
			<p class="text-ink m-0 text-sm leading-relaxed whitespace-pre-line">{review.replyDraft}</p>
			<div class="flex flex-wrap gap-2">
				<Button variant="outline" size="sm" icon={Copy} onclick={copyDraft}>Copy reply</Button>
			</div>
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
