<script lang="ts">
	import { CloudUpload, Trash, X } from '@lucide/svelte';
	import { nanoid } from 'nanoid';

	import type { ImageInputProps } from './types';

	import ImagePreviewDialog from '#dialogs/ImagePreviewDialog.svelte';
	import { formatBytes, formatFileName } from '#lib/util.js';
	import Spinner from '#ui/components/Spinner.svelte';
	import { logFactory } from '#ui/lib/logger.js';
	import { notificationManager } from '#ui/lib/notification-manager.js';
	import { cn } from '#ui/lib/utils.js';
	import Label from '#ui/primitives-new/label/label.svelte';
	import Progress from '#ui/primitives-new/progress/progress.svelte';
	import IconButton from '#ui/wrapped/IconButton.svelte';

	// ===== Props & State =====
	let {
		images = $bindable([]),
		imageActions = undefined,
		maxImage = 100,
		id = nanoid(),
		galleryType = 'vertical',
		class: className = '',
		hideGallery = false,
		multiple = false,
		onImageRemoved = undefined,
		onImageAdded = undefined
	}: ImageInputProps = $props();

	const log = logFactory.create('ImageInput');

	let fileInput: HTMLInputElement | null = $state(null);
	let files: FileList | null = $state(null);
	let isProcessing = $state(false);
	// A file is being dragged over the zone: say "yes, here" before it is dropped.
	let dragging = $state(false);

	// ===== Constants =====
	const HEIC_EXTENSIONS = ['.heic', '.heif'];
	const HEIC_MIME_TYPES = ['image/heic', 'image/heif'];
	const ACCEPTED_FILE_TYPES = 'image/*';
	const JPEG_QUALITY = 0.8;

	// ===== Helper Functions =====
	function isHEICFile(file: File): boolean {
		const hasHEICMimeType = HEIC_MIME_TYPES.includes(file.type);
		const hasHEICExtension = HEIC_EXTENSIONS.some((ext) =>
			file.name.toLowerCase().endsWith(ext)
		);
		return hasHEICMimeType || hasHEICExtension;
	}

	async function convertHEICToJPEG(file: File): Promise<Blob> {
		const heic2any = (await import('heic2any')).default;
		const convertedBlob = (await heic2any({
			blob: file,
			toType: 'image/jpeg',
			quality: JPEG_QUALITY
		})) as Blob;

		return convertedBlob;
	}

	function getConvertedFileName(originalName: string): string {
		return originalName.replace(/\.(heic|heif)$/i, '.jpg');
	}

	function createJPEGFile(blob: Blob, originalName: string): File {
		const fileName = getConvertedFileName(originalName);
		return new File([blob], fileName, { type: 'image/jpeg' });
	}

	function readFileAsDataURL(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (e) => resolve(e.target!.result as string);
			reader.onerror = () => reject(new Error('Error reading file'));
			reader.readAsDataURL(file);
		});
	}

	function addImageToGallery(imageData: string, fileName: string, size: number): void {
		if (images.find((f) => f.fileName === fileName)) {
			notificationManager.addNotification({
				warning: true,
				title: 'Bu fotoğraf zaten mevcut',
				text: 'Bu fotoğrafı zaten ekledin'
			});
			return;
		}
		const img = { image: imageData, fileName, size };
		images = [...images, img];
		onImageAdded?.(img);
	}

	function removeImageAtIndex(index: number): void {
		const removing = images[index];
		images.splice(index, 1);
		images = [...images];
		if (fileInput) {
			fileInput.value = '';
		}
		onImageRemoved?.(removing);
	}

	function resetFileInput(): void {
		if (fileInput) {
			fileInput.value = '';
		}
	}

	// ===== Main Upload Handler =====
	async function processFile(file: File): Promise<void> {
		let processedFile = file;
		let finalFileName = file.name;

		// Convert HEIC files to JPEG
		if (isHEICFile(file)) {
			const convertedBlob = await convertHEICToJPEG(file);
			processedFile = createJPEGFile(convertedBlob, file.name);
			finalFileName = getConvertedFileName(file.name);
		}

		const imageData = await readFileAsDataURL(processedFile);
		addImageToGallery(imageData, finalFileName, processedFile.size);
	}

	// Takes everything that was picked or dropped, in order, up to the room that is left.
	async function handleFileChange(): Promise<void> {
		const picked = Array.from(files ?? []);
		if (picked.length === 0) return;

		const room = Math.max(maxImage - images.length, 0);
		isProcessing = true;
		let failed = 0;

		try {
			for (const file of picked.slice(0, room)) {
				try {
					await processFile(file);
				} catch (error) {
					failed += 1;
					log.error('Error processing image:', error);
				}
			}
		} finally {
			isProcessing = false;
			resetFileInput();
		}

		if (failed > 0) {
			notificationManager.addNotification({
				warning: true,
				title: failed === 1 ? 'Bir fotoğraf eklenemedi' : `${failed} fotoğraf eklenemedi`,
				text: 'Dosya bozuk olabilir; başka bir fotoğraf dene.'
			});
		}
		if (picked.length > room) {
			notificationManager.addNotification({
				warning: true,
				title: `En fazla ${maxImage} fotoğraf ekleyebilirsin`
			});
		}
	}

	const canUploadMore = $derived(images.length < maxImage);
	const showProgress = $derived(images.length > 0 && maxImage > 1);
