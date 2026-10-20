<script lang="ts">
	import type { Snippet } from 'svelte';

	import { cn } from '#ui/lib/utils.js';

	/**
	 * The phone's bottom action bar: the price and the buy button on a listing, the pay
	 * button at checkout, "Kaydet" on a long form. Pinned to the bottom edge above the
	 * home indicator (it covers the tab bar — a page with one action has no use for
	 * both), and it reserves its own height so the page never ends underneath it.
	 */
	interface Props {
		/**
		 * From `lg` up: `hidden` when the desktop layout has the action elsewhere (a side
		 * rail), `inline` to let the same buttons sit in the flow at the end of the page.
		 */
		desktop?: 'hidden' | 'inline';
		/** Reserve the bar's height at the end of the page. */
		spacer?: boolean;
		class?: string;
		children: Snippet;
	}

	let { desktop = 'hidden', spacer = true, class: className = '', children }: Props = $props();

	let height = $state(0);
</script>

{#if spacer}
	<div class="shrink-0 lg:hidden" style={`height: ${height}px`} aria-hidden="true"></div>
{/if}
<div
	bind:offsetHeight={height}
	class={cn(
		'bg-paper border-line fixed inset-x-0 bottom-0 z-31 flex items-center gap-3 border-t px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]',
		desktop === 'hidden'
			? 'lg:hidden'
			: 'lg:static lg:z-auto lg:justify-end lg:border-t-0 lg:bg-transparent lg:p-0',
		className
	)}>
	{@render children()}
</div>
