<script lang="ts">
	import ImageInput from '#ui/components/image-input/image-input.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import ResponsiveModal from '#ui/wrapped/ResponsiveModal.svelte';

	interface Props {
		active?: boolean;
		disabled?: boolean;
		title?: string;
		description?: string | undefined;
		images?: { image: string; fileName: string; size: number }[];
		onSubmit?: (i: typeof images) => void;
		onClose?: () => void;
		maxImage?: number;
		/** The control that opens the dialog. */
		children?: import('svelte').Snippet;
	}

	let {
		active = $bindable(false),
		disabled = false,
		title = 'Fotoğraf ekle',
		description = undefined,
		images = $bindable([]),
		onSubmit = () => {},
		onClose: onCloseCallback,
		maxImage = 100,
		children
	}: Props = $props();

	// Closing without "Ekle" drops what was picked; "Ekle" hands it over first.
	let submitted = false;
	const onOpenChange = (open: boolean) => {
		if (open) {
			submitted = false;
			return;
		}
		if (!submitted) images = [];
		onCloseCallback?.();
	};

	const submit = () => {
		submitted = true;
		onSubmit([...images]);
		active = false;
	};
</script>

<ResponsiveModal
	bind:open={active}
	{title}
	description={description ?? (maxImage < 100 ? `En fazla ${maxImage} fotoğraf.` : '')}
	size="lg"
	trigger={disabled ? undefined : children}
	{onOpenChange}>
	<ImageInput id="UploadImagesDialog" bind:images {maxImage} multiple />

	<div class="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
		<Button variant="ghost" onclick={() => (active = false)}>Vazgeç</Button>
		<Button disabled={images.length === 0} onclick={submit}>
			{images.length > 1 ? `${images.length} fotoğrafı ekle` : 'Ekle'}
		</Button>
	</div>
</ResponsiveModal>

{#if disabled && children}
	<!-- A disabled trigger still has to be on screen, just not open anything. -->
	<span class="pointer-events-none opacity-50" aria-disabled="true">{@render children()}</span>
{/if}
