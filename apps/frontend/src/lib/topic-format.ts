// How the topic pages write their changes and where a topic lives.

/** A topic's page; keys hold spaces ("fried chicken"). */
export const topicHref = (key: string) => `/admin/trends/${encodeURIComponent(key)}`;

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
