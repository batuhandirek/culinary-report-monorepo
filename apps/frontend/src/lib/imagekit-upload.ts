/**
 * Client-side photo upload straight to ImageKit, with a single-use V2 token the backend
 * signed (the backend then registers the returned `fileId`; it never takes a URL from us).
 */

const IMAGEKIT_V2_UPLOAD_URL = 'https://upload.imagekit.io/api/v2/files/upload';

// Long edge after downscaling. Listing photos are viewed on phones; a 12MP original is
// ~10x the bytes over mobile data for no visible gain.
const MAX_EDGE = 2048;
const JPEG_QUALITY = 0.85;

export interface ImageKitUploadToken {
	token: string;
	fileName: string;
	folder: string;
	expiresAt: string | Date;
}

/**
 * Downscales and re-encodes a photo as JPEG. Re-encoding through a canvas also drops the
 * EXIF block — GPS included — so a seller's home location never ships with the listing.
 * `createImageBitmap` applies the EXIF orientation before it is lost.
 */
export const prepareImage = async (source: Blob): Promise<Blob> => {
	const bitmap = await createImageBitmap(source);
	const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
	const width = Math.round(bitmap.width * scale);
	const height = Math.round(bitmap.height * scale);
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height);
	bitmap.close();
	return new Promise((resolve, reject) =>
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error('Image encoding failed'))),
			'image/jpeg',
			JPEG_QUALITY
		)
	);
};

export const base64ToBlob = async (base64: string, mime = 'image/jpeg'): Promise<Blob> => {
	const dataUrl = base64.startsWith('data:') ? base64 : `data:${mime};base64,${base64}`;
	return (await fetch(dataUrl)).blob();
};

/** Uploads one file; `fileName` and `folder` must be sent exactly as signed. Returns the fileId. */
export const uploadToImageKit = async (blob: Blob, token: ImageKitUploadToken): Promise<string> => {
	const body = new FormData();
	body.append('file', blob, token.fileName);
	body.append('fileName', token.fileName);
	body.append('folder', token.folder);
	body.append('token', token.token);
	const res = await fetch(IMAGEKIT_V2_UPLOAD_URL, { method: 'POST', body });
	if (!res.ok) {
		throw new Error(`ImageKit upload failed (${res.status}): ${await res.text()}`);
	}
	const json = (await res.json()) as { fileId?: string };
	if (!json.fileId) throw new Error('ImageKit upload returned no fileId');
	return json.fileId;
};

// A proof-of-working clip. Mirrors the server's caps (`ImageService`), which delete a clip
// over either one after it has already been uploaded — so they are checked before.
export const VIDEO_MAX_DURATION_SECONDS = 60;
export const VIDEO_MAX_FILE_SIZE = 100 * 1024 * 1024;

/** The extension an upload token for this clip is asked with: it names the file by its type. */
export const videoExtension = (source: Blob) =>
	source.type.includes('quicktime') ? 'mov' : source.type.includes('webm') ? 'webm' : 'mp4';

/** A video's length in seconds, read from its metadata; `null` when the browser can't. */
export const readVideoDuration = (source: Blob): Promise<number | null> =>
	new Promise((resolve) => {
		const video = document.createElement('video');
		const url = URL.createObjectURL(source);
		const done = (duration: number | null) => {
			URL.revokeObjectURL(url);
			resolve(duration);
		};
		video.preload = 'metadata';
		video.onloadedmetadata = () =>
			done(Number.isFinite(video.duration) ? video.duration : null);
		video.onerror = () => done(null);
		video.src = url;
	});
