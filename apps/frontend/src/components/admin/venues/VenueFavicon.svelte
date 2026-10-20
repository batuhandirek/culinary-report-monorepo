<script lang="ts">
	// A venue's website icon (`Venue.favicon`), or an empty square of the same size while
	// none is found, so names line up in a list.
	let { favicon, size = 16 }: { favicon?: { url: string }; size?: number } = $props();
</script>

{#if favicon}
	<img
		src={favicon.url}
		alt=""
		width={size}
		height={size}
		loading="lazy"
		class="shrink-0 rounded-sm object-contain"
		style:width="{size}px"
		style:height="{size}px" />
{:else}
	<span
		aria-hidden="true"
		class="bg-muted inline-block shrink-0 rounded-sm"
		style:width="{size}px"
		style:height="{size}px"></span>
{/if}
