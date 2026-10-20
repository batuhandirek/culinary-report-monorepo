// Pure: Google Trends' autocomplete, the free endpoint that turns words into topic ids.

/** One suggestion: the id Trends searches, what it is, and Google's own kind of thing. */
export interface TrendsTopicSuggestion {
	id: string;
	title: string;
	type: string;
}

/** `https://trends.google.com/trends/api/autocomplete/<q>?hl=en-US&tz=0` for some words. */
export const trendsAutocompleteUrl = (q: string) =>
	`https://trends.google.com/trends/api/autocomplete/${encodeURIComponent(q.trim())}?hl=en-US&tz=0`;

/**
 * The suggestions of an autocomplete response, in Google's order. The body is JSON behind an
 * anti-hijacking prefix (`)]}',`), so it is read from the first brace; anything else is none.
 */
export const parseTrendsAutocomplete = (body: string): TrendsTopicSuggestion[] => {
	const start = body.indexOf('{');
	if (start < 0) return [];
	try {
		const topics =
			(JSON.parse(body.slice(start)) as { default?: { topics?: unknown[] } }).default
				?.topics ?? [];
		return topics.flatMap(t => {
			const { mid, title, type } = (t ?? {}) as Record<string, unknown>;
			return typeof mid === 'string' && typeof title === 'string' ?
					[{ id: mid, title, type: typeof type === 'string' ? type : '' }]
				:	[];
		});
	} catch {
		return [];
	}
};
