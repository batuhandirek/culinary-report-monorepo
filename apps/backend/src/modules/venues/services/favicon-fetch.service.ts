import { Injectable } from '@nestjs/common';

import { fetchPublic, type FetchedResource } from 'src/shared/util/public-fetch.js';

export type { FetchedResource };

// The page's head is near its start; a bigger icon than this is not an icon
export const MAX_PAGE_BYTES = 512 * 1024;
export const MAX_ICON_BYTES = 1024 * 1024;

/**
 * Plain GETs of venue websites for `VenueFaviconService`, which is its only caller; tests
 * mock it. The rules (every redirect hop public, bodies capped) are `fetchPublic`'s.
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
		return fetchPublic(url, { maxBytes, truncate });
	}
}
