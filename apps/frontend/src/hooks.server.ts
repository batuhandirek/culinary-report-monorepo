import type { HandleFetch } from '@sveltejs/kit/hooks';

import { PUBLIC_API_INTERNAL_URL } from '$app/env/public';

const internalApiOrigin = new URL(PUBLIC_API_INTERNAL_URL).origin;

export const handleFetch: HandleFetch = async ({ event, request, fetch }) => {
	const reqUrl = new URL(request.url);

	if (reqUrl.pathname.startsWith('/api')) {
		const cookies = event.request.headers.get('cookie');
		if (cookies) {
			request.headers.set('cookie', cookies);
		}

		const accessToken = event.cookies.get('accessToken');
		if (accessToken) {
			request.headers.set('authorization', `Bearer ${accessToken}`);
		}

		// We're bypassing Cloudflare, so the internal request loses the original
		// client context. Forward the headers the backend needs to identify the
		// real visitor (true IP, geo, UA) instead of seeing localhost/node.
		const incoming = event.request.headers;

		// Cloudflare-provided headers carry the *true* client info. cf-connecting-ip
		// is the real visitor IP; x-forwarded-for / x-real-ip only show CF's edge.
		const passthroughHeaders = [
			'cf-connecting-ip',
			'cf-ipcountry',
			'cf-ray',
			'x-forwarded-for',
			'x-forwarded-proto',
			'x-real-ip',
			'user-agent',
			'referer'
		];
		for (const header of passthroughHeaders) {
			const value = incoming.get(header);
			if (value) {
				request.headers.set(header, value);
			}
		}

		// Fallback: if CF didn't set cf-connecting-ip (e.g. local/dev or a direct
		// hit), use the adapter's resolved client address so the backend always
		// has *some* client IP.
		if (!incoming.get('cf-connecting-ip')) {
			const clientAddress = event.getClientAddress();
			if (clientAddress) {
				request.headers.set('cf-connecting-ip', clientAddress);
			}
		}

		// Custom headers set only by our SvelteKit server, so the backend can trust
		// them as "internal origin" (the public internal port must not be exposed)
		// and know which rendered page triggered the call.
		request.headers.set('x-culinary-report-source', 'sveltekit-ssr');
		request.headers.set('x-culinary-report-host', event.url.host);
		request.headers.set('x-culinary-report-path', event.url.pathname);

		const rerouted = `${internalApiOrigin}${reqUrl.pathname}${reqUrl.search}`;
		request = new Request(rerouted, request);
	}

	return fetch(request);
};
