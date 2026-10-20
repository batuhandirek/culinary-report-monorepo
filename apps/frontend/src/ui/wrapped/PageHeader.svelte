<script lang="ts">
	import { ChevronLeft } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	import Icon from '#ui/components/Icon.svelte';
	import { cn } from '#ui/lib/utils.js';

	/**
	 * The head of a page: the `<h1>`, one supporting sentence, and the page's actions at
	 * the far end. On touch the app bar (`MobileMenu`) already shows the title and the
	 * back button, so most pages pass `desktopOnly` and keep both.
	 *
	 * `desktopOnly` hides everything below `lg` except the `<h1>` itself, which stays for
	 * screen readers: the bar's title is not a heading, and a page needs exactly one.
	 */
	interface Props {
		title: string;
		/** One sentence under the title. */
		description?: string;
		/** Pixel label over the title: the section this page belongs to. */
		eyebrow?: string;
		/** A way back above the title: a link… */
		backHref?: string;
		/** …or a handler. */
		onBack?: () => void;
		backLabel?: string;
		/** Sits next to the title: a status badge, a count. */
		badge?: Snippet;
		/** The page's actions; the primary one last. */
		actions?: Snippet;
		/** Below `lg`, where the app bar carries the title: nothing visible, the `<h1>` kept. */
		desktopOnly?: boolean;
		class?: string;
		/** Under the header row: tabs, a filter row. */
		children?: Snippet;
	}

	let {
		title,
		description,
		eyebrow,
		backHref,
		onBack,
		backLabel = 'Geri',
		badge,
		actions,
		desktopOnly = false,
		class: className = '',
		children
	}: Props = $props();

	const backClass =
		'text-muted-foreground hover:text-ink focus-visible:ring-ring -ml-1.5 inline-flex min-h-9 w-fit cursor-pointer items-center gap-1 rounded-full pr-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2';

	// Below `lg` a desktop-only header takes no room: its boxes dissolve (`contents`), what
	// they hold is hidden, and only the heading is left, visually hidden.
	const through = $derived(desktopOnly ? 'max-lg:contents' : '');
	const gone = $derived(desktopOnly ? 'max-lg:hidden' : '');
	// A snippet's output can't take a class: a wrapper that is no box on desktop.
	const slot = $derived(desktopOnly ? 'max-lg:hidden lg:contents' : 'contents');
</script>

<header
	class={cn(
		'min-w-0 flex-col gap-4',
		desktopOnly ? 'max-lg:contents lg:flex' : 'flex',
		className
	)}
>
	<div class={cn('flex min-w-0 flex-col gap-1', through)}>
		{#if backHref}
			<a href={backHref} class={cn(backClass, gone)}>
				<Icon icon={ChevronLeft} size={16} />
				{backLabel}
			</a>
		{:else if onBack}
			<button type="button" onclick={onBack} class={cn(backClass, gone)}>
				<Icon icon={ChevronLeft} size={16} />
				{backLabel}
			</button>
		{/if}

		<div
			class={cn('flex min-w-0 flex-wrap items-end justify-between gap-x-6 gap-y-3', through)}
		>
			<div class={cn('flex min-w-0 flex-col gap-1', through)}>
				{#if eyebrow}
					<span class={cn('eyebrow text-beet', gone)}>{eyebrow}</span>
				{/if}
				<div class={cn('flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1', through)}>
					<h1
						class={cn(
							'type-title text-ink m-0 min-w-0 break-words text-2xl',
							desktopOnly && 'max-lg:sr-only'
						)}
					>
						{title}
					</h1>
					{#if badge}
						<span class={slot}>{@render badge()}</span>
					{/if}
				</div>
				{#if description}
					<p
						class={cn(
							'text-muted-foreground m-0 max-w-[68ch] text-pretty text-sm',
							gone
						)}
					>
						{description}
					</p>
				{/if}
			</div>
			{#if actions}
				<div class={cn('flex shrink-0 flex-wrap items-center gap-2', gone)}>
					{@render actions()}
				</div>
			{/if}
		</div>
	</div>

	{#if children}
		<div class={slot}>{@render children()}</div>
	{/if}
</header>
