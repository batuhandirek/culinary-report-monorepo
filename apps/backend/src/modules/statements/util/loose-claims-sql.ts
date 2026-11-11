/**
 * SQL: the `from … where` of a city's claims with text, joined to what the grouping by meaning
 * reads (`s` the statement, `a` its aspect, `rv` / `rb` a review's venue and brand, `m` / `mb` a
 * mention and its brand, `po` the post), a post by a brand's own account left out (its claims
 * about that brand, and its claims about the city or nothing). `conditions` narrows it further
 * (`and …`); the first parameter is the city's id, then those of `conditions`. A claim has one
 * aspect part at most, and a root has no `is_a` edge: a loose claim is `LOOSE_CLAIM_SQL`.
 */
export const claimsOfCitySql = (conditions: string) => `from statements s
	left join reviews r on r.id = s.review_id
	left join venues rv on rv.id = r.venue_id
	left join brands rb on rb.id = rv.brand_id
	left join mentions m on m.id = s.mention_id
	left join brands mb on mb.id = m.brand_id
	left join social_posts po on po.id = s.post_id
	left join statement_parts ap on ap.statement_id = s.id and ap.role = 'aspect'
	left join topics a on a.id = ap.topic_id
	where s.city_id = ? and s.text is not null ${conditions}
		and not exists (select 1 from social_accounts own_account where own_account.id = po.account_id
			and own_account.brand_id is not null and (s.mention_id is null or own_account.brand_id = m.brand_id))`;

/** SQL: a loose claim, under no aspect or filed at a root because nothing finer fitted */
export const LOOSE_CLAIM_SQL = `(a.id is null or not exists (select 1 from topic_edges ae where ae.from_id = a.id and ae.type = 'is_a'))`;
