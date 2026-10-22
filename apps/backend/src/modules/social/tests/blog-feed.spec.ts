import { describe, expect, it } from '@jest/globals';

import {
	articleText,
	blogExternalId,
	blogHandle,
	canonicalArticleUrl,
	feedLinksOf,
	feedPathCandidates,
	htmlToText,
	pagedFeedUrl,
	parseFeed,
} from '../util/blog-feed.js';

// RSS 2.0 as WordPress writes it (Cee Cee's starts with blank lines; tip Berlin's held a 0x08)
const RSS = `

<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
	<title>Restaurants &#8211; Cee Cee</title>
	<item>
		<title>KROQUE BERLIN: GETOASTET &amp; HAUSGEMACHT</title>
		<link>https://ceecee.cc/kroque-berlin/</link>
		<pubDate>Wed, 22 Oct 2026 14:25:23 +0000</pubDate>
		<guid isPermaLink="false">https://ceecee.cc/?p=123</guid>
		<description><![CDATA[Short teaser]]></description>
		<content:encoded><![CDATA[<p>Bei <strong>Kroque</strong> in Neukölln gibt es Toasts.\b</p><script>track()</script><p>Zweiter Absatz.</p>]]></content:encoded>
	</item>
	<item>
		<title>11 wirklich gute Restaurants in Friedrichshain</title>
		<link>/2026/beste-restaurants-friedrichshain/</link>
		<dc:date>2026-10-21T10:31:18Z</dc:date>
		<description>&lt;p&gt;The whole article sits in the description, as Mit Vergnügen's does: &lt;b&gt;Lokal&lt;/b&gt; und mehr.&lt;/p&gt;</description>
	</item>
	<item>
		<title>No link, no item</title>
	</item>
</channel>
</rss>`;

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
	<title>Hugo Food Blog</title>
	<entry>
		<title type="html">Pho &amp;amp; more</title>
		<link rel="replies" href="https://food.example.com/pho/#comments"/>
		<link rel="alternate" href="https://food.example.com/pho/"/>
		<published>2026-09-02T08:00:00+02:00</published>
		<updated>2026-09-05T08:00:00+02:00</updated>
		<summary>Short</summary>
		<content type="html">&lt;p&gt;The pho at Pho Sen in Mitte is great.&lt;/p&gt;</content>
	</entry>
	<entry>
		<title>Undated</title>
		<link href="https://food.example.com/undated/"/>
	</entry>
</feed>`;

describe('parseFeed', () => {
	it('reads RSS items: absolute links, dates, the longer of content and description, clean text', () => {
		const feed = parseFeed(RSS, 'https://mitvergnuegen.com/feed/')!;
		expect(feed.title).toBe('Restaurants – Cee Cee');
		expect(feed.items.map(i => [i.url, i.title, i.publishedAt?.toISOString()])).toEqual([
			['https://ceecee.cc/kroque-berlin/', 'KROQUE BERLIN: GETOASTET & HAUSGEMACHT', '2026-10-22T14:25:23.000Z'],
			['https://mitvergnuegen.com/2026/beste-restaurants-friedrichshain/', '11 wirklich gute Restaurants in Friedrichshain', '2026-10-21T10:31:18.000Z'],
		]);
		expect(htmlToText(feed.items[0].html)).toBe('Bei Kroque in Neukölln gibt es Toasts.\nZweiter Absatz.');
		expect(htmlToText(feed.items[1].html)).toBe(
			"The whole article sits in the description, as Mit Vergnügen's does: Lokal und mehr.",
		);
	});

	it('reads Atom entries: the alternate link, published before updated, content before a shorter summary', () => {
		const feed = parseFeed(ATOM, 'https://food.example.com/index.xml')!;
		expect(feed.title).toBe('Hugo Food Blog');
		expect(feed.items[0]).toMatchObject({
			url: 'https://food.example.com/pho/',
			title: 'Pho & more',
			publishedAt: new Date('2026-09-02T06:00:00Z'),
		});
		expect(htmlToText(feed.items[0].html)).toBe('The pho at Pho Sen in Mitte is great.');
		expect(feed.items[1]).toMatchObject({ url: 'https://food.example.com/undated/', publishedAt: null });
	});

	it('is null for a page that is no feed, such as a bot challenge', () => {
		expect(parseFeed('<!DOCTYPE html><html><body><script>challenge()</script></body></html>', 'https://x.de/feed/')).toBeNull();
	});
});

describe('finding a feed', () => {
	it('takes the feeds a page announces, comment feeds left out', () => {
		const html = `<html><head>
			<link rel="alternate" type="application/rss+xml" title="Blog &raquo; Feed" href="/feed/">
			<link rel="alternate" type="application/rss+xml" title="Blog &raquo; Kommentar-Feed" href="/comments/feed/">
			<link rel="alternate" type="application/atom+xml" href="https://blog.example.de/atom.xml">
			<link rel="alternate" hreflang="en" href="/en/">
		</head></html>`;
		expect(feedLinksOf(html, 'https://blog.example.de/')).toEqual([
			'https://blog.example.de/feed/',
			'https://blog.example.de/atom.xml',
		]);
	});

	it('looks under the source path, so a section gives its own feed', () => {
		expect(feedPathCandidates('https://www.tip-berlin.de/food').slice(0, 3)).toEqual([
			'https://www.tip-berlin.de/food/feed/',
			'https://www.tip-berlin.de/food/feed',
			'https://www.tip-berlin.de/food/rss',
		]);
	});

	it('pages a feed WordPress style', () => {
		expect(pagedFeedUrl('https://www.qiez.de/feed/?category_name=essen-trinken', 1)).toBe(
			'https://www.qiez.de/feed/?category_name=essen-trinken',
		);
		expect(pagedFeedUrl('https://www.qiez.de/feed/?category_name=essen-trinken', 3)).toBe(
			'https://www.qiez.de/feed/?category_name=essen-trinken&paged=3',
		);
	});
});

describe('articles', () => {
	it('is one post per URL whatever its tracking parameters or fragment', () => {
		expect(canonicalArticleUrl('https://x.de/a/?utm_source=rss&id=2#more')).toBe('https://x.de/a/?id=2');
		expect(blogExternalId('https://x.de/a/?utm_medium=feed')).toBe(blogExternalId('https://x.de/a/'));
		expect(blogExternalId('https://x.de/a/')).toMatch(/^blog_[0-9a-f]{24}$/);
	});

	it('names a blog by its host', () => {
		expect(blogHandle('https://www.tip-berlin.de/food/feed/')).toBe('tip-berlin.de');
		expect(blogHandle('ceecee.cc')).toBe('ceecee.cc');
		expect(blogHandle('not a url')).toBeNull();
	});

	it("reads a page's longest article, without navigation, teasers or scripts", () => {
		const body = 'Das Kroque in der Weserstraße macht Toasts mit Käse. '.repeat(10);
		const html = `<html><body>
			<header><nav>Home · Food · Bars</nav></header>
			<main>
				<article class="teaser"><h2>Other story</h2><p>Short teaser.</p></article>
				<article><h1>Kroque</h1><p>${body}</p><aside>Newsletter abonnieren</aside><script>x()</script></article>
			</main>
			<footer>Impressum</footer>
		</body></html>`;
		expect(articleText(html)).toBe(`Kroque\n${body.trim()}`);
	});

	it('falls back to main when no article holds the text', () => {
		expect(articleText('<html><body><nav>Menu</nav><main><h1>Title</h1><p>Text here</p></main></body></html>')).toBe(
			'Title\nText here',
		);
	});
});
