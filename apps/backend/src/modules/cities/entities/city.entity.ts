import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';

import type { PipelineStepEnum } from 'src/modules/pipeline/constants/pipeline.constant.js';
import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import type { CityDistrict } from '../interfaces/city-district.interface.js';

import { CitySource } from './city-source.entity.js';

/**
 * A place the pipeline covers: everything a step, the cron, a query or a prompt needs to know
 * about it. A new city is a row, never code.
 */
@Entity({ tableName: 'cities' })
export class City extends MikroOrmEntityAbstractClass<
	| 'aliases'
	| 'instagramEnabled'
	| 'districts'
	| 'nameStopwords'
	| 'chainDenyList'
	| 'stepBudgetsUsd'
	| 'topBrands'
	| 'cronEnabled'
	| 'active'
	| 'sources'
> {
	// URL key, e.g. "berlin"
	@Property({ type: 'text', unique: true })
	slug: string;

	// As mentions and reports name it, e.g. "Berlin"
	@Property({ type: 'text' })
	name: string;

	// Other names a mention may give it ("Berlin-Mitte" already matches by `name`)
	@Property({ type: 'jsonb' })
	aliases: string[] = [];

	// ISO 3166-1 alpha-2, e.g. "DE"
	@Property({ type: 'text' })
	country: string;

	// ISO 3166-2 subdivision, e.g. "DE-BE": regional public holidays and the Google Trends region
	@Property({ type: 'text', nullable: true })
	region?: string | null;

	// IANA, e.g. "Europe/Berlin"
	@Property({ type: 'text' })
	timezone: string;

	// ISO 639-1: the reports' and outreach's default language, e.g. "de"
	@Property({ type: 'text' })
	language: string;

	// Google Maps' location for venue scrapes and lookups, e.g. "Berlin, Germany"
	@Property({ type: 'text' })
	locationQuery: string;

	// TikTok search region (ISO-2), e.g. "DE"
	@Property({ type: 'text' })
	tiktokRegion: string;

	@Property({ type: 'boolean', default: true })
	instagramEnabled: boolean = true;

	@Property({ type: 'double', nullable: true })
	lat?: number | null;

	@Property({ type: 'double', nullable: true })
	lng?: number | null;

	// Its districts, with postal codes and the districts they border
	@Property({ type: 'jsonb' })
	districts: CityDistrict[] = [];

	// Words dropped from venue names before matching: the city's own name, local generic words
	@Property({ type: 'jsonb' })
	nameStopwords: string[] = [];

	// Chains and institutions that don't need a report (normalized names), for the lead score
	@Property({ type: 'jsonb' })
	chainDenyList: string[] = [];

	// Apify cap per pipeline step, in USD; a step not listed uses `DEFAULT_STEP_BUDGET_USD`
	@Property({ type: 'jsonb' })
	stepBudgetsUsd: Partial<Record<PipelineStepEnum, number>> = {};

	// How many of the month's most talked-about brands get reviews and reports (won ones on top)
	@Property({ type: 'int', default: 20 })
	topBrands: number = 20;

	// The monthly cron queues a run for it (when also active)
	@Property({ type: 'boolean', default: false })
	cronEnabled: boolean = false;

	@Property({ type: 'boolean', default: true })
	active: boolean = true;

	// The last city-wide Google Maps scrape (`SCRAPE_VENUES`). Openings count only once there was
	// one; the monthly cron queues the next one a quarter later
	@Property({ type: 'datetime', nullable: true })
	venuesScrapedAt?: Date | null;

	@OneToMany(() => CitySource, source => source.city)
	sources = new Collection<CitySource>(this);
}
