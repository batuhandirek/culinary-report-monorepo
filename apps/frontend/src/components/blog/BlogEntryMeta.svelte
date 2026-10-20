<script lang="ts">
	import { blogEntryDate } from '#lib/blog.js';
	import { formatDate } from '#ui/lib/date.js';

	// The byline every blog surface ends on — who, when, and how long a read where the body
	// is known. One component so a row, a card, the lead story and the article say it the
	// same way, and the date is a real `<time>`.
	let {
		entry,
		minutes,
		author = true,
		class: className = ''
	}: {
		entry: {
			author?: { publicName: string };
			publishedAt?: string | null;
			createdAt: string;
		};
		/** Reading time, where the body is at hand (summaries carry none). */
		minutes?: number;
		author?: boolean;
		class?: string;
	} = $props();

	let date = $derived(blogEntryDate(entry));
</script>

<div
	class={[
		'type-meta text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs',
		className
	]}>
	{#if author && entry.author?.publicName}
		<span>{entry.author.publicName}</span>
		<span aria-hidden="true">·</span>
	{/if}
	<time datetime={date}>{formatDate(date)}</time>
	{#if minutes}
		<span aria-hidden="true">·</span>
		<span>{minutes} min read</span>
	{/if}
</div>
