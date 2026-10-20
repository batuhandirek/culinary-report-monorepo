import { MediaTypeEnum } from '../constants/media-type.enum.constant.js';

export interface ImageOutputDto {
	width: number;
	height: number;
	aspectRatio: number;
	path: string;
	url: string;
	fileName: string;
}

// A slot that takes a photo or a short video (a listing's proof of working). For a VIDEO,
// `url` is the clip and `width` / `height` its frame size.
export interface MediaOutputDto extends ImageOutputDto {
	mediaType: MediaTypeEnum;
	// Seconds; videos only.
	duration?: number;
}
