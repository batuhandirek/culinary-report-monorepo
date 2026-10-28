import { ownPostSql } from 'src/modules/social/util/accounts.js';

import {
	OPENING_FIRST_REVIEW_DAYS,
	OPENING_GROWTH_MAX_START_REVIEWS,
	OPENING_GROWTH_MIN_DAYS,
	OPENING_GROWTH_PER_30_DAYS,
	OPENING_MIN_AUTHORS,
	OPENING_REVIEW_HISTORY_SHARE,
	OPENING_SCRAPE_DAYS,
} from '../constants/post-openings.constant.js';

/** What agreed with the flagged posts that a place just opened. */
export type PostOpeningEvidence = 'authors' | 'first_review' | 'review_growth' | 'scrape';

export interface PostOpeningRow {
	venue_id: string;
	name: string;
	district: string | null;
	category: string | null;
	street: string | null;
	/** The first flagged post by others */
	at: Date;
	/** The newest flagged post by others */
	last_at: Date;
	evidence: PostOpeningEvidence;
}

/**
 * SQL for the open venues whose posts say they just opened, with a second signal agreeing. Only
 * matched mentions flagged `is_new_opening` in posts by others count (an own account's never), in
 * posts of `[from, to)`, at venues open and under the review cap. A venue is listed when:
 * - flagged posts by `OPENING_MIN_AUTHORS`+ people (creators, else accounts) say so, or
 * - one outside author does and a second source agrees: its first Google review (from a history
 *   we hold nearly whole) near the first post, review counts low and climbing fast, or a city
 *   scrape that saw it open.
 *
 * `where` filters on the venue `v` (and may take params). Params, in order: the `where` params,
 * `from`, `to` (only with `withTo`), the review cap. Columns: `PostOpeningRow`.
 */
export const postOpeningsSql = (where: string, withTo: boolean): string => `
	with flagged as (
		select m.venue_id, p.posted_at,
			coalesce(a.creator_id::text, p.account_id::text, lower(p.author), p.id::text) as who
		from mentions m
			join social_posts p on p.id = m.post_id
			join venues v on v.id = m.venue_id
			left join social_accounts a on a.id = p.account_id
		where m.is_new_opening and m.match_method is distinct from 'ignored' and ${where}
			and p.posted_at >= ?${withTo ? ' and p.posted_at < ?' : ''}
			and v.deleted_at is null and not v.closed and coalesce(v.reviews_count, 0) < ?
			and not ${ownPostSql('p', 'v.brand_id')}
	), firsts as (
		select venue_id, min(posted_at) as at, max(posted_at) as last_at,
			count(distinct who)::int as authors
		from flagged group by venue_id
	), judged as (
		select f.*, case
			when f.authors >= ${OPENING_MIN_AUTHORS} then 'authors'
			when exists (
				select 1 from reviews r where r.venue_id = f.venue_id and r.platform = 'google'
				having count(*) >= ${OPENING_REVIEW_HISTORY_SHARE} * (
						select coalesce(max(reviews_count), 0) from venues where id = f.venue_id)
					and min(r.published_at) between f.at - interval '${OPENING_FIRST_REVIEW_DAYS} days'
						and f.at + interval '${OPENING_FIRST_REVIEW_DAYS} days'
			) then 'first_review'
			when exists (
				select 1 from venue_snapshots s1
					join venue_snapshots s2 on s2.venue_id = s1.venue_id
						and s2.snapshot_date::date >= s1.snapshot_date::date + ${OPENING_GROWTH_MIN_DAYS}
				where s1.venue_id = f.venue_id
					and s1.snapshot_date::date >= (f.at - interval '${OPENING_FIRST_REVIEW_DAYS} days')::date
					and s1.reviews_count < ${OPENING_GROWTH_MAX_START_REVIEWS}
					and (s2.reviews_count - s1.reviews_count) * 30.0
						/ (s2.snapshot_date::date - s1.snapshot_date::date) >= ${OPENING_GROWTH_PER_30_DAYS}
			) then 'review_growth'
			when exists (
				select 1 from venue_status_changes c
				where c.venue_id = f.venue_id and c.kind = 'opened'
					and c.at between f.at - interval '${OPENING_SCRAPE_DAYS} days'
						and f.at + interval '${OPENING_SCRAPE_DAYS} days'
			) then 'scrape'
		end as evidence
		from firsts f
	)
	select j.venue_id, v.name, v.district, v.category, v.street, j.at, j.last_at, j.evidence
	from judged j join venues v on v.id = j.venue_id
	where j.evidence is not null
	order by j.at desc, v.name`;
