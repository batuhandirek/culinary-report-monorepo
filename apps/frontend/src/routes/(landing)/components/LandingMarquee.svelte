<script lang="ts">
	// The dishes the city named most in the edition's window, in giant type, twice for the loop.
	let { dishes }: { dishes: string[] } = $props();
</script>

{#if dishes.length}
	<div class="lp-marquee border-b-4 py-8 md:py-10" style="border-color: var(--lp-rule)" aria-label="What the city named most this month: {dishes.join(', ')}">
		{#each [0, 1] as copy (copy)}
			<div class="lp-marquee__track" aria-hidden="true">
				{#each dishes as dish, i (dish)}
					<span class={['lp-dish', i % 2 === 1 && 'lp-dish--out']}>{dish}</span>
				{/each}
			</div>
		{/each}
	</div>
{/if}
