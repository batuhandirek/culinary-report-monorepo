// Food blogs read through their feeds: finding the feed, reading RSS and Atom items, an
// article's text out of its HTML. Pure functions, tested in `social/tests/blog-feed.spec.ts`.

import { createHash } from 'node:crypto';

import type { AnyNode, Document, Element } from 'domhandler';
import { findAll, findOne, getAttributeValue, getChildren, isTag, isText, removeElement, textContent } from 'domutils';
import { parseDocument } from 'htmlparser2';

/** One article a feed lists. */
export interface FeedItem {
	url: string;
	title: string;
	/** Null when the item gives no readable date */
	publishedAt: Date | null;
	/** The item's HTML: the full article (`content:encoded`, Atom `content`) or its excerpt */
	html: string;
}

export interface ParsedFeed {
	/** The blog's name, as the feed gives it */
	title: string | null;
	items: FeedItem[];
}

// Where a site without a `<link rel="alternate">` keeps its feed, under the source's path
// (WordPress answers `<section>/feed/` for a category, so a section URL gives that section's)
const FEED_PATHS = ['feed/', 'feed', 'rss', 'rss.xml', 'feed.xml', 'atom.xml', 'index.xml'];

const FEED_TYPES = new Set(['application/rss+xml', 'application/atom+xml', 'application/rdf+xml']);

// Never part of an article's text
const JUNK_TAGS = new Set([
	'script', 'style', 'noscript', 'template', 'svg', 'iframe', 'form', 'button', 'nav', 'header', 'footer',
	'aside', 'select', 'input', 'textarea', 'video', 'audio', 'picture', 'img',
]);

// Text inside these starts on a line of its own
const BLOCK_TAGS = new Set([
	'p', 'div', 'section', 'article', 'main', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'ul', 'ol', 'br', 'tr',
	'td', 'th', 'table', 'blockquote', 'figcaption', 'figure', 'dd', 'dt', 'dl', 'pre', 'address', 'hr',
]);

const name = (el: Element): string => el.name.toLowerCase();

/** The text of the first child element of `el` named one of `names` (namespaced names included). */
const childText = (el: Element, ...names: string[]): string | null => {
	for (const wanted of names) {
		const child = getChildren(el).find(c => isTag(c) && name(c) === wanted) as Element | undefined;
		if (child) {
			const text = textContent(child).trim();
			if (text) return text;
		}
	}
	return null;
};

const parseDate = (value: string | null): Date | null => {
	if (!value) return null;
	const date = new Date(value.trim());
	return Number.isNaN(date.getTime()) ? null : date;
};

const absolute = (href: string | null | undefined, base: string): string | null => {
	if (!href?.trim()) return null;
	try {
		const url = new URL(href.trim(), base);
		return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
	} catch {
		return null;
	}
};

/** Whether a body is an RSS, RDF or Atom document. */
export const isFeed = (body: string): boolean => /<(rss|feed|rdf:RDF)[\s>]/i.test(body.trimStart().slice(0, 2000));

// Control characters XML never allows (tip Berlin's feed held a 0x08): dropped before parsing
const cleanXml = (body: string): string => body.trimStart().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

/** The longer of two texts: some feeds put the whole article in `description` and none in `content:encoded`. */
const longer = (a: string | null, b: string | null): string | null => ((a?.length ?? 0) >= (b?.length ?? 0) ? a : b);

/**
 * An RSS 2.0, RSS 1.0 (RDF) or Atom document's title and items, links made absolute against
 * the feed's URL; null when the body is no feed. Items without a link are left out.
 */
export const parseFeed = (body: string, feedUrl: string): ParsedFeed | null => {
	if (!isFeed(body)) return null;
	const doc = parseDocument(cleanXml(body), { xmlMode: true });
	const root = findOne(el => ['rss', 'feed', 'rdf:rdf'].includes(name(el)), doc.children, true);
	if (!root) return null;
	const atom = name(root) === 'feed';
	const channel = atom ? root : findOne(el => name(el) === 'channel', root.children, true);
	const title = channel ? childText(channel, 'title') : null;
	const items: FeedItem[] = [];
	for (const el of findAll(e => name(e) === (atom ? 'entry' : 'item'), root.children)) {
		let link: string | null;
		if (atom) {
			const links = getChildren(el).filter(c => isTag(c) && name(c) === 'link') as Element[];
			const alternate =
				links.find(l => (getAttributeValue(l, 'rel') ?? 'alternate') === 'alternate') ?? links[0];
			link = absolute(alternate && getAttributeValue(alternate, 'href'), feedUrl);
		} else {
			const guid = getChildren(el).find(c => isTag(c) && name(c) === 'guid') as Element | undefined;
			const permalink =
				guid && getAttributeValue(guid, 'ispermalink') !== 'false' && getAttributeValue(guid, 'isPermaLink') !== 'false' ?
					textContent(guid)
				:	null;
			link = absolute(childText(el, 'link') ?? getAttributeValue(el, 'rdf:about') ?? permalink, feedUrl);
		}
		if (!link) continue;
		items.push({
			url: link,
			title: decodeTitle(childText(el, 'title') ?? ''),
			publishedAt: parseDate(
				atom ? childText(el, 'published', 'updated') : childText(el, 'pubdate', 'dc:date', 'published', 'updated'),
			),
			html:
				(atom ?
					longer(childText(el, 'content'), childText(el, 'summary'))
				:	longer(childText(el, 'content:encoded'), childText(el, 'description'))) ?? '',
		});
	}
	return { title: title ? decodeTitle(title) : null, items };
};

