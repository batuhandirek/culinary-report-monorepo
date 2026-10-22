// Plain GETs of public websites (venue icons, blog feeds and articles): every redirect hop is
// checked with `isPublicWebUrl`, a body is read up to its cap and never further, and a slow
// site costs the caller `TIMEOUT_MS` at most.

/** A fetched page or file, after redirects. */
export interface FetchedResource {
	/** The URL that answered, after redirects */
	url: string;
	contentType: string | null;
	body: Buffer;
}

const USER_AGENT =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
// Per request, redirects included
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 5;

/** http(s), default ports, a dotted host name that is neither an IP literal nor a local name. */
export const isPublicWebUrl = (url: URL): boolean => {
	if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
	if (url.port && url.port !== '80' && url.port !== '443') return false;
	if (url.username || url.password) return false;
	const host = url.hostname.toLowerCase();
	if (!host.includes('.') || host.startsWith('[') || /^[\d.]+$/.test(host)) return false;
	return !/(^|\.)(localhost|local|internal|lan|home|arpa)$/.test(host);
};

/**
 * The resource at `url`, or null when it answers anything but 200 or breaks a rule. A body
 * past `maxBytes` is null too, or cut there with `truncate` (a page's head is near its start).
 */
export const fetchPublic = async (
	url: string,
	{
		maxBytes,
		truncate = false,
		accept = '*/*',
		userAgent = USER_AGENT,
	}: { maxBytes: number; truncate?: boolean; accept?: string; userAgent?: string },
): Promise<FetchedResource | null> => {
	const signal = AbortSignal.timeout(TIMEOUT_MS);
	let current = new URL(url);
	for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
		if (!isPublicWebUrl(current)) return null;
		const res = await fetch(current, {
			redirect: 'manual',
			signal,
			headers: { 'User-Agent': userAgent, Accept: accept },
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
		return body && { url: current.href, contentType: res.headers.get('content-type'), body };
	}
	return null;
};

/** The body, or once it passes `maxBytes` null (its first `maxBytes` with `truncate`). */
const readCapped = async (res: Response, maxBytes: number, truncate: boolean): Promise<Buffer | null> => {
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
