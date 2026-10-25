import type { Rel } from '@mikro-orm/core';
import { Embedded, Entity, Index, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { City } from 'src/modules/cities/entities/city.entity.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import type { ReportData, ReportHighlights } from '../interfaces/report-data.interface.js';

import { BrandReportConfig } from './brand-report-config.entity.js';
import { type AnyReportSection, REPORT_SECTION_TYPES } from './report-section.embeddable.js';
import { ReportTemplate } from './report-template.entity.js';

/**
 * A brand's monthly report on its branches in one city, or (`city` null, `Brand.reportScope`
 * `all`) in every city, one per active configuration of the brand (or the default one).
 * Rebuilding it replaces the row. Each branch's place figures are its own
 * entry in `data.branches`. The unique key lets two null-city rows through
 * (nulls are distinct): `ReportService.build` finds the existing one first.
 */
@Entity({ tableName: 'reports' })
@Unique({ properties: ['brand', 'city', 'month', 'config'] })
export class Report extends MikroOrmEntityAbstractClass<
	'postCount' | 'reviewCount' | 'sections' | 'name'
> {
	@ManyToOne({ entity: () => Brand, deleteRule: 'cascade' })
	brand: Rel<Brand>;

	// The city whose branches it covers; null for a report across all of them
	@ManyToOne({ entity: () => City, deleteRule: 'cascade', index: true, nullable: true })
	city?: Rel<City> | null;

	// YYYY-MM
	@Index()
	@Property({ type: 'text' })
	month: string;

	@Property({ type: 'jsonb' })
	data: ReportData;

	@Property({ type: 'jsonb' })
	highlights: ReportHighlights;

	// The brand's configuration it was built for; null for the default report of a brand without
	// an active configuration, and once the configuration is deleted
	// Loaded by its own query: a join hydrates its polymorphic `sections` as null, and a flush writes that
	@ManyToOne({
		entity: () => BrandReportConfig,
		nullable: true,
		deleteRule: 'set null',
		index: true,
		strategy: 'select-in',
	})
	config?: Rel<BrandReportConfig> | null;

	// The template behind it: its configuration's, or the default one; null for a custom
	// configuration, and once the template is deleted (never a cascade)
	// Loaded by its own query: a join hydrates its polymorphic `sections` as null, and a flush writes that
	@ManyToOne({
		entity: () => ReportTemplate,
		nullable: true,
		deleteRule: 'set null',
		index: true,
		strategy: 'select-in',
	})
	template?: Rel<ReportTemplate> | null;

	// The configuration's (or the default template's) name at the build
	@Property({ type: 'text', default: 'Full report' })
	name: string = 'Full report';

	// The sections as they were at the build: what the report shows, in this order, and what
	// the highlights were written from. Editing the configuration later never moves it.
	@Embedded(REPORT_SECTION_TYPES, { array: true, defaultRaw: `'[]'` })
	sections: AnyReportSection[] = [];

	// Denormalized from `data` so lists can show and sort them
	@Property({ type: 'int', default: 0 })
	postCount: number = 0;

	@Property({ type: 'int', default: 0 })
	reviewCount: number = 0;

	// When it was last e-mailed to the brand (outreach `ReportDeliveryService`). Set, the build
	// event sends nothing more; "Send now" sends again.
	@Property({ type: 'datetime', nullable: true })
	sentAt?: Date | null;
}
