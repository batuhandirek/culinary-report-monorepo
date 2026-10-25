import type { ImageResponseOptions } from '@ethercorps/sveltekit-og';

import bricolage800 from './og-fonts/bricolage-grotesque-latin-800-normal.woff?url';
import bricolageExt800 from './og-fonts/bricolage-grotesque-latin-ext-800-normal.woff?url';
import onest400 from './og-fonts/onest-latin-400-normal.woff?url';
import onest700 from './og-fonts/onest-latin-700-normal.woff?url';
import onestExt400 from './og-fonts/onest-latin-ext-400-normal.woff?url';
import onestExt700 from './og-fonts/onest-latin-ext-700-normal.woff?url';

import { read } from '$app/server';

type Fonts = NonNullable<ImageResponseOptions['fonts']>;

// The brand's faces for satori, which takes static .woff/.ttf only (no woff2, no variable
// axes): Bricolage Grotesque 800 for headlines and numbers, Onest 400/700 for the rest. A
// card names them in inline styles (`font-family: 'Bricolage Grotesque'`); latin-ext follows
// each latin file so satori falls back to it for the glyphs latin lacks.
const FILES: { url: string; name: string; weight: 400 | 700 | 800 }[] = [
	{ url: onest400, name: 'Onest', weight: 400 },
	{ url: onestExt400, name: 'Onest', weight: 400 },
	{ url: onest700, name: 'Onest', weight: 700 },
	{ url: onestExt700, name: 'Onest', weight: 700 },
	{ url: bricolage800, name: 'Bricolage Grotesque', weight: 800 },
	{ url: bricolageExt800, name: 'Bricolage Grotesque', weight: 800 }
];

let loaded: Promise<Fonts> | undefined;

/** Loaded once per process; a failed load is retried on the next card. */
export const ogFonts = (): Promise<Fonts> => {
	loaded ??= Promise.all(
		FILES.map(async ({ url, name, weight }) => ({
			name,
			weight,
			style: 'normal' as const,
			data: await read(url).arrayBuffer()
		}))
	).catch((e) => {
		loaded = undefined;
		throw e;
	});
	return loaded;
};