</script>

<!-- ===== Upload Area ===== -->
<div class="flex flex-col gap-2">
	{#if canUploadMore}
		<!-- A dashed outline with no fill, so the ground reads straight through it. The
		     file input is stretched over the whole zone: a tap, a click, a drop and the
		     keyboard all land on the real control. -->
		<div
			class={cn(
				'f f1 flex-col cc border-line relative min-h-[120px] rounded-xl border border-dashed px-4 py-4 transition-colors',
				'hover:border-ink/40 has-[:focus-visible]:border-ink has-[:focus-visible]:ring-ring/50 has-[:focus-visible]:ring-[3px]',
				dragging && 'border-ink bg-wash/50',
				isProcessing && 'opacity-70',
				className
			)}
			aria-busy={isProcessing}
		>
			<div class="f fw fh flex-col cc muted text-center">
				<div class="bg-paper border-line text-ink mb-2 rounded-xl border p-2">
					{#if isProcessing}
						<Spinner size={16} label="" />
					{:else}
						<CloudUpload class="size-4" />
					{/if}
				</div>
				<div class="mb-1 text-sm">
					{#if isProcessing}
						<span class="text-ink font-semibold">İşleniyor…</span>
					{:else}
						<span class="text-ink font-semibold underline underline-offset-4">
							Fotoğraf seç
						</span>
						<!-- Nothing to drag on a phone. -->
						<span class="pointer-coarse:hidden">ya da buraya sürükle</span>
					{/if}
				</div>
				<div class="text-xs">JPG, PNG ya da HEIC</div>
			</div>
			<input
				type="file"
				{id}
				class="absolute fw fh opacity-0 left-0 top-0 z-50 cursor-pointer disabled:cursor-progress"
				accept={ACCEPTED_FILE_TYPES}
				multiple={multiple && maxImage > 1}
				aria-label="Fotoğraf seç"
				bind:this={fileInput}
				bind:files
				disabled={isProcessing}
				ondragenter={() => (dragging = true)}
				ondragleave={() => (dragging = false)}
				ondrop={() => (dragging = false)}
				onchange={handleFileChange}
			/>
		</div>
	{/if}

	<!-- ===== Vertical Gallery ===== -->
	{#if !hideGallery && galleryType === 'vertical'}
		{#each images as img, index (`${img.image}-${index}`)}
			<div class="pop bg-card relative flex w-full gap-4 rounded-xl p-4">
				<img
					class="pop-sm [--pop-d:0px] size-12 h-auto overflow-hidden rounded-lg object-contain"
					alt=""
					src={img.image}
				/>
				<div class="flex-1 h-full flex flex-col">
					<span class="text-sm">
						{formatFileName(img.fileName, 30)}
					</span>
					<span class="text-sm muted">
						{formatBytes(img.size)}
					</span>
				</div>
				<div class="absolute right-4 top-4 z-10">
					<IconButton
						icon={Trash}
						sm
						variant="ghost"
						label="Fotoğrafı kaldır"
						onclick={() => removeImageAtIndex(index)}
					/>
				</div>
			</div>
		{/each}
	{/if}

	<!-- ===== Horizontal Gallery ===== -->
	{#if !hideGallery && galleryType === 'horizontal' && showProgress}
		<div class="flex items-center">
			<Label>Eklenen fotoğraflar</Label>
			<div class="flex-1"></div>
			<span class="type-meta text-muted-foreground text-sm">{images.length}/{maxImage}</span>
		</div>
		<div>
			<Progress value={images.length} max={maxImage} />
		</div>
		<div class="flex flex-wrap w-full gap-2 py-2">
			{#each images as img, index (img.image)}
				<ImagePreviewDialog image={img.image}>
					<div class="relative h-[100px]">
						<img
							class="pop-sm [--pop-d:0px] h-full w-auto overflow-hidden rounded-lg object-contain"
							alt="Yüklenen fotoğraf"
							src={img.image}
						/>
						<div class="absolute flex gap-1 items-center -right-2 -top-2">
							{#if imageActions}
								{@render imageActions(img)}
							{/if}
							<IconButton
								icon={X}
								class="bg-destructive text-destructive-foreground"
								sm
								variant="ghost"
								label="Fotoğrafı kaldır"
								onclick={(e: Event) => {
									e.preventDefault();
									e.stopPropagation();
									removeImageAtIndex(index);
								}}
							/>
						</div>
					</div>
				</ImagePreviewDialog>
			{/each}
		</div>
	{/if}
</div>
