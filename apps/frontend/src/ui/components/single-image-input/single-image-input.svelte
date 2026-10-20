<script lang="ts">
	import { Crop, ImagePlus, Trash } from '@lucide/svelte';

	import ImageCropDialog from './image-crop-dialog.svelte';

	import { formatBytes } from '#lib/util.js';
	import Button from '#ui/wrapped/Button.svelte';
	import IconButton from '#ui/wrapped/IconButton.svelte';

	// Single-image counterpart to `image-input` (which is multi): upload always goes through a
	// crop step, with an optional forced `aspectRatio`. `value` is one image — a data URL for a
	// freshly cropped upload, or an existing hosted URL passed in by the caller.
	let {
		value = $bindable(''),
		aspectRatio = undefined,
		placeholder = 'Upload an image',
		onValueChange
	}: {
		value?: string;
		aspectRatio?: number;
		placeholder?: string;
		onValueChange?: (value: string) => void;
	} = $props();

	let cropOpen = $state(false);
	// The uncropped source, kept so the crop can be re-adjusted. Empty for images we didn't upload
	// this session (e.g. an existing hosted cover) — re-crop then falls back to `value` itself.
	let original = $state('');

	const setValue = (next: string) => {
		value = next;
		onValueChange?.(next);
	};

	// With an image present, re-open the cropper on its original; empty → fresh-upload flow.
	const cropSource = $derived(value ? original || value : undefined);

	const onCrop = (cropped: string, uncropped: string) => {
		original = uncropped;
		setValue(cropped);
	};

	const clear = () => {
		original = '';
		setValue('');
	};

	const isDataUrl = $derived(value.startsWith('data:'));

	// Fresh crops are data URLs with no real name → synthesize one from the mime type; hosted
	// images keep their URL basename so the row reads like a file entry either way.
	const fileName = $derived.by(() => {
		if (!value) return '';
		if (isDataUrl) {
			const ext = value.slice(5, value.indexOf(';')).split('/')[1] || 'png';
			return `cover-image.${ext}`;
		}
		try {
			const name = new URL(value, 'http://_').pathname.split('/').pop();
			return name ? decodeURIComponent(name) : 'cover-image';
		} catch {
			return 'cover-image';
		}
	});

	// Byte size is only knowable for data URLs (base64 → bytes); hosted URLs show no size.
	const byteSize = $derived.by(() => {
		if (!isDataUrl) return 0;
		const base64 = value.slice(value.indexOf(',') + 1);
		const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
		return Math.floor((base64.length * 3) / 4) - padding;
	});
</script>

<div class="flex flex-col gap-2">
	{#if value}
		<!-- Compact file-row preview (mirrors the vertical gallery in image-input) rather than a
		     full-bleed image. `aspectRatio` follows croppr's convention (height/width); CSS
		     `aspect-ratio` is width/height, so the thumbnail uses its inverse. -->
		<div class="pop bg-card flex w-full items-center gap-3 rounded-xl p-3">
			<!-- crossorigin matches the crop dialog's img so both share one CORS-enabled cache
			     entry; otherwise a non-CORS cached copy here would taint the re-crop canvas. -->
			<img
				src={value}
				alt="Selected"
				crossorigin="anonymous"
				class="pop-sm [--pop-d:0px] h-12 shrink-0 rounded-lg object-cover"
				style={aspectRatio ? `aspect-ratio:${1 / aspectRatio}` : 'aspect-ratio:1'}
			/>
			<div class="flex-1 min-w-0 flex flex-col">
				<span class="text-sm truncate">{fileName}</span>
				{#if byteSize > 0}
					<span class="text-sm muted">{formatBytes(byteSize)}</span>
				{/if}
			</div>
			<IconButton
				icon={Crop}
				sm
				variant="ghost"
				label="Recrop image"
				onclick={() => (cropOpen = true)}
			/>
			<IconButton icon={Trash} sm variant="ghost" label="Remove image" onclick={clear} />
		</div>
	{:else}
		<Button variant="outline" icon={ImagePlus} onclick={() => (cropOpen = true)}>
			{placeholder}
		</Button>
	{/if}

	<ImageCropDialog
		bind:active={cropOpen}
		{aspectRatio}
		source={cropSource}
		title={cropSource ? 'Recrop image' : 'Upload an image'}
		onSubmit={onCrop}
	/>
</div>
