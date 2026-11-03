<script lang="ts">
	import { Calendar, FileText, Globe, Heart, MapPin, Star, Store } from '@lucide/svelte';
	import type { AdminDigestedReviewOutputDto, AdminDigestionStatementOutputDto } from 'client';
	import type { Component } from 'svelte';

	import DigestedClaims from './DigestedClaims.svelte';
	import PipelineStrip, { type Step } from './PipelineStrip.svelte';
	import SourceText from './SourceText.svelte';

	import { atShort } from '#components/admin/admin-format.js';
	import { SOURCE_PLATFORM_LABELS } from '#lib/digestion.js';

	// A review and what the pipeline made of it: no gate and no places (its place is its venue),
	// so the strip has agent A's claims and agent B's parts; its texts on the left, its claims on
	// the right, those about the city or nothing apart.
	interface Props {
		review: AdminDigestedReviewOutputDto;
	}

	let { review }: Props = $props();

	const quotes = $derived(review.statements.map((s) => s.quote));
	const texts = $derived([review.text]);
	const readByB = $derived(review.statements.filter((s) => s.partsAt).length);
	const venueHref = $derived(`/admin/venues/${review.venue.id}`);
	const plural = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;

	const steps = $derived.by((): Step[] => {
		const out: Step[] = [
			{
				label: 'Claims',
				state: review.analysedAt ? 'done' : 'pending',
				result: review.analysedAt ? String(review.statements.length) : undefined,
				hint: review.analysedAt ? `split by agent A, ${atShort(review.analysedAt)}` : 'not read by agent A yet'
			}
		];
		if (review.statements.length)
			out.push({
				label: 'Parts',
				state: readByB === review.statements.length ? 'done' : readByB ? 'partly' : 'pending',
				result: `${readByB} of ${review.statements.length}`,
				hint: 'claims agent B read: sentiment, kind, aspect, foods, number'
			});
		return out;
	});

	const GROUPS = $derived(
		[
			{ key: 'place', icon: Store, label: review.venue.name, statements: review.statements.filter((s) => s.subject === 'place') },
			{ key: 'city', icon: Globe, label: `About ${review.venue.city.name}`, statements: review.statements.filter((s) => s.subject === 'city') },
			{ key: 'none', icon: FileText, label: 'In general', statements: review.statements.filter((s) => s.subject === 'none') }
		].filter((g) => g.statements.length)
	) as { key: string; icon: Component; label: string; statements: AdminDigestionStatementOutputDto[] }[];
	// Only the place's claims: no heading needed
	const headed = $derived(GROUPS.length > 1 || GROUPS[0]?.key !== 'place');
</script>

<div class="flex min-w-0 flex-col gap-4">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<PipelineStrip {steps} />
		<a href={`${venueHref}?tab=reviews`} class="text-xs font-medium underline-offset-4 hover:underline">Branch reviews</a>
	</div>

	<p class="text-muted-foreground m-0 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs">
		<span class="text-ink font-semibold">{SOURCE_PLATFORM_LABELS[review.platform] ?? review.platform} review</span>
		{#if review.stars}
			<span class="inline-flex items-center gap-px" title={`${review.stars} of 5 stars`}>
				{#each [1, 2, 3, 4, 5] as i (i)}<Star class={['size-3.5', i <= review.stars ? 'fill-current text-ink' : 'text-faint']} />{/each}
			</span>
		{/if}
		<span class="inline-flex items-center gap-1">
			<Store class="size-3.5" />
			<a href={venueHref} class="text-ink font-medium underline-offset-4 hover:underline">{review.venue.name}</a>
			{#if review.venue.brand.name !== review.venue.name}
				<span class="text-faint">·</span>
				<a href={`/admin/brands/${review.venue.brand.id}`} class="underline-offset-4 hover:underline">{review.venue.brand.name}</a>
			{/if}
		</span>
		<span class="inline-flex items-center gap-1"><MapPin class="size-3.5" />{review.venue.district ? `${review.venue.district}, ` : ''}{review.venue.city.name}</span>
		<span class="inline-flex items-center gap-1"><Calendar class="size-3.5" />{atShort(review.publishedAt)}</span>
		{#if review.likes}<span class="inline-flex items-center gap-1 tabular-nums" title="likes"><Heart class="size-3.5" />{review.likes}</span>{/if}
	</p>

	<div class="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
		<div class="flex min-w-0 flex-col gap-3">
			<SourceText label="Original" text={review.text} {quotes} note={review.language} />
			{#if review.textTranslated}
				<SourceText label="Translation" text={review.textTranslated} />
			{/if}
			{#if review.ownerResponse}
				<SourceText label="Owner's reply" text={review.ownerResponse} />
			{/if}
		</div>

		<div class="flex min-w-0 flex-col gap-4">
			{#if !review.analysedAt}
				<p class="text-muted-foreground m-0 text-sm">Not read by agent A yet.</p>
			{:else if !review.statements.length}
				<p class="text-muted-foreground m-0 text-sm">{review.text || review.textTranslated ? 'Agent A found no claims in it.' : 'Stars only: nothing to split into claims.'}</p>
			{/if}
			{#each GROUPS as group (group.key)}
				<section class="flex min-w-0 flex-col gap-1.5">
					{#if headed}
						<header class="flex items-center gap-2">
							<group.icon class="text-muted-foreground size-4 shrink-0" />
							<span class="text-sm font-semibold">{group.label}</span>
							<span class="text-muted-foreground text-xs">{plural(group.statements.length, 'claim')}</span>
						</header>
					{/if}
					<div class={headed ? 'pl-6' : ''}><DigestedClaims statements={group.statements} {texts} /></div>
				</section>
			{/each}
		</div>
	</div>
</div>
