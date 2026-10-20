import { Injectable } from '@nestjs/common';

import { isPublicWebUrl } from '../util/favicon.js';

/** A fetched page or file, after redirects. */
export interface FetchedResource {
	/** The URL that answered, after redirects */
	url: string;
	contentType: string | null;
	body: Buffer;
}

const USER_AGENT =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
// Per request, redirects included: a slow site costs the run this much at most
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 5;
// The page's head is near its start; a bigger icon than this is not an icon
export const MAX_PAGE_BYTES = 512 * 1024;
export const MAX_ICON_BYTES = 1024 * 1024;

/**
 * Plain GETs of venue websites for `VenueFaviconService`, which is its only caller; tests
 * mock it. Redirects are followed by hand so every hop is checked with `isPublicWebUrl`, and
 * a body is read up to its cap, never further.
 */
@Injectable()
export class FaviconFetchService {
	/**
	 * The resource at `url`, or null when it answers anything but 200 or breaks a rule. A body
	 * past `maxBytes` is null too, or cut there with `truncate` (a page's head is near its start).
	 */
	async get(
		url: string,
		{ maxBytes, truncate = false }: { maxBytes: number; truncate?: boolean },
	): Promise<FetchedResource | null> {
		const signal = AbortSignal.timeout(TIMEOUT_MS);
		let current = new URL(url);
		for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
			if (!isPublicWebUrl(current)) return null;
			const res = await fetch(current, {
				redirect: 'manual',
				signal,
				headers: { 'User-Agent': USER_AGENT, Accept: '*/*' },
			});
			const location = res.headers.get('location');
			if (res.status >= 300 && res.status < 400 && location) {
				await res.body?.cancel();
				current = new URL(location, current);
				continue;
			}
			if (res.status !== 200) {
				await res.body?.cancel();
				return null;
			}
			const length = Number(res.headers.get('content-length'));
			if (!truncate && length > maxBytes) {
				await res.body?.cancel();
				return null;
			}
			const body = await readCapped(res, maxBytes, truncate);
			return (
				body && { url: current.href, contentType: res.headers.get('content-type'), body }
			);
		}
		return null;
	}
}

/** The body, or once it passes `maxBytes` null (its first `maxBytes` with `truncate`). */
const readCapped = async (
	res: Response,
	maxBytes: number,
	truncate: boolean,
): Promise<Buffer | null> => {
	if (!res.body) return Buffer.alloc(0);
	const chunks: Buffer[] = [];
	let size = 0;
	// Leaving the loop early cancels the stream, so the rest is never downloaded
	for await (const chunk of res.body) {
		chunks.push(Buffer.from(chunk));
		size += chunk.length;
		if (size > maxBytes) return truncate ? Buffer.concat(chunks).subarray(0, maxBytes) : null;
	}
	return Buffer.concat(chunks);
};
