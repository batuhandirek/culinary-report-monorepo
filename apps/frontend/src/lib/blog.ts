// Small presentation helpers shared across the public blog pages (list, tag, detail)
// and the admin draft preview. Pure functions — safe on the server for SSR. Dates go
// through `#ui/lib/date.ts` like everywhere else.
import type { BlogEntryOutputDto, BlogEntrySummaryOutputDto, BlogTagOutputDto } from 'client';

import { BRAND_ICON_LINK } from '#constants/OG_IMAGE.js';

const SITE = 'https://munchwerk.com';

/** When an entry counts as written: its publication, or its creation while still a draft. */
export const blogEntryDate = (entry: { publishedAt?: string | null; createdAt: string }) =>
	entry.publishedAt ?? entry.createdAt;

/** A tag as a reader sees it. Tags are typed in lower case ("instagram"); a label starts with a capital. */
export const blogTagLabel = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

/**
 * The topics a set of entries is about, most written-about first. `api.blog.listTags`
 * answers with every tag ever created, most of which have no published post behind them —
 * a topic row built from the entries on screen never leads to an empty page.
 */
export const collectBlogTags = (
	entries: { tags?: BlogTagOutputDto[] }[],
	{ limit = 10, exclude }: { limit?: number; exclude?: string } = {}
): BlogTagOutputDto[] => {
	const counted = new Map<string, { tag: BlogTagOutputDto; count: number; first: number }>();
	let seen = 0;
	for (const entry of entries) {
		for (const tag of entry.tags ?? []) {
			if (tag.slug === exclude) continue;
			const hit = counted.get(tag.slug);
			if (hit) hit.count++;
			else counted.set(tag.slug, { tag, count: 1, first: seen++ });
		}
	}
	return [...counted.values()]
		.sort((a, b) => b.count - a.count || a.first - b.first)
		.slice(0, limit)
		.map((hit) => hit.tag);
};

/** What to read next: `primary` (same topic) first, topped up from `fallback` (newest). */
export const pickNextBlogEntries = (
	primary: BlogEntrySummaryOutputDto[],
	fallback: BlogEntrySummaryOutputDto[],
	{ exclude, limit = 3 }: { exclude: string; limit?: number }
): BlogEntrySummaryOutputDto[] => {
	const picked = new Map<string, BlogEntrySummaryOutputDto>();
	for (const entry of [...primary, ...fallback]) {
		if (entry.id !== exclude && !picked.has(entry.id)) picked.set(entry.id, entry);
	}
	return [...picked.values()].slice(0, limit);
};

/**
 * `BlogPosting` + breadcrumb for an article. The title and excerpt are written by an
 * editor, so render the result through `SafeJsonLd`, never `svelte-meta-tags`' `JsonLd`.
 */
export const blogPostingJsonLd = (entry: BlogEntryOutputDto): Record<string, unknown>[] => {
	const url = `${SITE}/blog/${entry.slug}`;
	const published = blogEntryDate(entry);
	return [
		{
			'@type': 'BlogPosting',
			mainEntityOfPage: url,
			url,
			headline: entry.title,
			...(entry.excerpt ? { description: entry.excerpt } : {}),
			image: entry.coverImage?.url ?? `${url}/og.png`,
			datePublished: published,
			dateModified: published,
			inLanguage: 'en',
			...(entry.author?.publicName
				? { author: { '@type': 'Person', name: entry.author.publicName } }
				: {}),
			publisher: {
				'@type': 'Organization',
				name: 'Munchwerk',
				url: SITE,
				logo: { '@type': 'ImageObject', url: BRAND_ICON_LINK }
			},
			...(entry.tags?.length
				? { keywords: entry.tags.map((tag) => tag.name).join(', ') }
				: {})
		},
		{
			'@type': 'BreadcrumbList',
			itemListElement: [
				{
					'@type': 'ListItem',
					position: 1,
					name: 'Blog',
					item: `${SITE}/blog`
				},
				{ '@type': 'ListItem', position: 2, name: entry.title, item: url }
			]
		}
	];
};

