<script lang="ts">
	import { ImageOff, X } from '@lucide/svelte';
	import { untrack } from 'svelte';

	import ImagePreviewDialog from '#dialogs/ImagePreviewDialog.svelte';
	import Icon from '#ui/components/Icon.svelte';
	import { imageKitUrl } from '#ui/lib/image-kit.js';
	import { cn } from '#ui/lib/utils.js';
	import type { ButtonProps } from '#ui/primitives-new/button/index.js';
	import IconButton from '#ui/wrapped/IconButton.svelte';

	/**
	 * A photo that holds its box while it loads: a wash well with a blurred preview under
	 * it, the sharp image fading in over that, and an icon instead of the browser's broken
	 * glyph when the file is gone. Give it `width`/`height` or `aspectRatio` so the layout
	 * never waits on the download.
	 */
	interface Props {
		src: string;
		alt: string;
		width?: number;
		height?: number;
		aspectRatio?: number;
		withPreview?: boolean;
		withClose?: boolean;
		onClose?: ButtonProps['onclick'];
		class?: string;
		objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
		noBlur?: boolean;
		/** Above-the-fold photos (a cover, the first slide) load eagerly; the rest wait. */
		eager?: boolean;
		/**
		 * File widths to offer as a `srcset` (ImageKit resizes each), for a photo whose box
		 * is fluid rather than `width`/`height` pixels. Pair with `sizes`.
		 */
		widths?: number[];
		/** The `sizes` attribute for `widths`: how wide the photo is laid out per breakpoint. */
		sizes?: string;
	}

	let {
		src,
		alt,
		width = undefined,
		height = undefined,
		aspectRatio = undefined,
		withPreview = false,
		withClose = false,
		noBlur = false,
		eager = false,
		widths = undefined,
		sizes = undefined,
		onClose,
		class: className = '',
		objectFit = 'cover'
	}: Props = $props();

	let loaded = $state(false);
	let failed = $state(false);
	let preloadTriggered = false;
	let mainEl = $state<HTMLImageElement>();

	const preloadFullImage = () => {
		if (!withPreview || preloadTriggered) return;
		preloadTriggered = true;

		// Preload the full-size original image
		const img = new Image();
		img.src = src;
	};

	// Only ImageKit understands the transform; a data URL or a foreign host is used as is.
	const transformed = (url: string, transformation: string) =>
		url.includes('ik.imagekit.io') && transformation ? imageKitUrl(url, transformation) : url;

	const isRemote = $derived(src.includes('ik.imagekit.io'));

	// Blur placeholder: tiny, low quality, blurred server-side.
	const blurUrl = $derived(transformed(src, 'w-20,q-10,bl-10'));

	// A fluid photo: the browser picks the file that fits its box and the screen's density.
	const srcset = $derived(
		isRemote && widths?.length
			? widths.map((w) => `${imageKitUrl(src, `w-${w}`)} ${w}w`).join(', ')
			: undefined
	);

	// The main image at twice the laid-out size, for dense screens. With `widths` it is
	// only the fallback for a browser that ignores `srcset`: the largest file offered.
	const mainUrl = $derived.by(() => {
		const transforms: string[] = [];
		if (width) transforms.push(`w-${Math.round(width * 2)}`);
		if (height) transforms.push(`h-${Math.round(height * 2)}`);
		if (!transforms.length && widths?.length) transforms.push(`w-${Math.max(...widths)}`);
		return transformed(src, transforms.join(','));
	});

	const sizeStyle = $derived(
		[width && `width: ${width}px`, height && `height: ${height}px`].filter(Boolean).join('; ')
	);
	const containerStyle = $derived(
		[sizeStyle, aspectRatio && `aspect-ratio: ${aspectRatio}`].filter(Boolean).join('; ')
	);

	// A new source starts over; and an image that was already in the cache (or arrived
	// before hydration) never fires `load` for us, so ask it directly. Only `src` is
	// tracked: a failed image unmounts `mainEl`, and re-running on that would clear
	// `failed` and request the missing file again, forever.
	$effect(() => {
		void src;
		untrack(() => {
			failed = false;
			loaded = !!mainEl?.complete && mainEl.naturalWidth > 0;
		});
	});
</script>

{#snippet images()}
	<div class="relative">
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class={cn(
				'image-container items-center justify-center',
				// The well shows until the photo covers it. A caller that turns the blur off
				// (the dark preview dialog) is painting its own ground.
				(failed || (!noBlur && !loaded)) && 'bg-wash',
				className
			)}
			style={containerStyle}
			onmouseenter={preloadFullImage}>
			{#if failed}
				<div
					class="text-muted-foreground grid size-full min-h-10 min-w-10 place-items-center"
					role="img"
					aria-label={alt || 'Fotoğraf yüklenemedi'}>
					<Icon icon={ImageOff} size={20} class="opacity-60" />
				</div>
			{:else}
				{#if !noBlur && isRemote && !loaded}
					<img src={blurUrl} alt="" class="image-blur" aria-hidden="true" style={sizeStyle} />
				{/if}
				<img
					bind:this={mainEl}
					{srcset}
					sizes={srcset ? sizes : undefined}
					src={mainUrl}
					{alt}
					loading={eager ? 'eager' : 'lazy'}
					decoding="async"
					draggable="false"
					class={cn('image-main h-full w-full', className)}
					class:loaded
					style="{sizeStyle}; object-fit: {objectFit}"
					onload={() => {
						loaded = true;
					}}
					onerror={() => {
						failed = true;
					}} />
			{/if}
		</div>
		{#if withClose}
			<IconButton
				icon={X}
				class="absolute -right-2 -top-2 z-[3]"
				sm
				variant="secondary"
				circle
				label="Kaldır"
				onclick={onClose} />
		{/if}
	</div>
{/snippet}
{#if withPreview && !failed}
	<ImagePreviewDialog image={src} blurredImage={blurUrl}>
		{@render images()}
	</ImagePreviewDialog>
{:else}
	{@render images()}
{/if}

<style>
	.image-container {
		position: relative;
		overflow: hidden;
		display: flex;
		width: 100%;
		height: 100%;
	}

	.image-blur,
	.image-main {
		width: 100%;
		height: 100%;
		display: block;
	}

	.image-blur {
		position: absolute;
		top: 0;
		left: 0;
		filter: blur(20px);
		transform: scale(1.1);
		z-index: 1;
	}

	.image-main {
		position: relative;
		z-index: 2;
		opacity: 0;
		transition: opacity 0.3s ease-in-out;
	}

	.image-main.loaded {
		opacity: 1;
	}

	@media (prefers-reduced-motion: reduce) {
		.image-main {
			transition: none;
		}
	}
</style>
