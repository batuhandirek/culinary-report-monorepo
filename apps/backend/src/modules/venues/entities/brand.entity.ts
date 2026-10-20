import { Collection } from '@mikro-orm/core';
import { Entity, Enum, Index, OneToMany, Property } from '@mikro-orm/decorators/legacy';

import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import type { LeadSignals } from '../interfaces/lead-score.interface.js';

import { Venue } from './venue.entity.js';

/** How a brand with branches in several cities gets its monthly report. */
export enum BrandReportScopeEnum {
	// One report per city, on the branches there
	CITY = 'city',
	// One report across every city, built after the last city's monthly run (`Report.city` null)
	ALL = 'all',
}

/**
 * The business behind one or more venues: what reports, prospects, the portal, the lead score
 * and the monthly top list are keyed by. Every venue is a branch of exactly one brand; a new
 * venue gets one of its own, and an admin merges brands into a chain (`BrandService`).
 */
@Entity({ tableName: 'brands' })
export class Brand extends MikroOrmEntityAbstractClass<'branchesSearchedAt' | 'excludedVenueIds' | 'reportScope'> {
	@Property({ type: 'text' })
	name: string;

	// `brandKey(name)`: what branch names start with. Not unique: unrelated venues share names
	@Index()
	@Property({ type: 'text' })
	key: string;

	// One report per city, or one across all of them; the admin's call on the brand page
	@Enum({ items: () => BrandReportScopeEnum, nativeEnumName: 'brand_report_scope', default: BrandReportScopeEnum.CITY })
	reportScope: BrandReportScopeEnum = BrandReportScopeEnum.CITY;

	// How good an outreach prospect it is, 0–100, and why (`BrandLeadScoreService`)
	@Index()
	@Property({ type: 'float', nullable: true })
	leadScore?: number | null;

	@Property({ type: 'jsonb', nullable: true })
	leadSignals?: LeadSignals | null;

	// When its name was last searched on Google Maps, per city id (ISO dates)
	@Property({ type: 'jsonb', default: '{}' })
	branchesSearchedAt: Record<string, string> = {};

	// Places with a matching name an admin said are not its branches: never offered again
	@Property({ type: 'jsonb', default: '[]' })
	excludedVenueIds: string[] = [];

	@OneToMany(() => Venue, venue => venue.brand)
	branches = new Collection<Venue>(this);
}
