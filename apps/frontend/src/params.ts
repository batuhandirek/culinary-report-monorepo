import { defineParams } from '@sveltejs/kit/params';

// The app's top-level paths: a city is never called after one of them, so `/blog/…`,
// `/admin/…` and the rest never reach a city page even when the second part looks like a month
const RESERVED = new Set(['admin', 'api', 'auth', 'blog', 'portal', 'print', 'r']);

export const params = defineParams({
	// A city's slug (`City.slug`): lowercase words with dashes. Whether the city exists is the
	// API's answer: an unknown slug is a 404 from the page's load
	city: (param) =>
		/^[a-z0-9]+(-[a-z0-9]+)*$/.test(param) && param.length <= 60 && !RESERVED.has(param)
			? param
			: undefined,
	// A month, `YYYY-MM`
	month: (param) => (/^\d{4}-(0[1-9]|1[0-2])$/.test(param) ? param : undefined),
	// A calendar quarter, `YYYY-qN` (a city's food trends: `/<city>/trends/2026-q3`)
	quarter: (param) => (/^\d{4}-q[1-4]$/.test(param) ? param : undefined),
	// A share image of a city's month: link card, Instagram square, Instagram portrait
	card: (param) => (param === 'og' || param === 'square' || param === 'portrait' ? param : undefined)
});
