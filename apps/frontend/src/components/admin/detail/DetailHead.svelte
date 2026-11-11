<script lang="ts">
	import { Store } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	// The head of a dense detail page (a brand, a branch, a creator): a square with its website's
	// icon (a shop glyph without one), or a person's round initial; the name with its pills, one
	// line under it saying what it is and where it stands, and the page's keys on the right.
	interface Props {
		title: string;
		favicon?: { url: string };
		/** A person: a round ink avatar with this letter instead of the square */
		initial?: string;
		/** Draws the name instead of the plain title (an inline rename) */
		heading?: Snippet;
		pills?: Snippet;
		sub?: Snippet;
		actions?: Snippet;
	}

	let { title, favicon, initial, heading, pills, sub, actions }: Props = $props();

	let textHeight = $state(0);
</script>

<header class="flex flex-wrap items-center gap-x-4 gap-y-2.5 pb-2.5">
	<div class="flex min-w-0 flex-[1_1_520px] items-center gap-2.5">
		<!-- As tall as the name and the line under it, and square: measured, since a square
		     stretched by CSS alone takes its width from the row before its height is known -->
		<span
			class={[
				'flex shrink-0 items-center justify-center',
				initial ? 'bg-ink text-acid rounded-full text-[15px] font-bold' : 'bg-wash rounded-[9px]'
			]}
			style:width="{textHeight || 34}px"
			style:height="{textHeight || 34}px">
			{#if initial}
				{initial}
			{:else if favicon}
				<img src={favicon.url} alt="" class="size-[55%] rounded-sm object-contain" />
			{:else}
				<Store class="size-1/2" strokeWidth={1.8} />
			{/if}
		</span>
		<div class="min-w-0" bind:clientHeight={textHeight}>
			<div class="flex flex-wrap items-center gap-2">
				{#if heading}
					{@render heading()}
				{:else}
					<h1 class="m-0 text-[19px] leading-tight font-[650]">{title}</h1>
				{/if}
				{@render pills?.()}
			</div>
			{#if sub}
				<div class="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">{@render sub()}</div>
			{/if}
		</div>
	</div>
	{#if actions}
		<div class="flex flex-wrap items-center gap-[5px]">{@render actions()}</div>
	{/if}
</header>
