<script lang="ts">
	import type { Snippet } from 'svelte';

	import type { HTMLAttributes } from 'svelte/elements';

	import { cn } from '#ui/lib/utils.js';

	/**
	 * The surface a block of a page sits on: the warm-white hairline card by default.
	 * A surface on sand needs a ground — this is that ground, with the head, padding and
	 * row dividers every page was writing out by hand.
	 */
	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
		as?: 'section' | 'div' | 'aside' | 'article';
		/** Heading inside the card. */
		title?: string;
		/** A quieter figure right after the title: a count ("Photos 4"). */
		note?: string | number;
		/** A quieter line under the title. */
		description?: string;
		/** `title` as a heading (default) or as the pixel label ("SATICININ NOTLARI"). */
		heading?: 'title' | 'eyebrow';
		/** Pixel label *above* the card, outside it — the caption over a menu group. */
		caption?: string;
		/** Trailing control in the head: a link, a button, a count. */
		actions?: Snippet;
		/**
		 * `paper` hairline card (default) · `tint` the darker paper for notes · `wash` a
		 * quiet well · `danger` for a problem block · `none` no ground, head and body only.
		 */
		tone?: 'paper' | 'tint' | 'wash' | 'danger' | 'none';
		padding?: 'none' | 'sm' | 'md';
		/**
		 * The denser card of a tool screen (the admin area): a 16px title centred on its
		 * actions, and `sm` padding unless `padding` says otherwise.
		 */
		dense?: boolean;
		/** The children are rows: no padding, a hairline between each (`ListRow`s). */
		rows?: boolean;
		/** Put the title in its own bar with a rule under it (sidebar cards). */
		bar?: boolean;
		/** The hard hairline offset that makes a card read as paper stuck on the sand. */
		sticker?: boolean;
		class?: string;
		children?: Snippet;
	}

	let {
		as = 'section',
		title,
		note,
		description,
		heading = 'title',
		caption,
		actions,
		tone = 'paper',
		padding: requestedPadding,
		dense = false,
		rows = false,
		bar = false,
		sticker = false,
		class: className = '',
		children,
		...restProps
	}: Props = $props();

	const TONE = {
		paper: 'bg-paper border-line border',
		tint: 'bg-tint',
		wash: 'bg-wash',
		danger: 'border-destructive/30 bg-destructive/5 border',
		none: ''
	};
	const PAD = { none: '', sm: 'p-4', md: 'p-5' };
	const GAP = { none: 'gap-3', sm: 'gap-3', md: 'gap-4' };

	const padding = $derived(requestedPadding ?? (dense ? 'sm' : 'md'));
	const hasNote = $derived(note !== undefined && note !== '');

	const hasHead = $derived(!!title || !!actions);
	// A head of its own (rule under it, body flush): a bar, or any head over rows.
	const splitHead = $derived(hasHead && (bar || rows));
	const padded = $derived(!rows && padding !== 'none');
</script>

{#snippet head()}
	<header
		class={cn(
			'flex min-w-0 justify-between gap-3',
			// A dense head is one line beside a small button: centre them on each other.
			dense && !description ? 'min-h-8 items-center' : 'items-start',
			splitHead && 'border-line border-b px-4 py-3'
		)}
	>
		<div class="flex min-w-0 flex-col gap-0.5">
			{#if title}
				{#if heading === 'eyebrow'}
					<h2 class="eyebrow text-beet m-0">{title}</h2>
				{:else}
					<h2
						class={cn(
							'type-title text-ink m-0',
							splitHead || dense ? 'text-base' : 'text-lg'
						)}
					>
						{title}
						{#if hasNote}
							<span
								class="text-muted-foreground ml-1 text-sm font-normal tabular-nums"
								>{note}</span
							>
						{/if}
					</h2>
				{/if}
			{/if}
			{#if description}
				<p class="text-muted-foreground m-0 text-sm">{description}</p>
			{/if}
		</div>
		{#if actions}
			<div class="flex shrink-0 items-center gap-2">
				{@render actions()}
			</div>
		{/if}
	</header>
{/snippet}

{#snippet surface(element: string, extra: Record<string, unknown>)}
	<svelte:element
		this={element}
		class={cn(
			'flex min-w-0 flex-col',
			tone !== 'none' && 'rounded-md',
			TONE[tone],
			sticker && 'shadow-sticker',
			// Rows and bars bring their own inner spacing; everything else is padded.
			splitHead || rows
				? 'overflow-hidden'
				: cn(tone !== 'none' && PAD[padding], GAP[padding]),
			className
		)}
		{...extra}
	>
		{#if hasHead}
			{@render head()}
		{/if}
		{#if rows}
			<div class="divide-line flex flex-col divide-y">
				{@render children?.()}
			</div>
		{:else if splitHead}
			<div class={cn('flex flex-col', padded && PAD[padding], GAP[padding])}>
				{@render children?.()}
			</div>
		{:else}
			{@render children?.()}
		{/if}
	</svelte:element>
{/snippet}

{#if caption}
	<svelte:element this={as} class="flex min-w-0 flex-col gap-2" {...restProps}>
		<h2 class="eyebrow text-muted-foreground m-0 px-1">{caption}</h2>
		{@render surface('div', {})}
	</svelte:element>
{:else}
	{@render surface(as, restProps)}
{/if}
