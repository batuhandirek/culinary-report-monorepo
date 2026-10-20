<script lang="ts">
	import { ChevronRight } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	import type { HTMLAttributes } from 'svelte/elements';

	import Icon from '#ui/components/Icon.svelte';
	import { cn } from '#ui/lib/utils.js';

	/**
	 * A titled stretch of a page: the catalogue's ruled head (`section-rule` — orange pixel
	 * block, title, dashed rule) over its body. A count and a quiet note sit beside the
	 * title; the far end of the rule holds the "see all" link, or an `action` of your own.
	 * The head stays put when there is no link, so sibling sections line up.
	 */
	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
		title: string;
		/** `h2` unless this section sits inside another one. */
		level?: 2 | 3;
		/** How many things the section holds, in pixel figures beside the title. 0 hides it. */
		count?: number;
		/** A quieter note beside the title ("12 yazı"). */
		note?: string;
		/** Where the trailing link leads. */
		href?: string;
		linkText?: string;
		/** Trailing content of your own, instead of the link. */
		action?: Snippet;
		/** `lg` steps the title up from `lg:` — a landing page's sections. */
		size?: 'md' | 'lg';
		/** An id for the heading; the section is labelled by it. */
		headingId?: string;
		/** Lands on the `<section>`; `gap-*` here sets the space between head and body. */
		class?: string;
		children?: Snippet;
	}

	let {
		title,
		level = 2,
		count = undefined,
		note = undefined,
		href = undefined,
		linkText = 'Tümü',
		action = undefined,
		size = 'md',
		headingId = undefined,
		class: className = '',
		children,
		...restProps
	}: Props = $props();
</script>

<section
	aria-labelledby={headingId}
	class={cn('flex min-w-0 flex-col gap-3', className)}
	{...restProps}
>
	<div class="section-rule">
		<svelte:element
			this={`h${level}`}
			id={headingId}
			class={cn('type-title m-0 min-w-0 text-lg', size === 'lg' && 'lg:text-xl')}
		>
			{title}
		</svelte:element>
		{#if count}
			<span class="eyebrow text-beet">{count}</span>
		{/if}
		{#if note}
			<span class="font-term text-muted-foreground text-base leading-none">{note}</span>
		{/if}
		{#if action}
			<div class="-my-2 ml-auto flex shrink-0 items-center gap-2">
				{@render action()}
			</div>
		{:else if href}
			<!-- The pixel label is 8px tall; the padding is its touch target, and the negative
			     margin keeps it from making the head taller. -->
			<a
				{href}
				class="eyebrow text-beet hover:text-ink -my-4 inline-flex min-h-11 shrink-0 items-center gap-1 py-4 pl-4"
			>
				{linkText}
				<Icon icon={ChevronRight} size={10} strokeWidth={3} />
			</a>
		{/if}
	</div>
	{@render children?.()}
</section>
