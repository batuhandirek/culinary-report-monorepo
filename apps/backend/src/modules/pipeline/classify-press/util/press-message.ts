import type { PressPageForClassifying } from 'src/modules/venues/services/web-mention.service.js';

/** The classifier's message for one press page: the name searched, its district, the page's title, outlet and snippet */
export const pressMessage = (page: PressPageForClassifying): string =>
	JSON.stringify({
		venue: page.venue,
		...(page.district && { district: page.district }),
		title: page.title,
		outlet: page.outlet,
		snippet: page.snippet?.slice(0, 500) ?? null,
	});
