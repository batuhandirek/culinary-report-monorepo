// How the topic pages write their changes and where a topic lives.

/** A kind of food's page; keys hold spaces ("fried chicken"). An aspect's key opens its own page from there. */
export const topicHref = (key: string) => `/admin/topics/${encodeURIComponent(key)}`;

/** An aspect's page (what a claim is about at a place: Queue, Price level) */
export const aspectPageHref = (key: string) => `/admin/aspects/${encodeURIComponent(key)}`;

/** A topic's page by its kind: an aspect's under Aspects, a kind of food's under Topics */
export const topicPageHref = (key: string, kind: string) => (kind === 'aspect' ? aspectPageHref(key) : topicHref(key));

/** A ratio change: 0.4 → "+40%", 1.2 → "2.2×"; "—" when unknown. */
export const change = (c: number | null | undefined) =>
	c === null || c === undefined
		? '—'
		: c >= 1
			? `${(c + 1).toFixed(1).replace(/\.0$/, '')}×`
			: `${c > 0 ? '+' : c < 0 ? '−' : '±'}${Math.round(Math.abs(c) * 100)}%`;

/** A change in percentage points: "+4.2 pt"; "—" when unknown. */
export const points = (c: number | null | undefined) =>
	c === null || c === undefined ? '—' : `${c > 0 ? '+' : c < 0 ? '−' : '±'}${Math.abs(c)} pt`;

/** Muted under `quiet`, olive up, beet down. */
export const tone = (c: number | null | undefined, quiet: number) =>
	c === null || c === undefined || Math.abs(c) < quiet
		? 'text-muted-foreground'
		: c > 0
			? 'text-primary-darker'
			: 'text-beet';
