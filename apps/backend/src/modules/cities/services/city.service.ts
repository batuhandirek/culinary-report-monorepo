import { QueryOrder, UniqueConstraintViolationException } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';

import { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';

import { City } from '../entities/city.entity.js';
import { CitySource, CitySourceKindEnum } from '../entities/city-source.entity.js';
import { normalizeSourceValue, sourcePost } from '../util/city-source.js';

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
	| 'topBrands'
	| 'cronEnabled'
	| 'active'
> &
	Partial<Pick<City, 'lat' | 'lng' | 'osmRelationId' | 'doNotListVenues' | 'doNotListCreators'>>;

/** What one source brought in over the window `sourceYield` looks at. */
export interface CitySourceYield {
	source: CitySource;
	/** Posts it found, first-seen only (a post found again by another source stays with the first) */
	posts: number;
	/** Posts with a mention matched to a venue */
	matchedPosts: number;
	views: number;
}

// Months `sourceYield` looks back
const YIELD_MONTHS = 3;

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
		const source = this.em.create(CitySource, {
			city,
			kind: input.kind,
			value,
			note: input.note?.trim() || null,
			enabled: input.enabled ?? true,
		});
		await this.flushUnique('The city already has this source');
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
		const added: CitySource[] = [];
		for (const item of items) {
			const value = normalizeSourceValue(item.kind, item.value);
			if (!value || seen.has(key(item.kind, value))) continue;
			seen.add(key(item.kind, value));
			added.push(
				this.em.create(CitySource, {
					city,
					kind: item.kind,
					value,
					note: item.note?.trim() || null,
					enabled: false,
					suggested: true,
				}),
			);
		}
		await this.flushUnique('The city already has one of these sources');
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
	 * Every source of the city with what it brought in over the last three months: posts saved,
	 * posts with a matched mention, views. A dead source is one to disable.
	 */
	async sourceYield(cityId: string, now = new Date()): Promise<CitySourceYield[]> {
		const since = new Date(now);
		since.setUTCMonth(since.getUTCMonth() - YIELD_MONTHS);
		const rows: {
			platform: SocialPlatformEnum;
			source: string;
			posts: number;
			matched_posts: number;
			views: string | number;
		}[] = await this.em.getConnection().execute(
			`select p.platform, lower(p.source) as source, count(*)::int as posts,
				count(*) filter (where exists (
					select 1 from mentions m where m.post_id = p.id and m.brand_id is not null
				))::int as matched_posts,
				coalesce(sum(p.views), 0) as views
			from social_posts p
			where p.city_id = ? and p.posted_at >= ? and p.source is not null
			group by p.platform, lower(p.source)`,
			[cityId, since],
		);
		const byKey = new Map(rows.map(r => [`${r.platform} ${r.source}`, r]));
		return (await this.sources(cityId)).map(source => {
			const { platform, source: key } = sourcePost(source.kind, source.value);
			const row = byKey.get(`${platform} ${key.toLowerCase()}`);
			return {
				source,
				posts: row?.posts ?? 0,
				matchedPosts: row?.matched_posts ?? 0,
				views: Number(row?.views ?? 0),
			};
		});
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
