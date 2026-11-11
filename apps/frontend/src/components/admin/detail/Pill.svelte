<script lang="ts">
	import type { Snippet } from 'svelte';

	import { cn } from '#ui/lib/utils.js';

	// A small rounded pill beside a detail page's title, or after an address: `sand` a plain fact
	// (chain size, price level), `ink` the rating, `good` / `bad` a judged figure (the lead score),
	// `outline` a link to a place (the district).
	interface Props {
		tone?: 'sand' | 'ink' | 'good' | 'bad' | 'outline';
		href?: string;
		title?: string;
		class?: string;
		children: Snippet;
	}

	let { tone = 'sand', href, title, class: className = '', children }: Props = $props();
</script>

<svelte:element
	this={href ? 'a' : 'span'}
	{href}
	{title}
	class={cn(
		'inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-[7px] text-[11.5px] font-semibold whitespace-nowrap tabular-nums hover:no-underline',
		tone === 'sand' && 'bg-wash text-ink/80 font-medium',
		tone === 'ink' && 'bg-ink text-sand',
		tone === 'good' && 'bg-success/10 text-success',
		tone === 'bad' && 'bg-destructive/10 text-destructive',
		tone === 'outline' && 'border-line text-ink hover:bg-sand h-[19px] border bg-white text-[11px]',
		className
	)}>
	{@render children()}
</svelte:element>
