// A venue website's icon: which websites have one of their own, which links in a page are
// icons, and what format a fetched file is. Pure functions.

import { hostOf, hostOnDomain } from './web-mentions.js';

/** An image ImageKit stores and a browser shows as an icon. */
export type FaviconFormat = 'png' | 'jpg' | 'gif' | 'webp' | 'ico' | 'svg';

// Websites that are a profile or listing on someone else's platform: their icon is the
// platform's, not the venue's
const PLATFORM_DOMAINS = [
	'google.',
	'goo.gl',
	'business.site',
	'instagram.com',
	'facebook.com',
	'fb.com',
	'tiktok.com',
	'x.com',
	'twitter.com',
	'youtube.com',
	'linktr.ee',
	'linkin.bio',
	'wa.me',
	'tripadvisor.',
	'yelp.',
	'opentable.',
	'thefork.',
	'resy.com',
	'lieferando.',
	'wolt.com',
	'deliveroo.',
	'ubereats.',
	'speisekarte.',
];

/**
 * The website to take an icon from: an http(s) URL on a public host name that is not a
 * platform profile; null otherwise. IP literals and local names are refused, since the
 * fetch runs on our server.
 */
export const faviconSite = (website: string | null | undefined): URL | null => {
	if (!website) return null;
	let url: URL;
	try {
		url = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`);
	} catch {
		return null;
	}
	if (!isPublicWebUrl(url)) return null;
	const host = hostOf(url.href);
	if (!host || PLATFORM_DOMAINS.some(domain => hostOnDomain(host, domain))) return null;
	return url;
};

/** http(s), default ports, a dotted host name that is neither an IP literal nor a local name. */
export const isPublicWebUrl = (url: URL): boolean => {
	if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
	if (url.port && url.port !== '80' && url.port !== '443') return false;
	if (url.username || url.password) return false;
	const host = url.hostname.toLowerCase();
	if (!host.includes('.') || host.startsWith('[') || /^[\d.]+$/.test(host)) return false;
	return !/(^|\.)(localhost|local|internal|lan|home|arpa)$/.test(host);
};

/** One icon a page declares. */
interface IconLink {
	url: string;
	/** Its largest declared side; 0 when unknown */
	size: number;
	/** `any` sizes or an SVG: scales to every size */
	scalable: boolean;
	apple: boolean;
}

const ICON_RELS = new Set([
	'icon',
	'shortcut icon',
	'apple-touch-icon',
	'apple-touch-icon-precomposed',
]);

// An apple-touch-icon without `sizes` is 180 px by Apple's convention
const APPLE_DEFAULT_SIZE = 180;

const attr = (tag: string, name: string): string | null => {
	const match = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i').exec(
		tag,
	);
	if (!match) return null;
	return (match[1] ?? match[2] ?? match[3]).replace(/&amp;/g, '&').trim();
};

/**
 * The icon URLs a page links to, best first: largest declared size, an SVG or `sizes="any"`
 * after the sized ones of 64 px and up, ICO last among equals; resolved against `pageUrl`
 * (or the page's `<base href>`), each once. Data URIs and non-http links are skipped.
 */
export const faviconLinks = (html: string, pageUrl: string): string[] => {
	const head = html.slice(
		0,
		html.search(/<\/head\s*>/i) >= 0 ? html.search(/<\/head\s*>/i) : html.length,
	);
	const baseHref = /<base\s[^>]*>/i.exec(head)?.[0];
	let base: URL;
	try {
		base = new URL((baseHref && attr(baseHref, 'href')) || pageUrl, pageUrl);
	} catch {
		base = new URL(pageUrl);
	}

	const links: IconLink[] = [];
	for (const [tag] of head.matchAll(/<link\s[^>]*>/gi)) {
		const rel = attr(tag, 'rel')?.toLowerCase().replace(/\s+/g, ' ');
		const href = attr(tag, 'href');
		if (!rel || !href || !ICON_RELS.has(rel)) continue;
		let url: URL;
		try {
			url = new URL(href, base);
		} catch {
			continue;
		}
		if (url.protocol !== 'https:' && url.protocol !== 'http:') continue;
		const sizes = attr(tag, 'sizes')?.toLowerCase() ?? '';
		const apple = rel.startsWith('apple-touch-icon');
		const declared = Math.max(
			0,
			...[...sizes.matchAll(/(\d+)x(\d+)/g)].map(m => Math.max(+m[1], +m[2])),
		);
		const svg =
			/\.svg(\?|#|$)/i.test(url.pathname) ||
			attr(tag, 'type')?.toLowerCase() === 'image/svg+xml';
		links.push({
			url: url.href,
			size: declared || (apple ? APPLE_DEFAULT_SIZE : 0),
			scalable: svg || sizes.split(/\s+/).includes('any'),
			apple,
		});
	}

	// A scalable icon ranks as 64 px: below a real 180 px PNG, above a 16 px or unsized one
	const rank = (link: IconLink) => (link.scalable ? Math.max(link.size, 64) : link.size);
	const ico = (link: IconLink) => /\.ico(\?|#|$)/i.test(link.url);
	const sorted = [...links].sort(
		(a, b) =>
			rank(b) - rank(a) ||
			Number(ico(a)) - Number(ico(b)) ||
			Number(b.apple) - Number(a.apple),
	);
	return [...new Set(sorted.map(link => link.url))];
};

/** Where a site without icon links keeps its icon by convention. */
export const defaultFaviconUrl = (site: URL): string => new URL('/favicon.ico', site.origin).href;

/** The image format of a fetched file by its first bytes (an SVG by its text); null for anything else. */
export const faviconFormat = (bytes: Buffer): FaviconFormat | null => {
	if (bytes.length < 4) return null;
	if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
		return 'png';
	if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
	if (bytes.subarray(0, 4).toString('latin1') === 'GIF8') return 'gif';
	if (
		bytes.subarray(0, 4).toString('latin1') === 'RIFF' &&
		bytes.subarray(8, 12).toString('latin1') === 'WEBP'
	)
		return 'webp';
	// ICONDIR: reserved 0, type 1 (icon), at least one image
	if (
		bytes.readUInt16LE(0) === 0 &&
		bytes.readUInt16LE(2) === 1 &&
		bytes.length >= 6 &&
		bytes.readUInt16LE(4) > 0
	)
		return 'ico';
	const text = bytes.subarray(0, 1024).toString('utf8').replace(/^﻿/, '').trimStart();
	if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!doctype svg[^>]*>\s*)?<svg[\s>]/i.test(text))
		return 'svg';
	return null;
};

/**
 * Google's own copy of a site's icon: the last resort for a site that blocks us or is down.
 * It answers 404 (with a generic globe) for a site it has no icon for.
 */
export const googleFaviconUrl = (site: URL): string =>
	`https://www.google.com/s2/favicons?${new URLSearchParams({ domain: site.hostname, sz: '128' })}`;
