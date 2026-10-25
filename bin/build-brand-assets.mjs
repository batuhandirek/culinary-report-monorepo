#!/usr/bin/env node
/**
 * Renders the brand's raster files from the logo SVGs in `apps/frontend/static/brand/`
 * (the drawn wordmark from the Claude Design handoff; brand skill). Run after a logo change:
 *
 *     node bin/build-brand-assets.mjs
 *
 * Writes, under `apps/frontend/static/`:
 *   favicon/favicon.ico            16, 32, 48 from favicon/favicon.svg (the wordmark's M)
 *   favicon/apple-touch-icon.png   180, the stacked logo on ink (iOS rounds it)
 *   favicon/icon-192.png, -512.png the manifest's icons (safe for "maskable": the logo sits
 *                                  inside the 80% circle)
 *   brand/og-default.png           1200×630, the share image of pages without their own
 *   brand/email-logo.png           the ink wordmark at 2× for the emails' header (mail clients
 *                                  don't draw SVG)
 *   brand/social/avatar-*.png      1080×1080 profile pictures for @munchwerk and
 *                                  @munchwerk.berlin (Instagram crops them to a circle)
 *
 * Headless Chrome through the backend's puppeteer; the fonts come from `static/fonts`.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const STATIC = join(root, 'apps/frontend/static');
const puppeteer = createRequire(join(root, 'apps/backend/package.json'))('puppeteer');

const INK = '#1f1724';
const OAT = '#f2ede3';
const ACID = '#c6f135';
const GRAPE = '#6a2bea';

const svg = (path) => readFileSync(join(STATIC, path), 'utf8');
// The brand's bite (`BRAND_BITE`: eight tooth marks in a 200 box), as a mask layer.
const BITE_D = readFileSync(join(root, 'apps/frontend/src/constants/BRAND_LOGO.ts'), 'utf8').match(/BRAND_BITE = \{[^}]*d: '([^']+)'/)[1];
const BITE = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><path d='${BITE_D}'/></svg>`)}")`;
// Inlined as data URLs: a page set from a string may not load file:// fonts.
const fontUrl = (path) => `data:font/woff2;base64,${readFileSync(join(STATIC, 'fonts', path)).toString('base64')}`;
const FONTS = `
	@font-face { font-family: 'Bricolage Grotesque'; font-weight: 200 800; src: url('${fontUrl('bricolage-grotesque/bricolage-grotesque-latin-opsz-normal.woff2')}') format('woff2'); }
	@font-face { font-family: 'Onest'; font-weight: 100 900; src: url('${fontUrl('onest/onest-latin-wght-normal.woff2')}') format('woff2'); }
	@font-face { font-family: 'Press Start 2P'; src: url('${fontUrl('press-start-2p/press-start-2p-v16-latin_latin-ext-regular.woff2')}') format('woff2'); }
	* { box-sizing: border-box; margin: 0; }
	html, body { background: transparent; }
	svg { display: block; }
`;

const page = (body, css = '') => `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}${css}</style></head><body>${body}</body></html>`;

// An SVG file filling a square of `size`.
const square = (file, size) => page(svg(file).replace('<svg ', `<svg width="${size}" height="${size}" `));

const OG = page(
	`<div class="card">
		<div class="logo">${svg('brand/munchwerk-wordmark-ink.svg')}</div>
		<div class="head">What the city's munching.</div>
		<div class="sub">The places, creators and dishes Berlin posts about, counted every month.</div>
		<div class="foot"><span class="sticker">HEAT CHECK · BERLIN</span><span class="url">munchwerk.com</span></div>
		<div class="field"></div>
	</div>`,
	`.card { position: relative; width: 1200px; height: 630px; background: ${OAT}; padding: 64px 72px; overflow: hidden; font-family: Onest; color: ${INK}; }
	.logo svg { height: 44px; width: auto; }
	.head { font-family: 'Bricolage Grotesque'; font-weight: 800; font-size: 104px; line-height: 0.92; letter-spacing: -0.035em; margin-top: 64px; max-width: 760px; }
	.sub { font-size: 30px; line-height: 1.35; color: #5e556a; margin-top: 28px; max-width: 700px; }
	.foot { position: absolute; left: 72px; bottom: 60px; display: flex; align-items: center; gap: 28px; }
	.sticker { font-family: 'Press Start 2P'; font-size: 18px; letter-spacing: 0.06em; background: ${ACID}; border: 4px solid ${INK}; border-radius: 12px; padding: 12px 18px 10px; transform: rotate(-6deg); box-shadow: 6px 6px 0 ${INK}; }
	.url { font-weight: 700; font-size: 28px; color: ${GRAPE}; }
	.field { position: absolute; right: 0; top: 150px; width: 290px; height: 480px; background: ${GRAPE};
		mask-image: linear-gradient(#000 0 0), ${BITE}; mask-size: 100% 100%, 160px 160px; mask-position: 0 0, right -50px top -50px;
		mask-repeat: no-repeat; mask-composite: exclude; }`
);

const avatar = (city) =>
	page(
		`<div class="tile">
			<div class="logo">${svg('brand/munchwerk-stacked-acid.svg')}</div>
			${city ? `<div class="city">${city}</div>` : ''}
		</div>`,
		`.tile { width: 1080px; height: 1080px; background: ${INK}; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 56px; }
		.logo svg { width: ${city ? 600 : 660}px; height: auto; }
		.city { font-family: 'Press Start 2P'; font-size: 48px; letter-spacing: 0.08em; color: ${INK}; background: ${ACID}; padding: 22px 30px 18px; border-radius: 12px; transform: rotate(-6deg); }`
	);

const EMAIL_LOGO = page(`<div class="logo">${svg('brand/munchwerk-wordmark-ink.svg')}</div>`, `.logo { width: 320px; } .logo svg { width: 320px; height: auto; }`);

// A PNG .ico: the ICONDIR header, one entry per image, then the PNG bytes.
const ico = (pngs) => {
	const header = Buffer.alloc(6 + 16 * pngs.length);
	header.writeUInt16LE(0, 0);
	header.writeUInt16LE(1, 2);
	header.writeUInt16LE(pngs.length, 4);
	let offset = header.length;
	pngs.forEach(({ size, data }, i) => {
		const e = 6 + 16 * i;
		header.writeUInt8(size >= 256 ? 0 : size, e);
		header.writeUInt8(size >= 256 ? 0 : size, e + 1);
		header.writeUInt16LE(1, e + 4);
		header.writeUInt16LE(32, e + 6);
		header.writeUInt32LE(data.length, e + 8);
		header.writeUInt32LE(offset, e + 12);
		offset += data.length;
	});
	return Buffer.concat([header, ...pngs.map((p) => p.data)]);
};

const browser = await puppeteer.launch({ headless: true });
const render = async (html, width, height, { selector, transparent = false } = {}) => {
	const tab = await browser.newPage();
	await tab.setViewport({ width, height, deviceScaleFactor: 1 });
	await tab.setContent(html, { waitUntil: 'load' });
	await tab.evaluate(() => document.fonts.ready);
	const target = selector ? await tab.$(selector) : tab;
	const data = await target.screenshot({ type: 'png', omitBackground: transparent, ...(selector ? {} : { clip: { x: 0, y: 0, width, height } }) });
	await tab.close();
	return Buffer.from(data);
};
const out = (path, data) => {
	mkdirSync(dirname(join(STATIC, path)), { recursive: true });
	writeFileSync(join(STATIC, path), data);
	console.log(path, data.length);
};

const favicons = [];
for (const size of [16, 32, 48]) favicons.push({ size, data: await render(square('favicon/favicon.svg', size), size, size, { transparent: true }) });
out('favicon/favicon.ico', ico(favicons));
out('favicon/apple-touch-icon.png', await render(square('brand/munchwerk-icon.svg', 180), 180, 180));
out('favicon/icon-192.png', await render(square('brand/munchwerk-icon.svg', 192), 192, 192));
out('favicon/icon-512.png', await render(square('brand/munchwerk-icon.svg', 512), 512, 512));
out('brand/og-default.png', await render(OG, 1200, 630));
out('brand/email-logo.png', await render(EMAIL_LOGO, 400, 200, { selector: '.logo', transparent: true }));
out('brand/social/avatar-munchwerk.png', await render(avatar(), 1080, 1080));
out('brand/social/avatar-munchwerk-berlin.png', await render(avatar('BERLIN'), 1080, 1080));

await browser.close();
