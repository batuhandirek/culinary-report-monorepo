import type { Snippet } from 'svelte';

export interface ImageFile {
	image: string;
	fileName: string;
	size: number;
}

export interface ImageInputProps {
	imageActions?: Snippet<[ImageFile]>;
	onImageAdded?: (img: ImageFile) => void;
	onImageRemoved?: (img: ImageFile) => void;
	images?: ImageFile[];
	maxImage?: number;
	/** Let the file picker take several photos at once (up to the room left under `maxImage`). */
	multiple?: boolean;
	id?: string;
	galleryType?: 'vertical' | 'horizontal';
	hideGallery?: boolean;
	class?: string;
}