/** Rough reading estimate (~200 wpm), floored at 1 min. Takes the rendered HTML body. */
export const readingTimeMinutes = (html?: string | null): number => {
	if (!html) return 1;
	const words = html
		.replace(/<[^>]+>/g, ' ')
		.trim()
		.split(/\s+/)
		.filter(Boolean).length;
	return Math.max(1, Math.round(words / 200));
};

/** Two-letter avatar initials from an author's public name. */
export const authorInitials = (name?: string | null): string => {
	if (!name) return '?';
	const parts = name.trim().split(/\s+/).filter(Boolean);
	const first = parts[0]?.[0] ?? '';
	const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
	return (first + last).toUpperCase() || '?';
};

/** Tag-free, entity-decoded text of an HTML fragment — enough for headings, which only
    ever carry inline marks. */
const stripHtml = (html: string): string =>
	html
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#3[49];/g, "'")
		.replace(/\s+/g, ' ')
		.trim();

/** URL-safe anchor slug, accents folded to ASCII first so `Café menüs` doesn't lose its letters. */
export const slugifyHeading = (text: string): string =>
	text
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/ß/g, 'ss')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

const OWN_HOST = /^https?:\/\/(?:www\.)?munchwerk\.com(?=[/?#]|$)/i;

/**
 * Links in an article that point at our own site become in-app links.
 *
 * The renderer stamps every link — the `cta` block's button included — with
 * `target="_blank"`, and editors paste the production address. Left alone, a "Sign up" under
 * an article opens a second tab and, on any host that is not production, leaves the site
 * altogether. A same-site link keeps its
 * path and loses `target`/`rel`; links to anywhere else are untouched. String work, so the
 * server and the client produce the same markup.
 */
export const localizeBlogLinks = (html?: string | null): string =>
	(html ?? '').replace(/<a\b([^>]*)>/gi, (tag, attrs: string) => {
		const href = /\shref="([^"]*)"/i.exec(attrs)?.[1];
		if (!href || !OWN_HOST.test(href)) return tag;
		const path = href.replace(OWN_HOST, '');
		const kept = attrs
			.replace(/\shref="[^"]*"/i, ` href="${path.startsWith('/') ? path : `/${path}`}"`)
			.replace(/\s(?:target|rel)="[^"]*"/gi, '');
		return `<a${kept}>`;
	});

export interface BlogTocItem {
	id: string;
	text: string;
}

/**
 * Derive the "Contents" table of contents from the article body and give every h2 the
 * matching anchor id.
 *
 * The body is stored as server-rendered HTML (the TipTap renderer emits bare `<h2>`), so the
 * ids have to be injected at display time — string surgery rather than DOM parsing, because
 * this has to produce identical markup during SSR and on the client or Svelte would hydrate
 * over a mismatch. The HTML is admin-authored and already trusted, so only h2 is touched;
 * h3/h4 stay out of the list on purpose — the prototype's sidebar is one flat level.
 */
export const buildBlogToc = (html?: string | null): { html: string; toc: BlogTocItem[] } => {
	if (!html) return { html: '', toc: [] };

	const toc: BlogTocItem[] = [];
	const used = new Set<string>();

	const withIds = html.replace(
		/<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi,
		(match, attrs: string, inner: string) => {
			const text = stripHtml(inner);
			if (!text) return match;

			const existing = /\sid=["']([^"']+)["']/i.exec(attrs)?.[1];
			const base = existing || slugifyHeading(text) || `section-${toc.length + 1}`;
			let id = base;
			for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
			used.add(id);

			toc.push({ id, text });
			return existing ? match : `<h2${attrs} id="${id}">${inner}</h2>`;
		}
	);

	return { html: withIds, toc };
};
