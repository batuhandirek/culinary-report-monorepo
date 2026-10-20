<script lang="ts">
	import { ExternalLink } from '@lucide/svelte';
	import type { PortalPostOutputDto } from 'client';

	import { compact, PLATFORM_LABELS } from '#lib/culinary.js';

	// One post about the venue: who, where, how far it went, what it said.
	let { post }: { post: PortalPostOutputDto } = $props();

	const date = $derived(
		new Date(post.postedAt).toLocaleDateString('en', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			timeZone: 'UTC'
		})
	);
	const SENTIMENT: Record<string, { label: string; class: string }> = {
		positive: { label: 'Positive', class: 'text-primary-darker' },
		mixed: { label: 'Mixed', class: 'text-ink' },
		neutral: { label: 'Neutral', class: 'text-muted-foreground' },
		negative: { label: 'Negative', class: 'text-beet' }
	};
	const sentiment = $derived(SENTIMENT[post.sentiment] ?? SENTIMENT.neutral);
</script>

<article class="flex flex-col gap-2 px-4 py-4 sm:px-5">
	<header class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
		<span class="text-ink font-semibold break-all">
			{post.author ? `@${post.author}` : 'Unknown creator'}
		</span>
		{#if post.authorFans != null}
			<span class="text-muted-foreground text-sm">{compact(post.authorFans)} followers</span>
		{/if}
		<span class="eyebrow text-beet">{PLATFORM_LABELS[post.platform] ?? post.platform}</span>
		{#if post.own}<span class="eyebrow text-muted-foreground">Your account</span>{/if}
		{#if post.paid}<span class="eyebrow text-muted-foreground">Paid or gifted</span>{/if}
	</header>

	<p class="text-ink m-0 max-w-[68ch] text-[0.9375rem] leading-relaxed">{post.summary}</p>

	<div class="flex flex-wrap items-center gap-x-4 gap-y-1">
		<span class="font-term text-muted-foreground text-base">
			{date} · {compact(post.views)} views · {compact(post.likes)} likes
		</span>
		<span class={['text-sm font-medium', sentiment.class]}>{sentiment.label}</span>
		{#if !post.visited}<span class="text-muted-foreground text-sm">Not visited</span>{/if}
		<a
			href={post.url}
			target="_blank"
			rel="noopener noreferrer"
			class="text-beet ml-auto inline-flex min-h-11 items-center gap-1 text-sm font-medium underline-offset-2 hover:underline">
			Open post <ExternalLink class="size-3.5" aria-hidden="true" />
		</a>
	</div>
</article>
