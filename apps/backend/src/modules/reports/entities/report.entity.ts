import type { Rel } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { City } from 'src/modules/cities/entities/city.entity.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import type { ReportData, ReportHighlights } from '../interfaces/report-data.interface.js';

/**
 * A brand's monthly report on its branches in one city, or (`city` null, `Brand.reportScope`
 * `all`) in every city. Rebuilding it replaces the row. Each branch's place figures are its own
 * entry in `data.branches`. The unique key lets two null-city rows through
 * (nulls are distinct): `ReportService.build` finds the existing one first.
 */
@Entity({ tableName: 'reports' })
@Unique({ properties: ['brand', 'city', 'month'] })
export class Report extends MikroOrmEntityAbstractClass<'postCount' | 'reviewCount'> {
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
