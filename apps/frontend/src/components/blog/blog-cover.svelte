<script lang="ts">
	import { ImageIcon } from '@lucide/svelte';

	import type { BlogEntryCoverImageOutputDto } from 'client/src/Api';

	import Icon from '#ui/components/Icon.svelte';
	import Image from '#ui/components/Image.svelte';

	// Cover with a graceful placeholder. Covers are cropped to a fixed 1200×630 on upload,
	// so the display ratio comes straight from the uploaded Image entity's `aspectRatio`
	// (width/height) — no per-placement hard-coding. Placeholders (no image yet) fall back
	// to the same cover ratio so empty and populated covers occupy an identical box.
	// Fixed-size thumbnails (callers passing `size-*`) naturally override the ratio, since
	// an explicit width+height wins over `aspect-ratio` in CSS.
	const DEFAULT_COVER_ASPECT_RATIO = 1200 / 630;

	// The files a cover is offered in: a row thumbnail, a card and the article column, each
	// at 1x and 2x. `sizes` says which box this placement is, so a 104px thumbnail does not
	// download the 1200px original.
	const COVER_WIDTHS = [240, 480, 800, 1200];

	let {
		image,
		alt,
		class: className = '',
		iconSize = 32,
		sizes = '100vw',
		eager = false
	}: {
		image?: BlogEntryCoverImageOutputDto | null;
		/** `''` where the headline beside it already names the post (rows, cards). */
		alt: string;
		class?: string;
		iconSize?: number;
		/** How wide this placement lays the cover out, as an `<img sizes>` value. */
		sizes?: string;
		/** The cover the page opens on loads at once; the rest wait for the scroll. */
		eager?: boolean;
	} = $props();

	let ratio = $derived(image?.aspectRatio || DEFAULT_COVER_ASPECT_RATIO);
</script>

<!-- `isolate`: the photo fades in on its own z-index, which must not climb over a sticker
     or a badge the caller lays on the cover. -->
<div class={['bg-wash isolate overflow-hidden', className]} style={`aspect-ratio:${ratio}`}>
	{#if image?.url}
		<Image src={image.url} {alt} widths={COVER_WIDTHS} {sizes} {eager} class="h-full w-full" />
	{:else}
		<div class="text-muted-foreground grid h-full w-full place-items-center">
			<Icon icon={ImageIcon} size={iconSize} strokeWidth={1.4} />
		</div>
	{/if}
</div>
