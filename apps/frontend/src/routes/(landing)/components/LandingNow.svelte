<script lang="ts">
	import { onMount } from 'svelte';

	import { LANDING_CITY, type StoryLine } from './landing.js';

	// The ink strip under the hero: one fact at a time, every few seconds. The facts are the
	// edition's ticker lines; a post is credited by its @handle and linked.
	let { lines }: { lines: StoryLine[] } = $props();

	let at = $state(0);
	let paused = $state(false);
	const line = $derived(lines.length ? lines[at % lines.length] : null);

	onMount(() => {
		if (lines.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const timer = setInterval(() => {
			if (!paused) at = (at + 1) % lines.length;
		}, 4000);
		return () => clearInterval(timer);
	});
</script>

{#if line}
	<div
		role="region"
		class="lp-field-ink border-y-4 py-[18px]"
		style="border-color: var(--lp-brand-ink)"
		aria-label="Right now in {LANDING_CITY.name}"
		onmouseenter={() => (paused = true)}
		onmouseleave={() => (paused = false)}>
		<div class="lp-wrap flex flex-wrap items-center gap-x-6 gap-y-3 text-[17px] font-semibold" style="color: var(--lp-oat)">
			<span class="lp-stamp-line inline-flex flex-none items-center gap-2.5 text-[10px]" style="color: var(--lp-acid)">
				<span class="lp-live" aria-hidden="true"></span>Right now in {LANDING_CITY.name}
			</span>
			<span class="min-w-0 flex-[1_1_320px]" aria-live="polite">
				{line.line}
				{#if line.url && line.handle}
					<a href={line.url} target="_blank" rel="noopener" class="ml-1 whitespace-nowrap underline" style="color: var(--lp-lavender)">See @{line.handle}'s post</a>
				{/if}
			</span>
			{#if line.district}<span class="lp-tag lp-tag--green ml-auto text-xs">{line.district}</span>{/if}
		</div>
	</div>
{/if}
