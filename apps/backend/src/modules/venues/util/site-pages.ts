// A venue website's own pages beyond the home page: where a site without profile links on its
// home page keeps them. Pure functions, tested in `social/tests/own-account-finding.spec.ts`.

import { isPublicWebUrl } from 'src/shared/util/public-fetch.js';

import { registrableDomain } from './brands.js';
import { hostOf } from './web-mentions.js';

// Contact and legal pages, best first: German sites must publish an Impressum, and the contact
// page is where the rest put their profiles
const PAGE_KINDS: RegExp[] = [
	/kontakt|contact/i,
	/impressum|imprint|legal-notice/i,
	/about|ueber-uns|uber-uns|über-uns|über uns/i,
];

const attr = (tag: string, name: string): string | null => {
	const match = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i').exec(
		tag,
	);
	return match ? (match[1] ?? match[2] ?? match[3]).replace(/&amp;/g, '&').trim() : null;
};

/**
 * The site's contact, Impressum and about pages a page links to, by its link's address or
 * words, best kind first, at most `max`: on the page's own site (its registrable domain), never
 * the page itself, each once.
 */
export const contactPageUrls = (html: string, pageUrl: string, max = 2): string[] => {
	const page = new URL(pageUrl);
	const site = registrableDomain(hostOf(page.href) ?? page.hostname);
	const found: { url: string; kind: number; at: number }[] = [];
	for (const match of html.matchAll(/<a\s[^>]*>([\s\S]{0,200}?)<\/a\s*>/gi)) {
		const href = attr(match[0].slice(0, match[0].indexOf('>') + 1), 'href');
		if (!href || /^(mailto|tel|javascript):|^#/i.test(href)) continue;
		let url: URL;
		try {
			url = new URL(href, page);
		} catch {
			continue;
		}
		url.hash = '';
		if (!isPublicWebUrl(url) || url.href === page.href) continue;
		const host = hostOf(url.href);
		if (!host || registrableDomain(host) !== site) continue;
		const words = `${decodeURIComponent(url.pathname)} ${match[1].replace(/<[^>]*>/g, ' ')}`;
		const kind = PAGE_KINDS.findIndex(re => re.test(words));
		if (kind >= 0) found.push({ url: url.href, kind, at: found.length });
	}
	const ordered = found.sort((a, b) => a.kind - b.kind || a.at - b.at).map(f => f.url);
	return [...new Set(ordered)].slice(0, max);
};
