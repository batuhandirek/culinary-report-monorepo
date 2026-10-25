<script lang="ts">
	// The wordmark until the logo is drawn (`brand`): "Munchwerk" in Bricolage 800, ink on an
	// acid block, or acid on ink (`ink`) on acid and light accent grounds. With a handle beside it.
	interface Props {
		handle?: string;
		ink?: boolean;
		size?: number;
		class?: string;
	}

	let { handle = '', ink = false, size = 44, class: className = '' }: Props = $props();
</script>

<div class={['flex items-center', className]} style={`gap: ${size * 0.5}px;`}>
	<span
		class={[
			'font-display rounded-[8px] leading-none font-extrabold whitespace-nowrap',
			ink ? 'bg-ink text-acid' : 'bg-acid text-ink'
		]}
		style={`font-size: ${size}px; padding: ${size * 0.26}px ${size * 0.3}px ${size * 0.3}px; letter-spacing: -0.03em;`}>
		Munchwerk
	</span>
	{#if handle}
		<span class="font-bold" style={`font-size: ${Math.max(32, size * 0.75)}px;`}>{handle}</span>
	{/if}
</div>