// A title may hold escaped HTML ("Tom &amp; Jerry" double escaped, or `<em>`): its plain text
const decodeTitle = (title: string): string => (/[<&]/.test(title) ? htmlToText(title) : title).replace(/\s+/g, ' ').trim();

/**
 * The feeds a page announces (`<link rel="alternate" type="application/rss+xml">`), comment
 * feeds left out, made absolute against the page's URL.
 */
export const feedLinksOf = (html: string, pageUrl: string): string[] => {
	const doc = parseDocument(html);
	const links = findAll(
		el =>
			name(el) === 'link' &&
			(getAttributeValue(el, 'rel') ?? '').toLowerCase().split(/\s+/).includes('alternate') &&
			FEED_TYPES.has((getAttributeValue(el, 'type') ?? '').toLowerCase().trim()),
		doc.children,
	);
	const urls = links
		.filter(el => !/comment|kommentar/i.test(`${getAttributeValue(el, 'title') ?? ''} ${getAttributeValue(el, 'href') ?? ''}`))
		.map(el => absolute(getAttributeValue(el, 'href'), pageUrl))
		.filter((u): u is string => !!u);
	return [...new Set(urls)];
};

/** Where to look for a feed under a source URL that announces none, most likely first. */
export const feedPathCandidates = (sourceUrl: string): string[] => {
	const base = new URL(sourceUrl);
	base.search = '';
	base.hash = '';
	if (!base.pathname.endsWith('/')) base.pathname += '/';
	return FEED_PATHS.map(path => new URL(path, base).href);
};

/** The feed's page `page` (WordPress's `?paged=N`); page 1 is the feed itself. */
export const pagedFeedUrl = (feedUrl: string, page: number): string => {
	if (page <= 1) return feedUrl;
	const url = new URL(feedUrl);
	url.searchParams.set('paged', `${page}`);
	return url.href;
};

/** An article's URL as one post: no fragment, no `utm_*` tracking. */
export const canonicalArticleUrl = (url: string): string => {
	const parsed = new URL(url);
	parsed.hash = '';
	for (const key of [...parsed.searchParams.keys()]) if (/^utm_/i.test(key)) parsed.searchParams.delete(key);
	return parsed.href;
};

/** `SocialPost.externalId` of a blog article: the same URL is the same post whatever finds it. */
export const blogExternalId = (url: string): string =>
	`blog_${createHash('sha1').update(canonicalArticleUrl(url)).digest('hex').slice(0, 24)}`;

/** A blog's handle (`SocialAccount.handle`): its host, lowercased, without `www.`. */
export const blogHandle = (url: string): string | null => {
	try {
		const host = new URL(/^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`).hostname
			.toLowerCase()
			.replace(/^www\./, '');
		return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) && host.length <= 80 ? host : null;
	} catch {
		return null;
	}
};

/** Text of nodes, blocks on lines of their own, junk left out. */
const nodesText = (nodes: AnyNode[]): string => {
	const out: string[] = [];
	const walk = (node: AnyNode) => {
		if (isText(node)) {
			out.push(node.data);
			return;
		}
		if (!isTag(node)) return;
		const tag = name(node);
		if (JUNK_TAGS.has(tag)) return;
		const block = BLOCK_TAGS.has(tag);
		if (block) out.push('\n');
		for (const child of node.children) walk(child);
		if (block) out.push('\n');
	};
	for (const node of nodes) walk(node);
	return out
		.join('')
		.replace(/[ \t ]+/g, ' ')
		.split('\n')
		.map(line => line.trim())
		.filter(Boolean)
		.join('\n');
};

/** An HTML fragment's text (a feed item's content), one block a line. */
export const htmlToText = (html: string): string => nodesText(parseDocument(html).children);

/**
 * An article page's text: the `<article>` with the most text (a page lists teaser cards as
 * articles too), else `<main>`, else the body; navigation, headers, footers, asides, forms and
 * scripts left out.
 */
export const articleText = (html: string): string => {
	const doc: Document = parseDocument(html);
	for (const el of findAll(e => JUNK_TAGS.has(name(e)), doc.children)) removeElement(el);
	const articles = findAll(el => name(el) === 'article', doc.children).map(el => ({ el, text: nodesText([el]) }));
	const best = articles.sort((a, b) => b.text.length - a.text.length)[0];
	if (best && best.text.length >= 200) return best.text;
	const main =
		findOne(el => name(el) === 'main' || getAttributeValue(el, 'role') === 'main', doc.children, true) ??
		findOne(el => name(el) === 'body', doc.children, true);
	return nodesText(main ? [main] : doc.children);
};

export const wordCount = (text: string): number => text.split(/\s+/).filter(Boolean).length;
