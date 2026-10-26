import { QueryOrder, UniqueConstraintViolationException } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';

import _ from 'lodash';

import { PostSourceKindEnum } from 'src/modules/social/entities/post-source.entity.js';
import { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';
import { ensureHashtags, hashtagKey, normalizeHashtag } from 'src/modules/social/util/hashtags.js';
import { linkPostSources } from 'src/modules/social/util/post-sources.js';

import { City } from '../entities/city.entity.js';
import { CitySource, CitySourceKindEnum } from '../entities/city-source.entity.js';
import { isHashtagKind, normalizeSourceValue } from '../util/city-source.js';

/** The editable fields of a city (everything but its sources). */
export type CityFields = Pick<
	City,
	| 'slug'
	| 'name'
	| 'aliases'
	| 'country'
	| 'timezone'
	| 'language'
	| 'locationQuery'
	| 'tiktokRegion'
	| 'instagramEnabled'
	| 'districts'
	| 'nameStopwords'
	| 'chainDenyList'
	| 'stepBudgetsUsd'
	| 'dishSearchEveryDays'
	| 'topBrands'
	| 'cronEnabled'
	| 'active'
> &
	Partial<Pick<City, 'lat' | 'lng' | 'osmRelationId' | 'doNotListVenues' | 'doNotListCreators'>>;

/** What one source brought in over the window `sourceYield` looks at. */
export interface CitySourceYield {
	source: CitySource;
	/** Posts it found (`PostSource`), whichever source found them too */
	posts: number;
	/** Of those, posts with a mention matched to a brand */
	matchedPosts: number;
	/**
	 * Matched posts nothing else that keeps running found: no other enabled source of the city, no
	 * venue search. What turning it off would lose.
	 */
	uniqueMatchedPosts: number;
	views: number;
}

/** A tag the city doesn't scrape that keeps coming up on its matched posts. */
export interface CityHashtagSuggestion {
	hashtagId: number;
	tag: string;
	/** The source it would be: the platform whose posts carry it */
	kind: CitySourceKindEnum.TIKTOK_HASHTAG | CitySourceKindEnum.INSTAGRAM_HASHTAG;
	matchedPosts: number;
	/** Distinct brands of those posts' matched mentions */
	brands: number;
	/** A few of them, by name */
	sampleBrands: string[];
}

// Months `sourceYield` and the hashtag suggestions look back
const YIELD_MONTHS = 3;
// A tag is suggested from the data on matched posts of this many brands, and this many posts
export const HASHTAG_SUGGESTION_MIN_BRANDS = 3;
export const HASHTAG_SUGGESTION_MIN_POSTS = 5;
const HASHTAG_SUGGESTIONS_SHOWN = 30;

/** The one entry point for cities and their scrape sources. */
@Injectable()
export class CityService {
	constructor(private readonly em: EntityManager) {}

	async getById(id: string): Promise<City> {
		return this.em.findOneOrFail(City, { id });
	}

	async getBySlug(slug: string): Promise<City> {
		return this.em.findOneOrFail(City, { slug });
	}

	/** Every city, by name. */
	async list(): Promise<City[]> {
		return this.em.find(City, {}, { orderBy: { name: QueryOrder.ASC } });
	}

	/** Per city id: its venues, its sources and how many of those are enabled. */
	async counts(): Promise<Map<string, { venues: number; sources: number; enabledSources: number }>> {
		const rows: { id: string; venues: number; sources: number; enabled_sources: number }[] =
			await this.em.getConnection().execute(
				`select c.id,
					(select count(*) from venues v where v.city_id = c.id)::int as venues,
					(select count(*) from city_sources s where s.city_id = c.id)::int as sources,
					(select count(*) from city_sources s where s.city_id = c.id and s.enabled)::int as enabled_sources
				from cities c`,
			);
		return new Map(
			rows.map(r => [r.id, { venues: r.venues, sources: r.sources, enabledSources: r.enabled_sources }]),
		);
	}

	/** Cities the pipeline covers, by name. */
	async active(): Promise<City[]> {
		return this.em.find(City, { active: true }, { orderBy: { name: QueryOrder.ASC } });
	}

	/** Cities the monthly cron queues a run for: active and with the cron on. */
	async forMonthlyCron(): Promise<City[]> {
		return this.em.find(
			City,
			{ active: true, cronEnabled: true },
			{ orderBy: { createdAt: QueryOrder.ASC } },
		);
	}

	/** A city's sources, optionally of one kind and only the enabled ones, oldest first. */
	async sources(
		cityId: string,
		opts: { kind?: CitySourceKindEnum; enabledOnly?: boolean } = {},
	): Promise<CitySource[]> {
		return this.em.find(
			CitySource,
			{
				city: cityId,
				...(opts.kind && { kind: opts.kind }),
				...(opts.enabledOnly && { enabled: true }),
			},
			{ orderBy: { createdAt: QueryOrder.ASC, id: QueryOrder.ASC } },
		);
	}

	/** The enabled values of one kind, what a scrape reads. */
	async enabledValues(cityId: string, kind: CitySourceKindEnum): Promise<string[]> {
		return (await this.sources(cityId, { kind, enabledOnly: true })).map(s => s.value);
	}

	/**
	 * Account sources (creators a city watches), on or off, with their city: one city's, or every
	 * city's naming these handles (`{ platform kind, handle }`). The watch list and a creator's page.
	 */
	async accountSources(
		opts: { cityId?: string; handles?: { kind: CitySourceKindEnum; handle: string }[] } = {},
	): Promise<CitySource[]> {
		if (opts.handles && !opts.handles.length) return [];
		return this.em.find(
			CitySource,
			{
				kind: { $in: [CitySourceKindEnum.TIKTOK_ACCOUNT, CitySourceKindEnum.INSTAGRAM_ACCOUNT] },
				...(opts.cityId && { city: opts.cityId }),
				...(opts.handles && { $or: opts.handles.map(h => ({ kind: h.kind, value: h.handle })) }),
			},
			{ populate: ['city'], orderBy: { createdAt: QueryOrder.ASC, id: QueryOrder.ASC } },
		);
	}

	/** Creates a city. Flushes; a taken slug is a 409. */
	async create(fields: CityFields): Promise<City> {
		const city = this.em.create(City, fields);
		await this.flushUnique('A city with this slug already exists');
		return city;
	}

	/** Updates a city's fields. Flushes. */
	async update(id: string, fields: Partial<CityFields>): Promise<City> {
		const city = await this.getById(id);
		this.em.assign(city, fields);
		await this.flushUnique('A city with this slug already exists');
		return city;
	}

	/**
	 * Adds a source (hashtags lose their `#` and are lowercased; a blog is its URL, 400 when it is
	 * not a public web address). Flushes; a duplicate is a 409.
	 */
	async addSource(
		cityId: string,
		input: { kind: CitySourceKindEnum; value: string; note?: string | null; enabled?: boolean },
	): Promise<CitySource> {
		const value = normalizeSourceValue(input.kind, input.value);
		if (!value) throw new BadRequestException('Not a usable source');
		const city = await this.getById(cityId);
		const hashtags = isHashtagKind(input.kind) ? await ensureHashtags(this.em, [value]) : undefined;
		const source = this.em.create(CitySource, {
			city,
			kind: input.kind,
			value,
			hashtag: hashtags?.get(value) ?? null,
			note: input.note?.trim() || null,
			enabled: input.enabled ?? true,
		});
		await this.flushUnique('The city already has this source');
		// Posts it found before (it was listed once, or a venue search's query was it) count for it
		await linkPostSources(this.em, cityId);
		return source;
	}

	/**
	 * Adds suggestions as disabled sources marked `suggested`, skipping any the city already has
	 * (searches compared case-insensitively) and repeats. Flushes once; returns the added rows.
	 */
	async addSuggestedSources(
		cityId: string,
		items: { kind: CitySourceKindEnum; value: string; note?: string | null }[],
	): Promise<CitySource[]> {
		const city = await this.getById(cityId);
		const key = (kind: CitySourceKindEnum, value: string) =>
			`${kind} ${normalizeSourceValue(kind, value).toLowerCase()}`;
		const seen = new Set((await this.sources(cityId)).map(s => key(s.kind, s.value)));
		const wanted = items
			.map(item => ({ ...item, value: normalizeSourceValue(item.kind, item.value) }))
			.filter(item => {
				if (!item.value || seen.has(key(item.kind, item.value))) return false;
				seen.add(key(item.kind, item.value));
				return true;
			});
		const hashtags = await ensureHashtags(
			this.em,
			wanted.filter(item => isHashtagKind(item.kind)).map(item => item.value),
		);
		const added = wanted.map(item =>
			this.em.create(CitySource, {
				city,
				kind: item.kind,
				value: item.value,
				hashtag: isHashtagKind(item.kind) ? (hashtags.get(item.value) ?? null) : null,
				note: item.note?.trim() || null,
				enabled: false,
				suggested: true,
			}),
		);
		await this.flushUnique('The city already has one of these sources');
		if (added.length) await linkPostSources(this.em, cityId);
		return added;
	}

	/** Turns a source on or off, or changes its note. Flushes. */
	async updateSource(
		cityId: string,
		sourceId: string,
		input: { enabled?: boolean; note?: string | null },
	): Promise<CitySource> {
		const source = await this.em.findOneOrFail(CitySource, { id: sourceId, city: cityId });
		if (input.enabled !== undefined) {
			source.enabled = input.enabled;
			// Switching a suggestion either way is its review
			source.suggested = false;
		}
		if (input.note !== undefined) source.note = input.note?.trim() || null;
		await this.em.flush();
		return source;
	}

	/**
	 * What `SCRAPE_BLOGS` found reading a blog source: the feed it read (kept for the next run)
	 * and what went wrong, null when nothing did. Does not flush.
	 */
	recordBlogCheck(source: CitySource, check: { feedUrl: string | null; error: string | null }, now = new Date()): void {
		source.feedUrl = check.feedUrl;
		source.error = check.error;
		source.checkedAt = now;
	}

	/**
	 * Every source of the city with what it brought in over the last three months, from every find
	 * (`PostSource`): posts, posts with a matched mention, the matched posts only it found, views.
	 * A dead source is one to disable; one whose unique count is low costs a page for little.
	 */
	async sourceYield(cityId: string, now = new Date()): Promise<CitySourceYield[]> {
		const since = new Date(now);
		since.setUTCMonth(since.getUTCMonth() - YIELD_MONTHS);
		const rows: {
			source_id: string;
			posts: number;
			matched_posts: number;
			unique_matched_posts: number;
			views: string | number;
		}[] = await this.em.getConnection().execute(
			`with finds as (
				select ps.source_id, ps.post_id, p.views, exists (
					select 1 from mentions m where m.post_id = p.id and m.brand_id is not null
				) as matched
				from post_sources ps
				join city_sources cs on cs.id = ps.source_id
				join social_posts p on p.id = ps.post_id
				where cs.city_id = ? and p.posted_at >= ?
			)
			select f.source_id, count(*)::int as posts,
				count(*) filter (where f.matched)::int as matched_posts,
				count(*) filter (where f.matched and not exists (
					select 1 from post_sources o
					left join city_sources ocs on ocs.id = o.source_id
					where o.post_id = f.post_id and (
						(ocs.enabled and o.source_id <> f.source_id)
						or o.kind in ('${PostSourceKindEnum.VENUE_SEARCH}', '${PostSourceKindEnum.VENUE_PLACE}')
						-- A watched brand's own profile (no city source): watched whatever the sources are
						or (o.source_id is null and o.kind in ('${PostSourceKindEnum.TIKTOK_ACCOUNT}', '${PostSourceKindEnum.INSTAGRAM_ACCOUNT}'))
					)
				))::int as unique_matched_posts,
				coalesce(sum(f.views), 0) as views
			from finds f
			group by f.source_id`,
			[cityId, since],
		);
		const bySource = new Map(rows.map(r => [r.source_id, r]));
		return (await this.sources(cityId)).map(source => {
			const row = bySource.get(source.id);
			return {
				source,
				posts: row?.posts ?? 0,
				matchedPosts: row?.matched_posts ?? 0,
				uniqueMatchedPosts: row?.unique_matched_posts ?? 0,
				views: Number(row?.views ?? 0),
			};
		});
	}

	/**
	 * Tags worth scraping, from the data, free: over the last three months, the tags on the city's
	 * posts with a matched mention, on `HASHTAG_SUGGESTION_MIN_POSTS`+ such posts of
	 * `HASHTAG_SUGGESTION_MIN_BRANDS`+ brands, that the city has no hashtag source for on that
	 * platform (enabled or not), an admin hasn't ignored and that isn't the city's own name; the
	 * most matched posts first.
	 */
	async hashtagSuggestions(cityId: string, now = new Date()): Promise<CityHashtagSuggestion[]> {
		const city = await this.getById(cityId);
		// The city's own name is no source (#berlin is every post about the city)
		const ownNames = _.uniq(
			[city.name, ...(city.aliases ?? [])].flatMap(name => [normalizeHashtag(name), hashtagKey(name)]).filter(Boolean),
		);
		const since = new Date(now);
		since.setUTCMonth(since.getUTCMonth() - YIELD_MONTHS);
		const rows: { id: number; tag: string; kind: CityHashtagSuggestion['kind']; matched_posts: number; brands: number; sample: string[] }[] =
			await this.em.getConnection().execute(
				`select h.id, h.tag, k.kind, count(distinct p.id)::int as matched_posts,
					count(distinct m.brand_id)::int as brands,
					(array_agg(distinct b.name order by b.name))[1:3] as sample
				from post_hashtags ph
				join hashtags h on h.id = ph.hashtag_id
				join social_posts p on p.id = ph.post_id
				join (values ('${SocialPlatformEnum.TIKTOK}', '${CitySourceKindEnum.TIKTOK_HASHTAG}'),
					('${SocialPlatformEnum.INSTAGRAM}', '${CitySourceKindEnum.INSTAGRAM_HASHTAG}')) as k(platform, kind)
					on k.platform = p.platform::text
				join mentions m on m.post_id = p.id and m.brand_id is not null
				join brands b on b.id = m.brand_id
				where p.city_id = ? and p.posted_at >= ? and not h.ignored
				and h.tag not in (${ownNames.map(() => '?').join(', ')})
				and not exists (
					select 1 from city_sources cs
					where cs.city_id = p.city_id and cs.hashtag_id = h.id and cs.kind::text = k.kind
				)
				group by h.id, h.tag, k.kind
				having count(distinct m.brand_id) >= ? and count(distinct p.id) >= ?
				order by matched_posts desc, brands desc, h.tag
				limit ?`,
				[cityId, since, ...ownNames, HASHTAG_SUGGESTION_MIN_BRANDS, HASHTAG_SUGGESTION_MIN_POSTS, HASHTAG_SUGGESTIONS_SHOWN],
			);
		return rows.map(r => ({
			hashtagId: r.id,
			tag: r.tag,
			kind: r.kind,
			matchedPosts: r.matched_posts,
			brands: r.brands,
			sampleBrands: r.sample,
		}));
	}

	private async flushUnique(message: string): Promise<void> {
		try {
			await this.em.flush();
		} catch (e) {
			if (e instanceof UniqueConstraintViolationException) throw new ConflictException(message);
			throw e;
		}
	}
}
