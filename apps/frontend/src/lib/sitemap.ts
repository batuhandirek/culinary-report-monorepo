export const ORIGIN = 'https://munchwerk.com';
export const SITEMAP_PAGE_SIZE = 10_000;

function escapeXml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

interface SitemapUrl {
	loc: string;
	lastmod?: string;
}

interface SitemapIndexEntry {
	loc: string;
}

export function generateUrlsetXml(urls: SitemapUrl[]): string {
	const entries = urls
		.map((url) => {
			let entry = `  <url>\n    <loc>${escapeXml(url.loc)}</loc>`;
			if (url.lastmod) entry += `\n    <lastmod>${escapeXml(url.lastmod)}</lastmod>`;
			entry += '\n  </url>';
			return entry;
		})
		.join('\n');

	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;
}

export function generateSitemapIndexXml(sitemaps: SitemapIndexEntry[]): string {
	const entries = sitemaps
		.map((s) => `  <sitemap>\n    <loc>${escapeXml(s.loc)}</loc>\n  </sitemap>`)
		.join('\n');

	return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;
}

export function xmlResponse(xml: string, maxAgeSeconds: number): Response {
	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds}`
		}
	});
}
