<script lang="ts">
	import { ChevronRight } from '@lucide/svelte';

	import { type Snippet, untrack } from 'svelte';

	// One block of the Explore page that folds away: its title, one line on what it does, controls
	// on the right while open. Whether it is open is remembered per browser (a convenience; a
	// private window or blocked storage just starts from `defaultOpen`).
	interface Props {
		/** The key it is remembered under */
		id: string;
		title: string;
		/** What it shows and what clicking in it does, one line */
		note?: string;
		defaultOpen?: boolean;
		/** Open now; bind it to open the section from outside */
		open?: boolean;
		/** Right of the title while open: a picker */
		actions?: Snippet;
		children: Snippet;
	}

	let { id, title, note, defaultOpen = true, open = $bindable(), actions, children }: Props = $props();

	const key = $derived(`explore:open:${id}`);
	const stored = (): boolean | undefined => {
		try {
			const value = localStorage.getItem(key);
			return value === null ? undefined : value === '1';
		} catch {
			return undefined;
		}
	};
	// Seeded once: a later `defaultOpen` never closes what the user opened
	if (open === undefined) open = untrack(() => stored() ?? defaultOpen);
	const toggle = () => {
		open = !open;
		try {
			localStorage.setItem(key, open ? '1' : '0');
		} catch {
			// remembered for this page view only
		}
	};
</script>

<section id={`explore-${id}`} class="bg-paper border-line scroll-mt-4 flex min-w-0 flex-col rounded-md border">
	<header class="flex min-h-12 items-center gap-3 px-3 py-1.5">
		<button type="button" class="flex min-h-9 min-w-0 flex-1 items-center gap-2 text-left" aria-expanded={open} onclick={toggle}>
			<ChevronRight class={['text-muted-foreground size-4 shrink-0 transition-transform', open && 'rotate-90']} />
			<h2 class="text-ink m-0 shrink-0 text-base font-semibold">{title}</h2>
			{#if note}<span class="text-muted-foreground min-w-0 truncate text-xs">{note}</span>{/if}
		</button>
		{#if actions && open}
			<div class="flex shrink-0 items-center gap-2">{@render actions()}</div>
		{/if}
	</header>
	{#if open}
		<div class="border-line border-t p-4">{@render children()}</div>
	{/if}
</section>
