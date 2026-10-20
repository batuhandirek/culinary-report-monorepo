<script lang="ts">
	import 'croppr/dist/croppr.min.css';

	import { onMount } from 'svelte';

	import ImageInput from '#ui/components/image-input/image-input.svelte';
	import * as Dialog from '#ui/primitives-new/dialog/index.js';
	import Button from '#ui/wrapped/Button.svelte';

	// Upload → crop → emit a cropped data URL plus the uncropped source. `aspectRatio` (optional)
	// forces the crop shape. When `source` is given the upload step is skipped and that image is
	// loaded straight into the cropper (used to re-crop an already-uploaded image).
	interface Props {
		active?: boolean;
		title?: string;
		description?: string | undefined;
		aspectRatio?: number | undefined;
		source?: string | undefined;
		onSubmit?: (croppedImage: string, original: string) => void;
		onClose?: () => void;
		children?: import('svelte').Snippet;
	}

	let {
		active = $bindable(false),
		title = 'Upload an image',
		description = undefined,
		aspectRatio = undefined,
		source = undefined,
		onSubmit: onSubmitCallback,
		onClose: onCloseCallback,
		children
	}: Props = $props();

	let uploadedImage: string | undefined = $state(undefined);
	let Croppr: any = $state();
	let croppr: any = $state();

	let imageEl: HTMLImageElement | null = $state(null);
	$effect(() => {
		if (imageEl && Croppr && !croppr) {
			croppr = new Croppr(imageEl, { aspectRatio });
		}
	});

	// On open, seed the cropper from `source` (re-crop) or leave it empty (fresh upload). Nothing
	// is emitted until the user confirms, so cancelling always leaves the caller's image untouched.
	$effect(() => {
		if (active) uploadedImage = source;
	});

	onMount(async () => {
		const module = await import('croppr');
		Croppr = module.default;
	});

	function acceptImage() {
		const { x, y, width, height } = croppr.getValue();
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;

		const ctx = canvas.getContext('2d')!;
		ctx.drawImage(imageEl!, x, y, width, height, 0, 0, width, height);
		onSubmitCallback?.(canvas.toDataURL('image/png'), uploadedImage!);
		onClose();
	}

	function resetCrop() {
		uploadedImage = undefined;
		croppr = undefined;
	}

	function onClose() {
		resetCrop();
		active = false;
		onCloseCallback?.();
	}
</script>

<Dialog.Root
	bind:open={active}
	onOpenChange={(isOpen) => {
		if (!isOpen) onClose();
	}}>
	{#if children}
		<Dialog.Trigger>
			{@render children?.()}
		</Dialog.Trigger>
	{/if}

	<Dialog.Content class="sm:max-w-[620px] max-h-[80vh] overflow-scroll">
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			{#if description}
				<Dialog.Description>{description}</Dialog.Description>
			{/if}
		</Dialog.Header>

		{#if uploadedImage}
			<div class="pop-sm [--pop-d:0px] overflow-hidden rounded-lg">
				<!-- svelte-ignore a11y_img_redundant_alt -->
				<!-- crossorigin so re-cropping a hosted (CDN) image loads in CORS mode and the crop
				     canvas stays exportable (toDataURL) instead of being tainted. -->
				<img
					src={uploadedImage}
					alt="Image to crop"
					crossorigin="anonymous"
					bind:this={imageEl} />
			</div>
		{:else}
			<ImageInput
				id="crop-source"
				hideGallery
				onImageAdded={(img) => {
					uploadedImage = img.image;
				}} />
		{/if}

		<Dialog.Footer>
			<!-- Cancel always discards and closes — nothing done in the dialog is applied. -->
			<Button onclick={onClose} variant="outline">İptal</Button>
			<Button onclick={acceptImage} disabled={!uploadedImage}>Yükle</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
