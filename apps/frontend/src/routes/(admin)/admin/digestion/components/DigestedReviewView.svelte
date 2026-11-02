<script lang="ts">
	import type { AdminDigestedReviewOutputDto, AdminDigestionStatementOutputDto } from 'client';

	import DigestedClaims from './DigestedClaims.svelte';
	import PipelineStep from './PipelineStep.svelte';
	import SourceText from './SourceText.svelte';

	import { atShort } from '#components/admin/admin-format.js';
	import { SOURCE_PLATFORM_LABELS } from '#lib/digestion.js';

	// A review and what the pipeline made of it: no gate and no places (its place is its venue),
	// agent A's claims and agent B's parts of each.
	interface Props {
		review: AdminDigestedReviewOutputDto;
	}

	let { review }: Props = $props();

	const quotes = $derived(review.statements.map((s) => s.quote));
	const texts = $derived([review.text]);
	const readByB = $derived(review.statements.filter((s) => s.partsAt).length);
	const venueHref = $derived(`/admin/venues/${review.venue.id}`);

	const aboutOf = (statement: AdminDigestionStatementOutputDto) =>
		statement.subject === 'place'
			? { label: review.venue.name, href: venueHref }
			: statement.subject === 'city'
				? { label: review.venue.city.name, muted: true }
				: { label: 'nothing in particular', muted: true };
</script>

<div class="flex min-w-0 flex-col gap-6">
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
		<!-- What was scraped -->
		<div class="flex min-w-0 flex-col gap-3">
			<p class="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
				<span class="font-semibold">{SOURCE_PLATFORM_LABELS[review.platform] ?? review.platform} review</span>
				{#if review.stars}<span class="font-semibold tabular-nums">{review.stars}★</span>{/if}
				<a href={venueHref} class="font-medium underline-offset-4 hover:underline">{review.venue.name}</a>
				{#if review.venue.brand.name !== review.venue.name}
					<a href={`/admin/brands/${review.venue.brand.id}`} class="text-muted-foreground underline-offset-4 hover:underline">{review.venue.brand.name}</a>
				{/if}
				<span class="text-muted-foreground">{review.venue.city.name} · {atShort(review.publishedAt)}</span>
				{#if review.likes}<span class="text-muted-foreground tabular-nums">{review.likes} likes</span>{/if}
				<a href={`${venueHref}?tab=reviews`} class="font-medium underline-offset-4 hover:underline">Branch reviews</a>
			</p>
			<SourceText label="Original" text={review.text} {quotes} note={review.language} />
			{#if review.textTranslated}
				<SourceText label="Translation" text={review.textTranslated} />
			{/if}
			{#if review.ownerResponse}
				<SourceText label="Owner's reply" text={review.ownerResponse} />
			{/if}
		</div>

		<div class="flex min-w-0 flex-col gap-5">
			<PipelineStep step={1} title="Gate">
				<p class="text-muted-foreground m-0 text-sm">Reviews have no gate: every one goes to agent A.</p>
			</PipelineStep>
			<PipelineStep step={2} title="Place" note={review.analysedAt ? `read ${atShort(review.analysedAt)}` : 'not read by agent A yet'}>
				<p class="m-0 text-sm">
					Its own venue:
					<a href={venueHref} class="font-medium underline-offset-4 hover:underline">{review.venue.name}</a>{review.venue.district
						? ` (${review.venue.district})`
						: ''}, a branch of
					<a href={`/admin/brands/${review.venue.brand.id}`} class="underline-offset-4 hover:underline">{review.venue.brand.name}</a>. Agent A takes no places from a review.
				</p>
			</PipelineStep>
		</div>
	</div>

	<PipelineStep
		step={3}
		title="Claims (agent A) and their parts (agent B)"
		note={review.statements.length
			? `${review.statements.length} claim${review.statements.length === 1 ? '' : 's'} · ${readByB} read by agent B`
			: undefined}>
		{#if !review.analysedAt}
			<p class="text-muted-foreground m-0 text-sm">Not read by agent A yet.</p>
		{:else if !review.text && !review.textTranslated && !review.statements.length}
			<p class="text-muted-foreground m-0 text-sm">Stars only: nothing to split into claims.</p>
		{:else}
			<DigestedClaims statements={review.statements} {texts} {aboutOf} />
		{/if}
	</PipelineStep>
</div>
