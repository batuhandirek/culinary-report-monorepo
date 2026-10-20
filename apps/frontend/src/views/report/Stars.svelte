<script lang="ts">
	// A star rating drawn in SVG: a ★ character falls back to whatever face the printing
	// machine has, and some have none.
	interface Props {
		value: number;
		size?: number;
	}

	let { value, size = 11 }: Props = $props();
</script>

<span
	class="inline-flex shrink-0 gap-px align-[-1px]"
	role="img"
	aria-label={`${value} of 5 stars`}>
	{#each [1, 2, 3, 4, 5] as i (i)}
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			class={i <= value ? 'text-ink' : 'text-line'}
			aria-hidden="true">
			<path
				fill="currentColor"
				d="M12 2.5l2.94 6.1 6.56.9-4.8 4.6 1.2 6.6L12 17.6l-5.9 3.1 1.2-6.6-4.8-4.6 6.56-.9z" />
		</svg>
	{/each}
</span>
