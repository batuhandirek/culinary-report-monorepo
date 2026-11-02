// Pure: SQL fragments every reader of statements shares, so a "praise", a "change" or a source's
// sentiment means the same in every query (claim model v2: `kind` replaced the `change` flag, and a
// review or a mention has no stored sentiment or summary any more).

/** A claim that can praise or complain: no change and no question (a claim B has not read counts as one) */
export const judgingSql = (s = 's') => `coalesce(${s}.kind, '') not in ('change', 'question')`;

/** A noticed change */
export const changeSql = (s = 's') => `${s}.kind = 'change'`;

/**
 * A mention's sentiment, worked out from its claims about the place (as `sentimentOf` does): every
 * judging claim positive → positive, every one negative → negative, both or a mixed one → mixed,
 * none judged → neutral
 */
export const mentionSentimentSql = (m = 'm') => `(select case
		when bool_or(ms.sentiment = 'mixed') or (bool_or(ms.sentiment = 'positive') and bool_or(ms.sentiment = 'negative')) then 'mixed'
		when bool_or(ms.sentiment = 'positive') then 'positive'
		when bool_or(ms.sentiment = 'negative') then 'negative'
		else 'neutral' end
	from statements ms where ms.mention_id = ${m}.id and ms.text is not null and ${judgingSql('ms')})`;

/**
 * What a mention said about the place, in its own words where kept: its first claims' quotes (else
 * their English), judging ones first, joined with " · ", at most `limit`; null when it has none
 */
export const mentionSaidSql = (
	m = 'm',
	limit = 2,
) => `(select string_agg(said, ' · ' order by first desc, id) from (
		select coalesce(ms.quote, ms.text) as said, ms.id, (ms.sentiment in ('positive', 'negative', 'mixed') and ${judgingSql('ms')}) as first
		from statements ms where ms.mention_id = ${m}.id and ms.text is not null
		order by first desc, ms.id limit ${limit}
	) said)`;
