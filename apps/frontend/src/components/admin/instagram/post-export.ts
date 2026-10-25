import { zipSync } from 'fflate';
import { domToBlob } from 'modern-screenshot';

// Turns a rendered canvas into a PNG in the browser. modern-screenshot clones the node into
// an SVG foreignObject, so whatever the browser draws (grid, masks, rotations, the app's
// fonts) comes out as seen; it inlines the @font-face files the node uses.

export const canvasToPng = async (node: HTMLElement, width: number, height: number) => {
	await document.fonts.ready;
	await Promise.all(
		[...node.querySelectorAll('img')].map((img) => img.decode().catch(() => undefined))
	);
	const blob = await domToBlob(node, { width, height, scale: 1, type: 'image/png' });
	if (!blob) throw new Error('The canvas could not be drawn');
	return blob;
};

export const saveBlob = (blob: Blob, filename: string) => {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const zipFiles = async (files: { name: string; blob: Blob }[]) => {
	const entries: Record<string, Uint8Array> = {};
	for (const { name, blob } of files) entries[name] = new Uint8Array(await blob.arrayBuffer());
	// PNGs are already compressed: store them
	return new Blob([new Uint8Array(zipSync(entries, { level: 0 }))], { type: 'application/zip' });
};

/** The phone's share sheet takes files where the browser allows it: straight to Instagram. */
export const canShareFiles = () => {
	try {
		const probe = new File([''], 'probe.png', { type: 'image/png' });
		return typeof navigator !== 'undefined' && !!navigator.canShare?.({ files: [probe] });
	} catch {
		return false;
	}
};

/** A photo from disk as a JPEG data URL no wider or taller than `max`. */
export const readImageFile = (file: File, max = 1620): Promise<string> =>
	new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
			const canvas = document.createElement('canvas');
			canvas.width = Math.round(img.naturalWidth * scale);
			canvas.height = Math.round(img.naturalHeight * scale);
			canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
			URL.revokeObjectURL(url);
			resolve(canvas.toDataURL('image/jpeg', 0.9));
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Not an image the browser can open'));
		};
		img.src = url;
	});
